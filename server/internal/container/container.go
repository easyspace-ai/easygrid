package container

import (
	"context"
	"fmt"

	"github.com/dop251/goja"
	"gorm.io/gorm"

	"github.com/easyspace-ai/luckdb/server/internal/application"
	"github.com/easyspace-ai/luckdb/server/internal/config"
	"github.com/easyspace-ai/luckdb/server/internal/events"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/cache"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/repository"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"

	// 领域层仓储接口
	baseRepo "github.com/easyspace-ai/luckdb/server/internal/domain/base/repository"
	collaboratorRepo "github.com/easyspace-ai/luckdb/server/internal/domain/collaborator/repository"
	fieldRepo "github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	spaceRepo "github.com/easyspace-ai/luckdb/server/internal/domain/space/repository"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	userRepo "github.com/easyspace-ai/luckdb/server/internal/domain/user/repository"
	viewRepo "github.com/easyspace-ai/luckdb/server/internal/domain/view/repository"

	// 计算服务相关包
	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/lookup"
	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/rollup"

	// JSVM 和实时通信服务
	"github.com/easyspace-ai/luckdb/server/internal/jsvm"
	"github.com/easyspace-ai/luckdb/server/internal/realtime"
	"github.com/easyspace-ai/luckdb/server/internal/sharedb"
	"go.uber.org/zap"
)

// Container 依赖注入容器
// 管理所有服务的生命周期和依赖关系
type Container struct {
	// 配置
	cfg *config.Config

	// 基础设施
	db          *database.Connection
	dbProvider  database.DBProvider // ✅ 数据库提供者（Schema隔离和动态表管理）
	cacheClient *cache.RedisClient

	// 仓储层（基础设施层实现）
	userRepository         userRepo.UserRepository
	userConfigRepository   userRepo.UserConfigRepository
	collaboratorRepository collaboratorRepo.CollaboratorRepository
	baseRepository         baseRepo.BaseRepository
	recordRepository       recordRepo.RecordRepository
	fieldRepository        fieldRepo.FieldRepository
	spaceRepository        spaceRepo.SpaceRepository
	tableRepository        tableRepo.TableRepository
	viewRepository         viewRepo.ViewRepository

	// 应用服务层
	errorService        *application.ErrorService // 统一错误处理服务 ✨
	userService         *application.UserService
	userConfigService   *application.UserConfigService // 用户配置服务 ✨
	authService         *application.AuthService
	tokenService        *application.TokenService
	permissionServiceV2 *application.PermissionServiceV2 // 权限服务V2 (Action-based) ✨
	collaboratorService *application.CollaboratorService // 协作者服务 ✨
	spaceService        *application.SpaceService
	baseService         *application.BaseService
	tableService        *application.TableService
	fieldService        *application.FieldService
	recordService       *application.RecordService
	viewService         *application.ViewService

	// 基础设施服务 ✨
	batchService       *application.BatchService       // 批量操作服务
	cacheService       *application.CacheService       // 统一缓存服务
	eventBus           *application.EventBus           // 事件总线
	eventStore         *application.EventStore         // 事件存储
	transactionManager *application.TransactionManager // 统一事务管理器

	// 计算服务（重构后的模块化服务）✨
	calculationOrchestrator *application.CalculationOrchestrator // 计算编排器
	dependencyService       *application.DependencyService       // 依赖管理服务
	formulaService          *application.FormulaService          // 公式计算服务
	rollupService           *application.RollupService           // Rollup计算服务
	lookupService           *application.LookupService           // Lookup计算服务
	countService            *application.CountService            // Count计算服务

	// 兼容性：保留原有的计算服务
	calculationService *application.CalculationService // 计算引擎服务 ✨

	// 业务事件管理器 ✨
	businessEventManager *events.BusinessEventManager

	// JSVM 和实时通信服务 ✨
	jsvmManager     *jsvm.RuntimeManager
	realtimeManager *realtime.Manager
	hookService     *application.HookService
}

// NewContainer 创建新的容器
func NewContainer(cfg *config.Config) *Container {
	return &Container{
		cfg: cfg,
	}
}

// Initialize 初始化容器和所有依赖
func (c *Container) Initialize() error {
	logger.Info("正在初始化依赖注入容器...")

	// 1. 初始化数据库连接
	if err := c.initDatabase(); err != nil {
		return fmt.Errorf("初始化数据库失败: %w", err)
	}
	logger.Info("✅ 数据库连接已建立")

	// 2. 初始化缓存
	if err := c.initCache(); err != nil {
		logger.Warn("初始化缓存失败（可选服务）", logger.ErrorField(err))
		// 缓存失败不阻塞启动
	} else {
		logger.Info("✅ 缓存服务已就绪")
	}

	// 3. 初始化仓储层
	c.initRepositories()
	logger.Info("✅ 仓储层已初始化")

	// 4. 初始化应用服务层
	c.initServices()
	logger.Info("✅ 应用服务层已初始化")

	// 5. 初始化 JSVM 和实时通信服务
	if err := c.initJSVMServices(); err != nil {
		logger.Warn("JSVM 服务初始化失败（可选服务）", logger.ErrorField(err))
		// JSVM 失败不阻塞启动
	} else {
		logger.Info("✅ JSVM 和实时通信服务已就绪")
	}

	logger.Info("🎉 依赖注入容器初始化完成")
	return nil
}

// initDatabase 初始化数据库连接和Provider
func (c *Container) initDatabase() error {
	db, err := database.NewConnection(c.cfg.Database)
	if err != nil {
		return err
	}

	c.db = db

	// ✅ 初始化DBProvider（根据数据库类型自动选择）
	factory := database.NewProviderFactory()
	c.dbProvider = factory.MustCreateProvider(c.db.GetDB())
	logger.Info("✅ DBProvider已初始化",
		logger.String("driver", c.dbProvider.DriverName()),
		logger.Bool("supports_schema", c.dbProvider.SupportsSchema()))

	return nil
}

// initCache 初始化缓存
func (c *Container) initCache() error {
	cacheClient, err := cache.NewRedisClient(c.cfg.Redis)
	if err != nil {
		return err
	}

	c.cacheClient = cacheClient
	return nil
}

// initRepositories 初始化所有仓储
func (c *Container) initRepositories() {
	db := c.db.GetDB()

	// 用户仓储
	c.userRepository = repository.NewUserRepository(db)

	// 用户配置仓储
	c.userConfigRepository = repository.NewGormUserConfigRepository(db)

	// 协作者仓储
	c.collaboratorRepository = repository.NewCollaboratorRepository(db)

	// Base仓储
	c.baseRepository = repository.NewBaseRepository(db)

	// 表格仓储
	c.tableRepository = repository.NewTableRepository(db)

	// 字段仓储
	c.fieldRepository = repository.NewFieldRepository(db)

	// ✅ 记录仓储（完全动态表架构）
	// 需要在 tableRepository 和 fieldRepository 之后初始化
	c.recordRepository = repository.NewRecordRepositoryDynamic(
		db,
		c.dbProvider,      // ✅ 注入 DBProvider
		c.tableRepository, // ✅ 注入 TableRepository
		c.fieldRepository, // ✅ 注入 FieldRepository
	)

	// 空间仓储
	c.spaceRepository = repository.NewSpaceRepository(db)

	// 视图仓储
	c.viewRepository = repository.NewViewRepository(db)

}

// initServices 初始化所有应用服务（完美架构）
//
// 设计考量：
//   - 按依赖顺序初始化服务
//   - 计算服务需要在RecordService之前初始化
//   - RecordService依赖CalculationService实现自动计算
func (c *Container) initServices() {
	// 错误处理服务（最先初始化，其他服务可能依赖它）
	c.errorService = application.NewErrorService()

	// 基础设施服务
	c.initInfrastructureServices()

	// Token 服务
	c.tokenService = application.NewTokenService(c.cfg.JWT)

	// 用户服务
	c.userService = application.NewUserService(c.userRepository)

	// 用户配置服务 ✨
	c.userConfigService = application.NewUserConfigService(c.userConfigRepository)

	// 认证服务
	c.authService = application.NewAuthService(c.userRepository, c.tokenService)

	// 权限服务V2 ✨
	c.permissionServiceV2 = application.NewPermissionServiceV2(
		c.collaboratorRepository,
		c.spaceRepository,
		c.baseRepository,
		c.tableRepository,
	)

	// 协作者服务 ✨
	c.collaboratorService = application.NewCollaboratorService(c.collaboratorRepository)

	// 核心业务服务
	c.spaceService = application.NewSpaceService(c.spaceRepository)
	c.baseService = application.NewBaseService(c.baseRepository, c.spaceRepository, c.dbProvider) // ✅ 注入DBProvider + SpaceRepository

	// ✅ 先初始化 ViewService（独立服务，不依赖其他服务）
	// 注意：这里先传 nil，稍后在 initInfrastructureServices 后重新设置
	c.viewService = application.NewViewService(c.viewRepository, c.tableRepository, nil)

	// ✅ 初始化 FieldService (暂时传nil，待实现broadcaster)
	c.fieldService = application.NewFieldService(
		c.fieldRepository,
		nil,               // depGraphRepo（待实现）
		nil,               // broadcaster（已移除 WebSocket 服务）
		c.tableRepository, // ✅ 注入TableRepository
		c.dbProvider,      // ✅ 注入DBProvider
	)

	// ✅ 初始化 TableService（依赖 FieldService 和 ViewService）
	c.tableService = application.NewTableService(
		c.tableRepository,
		c.baseRepository,
		c.spaceRepository,
		c.recordRepository, // ✅ 注入RecordRepository
		c.fieldService,
		c.viewService, // ✅ 注入ViewService
		c.dbProvider,  // ✅ 注入DBProvider
	)

	// ✨ 业务事件管理器初始化（带Redis分布式广播）
	if c.cacheClient != nil {
		c.businessEventManager = events.NewBusinessEventManagerWithRedis(
			logger.Logger,
			c.cacheClient.GetClient(),
			"luckdb:events",
		)
		logger.Info("✅ 业务事件管理器已初始化（Redis分布式广播）")
	} else {
		c.businessEventManager = events.NewBusinessEventManager(logger.Logger)
		logger.Info("✅ 业务事件管理器已初始化（本地模式）")
	}

	// ✨ 初始化模块化计算服务（重构后的架构）
	c.initCalculationServices()

	// ✨ 初始化基础设施服务
	c.initInfrastructureServices()

	// ✅ 重新设置 ViewService 的 businessEventManager（现在 businessEventManager 已经初始化）
	c.viewService = application.NewViewService(c.viewRepository, c.tableRepository, c.businessEventManager)

	// ✨ 计算引擎服务（在RecordService之前初始化）
	// 仅使用业务事件/YJS+SSE，不再注入旧 WebSocket
	c.calculationService = application.NewCalculationService(
		c.fieldRepository,
		c.recordRepository,
		c.businessEventManager, // ✨ 业务事件管理器
	)

	// ✅ Phase 2: 类型转换服务
	typecastService := application.NewTypecastService(c.fieldRepository)

	// 记录服务（集成计算引擎+验证） ✨ 移除旧 WebSocket 广播，改由业务事件+YJS/SSE
	// 注意：ShareDB 服务将在 initJSVMServices 中初始化，所以这里先传 nil
	c.recordService = application.NewRecordService(
		c.recordRepository,
		c.fieldRepository,
		c.tableRepository,      // ✅ 注入表仓储，用于检查表存在性
		c.calculationService,   // 注入计算服务 ✨
		nil,                    // 🔥 不再使用旧 WS 广播器
		c.businessEventManager, // ✨ 业务事件管理器
		typecastService,        // ✅ 注入验证服务
		nil,                    // ✨ ShareDB 服务将在 initJSVMServices 中设置
	)
}

// initCalculationServices 初始化模块化计算服务
func (c *Container) initCalculationServices() {
	logger.Info("正在初始化模块化计算服务...")

	// 1. 初始化依赖管理服务
	c.dependencyService = application.NewDependencyService(c.errorService)

	// 2. 初始化各个专门的计算服务
	c.formulaService = application.NewFormulaService(c.errorService)

	// 创建Rollup计算器
	rollupCalculator := &rollup.RollupCalculator{} // 这里需要根据实际的rollup包来创建
	c.rollupService = application.NewRollupService(
		c.fieldRepository,
		c.recordRepository,
		rollupCalculator,
		c.errorService,
	)

	// 创建Lookup计算器
	lookupCalculator := &lookup.LookupCalculator{} // 这里需要根据实际的lookup包来创建
	c.lookupService = application.NewLookupService(
		c.recordRepository,
		lookupCalculator,
		c.errorService,
	)

	c.countService = application.NewCountService(c.errorService)

	// 3. 初始化计算编排器
	c.calculationOrchestrator = application.NewCalculationOrchestrator(
		c.dependencyService,
		c.formulaService,
		c.rollupService,
		c.lookupService,
		c.countService,
		c.fieldRepository,
		c.recordRepository,
		c.errorService,
	)

	logger.Info("✅ 模块化计算服务已初始化")
}

// Close 关闭容器和所有资源
func (c *Container) Close() {
	logger.Info("正在关闭容器资源...")

	// 1. 首先关闭业务事件管理器（停止Redis订阅）
	if c.businessEventManager != nil {
		c.businessEventManager.Shutdown()
		logger.Info("✅ 业务事件管理器已关闭")
	}

	// 2. 关闭 JSVM 服务
	if c.jsvmManager != nil {
		c.jsvmManager.Shutdown()
		logger.Info("✅ JSVM 服务已关闭")
	}

	// 3. 关闭实时通信服务
	if c.realtimeManager != nil {
		c.realtimeManager.Shutdown()
		logger.Info("✅ 实时通信服务已关闭")
	}

	// 4. 关闭数据库连接
	if c.db != nil {
		c.db.Close()
		logger.Info("✅ 数据库连接已关闭")
	}

	// 5. 最后关闭缓存连接
	if c.cacheClient != nil {
		c.cacheClient.Close()
		logger.Info("✅ 缓存连接已关闭")
	}

	logger.Info("🎉 容器资源已全部释放")
}

// ==================== 服务访问器 ====================

// Config 获取配置
func (c *Container) Config() *config.Config {
	return c.cfg
}

// DBConnection 获取数据库连接
func (c *Container) DBConnection() *database.Connection {
	return c.db
}

// DB 获取 GORM DB 实例
func (c *Container) DB() *gorm.DB {
	return c.db.GetDB()
}

// CacheClient 获取缓存客户端
func (c *Container) CacheClient() *cache.RedisClient {
	return c.cacheClient
}

// ==================== 仓储访问器 ====================

// UserRepository 获取用户仓储
func (c *Container) UserRepository() userRepo.UserRepository {
	return c.userRepository
}

// RecordRepository 获取记录仓储
func (c *Container) RecordRepository() recordRepo.RecordRepository {
	return c.recordRepository
}

// FieldRepository 获取字段仓储
func (c *Container) FieldRepository() fieldRepo.FieldRepository {
	return c.fieldRepository
}

// UserRepo 获取用户仓储（别名）
func (c *Container) UserRepo() userRepo.UserRepository {
	return c.userRepository
}

// ==================== 应用服务访问器 ====================

// ErrorService 获取错误处理服务 ✨
func (c *Container) ErrorService() *application.ErrorService {
	return c.errorService
}

// BatchService 获取批量操作服务
func (c *Container) BatchService() *application.BatchService {
	return c.batchService
}

// CacheService 获取缓存服务
func (c *Container) CacheService() *application.CacheService {
	return c.cacheService
}

// EventBus 获取事件总线
func (c *Container) EventBus() *application.EventBus {
	return c.eventBus
}

// EventStore 获取事件存储
func (c *Container) EventStore() *application.EventStore {
	return c.eventStore
}

// UserService 获取用户服务
func (c *Container) UserService() *application.UserService {
	return c.userService
}

// UserConfigService 获取用户配置服务
func (c *Container) UserConfigService() *application.UserConfigService {
	return c.userConfigService
}

// AuthService 获取认证服务
func (c *Container) AuthService() *application.AuthService {
	return c.authService
}

// TokenService 获取Token服务
func (c *Container) TokenService() *application.TokenService {
	return c.tokenService
}

// PermissionServiceV2 获取权限服务V2
func (c *Container) PermissionServiceV2() *application.PermissionServiceV2 {
	return c.permissionServiceV2
}

// CollaboratorService 获取协作者服务
func (c *Container) CollaboratorService() *application.CollaboratorService {
	return c.collaboratorService
}

// SpaceService 获取空间服务
func (c *Container) SpaceService() *application.SpaceService {
	return c.spaceService
}

// BaseService 获取Base服务
func (c *Container) BaseService() *application.BaseService {
	return c.baseService
}

// TableService 获取表格服务
func (c *Container) TableService() *application.TableService {
	return c.tableService
}

// FieldService 获取字段服务
func (c *Container) FieldService() *application.FieldService {
	return c.fieldService
}

// RecordService 获取记录服务
func (c *Container) RecordService() *application.RecordService {
	return c.recordService
}

// ViewService 获取视图服务
func (c *Container) ViewService() *application.ViewService {
	return c.viewService
}

// CalculationService 获取计算服务 ✨
func (c *Container) CalculationService() *application.CalculationService {
	return c.calculationService
}

// ==================== 模块化计算服务访问器 ====================

// CalculationOrchestrator 获取计算编排器 ✨
func (c *Container) CalculationOrchestrator() *application.CalculationOrchestrator {
	return c.calculationOrchestrator
}

// DependencyService 获取依赖管理服务 ✨
func (c *Container) DependencyService() *application.DependencyService {
	return c.dependencyService
}

// FormulaService 获取公式计算服务 ✨
func (c *Container) FormulaService() *application.FormulaService {
	return c.formulaService
}

// RollupService 获取Rollup计算服务 ✨
func (c *Container) RollupService() *application.RollupService {
	return c.rollupService
}

// LookupService 获取Lookup计算服务 ✨
func (c *Container) LookupService() *application.LookupService {
	return c.lookupService
}

// CountService 获取Count计算服务 ✨
func (c *Container) CountService() *application.CountService {
	return c.countService
}

// JSVMManager 获取 JSVM 运行时管理器 ✨
func (c *Container) JSVMManager() *jsvm.RuntimeManager {
	return c.jsvmManager
}

// RealtimeManager 获取实时通信管理器 ✨
func (c *Container) RealtimeManager() *realtime.Manager {
	return c.realtimeManager
}

// HookService 获取钩子服务 ✨
func (c *Container) HookService() *application.HookService {
	return c.hookService
}

// ==================== 健康检查 ====================

// Health 健康检查
func (c *Container) Health(ctx context.Context) error {
	// 检查数据库
	if err := c.db.Health(); err != nil {
		return fmt.Errorf("数据库不健康: %w", err)
	}

	// 检查缓存（可选）
	if c.cacheClient != nil {
		if err := c.cacheClient.Health(ctx); err != nil {
			logger.Warn("缓存服务不健康", logger.ErrorField(err))
			// 不返回错误，缓存失败不影响服务
		}
	}

	return nil
}

// ==================== 启动和停止服务 ====================

// StartServices 启动所有后台服务
func (c *Container) StartServices(ctx context.Context) {
	logger.Info("启动后台服务...")

	// 启动后台任务（参考 teable-develop）
	// - 定时任务
	// - 消息队列消费者
	// - WebSocket 服务
	// - 计算任务队列

	logger.Info("✅ 后台服务启动完成")
}

// StopServices 停止所有后台服务
func (c *Container) StopServices() {
	logger.Info("停止后台服务...")

	// 停止后台任务（优雅关闭所有后台服务）

	logger.Info("✅ 后台服务已停止")
}

// initInfrastructureServices 初始化基础设施服务
func (c *Container) initInfrastructureServices() {
	// 批量操作服务
	c.batchService = application.NewBatchService(
		c.fieldRepository,
		c.recordRepository,
		c.errorService,
	)

	// 缓存服务
	cacheConfig := application.DefaultCacheConfig()
	c.cacheService = application.NewCacheService(
		c.cacheClient,
		c.errorService,
		cacheConfig,
	)

	// 事件存储
	c.eventStore = application.NewEventStore(
		c.db.DB,
		nil, // 使用默认配置
	)

	// 事件总线
	eventBusConfig := application.DefaultEventBusConfig()
	c.eventBus = application.NewEventBus(
		c.eventStore,
		c.errorService,
		eventBusConfig,
	)

	// 统一事务管理器
	c.transactionManager = application.NewTransactionManager(
		c.db.DB,
		c.eventBus,
		nil, // 使用默认配置
	)
}

// initJSVMServices 初始化 JSVM 和实时通信服务
func (c *Container) initJSVMServices() error {
	// 检查 JSVM 是否启用
	if !c.cfg.JSVM.Enabled {
		logger.Info("JSVM 服务已禁用")
		return nil
	}

	logger.Info("正在初始化 JSVM 和实时通信服务...")

	// 创建实时通信管理器
	c.realtimeManager = realtime.NewManager(logger.Logger)
	logger.Info("✅ 实时通信管理器已创建")

	// 设置正确的业务事件管理器（确保 YJS 和 SSE 使用同一个实例）
	if c.businessEventManager != nil {
		c.realtimeManager.SetBusinessEventManager(c.businessEventManager)
		logger.Info("✅ 实时管理器已使用容器中的业务事件管理器")
	}

	// 初始化 ShareDB 服务
	c.initShareDB(logger.Logger)

	// 创建 JSVM 运行时管理器
	jsvmConfig := &jsvm.Config{
		HooksDir:            c.cfg.JSVM.HooksDir,
		HooksWatch:          c.cfg.JSVM.HooksWatch,
		HooksPoolSize:       c.cfg.JSVM.HooksPoolSize,
		PluginsDir:          c.cfg.JSVM.PluginsDir,
		HooksFilesPattern:   c.cfg.JSVM.HooksFilesPattern,
		PluginsFilesPattern: c.cfg.JSVM.PluginsFilesPattern,
		OnInit: func(vm *goja.Runtime) {
			// 设置自定义 API
			vm.Set("app", map[string]interface{}{
				"onUserCreate": func(callback goja.Callable) {
					logger.Info("User create hook registered")
				},
				"onUserUpdate": func(callback goja.Callable) {
					logger.Info("User update hook registered")
				},
				"onUserDelete": func(callback goja.Callable) {
					logger.Info("User delete hook registered")
				},
				"onRecordCreate": func(callback goja.Callable) {
					logger.Info("Record create hook registered")
				},
				"onRecordUpdate": func(callback goja.Callable) {
					logger.Info("Record update hook registered")
				},
				"onRecordDelete": func(callback goja.Callable) {
					logger.Info("Record delete hook registered")
				},
			})
		},
	}

	var err error
	c.jsvmManager, err = jsvm.NewRuntimeManager(jsvmConfig, logger.Logger)
	if err != nil {
		return fmt.Errorf("创建 JSVM 管理器失败: %w", err)
	}

	// 加载钩子和插件
	if err := c.jsvmManager.LoadHooks(); err != nil {
		logger.Warn("加载钩子失败", logger.ErrorField(err))
	}

	if err := c.jsvmManager.LoadPlugins(); err != nil {
		logger.Warn("加载插件失败", logger.ErrorField(err))
	}

	// 创建钩子服务
	c.hookService = application.NewHookService(c.jsvmManager)

	// 设置用户服务的钩子服务
	if c.userService != nil {
		c.userService.SetHookService(c.hookService)
		logger.Info("✅ 用户服务钩子已设置")
	}

	// 设置记录服务的钩子服务
	if c.recordService != nil {
		c.recordService.SetHookService(c.hookService)
		logger.Info("✅ 记录服务钩子已设置")
	}

	logger.Info("✅ JSVM 和实时通信服务初始化完成")
	return nil
}

// initShareDB 初始化 ShareDB 服务
func (c *Container) initShareDB(logger *zap.Logger) {
	logger.Info("正在初始化 ShareDB 服务...")

	// 创建数据库适配器
	adapter := sharedb.NewPostgresAdapter(c.db.GetDB(), logger)
	logger.Info("✅ ShareDB PostgreSQL 适配器已创建")

	// 创建发布订阅服务
	var pubsub sharedb.PubSub
	if c.cacheClient != nil {
		// 使用 Redis 发布订阅
		redisPubsub, err := sharedb.NewRedisPubSub("redis://localhost:6379", logger)
		if err != nil {
			logger.Warn("Redis 发布订阅创建失败，使用本地发布订阅", zap.Error(err))
			pubsub = sharedb.NewLocalPubSub(logger)
		} else {
			pubsub = redisPubsub
			logger.Info("✅ ShareDB Redis 发布订阅已创建")
		}
	} else {
		// 使用本地发布订阅
		pubsub = sharedb.NewLocalPubSub(logger)
		logger.Info("✅ ShareDB 本地发布订阅已创建")
	}

	// 创建在线状态管理器
	presence := sharedb.NewPresenceManager(logger)
	logger.Info("✅ ShareDB 在线状态管理器已创建")

	// 初始化 ShareDB 服务
	c.realtimeManager.InitShareDB(adapter, pubsub, presence)

	// 设置事件管理器
	if c.businessEventManager != nil {
		shareDBService := c.realtimeManager.GetShareDBService()
		if shareDBService != nil {
			shareDBService.SetEventManager(c.businessEventManager)
			logger.Info("✅ ShareDB 事件管理器已设置")
		}
	}

	// 设置 ShareDB 服务到 RecordService
	if c.recordService != nil {
		c.recordService.SetShareDBService(c.realtimeManager.GetShareDBService())
		logger.Info("✅ RecordService ShareDB 服务已设置")
	}

	logger.Info("✅ ShareDB 服务初始化完成")
}
