# 依赖注入容器

## 🎯 概述

LuckDB 使用 **Container 模式**统一管理所有服务的生命周期和依赖关系，实现依赖注入（Dependency Injection）。

## 📦 容器结构

### Container定义

```go
type Container struct {
    // 配置
    cfg *config.Config
    
    // 基础设施
    db          *database.Connection
    dbProvider  database.DBProvider
    cacheClient *cache.RedisClient
    
    // 仓储层
    userRepository    userRepo.UserRepository
    tableRepository   tableRepo.TableRepository
    recordRepository  recordRepo.RecordRepository
    fieldRepository   fieldRepo.FieldRepository
    // ... 更多仓储
    
    // 应用服务层
    userService       *application.UserService
    tableService      *application.TableService
    recordService     *application.RecordService
    fieldService      *application.FieldService
    // ... 更多服务
}
```

## 🔄 初始化流程

### 1. 创建容器

```go
cfg, _ := config.Load()
cont := container.NewContainer(cfg)
```

### 2. 初始化容器

```go
if err := cont.Initialize(); err != nil {
    log.Fatal(err)
}
defer cont.Close()
```

### 初始化步骤

```
1. 初始化数据库连接
   ↓
2. 初始化缓存（可选）
   ↓
3. 初始化基础设施服务
   ↓
4. 初始化仓储层
   ↓
5. 初始化应用服务层
   ↓
6. 初始化JSVM和实时通信（可选）
```

## 🏗️ 服务初始化顺序

### 阶段1: 基础设施

```go
// 1. 数据库连接
func (c *Container) initDatabase() error {
    db, err := database.NewConnection(c.cfg.Database)
    c.db = db
    c.dbProvider = database.NewProvider(db)
    return err
}

// 2. 缓存（可选）
func (c *Container) initCache() error {
    if c.cfg.Redis.Host == "" {
        return nil // 缓存是可选的
    }
    cache, err := cache.NewRedisClient(c.cfg.Redis)
    c.cacheClient = cache
    return err
}
```

### 阶段2: 仓储层

```go
func (c *Container) initRepositories() {
    // 用户仓储
    c.userRepository = repository.NewUserRepository(c.db)
    
    // 表格仓储
    c.tableRepository = repository.NewTableRepository(c.db, c.dbProvider)
    
    // 记录仓储
    c.recordRepository = repository.NewRecordRepository(c.db, c.dbProvider)
    
    // 字段仓储
    c.fieldRepository = repository.NewFieldRepository(c.db)
    
    // ... 更多仓储
}
```

### 阶段3: 应用服务层

```go
func (c *Container) initServices() {
    // 用户服务
    c.userService = application.NewUserService(
        c.userRepository,
        c.cacheClient,
    )
    
    // 表格服务
    c.tableService = application.NewTableService(
        c.tableRepository,
        c.fieldRepository,
        c.dbProvider,
    )
    
    // 记录服务
    c.recordService = application.NewRecordService(
        c.recordRepository,
        c.fieldRepository,
        c.tableRepository,
        c.calculationService,
    )
    
    // ... 更多服务
}
```

## 🔌 依赖注入示例

### 服务依赖关系

```
RecordService
  ├── RecordRepository
  ├── FieldRepository
  ├── TableRepository
  └── CalculationService
        ├── FieldRepository
        ├── RecordRepository
        └── DependencyService
```

### 实现方式

```go
// RecordService 构造函数接收依赖
func NewRecordService(
    recordRepo recordRepo.RecordRepository,
    fieldRepo fieldRepo.FieldRepository,
    tableRepo tableRepo.TableRepository,
    calcService *application.CalculationService,
) *RecordService {
    return &RecordService{
        recordRepo:  recordRepo,
        fieldRepo:   fieldRepo,
        tableRepo:   tableRepo,
        calcService: calcService,
    }
}

// 在容器中初始化
func (c *Container) initServices() {
    // 先初始化依赖的服务
    c.calculationService = application.NewCalculationService(...)
    
    // 再初始化依赖它的服务
    c.recordService = application.NewRecordService(
        c.recordRepository,
        c.fieldRepository,
        c.tableRepository,
        c.calculationService, // 注入依赖
    )
}
```

## 🎮 使用容器

### 在Handler中使用

```go
// Handler接收Container
func NewRecordHandler(cont *container.Container) *RecordHandler {
    return &RecordHandler{
        recordService: cont.RecordService(),
        fieldService:  cont.FieldService(),
    }
}

// 在路由中设置
func setupRecordRoutes(rg *gin.RouterGroup, cont *container.Container) {
    handler := NewRecordHandler(cont)
    // 注册路由...
}
```

### 服务访问器

```go
// Container提供访问器方法
func (c *Container) RecordService() *application.RecordService {
    return c.recordService
}

func (c *Container) FieldService() *application.FieldService {
    return c.fieldService
}

// ... 更多访问器
```

## 🔄 服务生命周期

### 单例模式

- **所有服务都是单例**: 容器中每个服务只有一个实例
- **线程安全**: 服务应该是线程安全的
- **延迟初始化**: 按需初始化，避免循环依赖

### 可选服务

```go
// JSVM是可选的
func (c *Container) initJSVMServices() error {
    if !c.cfg.JSVM.Enabled {
        return nil // 不启用JSVM
    }
    
    c.jsvmManager = jsvm.NewRuntimeManager(...)
    return nil
}

// 使用时检查
func (c *Container) JSVMManager() *jsvm.RuntimeManager {
    if c.jsvmManager == nil {
        return nil // 返回nil表示未启用
    }
    return c.jsvmManager
}
```

## 🧹 资源清理

### Close方法

```go
func (c *Container) Close() error {
    var errs []error
    
    // 关闭数据库连接
    if c.db != nil {
        if err := c.db.Close(); err != nil {
            errs = append(errs, err)
        }
    }
    
    // 关闭缓存连接
    if c.cacheClient != nil {
        if err := c.cacheClient.Close(); err != nil {
            errs = append(errs, err)
        }
    }
    
    // 关闭JSVM
    if c.jsvmManager != nil {
        if err := c.jsvmManager.Close(); err != nil {
            errs = append(errs, err)
        }
    }
    
    return errors.Join(errs...)
}
```

## 📋 最佳实践

### 1. 依赖顺序

- **先初始化被依赖的服务**: CalculationService → RecordService
- **避免循环依赖**: 如果出现，考虑引入中间服务

### 2. 接口隔离

- **依赖接口，不依赖实现**: Service依赖Repository接口
- **接口定义在Domain Layer**: Repository接口在domain层

### 3. 错误处理

- **初始化失败立即返回**: 不继续初始化其他服务
- **可选服务失败不阻塞**: JSVM、Cache失败不影响启动

### 4. 测试支持

- **容器可替换**: 测试时可以使用Mock容器
- **依赖可注入**: 测试时可以注入Mock依赖

## 📖 相关文档

- [架构总览](./ARCHITECTURE-OVERVIEW.md)
- [分层架构](./ARCHITECTURE-LAYERS.md)
- [数据库设计](./ARCHITECTURE-DATABASE.md)

---

**最后更新**: 2025-01-XX

