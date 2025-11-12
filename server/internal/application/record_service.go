package application

import (
	"context"
	"fmt"
	"strings"

	"github.com/easyspace-ai/luckdb/server/internal/application/dto"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/valueobject"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	tableService "github.com/easyspace-ai/luckdb/server/internal/domain/table/service"
	"github.com/easyspace-ai/luckdb/server/internal/events"
	infraRepository "github.com/easyspace-ai/luckdb/server/internal/infrastructure/repository"
	"github.com/easyspace-ai/luckdb/server/internal/sharedb"
	"github.com/easyspace-ai/luckdb/server/pkg/database"
	pkgerrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/easyspace-ai/luckdb/server/pkg/sharedb/opbuilder"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// RecordService 记录应用服务（集成计算引擎+实时推送）✨
//
// 设计哲学：
//   - 自动计算：Record创建/更新时自动计算虚拟字段
//   - 依赖感知：自动识别受影响的字段
//   - 性能优先：批量计算，拓扑优化
//   - 实时推送：变更实时广播到WebSocket客户端
//
// 集成计算引擎：
//   - 创建Record后自动计算所有虚拟字段
//   - 更新Record后自动计算受影响的字段
//   - 确保数据一致性和实时性
//
// 实时推送：
//   - 记录变更实时推送到前端
//   - 计算字段变更实时推送
//   - 支持多客户端同步
type RecordService struct {
	recordRepo         recordRepo.RecordRepository
	fieldRepo          repository.FieldRepository
	tableRepo          tableRepo.TableRepository     // ✅ 添加表仓储，用于检查表存在性
	calculationService *CalculationService           // ✨ 计算引擎
	broadcaster        Broadcaster                   // ✨ WebSocket广播器
	businessEvents     events.BusinessEventPublisher // ✨ 业务事件发布器
	typecastService    *TypecastService              // ✅ Phase 2: 类型转换和验证
	hookService        *HookService                  // ✨ 钩子服务
	shareDBService        *sharedb.ShareDBService       // ✨ ShareDB 实时协作服务
	linkService           *tableService.LinkService     // ✨ Link 字段服务
	linkTitleUpdateService *LinkTitleUpdateService      // ✨ Link 字段标题更新服务
	logger                *zap.Logger                  // ✨ 日志记录器
}

// Broadcaster WebSocket广播器接口
type Broadcaster interface {
	BroadcastRecordUpdate(tableID, recordID string, fields map[string]interface{})
	BroadcastRecordCreate(tableID, recordID string, fields map[string]interface{})
	BroadcastRecordDelete(tableID, recordID string)
}

// NewRecordService 创建记录服务（集成计算引擎+实时推送+验证）✨
func NewRecordService(
	recordRepo recordRepo.RecordRepository,
	fieldRepo repository.FieldRepository,
	tableRepo tableRepo.TableRepository,
	calculationService *CalculationService,
	broadcaster Broadcaster,
	businessEvents events.BusinessEventPublisher,
	typecastService *TypecastService,
	shareDBService *sharedb.ShareDBService,
	linkService *tableService.LinkService,
	linkTitleUpdateService *LinkTitleUpdateService,
) *RecordService {
	return &RecordService{
		recordRepo:            recordRepo,
		fieldRepo:             fieldRepo,
		tableRepo:             tableRepo,
		calculationService:    calculationService,
		broadcaster:           broadcaster,
		businessEvents:        businessEvents,
		typecastService:       typecastService,
		shareDBService:        shareDBService,
		linkService:           linkService,
		linkTitleUpdateService: linkTitleUpdateService,
		logger:                logger.Logger,
	}
}

// SetBroadcaster 设置广播器（用于延迟注入）
func (s *RecordService) SetBroadcaster(broadcaster Broadcaster) {
	s.broadcaster = broadcaster
}

// SetHookService 设置钩子服务（用于延迟注入）
func (s *RecordService) SetHookService(hookService *HookService) {
	s.hookService = hookService
}

// getDBFromRecordRepo 从 RecordRepository 获取数据库连接
// 处理缓存包装器的情况
func (s *RecordService) getDBFromRecordRepo() (*gorm.DB, error) {
	// 尝试类型断言到 CachedRecordRepository
	if cachedRepo, ok := s.recordRepo.(*infraRepository.CachedRecordRepository); ok {
		db := cachedRepo.GetDB()
		if db == nil {
			return nil, fmt.Errorf("无法从缓存仓库获取数据库连接")
		}
		return db, nil
	}
	// 尝试类型断言到 RecordRepositoryDynamic
	if dynamicRepo, ok := s.recordRepo.(*infraRepository.RecordRepositoryDynamic); ok {
		return dynamicRepo.GetDB(), nil
	}
	return nil, fmt.Errorf("不支持的 RecordRepository 类型")
}

// CreateRecord 创建记录（集成自动计算）✨ 事务版
//
// 执行流程：
//  1. 在事务中验证并创建Record实体
//  2. 保存到数据库
//  3. ✨ 自动计算所有虚拟字段（在事务内）
//  4. 收集 WebSocket 事件（不立即发送）
//  5. 事务成功后发布事件
//  6. 返回包含计算结果的Record
//
// 设计考量：
//   - 所有操作在单个事务中（原子性）
//   - 计算失败回滚整个事务
//   - 事务成功后才发布 WebSocket 事件
func (s *RecordService) CreateRecord(ctx context.Context, req dto.CreateRecordRequest, userID string) (*dto.RecordResponse, error) {
	// ✅ 在事务前检查表是否存在
	table, err := s.tableRepo.GetByID(ctx, req.TableID)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找表失败: %v", err))
	}
	if table == nil {
		return nil, pkgerrors.ErrTableNotFound.WithDetails(map[string]interface{}{
			"table_id": req.TableID,
		})
	}

	var record *entity.Record
	var finalFields map[string]interface{}

	// ✅ 在事务中执行所有操作
	// 处理缓存包装器的情况
	db, err := s.getDBFromRecordRepo()
	if err != nil {
		return nil, pkgerrors.ErrInternalServer.WithDetails(fmt.Sprintf("获取数据库连接失败: %v", err))
	}

	err = database.Transaction(ctx, db, nil, func(txCtx context.Context) error {
		// 1. 数据验证和类型转换
		var validatedData map[string]interface{}
		if s.typecastService != nil {
			var err error
			// ✅ 使用严格模式（typecast=false）进行验证，确保字段存在性和数据类型正确
			validatedData, err = s.typecastService.ValidateAndTypecastRecord(txCtx, req.TableID, req.Data, false)
			if err != nil {
				return err // 直接返回错误，保留具体的错误类型
			}
		} else {
			validatedData = req.Data
		}

		// 2. 验证必填字段
		if err := s.validateRequiredFields(txCtx, req.TableID, validatedData); err != nil {
			return err
		}

		// 3. 创建记录数据值对象
		recordData, err := valueobject.NewRecordData(validatedData)
		if err != nil {
			return pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("记录数据无效: %v", err))
		}

		// 4. 创建记录实体
		record, err = entity.NewRecord(req.TableID, recordData, userID)
		if err != nil {
			return pkgerrors.ErrInternalServer.WithDetails(fmt.Sprintf("创建记录实体失败: %v", err))
		}

		// 5. 保存记录（在事务中）
		if err := s.recordRepo.Save(txCtx, record); err != nil {
			return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("保存记录失败: %v", err))
		}

		logger.Info("记录创建成功（事务中）",
			logger.String("record_id", record.ID().String()),
			logger.String("table_id", req.TableID))

		// 6. ✨ 自动计算虚拟字段（在事务内）
		if s.calculationService != nil {
			if err := s.calculationService.CalculateRecordFields(txCtx, record); err != nil {
				logger.Error("虚拟字段计算失败（回滚事务）",
					logger.String("record_id", record.ID().String()),
					logger.ErrorField(err))
				return err
			}
			logger.Info("虚拟字段计算成功（事务中）✨",
				logger.String("record_id", record.ID().String()))
		}

		// 7. ✅ 收集事件（不立即发送）
		finalFields = record.Data().ToMap()
		event := &database.RecordEvent{
			EventType: "record.create",
			TID:       req.TableID,
			RID:       record.ID().String(),
			Fields:    finalFields,
			UserID:    userID,
		}
		database.AddEventToTx(txCtx, event)

		// 8. ✨ 添加事务提交后回调（发布 WebSocket 事件）
		database.AddTxCallback(txCtx, func() {
			s.publishRecordEvent(event)
		})

		return nil
	})

	if err != nil {
		logger.Error("记录创建失败",
			logger.String("table_id", req.TableID),
			logger.Any("data", req.Data),
			logger.ErrorField(err))
		return nil, err
	}

	logger.Info("记录创建完成，事件将在事务提交后发布",
		logger.String("record_id", record.ID().String()))

	// 触发记录创建钩子
	if s.hookService != nil {
		s.hookService.TriggerRecordCreateHook(ctx, req.TableID, record.ID().String(), finalFields)
	}

	return dto.FromRecordEntity(record), nil
}

// GetRecord 获取记录详情
// ✨ 关键修复：在查询时计算虚拟字段（如 Count 字段）
func (s *RecordService) GetRecord(ctx context.Context, tableID, recordID string) (*dto.RecordResponse, error) {
	id := valueobject.NewRecordID(recordID)

	logger.Info("GetRecord: 开始查询记录",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID))

	record, err := s.recordRepo.FindByTableAndID(ctx, tableID, id)
	if err != nil {
		logger.Error("GetRecord: 查找记录失败",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID),
			logger.ErrorField(err))
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找记录失败: %v", err))
	}
	if record == nil {
		logger.Warn("GetRecord: 记录不存在",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID))
		return nil, pkgerrors.ErrNotFound.WithDetails("记录不存在")
	}

	// ✨ 关键修复：计算虚拟字段（如 Count 字段）
	// 因为虚拟字段的值不保存在数据库中，需要在查询时动态计算
	if s.calculationService != nil {
		logger.Info("GetRecord: 开始计算虚拟字段",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID))
		
		// 预加载字段（只查询一次）
		fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
		if err != nil {
			logger.Warn("GetRecord: 预加载字段失败，跳过虚拟字段计算",
				logger.String("table_id", tableID),
				logger.String("record_id", recordID),
				logger.ErrorField(err))
		} else {
			// 计算虚拟字段（使用预加载的字段）
			if err := s.calculationService.CalculateRecordFieldsWithFields(ctx, record, fields); err != nil {
				logger.Warn("GetRecord: 计算虚拟字段失败",
					logger.String("table_id", tableID),
					logger.String("record_id", recordID),
					logger.ErrorField(err))
				// 不中断查询，继续返回记录（即使虚拟字段计算失败）
			} else {
				logger.Info("GetRecord: 虚拟字段计算成功",
					logger.String("table_id", tableID),
					logger.String("record_id", recordID))
			}
		}
	}

	logger.Info("GetRecord: 查询记录成功",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID))

	return dto.FromRecordEntity(record), nil
}

// UpdateRecord 更新记录（集成智能重算）✨ 事务版
//
// 执行流程：
//  1. 在事务中查找并验证Record
//  2. 识别变化的字段
//  3. 更新Record数据并保存
//  4. ✨ 智能重算受影响的虚拟字段（在事务内）
//  5. 收集 WebSocket 事件（不立即发送）
//  6. 事务成功后发布事件
//  7. 返回包含最新计算结果的Record
//
// 设计考量：
//   - 所有操作在单个事务中（原子性）
//   - 计算失败回滚整个事务
//   - 事务成功后才发布 WebSocket 事件
func (s *RecordService) UpdateRecord(ctx context.Context, tableID, recordID string, req dto.UpdateRecordRequest, userID string) (*dto.RecordResponse, error) {
	// 处理 Teable 格式的请求
	var updateData map[string]interface{}
	var version *int

	// 检查是否是 Teable 格式（有 record 字段）
	if req.Record != nil && req.Record.Fields != nil {
		// Teable 格式：使用 record.fields
		updateData = req.Record.Fields
		version = req.Version
		s.logger.Info("使用 Teable 格式更新记录",
			zap.String("fieldKeyType", req.FieldKeyType),
			zap.Any("fields", updateData))
	} else if req.Data != nil {
		// 兼容格式：使用 data 字段
		updateData = req.Data
		version = req.Version
		s.logger.Info("使用兼容格式更新记录", zap.Any("data", updateData))
	} else {
		return nil, pkgerrors.ErrValidationFailed.WithMessage("请求格式无效：必须提供 record.fields 或 data 字段")
	}

	// ✅ 在事务前检查表是否存在
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找表失败: %v", err))
	}
	if table == nil {
		return nil, pkgerrors.ErrTableNotFound.WithDetails(map[string]interface{}{
			"table_id": tableID,
		})
	}

	var record *entity.Record
	var finalFields map[string]interface{}

	// ✅ 在事务中执行所有操作
	// 处理缓存包装器的情况
	db, err := s.getDBFromRecordRepo()
	if err != nil {
		return nil, pkgerrors.ErrInternalServer.WithDetails(fmt.Sprintf("获取数据库连接失败: %v", err))
	}

	err = database.Transaction(ctx, db, nil, func(txCtx context.Context) error {
		// 1. 查找记录（使用 tableID）
		id := valueobject.NewRecordID(recordID)
		var err error
		records, err := s.recordRepo.FindByIDs(txCtx, tableID, []valueobject.RecordID{id})
		if err != nil {
			return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找记录失败: %v", err))
		}
		if len(records) == 0 {
			return pkgerrors.ErrNotFound.WithDetails("记录不存在")
		}
		record = records[0]

		// ✅ 2. 乐观锁检查：只在明确提供版本号且大于0时才检查
		if version != nil && *version > 0 {
			expectedVersion, err := valueobject.NewRecordVersion(int64(*version))
			if err != nil {
				return pkgerrors.ErrValidationFailed.WithMessage("无效的版本号").WithDetails(map[string]interface{}{
					"version": *version,
				})
			}
			if record.HasChangedSince(expectedVersion) {
				return pkgerrors.ErrConflict.WithMessage("记录已被其他用户修改，请刷新后重试").WithDetails(map[string]interface{}{
					"expected_version": *version,
					"current_version":  record.Version().Value(),
				})
			}
		}

		// 3. ✅ 关键修复：将字段名转换为字段ID（如果请求数据使用字段名）
		// 因为 record 数据使用字段ID作为键，而请求可能使用字段名
		logger.Info("🔵 开始字段名转换",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID),
			logger.Any("update_data", updateData))
		convertedUpdateData, err := s.convertFieldNamesToIDs(txCtx, tableID, updateData)
		if err != nil {
			logger.Warn("字段名转换失败，使用原始数据",
				logger.String("table_id", tableID),
				logger.String("record_id", recordID),
				logger.ErrorField(err))
			convertedUpdateData = updateData // 如果转换失败，使用原始数据
		} else {
			logger.Info("✅ 字段名转换完成",
				logger.String("table_id", tableID),
				logger.String("record_id", recordID),
				logger.Any("converted_data", convertedUpdateData))
		}

		// 4. ✅ 关键修复：清理 record.data 中的冗余键（字段名或字段ID）
		// 在合并前清理，确保不会同时存在字段名和字段ID
		oldData := record.Data().ToMap()
		logger.Info("🔵 开始清理冗余键",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID),
			logger.Int("old_data_keys", len(oldData)),
			logger.Int("new_data_keys", len(convertedUpdateData)))
		
		cleanedOldData, err := s.cleanRedundantKeys(txCtx, tableID, oldData, convertedUpdateData)
		if err != nil {
			logger.Warn("清理冗余键失败，使用原始数据",
				logger.String("table_id", tableID),
				logger.String("record_id", recordID),
				logger.ErrorField(err))
			cleanedOldData = oldData // 如果清理失败，使用原始数据
		} else {
			logger.Info("✅ 清理冗余键完成",
				logger.String("table_id", tableID),
				logger.String("record_id", recordID),
				logger.Int("old_data_keys", len(oldData)),
				logger.Int("cleaned_data_keys", len(cleanedOldData)))
			
			// 如果清理了数据，需要更新 record.data
			if len(cleanedOldData) != len(oldData) {
				cleanedRecordData, err := valueobject.NewRecordData(cleanedOldData)
				if err != nil {
					logger.Warn("创建清理后的记录数据失败，使用原始数据",
						logger.String("table_id", tableID),
						logger.String("record_id", recordID),
						logger.ErrorField(err))
				} else {
					// 更新 record 的数据（不递增版本号，因为这只是清理操作）
					record = entity.ReconstructRecord(
						record.ID(),
						record.TableID(),
						cleanedRecordData,
						record.Version(),
						record.CreatedBy(),
						record.UpdatedBy(),
						record.CreatedAt(),
						record.UpdatedAt(),
						record.DeletedAt(),
					)
					logger.Info("✅ 已更新 record.data（清理冗余键后）",
						logger.String("table_id", tableID),
						logger.String("record_id", recordID))
				}
			}
		}

		// 5. 识别变化的字段（用于智能重算）
		// 使用清理后的数据进行比较
		changedFieldIDs := s.identifyChangedFields(cleanedOldData, convertedUpdateData)

		// 6. 创建新数据
		newData, err := valueobject.NewRecordData(convertedUpdateData)
		if err != nil {
			return pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("记录数据无效: %v", err))
		}

		// 7. 更新记录（会递增版本号）
		if err := record.Update(newData, userID); err != nil {
			return pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("更新记录失败: %v", err))
		}

		// 8. ✨ 处理 Link 字段变更（在事务内，保存之前）
		if s.linkService != nil {
			linkCellContexts := s.extractLinkCellContexts(tableID, recordID, oldData, convertedUpdateData)
			if len(linkCellContexts) > 0 {
				derivation, err := s.linkService.GetDerivateByLink(txCtx, tableID, linkCellContexts)
				if err != nil {
					logger.Error("Link 字段处理失败（回滚事务）",
						logger.String("record_id", recordID),
						logger.ErrorField(err))
					return err
				}
				if derivation != nil {
					// ✅ 对称字段的更新已在 linkService.updateSymmetricFields 中通过 applySymmetricFieldUpdates 应用
					// 这里只需要记录日志
					logger.Info("Link 字段衍生变更已应用",
						logger.String("record_id", recordID),
						logger.Int("cell_changes", len(derivation.CellChanges)))
					for _, cellChange := range derivation.CellChanges {
						logger.Debug("Link 字段衍生变更",
							logger.String("table_id", cellChange.TableID),
							logger.String("record_id", cellChange.RecordID),
							logger.String("field_id", cellChange.FieldID))
					}
				}
				logger.Info("Link 字段处理成功（事务中）✨",
					logger.String("record_id", recordID),
					logger.Int("link_changes", len(linkCellContexts)))
			}
		}

		// 7. ✨ 智能重算受影响的虚拟字段（在事务内，保存之前）
		if s.calculationService != nil && len(changedFieldIDs) > 0 {
			if err := s.calculationService.CalculateAffectedFields(txCtx, record, changedFieldIDs); err != nil {
				logger.Error("受影响字段重算失败（回滚事务）",
					logger.String("record_id", recordID),
					logger.Int("changed_fields", len(changedFieldIDs)),
					logger.ErrorField(err))
				return err
			}
			logger.Info("受影响字段重算成功（事务中）✨",
				logger.String("record_id", recordID),
				logger.Int("changed_fields", len(changedFieldIDs)))
		}

		// 8. 保存（在事务中，包含计算后的字段）
		// 注意：record.Update()已经递增了版本，但Save会用旧版本做乐观锁检查
		if err := s.recordRepo.Save(txCtx, record); err != nil {
			return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("保存记录失败: %v", err))
		}

		logger.Info("记录更新成功（事务中）", logger.String("record_id", recordID))

		// 9. ✅ 收集事件（不立即发送）
		finalFields = record.Data().ToMap()
		event := &database.RecordEvent{
			EventType:  "record.update",
			TID:        record.TableID(),
			RID:        recordID,
			Fields:     finalFields,
			UserID:     userID,
			OldVersion: record.Version().Value() - 1,
			NewVersion: record.Version().Value(),
		}
		database.AddEventToTx(txCtx, event)

		// 10. ✨ 添加事务提交后回调（发布 WebSocket 事件）
		database.AddTxCallback(txCtx, func() {
			s.publishRecordEvent(event)
		})

		// 11. ✨ 添加事务提交后回调（更新 Link 字段标题）
		// ✅ 关键修复：无论是否更新了 Link 字段，只要更新了源记录，都应该检查是否有其他记录引用它
		// 因为源记录的字段值可能已经改变，需要更新引用它的 Link 字段的 title
		if s.linkTitleUpdateService != nil {
			// ✅ 验证事务上下文
			txContext := database.GetTxContext(txCtx)
			if txContext == nil {
				logger.Warn("⚠️ 不在事务上下文中，Link 字段标题更新回调可能无法执行",
					logger.String("table_id", tableID),
					logger.String("record_id", recordID))
			} else {
				logger.Info("✅ 事务上下文验证成功，准备注册 Link 字段标题更新回调",
					logger.String("table_id", tableID),
					logger.String("record_id", recordID),
					logger.String("tx_id", txContext.ID))
			}
			
			// 记录回调注册
			logger.Info("🔧 正在注册 Link 字段标题更新回调",
				logger.String("table_id", tableID),
				logger.String("record_id", recordID))
			
			// ✅ 关键修复：在事务提交后，重新从数据库查询最新的记录数据
			// 因为 record 对象可能包含的是更新前的数据，或者数据格式不完整
			database.AddTxCallback(txCtx, func() {
				// ✅ 添加调试日志：记录回调执行
				logger.Info("🔵 开始执行 Link 字段标题更新回调",
					logger.String("table_id", tableID),
					logger.String("record_id", recordID))
				
				// ✅ 关键修复：在事务提交后，重新从数据库查询最新的记录数据
				// 确保获取到最新的字段值
				ctx := context.Background()
				recordIDVO := valueobject.NewRecordID(recordID)
				latestRecord, err := s.recordRepo.FindByTableAndID(ctx, tableID, recordIDVO)
				if err != nil {
					logger.Error("重新查询记录失败，使用原始记录数据",
						logger.String("table_id", tableID),
						logger.String("record_id", recordID),
						logger.ErrorField(err))
					latestRecord = record // 如果查询失败，使用原始记录
				} else if latestRecord == nil {
					logger.Warn("重新查询记录为空，使用原始记录数据",
						logger.String("table_id", tableID),
						logger.String("record_id", recordID))
					latestRecord = record // 如果查询为空，使用原始记录
				} else {
					logger.Info("✅ 重新查询记录成功，使用最新记录数据",
						logger.String("table_id", tableID),
						logger.String("record_id", recordID),
						logger.Any("latest_record_data", latestRecord.Data().ToMap()))
				}
				
				// 在事务提交后更新 Link 字段的 title
				if err := s.linkTitleUpdateService.UpdateLinkTitlesForRecord(
					ctx,
					tableID,
					recordID,
					latestRecord, // ✅ 使用最新查询的记录
				); err != nil {
					logger.Error("❌ 更新 Link 字段标题失败",
						logger.String("table_id", tableID),
						logger.String("record_id", recordID),
						logger.ErrorField(err))
					// 不中断主流程，只记录错误
				} else {
					logger.Info("✅ Link 字段标题更新回调执行成功",
						logger.String("table_id", tableID),
						logger.String("record_id", recordID))
				}
			})
		} else {
			logger.Warn("⚠️ linkTitleUpdateService 为 nil，跳过 Link 字段标题更新",
				logger.String("table_id", tableID),
				logger.String("record_id", recordID))
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	logger.Info("记录更新完成，事件将在事务提交后发布",
		logger.String("record_id", recordID))

	return dto.FromRecordEntity(record), nil
}

// extractLinkCellContexts 提取 Link 字段的变更上下文
func (s *RecordService) extractLinkCellContexts(
	tableID string,
	recordID string,
	oldData map[string]interface{},
	newData map[string]interface{},
) []tableService.LinkCellContext {
	contexts := make([]tableService.LinkCellContext, 0)

	// 收集所有变更的字段
	allFieldIDs := make(map[string]bool)
	for fieldID := range oldData {
		allFieldIDs[fieldID] = true
	}
	for fieldID := range newData {
		allFieldIDs[fieldID] = true
	}

	// 检查每个字段是否为 Link 字段
	for fieldID := range allFieldIDs {
		oldValue := oldData[fieldID]
		newValue := newData[fieldID]

		// 检查值是否变化
		if s.isLinkCellValue(oldValue) || s.isLinkCellValue(newValue) {
			contexts = append(contexts, tableService.LinkCellContext{
				RecordID: recordID,
				FieldID:  fieldID,
				OldValue: oldValue,
				NewValue: newValue,
			})
		}
	}

	return contexts
}

// isLinkCellValue 判断是否为 Link 单元格值
func (s *RecordService) isLinkCellValue(value interface{}) bool {
	if value == nil {
		return false
	}

	// 检查是否为单个 LinkCellValue
	if m, ok := value.(map[string]interface{}); ok {
		if id, exists := m["id"]; exists && id != nil {
			return true
		}
	}

	// 检查是否为 LinkCellValue 数组
	if arr, ok := value.([]interface{}); ok {
		for _, item := range arr {
			if m, ok := item.(map[string]interface{}); ok {
				if id, exists := m["id"]; exists && id != nil {
					return true
				}
			}
		}
	}

	return false
}

// validateRequiredFields 验证必填字段
// 返回 nil 表示验证通过，返回 AppError 表示验证失败
func (s *RecordService) validateRequiredFields(ctx context.Context, tableID string, data map[string]interface{}) error {
	// 1. 获取表的所有字段
	fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("获取字段列表失败: %v", err))
	}

	// 2. 检查每个必填字段
	missingFields := make([]map[string]string, 0)
	for _, field := range fields {
		// 跳过计算字段（只读，不需要用户提供）
		if field.IsComputed() {
			continue
		}

		// 检查是否为必填字段
		if !field.IsRequired() {
			continue
		}

		fieldID := field.ID().String()
		fieldName := field.Name().String()

		// 检查字段是否在数据中
		value, exists := data[fieldID]
		if !exists {
			// 尝试通过字段名查找
			value, exists = data[fieldName]
		}

		// 检查值是否为空
		if !exists || value == nil || value == "" {
			missingFields = append(missingFields, map[string]string{
				"id":   fieldID,
				"name": fieldName,
			})
		}
	}

	if len(missingFields) > 0 {
		return pkgerrors.ErrFieldRequired.WithDetails(map[string]interface{}{
			"missing_fields": missingFields,
			"message":        fmt.Sprintf("必填字段缺失，共 %d 个", len(missingFields)),
		})
	}

	return nil
}

// convertFieldNamesToIDs 将字段名转换为字段ID
// 如果 updateData 中的键是字段名（如 "name"），则转换为字段ID（如 "fld_xxx"）
// 如果已经是字段ID，则保持不变
// 增强版：添加更详细的日志，确保转换过程可追踪
func (s *RecordService) convertFieldNamesToIDs(ctx context.Context, tableID string, updateData map[string]interface{}) (map[string]interface{}, error) {
	if updateData == nil || len(updateData) == 0 {
		logger.Info("convertFieldNamesToIDs: 输入数据为空，直接返回",
			logger.String("table_id", tableID))
		return updateData, nil
	}

	logger.Info("🔵 convertFieldNamesToIDs: 开始字段名转换",
		logger.String("table_id", tableID),
		logger.Int("input_keys_count", len(updateData)),
		logger.Any("input_keys", func() []string {
			keys := make([]string, 0, len(updateData))
			for k := range updateData {
				keys = append(keys, k)
			}
			return keys
		}()))

	// 检查键的类型（字段名还是字段ID）
	fieldIDKeys := make([]string, 0)
	fieldNameKeys := make([]string, 0)
	unknownKeys := make([]string, 0)
	
	for key := range updateData {
		if strings.HasPrefix(key, "fld_") {
			fieldIDKeys = append(fieldIDKeys, key)
		} else {
			fieldNameKeys = append(fieldNameKeys, key)
		}
	}

	logger.Info("🔵 convertFieldNamesToIDs: 键类型分析",
		logger.String("table_id", tableID),
		logger.Int("field_id_keys_count", len(fieldIDKeys)),
		logger.Strings("field_id_keys", fieldIDKeys),
		logger.Int("field_name_keys_count", len(fieldNameKeys)),
		logger.Strings("field_name_keys", fieldNameKeys),
		logger.Int("unknown_keys_count", len(unknownKeys)),
		logger.Strings("unknown_keys", unknownKeys))

	// 如果所有键都是字段ID格式，直接返回
	if len(fieldIDKeys) > 0 && len(fieldNameKeys) == 0 {
		logger.Info("✅ convertFieldNamesToIDs: 所有键都是字段ID格式，无需转换",
			logger.String("table_id", tableID),
			logger.Int("field_id_keys_count", len(fieldIDKeys)))
		return updateData, nil
	}

	// 如果存在字段名，需要转换
	if len(fieldNameKeys) > 0 {
		// 获取表的所有字段
		logger.Info("🔵 convertFieldNamesToIDs: 获取字段列表",
			logger.String("table_id", tableID))
		
		fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
		if err != nil {
			logger.Error("❌ convertFieldNamesToIDs: 获取字段列表失败",
				logger.String("table_id", tableID),
				logger.ErrorField(err))
			return nil, fmt.Errorf("获取字段列表失败: %w", err)
		}

		logger.Info("🔵 convertFieldNamesToIDs: 字段列表获取成功",
			logger.String("table_id", tableID),
			logger.Int("fields_count", len(fields)))

		// 构建字段名到字段ID的映射
		nameToID := make(map[string]string)
		for _, field := range fields {
			fieldName := field.Name().String()
			fieldID := field.ID().String()
			nameToID[fieldName] = fieldID
		}

		logger.Info("🔵 convertFieldNamesToIDs: 字段映射构建完成",
			logger.String("table_id", tableID),
			logger.Int("name_to_id_mapping_count", len(nameToID)))

		// 转换字段名为字段ID
		convertedData := make(map[string]interface{})
		convertedCount := 0
		notFoundKeys := make([]string, 0)
		
		// 先处理字段ID键（直接复制）
		for _, key := range fieldIDKeys {
			convertedData[key] = updateData[key]
		}
		
		// 再处理字段名键（需要转换）
		for _, key := range fieldNameKeys {
			value := updateData[key]
			// 如果是字段名，转换为字段ID
			if fieldID, exists := nameToID[key]; exists {
				convertedData[fieldID] = value
				convertedCount++
				logger.Info("✅ convertFieldNamesToIDs: 字段名转换为字段ID",
					logger.String("table_id", tableID),
					logger.String("field_name", key),
					logger.String("field_id", fieldID),
					logger.Any("value", value))
			} else {
				// 如果找不到对应的字段ID，可能是字段不存在
				// 保持原样，让后续逻辑处理
				convertedData[key] = value
				notFoundKeys = append(notFoundKeys, key)
				logger.Warn("⚠️ convertFieldNamesToIDs: 字段名未找到对应字段ID，保持原样",
					logger.String("table_id", tableID),
					logger.String("key", key),
					logger.Any("value", value))
			}
		}

		logger.Info("✅ convertFieldNamesToIDs: 字段名转换完成",
			logger.String("table_id", tableID),
			logger.Int("input_count", len(updateData)),
			logger.Int("converted_count", convertedCount),
			logger.Int("not_found_count", len(notFoundKeys)),
			logger.Strings("not_found_keys", notFoundKeys),
			logger.Int("output_count", len(convertedData)),
			logger.Any("converted_data", convertedData))

		return convertedData, nil
	}

	// 如果所有键都是未知格式，直接返回
	logger.Warn("⚠️ convertFieldNamesToIDs: 所有键都是未知格式，保持原样",
		logger.String("table_id", tableID),
		logger.Int("unknown_keys_count", len(unknownKeys)))
	return updateData, nil
}

// identifyChangedFields 识别变化的字段ID列表
func (s *RecordService) identifyChangedFields(oldData map[string]interface{}, newData map[string]interface{}) []string {
	changed := make([]string, 0)

	// 检查所有新数据中的字段
	for fieldID, newValue := range newData {
		oldValue, exists := oldData[fieldID]

		// 字段不存在或值发生变化
		if !exists || !s.isValueEqual(oldValue, newValue) {
			changed = append(changed, fieldID)
		}
	}

	return changed
}

// isValueEqual 比较两个值是否相等（简化版）
func (s *RecordService) isValueEqual(a, b interface{}) bool {
	// 简化比较：使用fmt.Sprintf转字符串比较
	// 实际项目中可以使用reflect.DeepEqual或更精确的比较
	return fmt.Sprintf("%v", a) == fmt.Sprintf("%v", b)
}

// cleanRedundantKeys 清理冗余的字段名/字段ID键
// 如果新数据使用字段ID，删除旧数据中对应的字段名
// 如果新数据使用字段名，删除旧数据中对应的字段ID
// 返回清理后的数据映射
func (s *RecordService) cleanRedundantKeys(
	ctx context.Context,
	tableID string,
	oldData map[string]interface{},
	newData map[string]interface{},
) (map[string]interface{}, error) {
	if oldData == nil || len(oldData) == 0 {
		return oldData, nil
	}

	// 获取表的所有字段，构建字段名和字段ID的映射
	fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return nil, fmt.Errorf("获取字段列表失败: %w", err)
	}

	// 构建字段名到字段ID的映射
	nameToID := make(map[string]string)
	// 构建字段ID到字段名的映射
	idToName := make(map[string]string)
	for _, field := range fields {
		fieldName := field.Name().String()
		fieldID := field.ID().String()
		nameToID[fieldName] = fieldID
		idToName[fieldID] = fieldName
	}

	// 创建清理后的数据副本
	cleanedData := make(map[string]interface{})
	for k, v := range oldData {
		cleanedData[k] = v
	}

	// 统计清理的键
	cleanedKeys := make([]string, 0)

	// 检查新数据使用的键类型
	for newKey := range newData {
		// 如果新数据使用字段ID（fld_开头）
		if strings.HasPrefix(newKey, "fld_") {
			// 删除旧数据中对应的字段名
			if fieldName, exists := idToName[newKey]; exists {
				if _, hasFieldName := cleanedData[fieldName]; hasFieldName {
					delete(cleanedData, fieldName)
					cleanedKeys = append(cleanedKeys, fieldName)
					logger.Info("清理冗余键：删除字段名（新数据使用字段ID）",
						logger.String("field_id", newKey),
						logger.String("field_name", fieldName))
				}
			}
		} else {
			// 如果新数据使用字段名
			// 删除旧数据中对应的字段ID
			if fieldID, exists := nameToID[newKey]; exists {
				if _, hasFieldID := cleanedData[fieldID]; hasFieldID {
					delete(cleanedData, fieldID)
					cleanedKeys = append(cleanedKeys, fieldID)
					logger.Info("清理冗余键：删除字段ID（新数据使用字段名）",
						logger.String("field_name", newKey),
						logger.String("field_id", fieldID))
				}
			}
		}
	}

	if len(cleanedKeys) > 0 {
		logger.Info("✅ 清理冗余键完成",
			logger.String("table_id", tableID),
			logger.Int("cleaned_count", len(cleanedKeys)),
			logger.Strings("cleaned_keys", cleanedKeys),
			logger.Int("old_data_keys", len(oldData)),
			logger.Int("cleaned_data_keys", len(cleanedData)))
	}

	return cleanedData, nil
}

// DeleteRecord 删除记录 ✨ 事务版
// ✅ 对齐 Teable：所有记录操作都需要 tableID
func (s *RecordService) DeleteRecord(ctx context.Context, tableID, recordID string) error {
	// ✅ 在事务中执行所有操作
	err := database.Transaction(ctx, s.recordRepo.(*infraRepository.RecordRepositoryDynamic).GetDB(), nil, func(txCtx context.Context) error {
		id := valueobject.NewRecordID(recordID)

		// 1. 先获取记录信息（使用 tableID）
		record, err := s.recordRepo.FindByTableAndID(txCtx, tableID, id)
		if err != nil {
			return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找记录失败: %v", err))
		}
		if record == nil {
			return pkgerrors.ErrNotFound.WithDetails("记录不存在")
		}

		// 2. ✅ 清理 Link 字段引用（在删除记录前）
		if err := s.cleanupLinkReferences(txCtx, tableID, recordID); err != nil {
			logger.Warn("清理 Link 字段引用失败（不影响记录删除）",
				logger.String("table_id", tableID),
				logger.String("record_id", recordID),
				logger.ErrorField(err))
			// 注意：清理失败不影响记录删除，只记录警告
		}

		// 3. 删除记录（使用 tableID）
		if err := s.recordRepo.DeleteByTableAndID(txCtx, tableID, id); err != nil {
			return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("删除记录失败: %v", err))
		}

		logger.Info("记录删除成功（事务中）", logger.String("record_id", recordID))

		// 4. ✅ 收集事件（不立即发送）
		event := &database.RecordEvent{
			EventType: "record.delete",
			TID:       tableID,
			RID:       recordID,
			Fields:    record.Data().ToMap(), // 保存删除前的数据
		}
		database.AddEventToTx(txCtx, event)

		// 5. ✨ 添加事务提交后回调（发布 WebSocket 事件）
		database.AddTxCallback(txCtx, func() {
			s.publishRecordEvent(event)
		})

		return nil
	})

	if err != nil {
		return err
	}

	logger.Info("记录删除完成，事件将在事务提交后发布",
		logger.String("record_id", recordID))

	return nil
}

// cleanupLinkReferences 清理 Link 字段引用
// 当删除记录时，需要从所有引用该记录的 Link 字段中移除该记录的引用
func (s *RecordService) cleanupLinkReferences(ctx context.Context, tableID, recordID string) error {
	// 1. 查找所有指向该表的 Link 字段
	linkFields, err := s.fieldRepo.FindLinkFieldsToTable(ctx, tableID)
	if err != nil {
		return fmt.Errorf("查找 Link 字段失败: %w", err)
	}

	if len(linkFields) == 0 {
		return nil // 没有 Link 字段引用该表
	}

	logger.Info("开始清理 Link 字段引用",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID),
		logger.Int("link_field_count", len(linkFields)))

	// 2. 对每个 Link 字段，查找包含该记录引用的所有记录
	for _, linkField := range linkFields {
		linkTableID := linkField.TableID()
		
		// 查找包含该记录引用的所有记录
		referencingRecordIDs, err := s.recordRepo.(*infraRepository.RecordRepositoryDynamic).FindRecordsByLinkValue(
			ctx, linkTableID, linkField.ID().String(), []string{recordID})
		if err != nil {
			logger.Warn("查找引用记录失败",
				logger.String("link_field_id", linkField.ID().String()),
				logger.String("link_table_id", linkTableID),
				logger.ErrorField(err))
			continue
		}

		if len(referencingRecordIDs) == 0 {
			continue // 没有记录引用该记录
		}

		// 3. 从这些记录的 Link 字段中移除该记录的引用
		// 使用 jsonb_set 或 jsonb 操作符来更新 JSONB 字段
		for _, refRecordID := range referencingRecordIDs {
			if err := s.removeLinkReference(ctx, linkTableID, refRecordID, linkField.ID().String(), recordID); err != nil {
				logger.Warn("移除 Link 引用失败",
					logger.String("link_field_id", linkField.ID().String()),
					logger.String("link_table_id", linkTableID),
					logger.String("ref_record_id", refRecordID),
					logger.String("record_id", recordID),
					logger.ErrorField(err))
				// 继续处理其他记录，不中断
			}
		}
	}

	logger.Info("Link 字段引用清理完成",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID))

	return nil
}

// removeLinkReference 从 Link 字段中移除指定记录的引用
func (s *RecordService) removeLinkReference(ctx context.Context, tableID, recordID, fieldID, linkedRecordID string) error {
	// 获取表信息
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取表信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("表不存在: %s", tableID)
	}

	// 获取字段信息
	fieldIDVO := fieldValueObject.NewFieldID(fieldID)
	field, err := s.fieldRepo.FindByID(ctx, fieldIDVO)
	if err != nil {
		return fmt.Errorf("获取字段信息失败: %w", err)
	}
	if field == nil {
		return fmt.Errorf("字段不存在: %s", fieldID)
	}

	dbFieldName := field.DBFieldName().String()
	if dbFieldName == "" {
		return fmt.Errorf("字段的 DBFieldName 为空: %s", fieldID)
	}

	baseID := table.BaseID()
	fullTableName := fmt.Sprintf("%s.%s", baseID, tableID)

	// 使用 PostgreSQL 的 jsonb_set 函数移除引用
	// 对于数组格式：[{"id": "rec_xxx"}, ...] -> 移除包含该 id 的元素
	// 对于单个对象格式：{"id": "rec_xxx"} -> 设置为 NULL
	updateSQL := fmt.Sprintf(`
		UPDATE %s
		SET %s = CASE
			WHEN jsonb_typeof(%s) = 'array' THEN
				(SELECT jsonb_agg(elem) FROM jsonb_array_elements(%s) AS elem WHERE elem->>'id' != $1)
			WHEN %s->>'id' = $1 THEN NULL
			ELSE %s
		END,
		__last_modified_time = CURRENT_TIMESTAMP,
		__version = __version + 1
		WHERE __id = $2
	`, 
		fmt.Sprintf(`"%s"`, fullTableName),
		fmt.Sprintf(`"%s"`, dbFieldName),
		fmt.Sprintf(`"%s"`, dbFieldName),
		fmt.Sprintf(`"%s"`, dbFieldName),
		fmt.Sprintf(`"%s"`, dbFieldName),
		fmt.Sprintf(`"%s"`, dbFieldName),
	)

	// 执行更新
	db := s.recordRepo.(*infraRepository.RecordRepositoryDynamic).GetDB()
	if err := db.WithContext(ctx).Exec(updateSQL, linkedRecordID, recordID).Error; err != nil {
		return fmt.Errorf("更新 Link 字段失败: %w", err)
	}

	return nil
}

// ListRecords 列出表格的所有记录
func (s *RecordService) ListRecords(ctx context.Context, tableID string, limit, offset int) ([]*dto.RecordResponse, int64, error) {
	// 构建过滤器
	filter := recordRepo.RecordFilter{
		TableID: &tableID,
		Limit:   limit,
		Offset:  offset,
	}

	if filter.Limit == 0 {
		filter.Limit = 100 // 默认限制
	}

	// 查询记录列表
	records, total, err := s.recordRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查询记录列表失败: %v", err))
	}

	// ✅ 优化：批量预加载字段，避免N+1查询
	// 一次性获取所有字段，然后在计算时复用
	if s.calculationService != nil && len(records) > 0 {
		logger.Info("开始计算记录列表的虚拟字段",
			logger.String("table_id", tableID),
			logger.Int("record_count", len(records)))

		// 预加载字段（只查询一次）
		fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
		if err != nil {
			logger.Warn("预加载字段失败，跳过虚拟字段计算",
				logger.String("table_id", tableID),
				logger.ErrorField(err))
		} else {
			// 批量计算所有记录的虚拟字段（使用预加载的字段）
			for _, record := range records {
				if err := s.calculationService.CalculateRecordFieldsWithFields(ctx, record, fields); err != nil {
					logger.Warn("计算记录虚拟字段失败",
						logger.String("record_id", record.ID().String()),
						logger.ErrorField(err))
					// 不中断整个列表，继续处理其他记录
				}
			}

			logger.Info("记录列表虚拟字段计算完成",
				logger.String("table_id", tableID),
				logger.Int("record_count", len(records)),
				logger.Int("fields_count", len(fields)))
		}
	}

	// 转换为 DTO
	return dto.FromRecordEntities(records), total, nil
}

// BatchCreateRecords 批量创建记录（严格遵守：返回AppError）
func (s *RecordService) BatchCreateRecords(ctx context.Context, tableID string, req dto.BatchCreateRecordRequest, userID string) (*dto.BatchCreateRecordResponse, error) {
	// ✅ 允许空数组：直接返回成功响应
	if len(req.Records) == 0 {
		return &dto.BatchCreateRecordResponse{
			Records:      []*dto.RecordResponse{},
			SuccessCount: 0,
			FailedCount:  0,
			Errors:       []string{},
		}, nil
	}

	successRecords := make([]*dto.RecordResponse, 0, len(req.Records))
	errorsList := make([]string, 0)

	// 遍历每条记录进行创建
	for i, item := range req.Records {
		// ✅ 对齐单条创建逻辑：使用 typecast service 验证和转换数据
		validatedData, err := s.typecastService.ValidateAndTypecastRecord(ctx, tableID, item.Fields, true)
		if err != nil {
			errorsList = append(errorsList, fmt.Sprintf("记录%d数据验证失败: %v", i+1, err))
			continue
		}

		// 创建记录数据值对象（使用验证后的数据）
		recordData, err := valueobject.NewRecordData(validatedData)
		if err != nil {
			errorsList = append(errorsList, fmt.Sprintf("记录%d数据无效: %v", i+1, err))
			continue
		}

		// 创建记录实体
		record, err := entity.NewRecord(tableID, recordData, userID)
		if err != nil {
			errorsList = append(errorsList, fmt.Sprintf("记录%d创建失败: %v", i+1, err))
			continue
		}

		// 保存记录
		if err := s.recordRepo.Save(ctx, record); err != nil {
			errorsList = append(errorsList, fmt.Sprintf("记录%d保存失败: %v", i+1, err))
			continue
		}

		// ✨ 自动计算虚拟字段（对齐单条创建逻辑）
		if s.calculationService != nil {
			if err := s.calculationService.CalculateRecordFields(ctx, record); err != nil {
				logger.Warn("记录虚拟字段计算失败（不影响创建）",
					logger.String("record_id", record.ID().String()),
					logger.Int("record_index", i+1),
					logger.ErrorField(err),
				)
				// 计算失败不影响记录创建，继续
			}
		}

		// 添加到成功列表
		successRecords = append(successRecords, dto.FromRecordEntity(record))
	}

	logger.Info("批量创建记录完成",
		logger.String("table_id", tableID),
		logger.Int("total", len(req.Records)),
		logger.Int("success", len(successRecords)),
		logger.Int("failed", len(errorsList)),
	)

	return &dto.BatchCreateRecordResponse{
		Records:      successRecords,
		SuccessCount: len(successRecords),
		FailedCount:  len(errorsList),
		Errors:       errorsList,
	}, nil
}

// BatchUpdateRecords 批量更新记录（严格遵守：返回AppError）
// ✨ 修复：使用事务并调用 UpdateLinkTitlesForRecord
func (s *RecordService) BatchUpdateRecords(ctx context.Context, tableID string, req dto.BatchUpdateRecordRequest, userID string) (*dto.BatchUpdateRecordResponse, error) {
	successRecords := make([]*dto.RecordResponse, 0, len(req.Records))
	errorsList := make([]string, 0)

	// ✨ 使用事务批量更新，确保每条记录都触发 Link 字段更新
	// 获取数据库连接（从 recordRepo 获取，支持 CachedRecordRepository）
	var db *gorm.DB
	if cachedRepo, ok := s.recordRepo.(*infraRepository.CachedRecordRepository); ok {
		// 如果是 CachedRecordRepository，获取底层的数据库连接
		db = cachedRepo.GetDB()
	} else if dynamicRepo, ok := s.recordRepo.(*infraRepository.RecordRepositoryDynamic); ok {
		// 如果是 RecordRepositoryDynamic，直接获取数据库连接
		db = dynamicRepo.GetDB()
	} else {
		// 如果都不支持，返回错误
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails("无法获取数据库连接")
	}
	
	// ✨ 使用事务批量更新，确保每条记录都触发 Link 字段更新
	// 注意：批量更新时，即使某些记录失败，也要继续处理其他记录
	// 因此，我们需要在事务中捕获错误，但不中断事务
	err := database.Transaction(ctx, db, nil, func(txCtx context.Context) error {
		// 遍历每条记录进行更新
		for i, item := range req.Records {
			// 查找记录（使用 tableID）
			id := valueobject.NewRecordID(item.ID)
			records, findErr := s.recordRepo.FindByIDs(txCtx, tableID, []valueobject.RecordID{id})
			if findErr != nil {
				logger.Warn("批量更新：记录查找失败",
					logger.String("table_id", tableID),
					logger.String("record_id", item.ID),
					logger.ErrorField(findErr))
				errorsList = append(errorsList, fmt.Sprintf("记录%s查找失败: %v", item.ID, findErr))
				continue
			}
			if len(records) == 0 {
				logger.Warn("批量更新：记录不存在",
					logger.String("table_id", tableID),
					logger.String("record_id", item.ID))
				errorsList = append(errorsList, fmt.Sprintf("记录%s不存在", item.ID))
				continue
			}
			record := records[0]

			// 创建新数据
			newData, dataErr := valueobject.NewRecordData(item.Fields)
			if dataErr != nil {
				logger.Warn("批量更新：记录数据无效",
					logger.String("table_id", tableID),
					logger.String("record_id", item.ID),
					logger.ErrorField(dataErr))
				errorsList = append(errorsList, fmt.Sprintf("记录%d数据无效: %v", i+1, dataErr))
				continue
			}

			// 更新记录
			if updateErr := record.Update(newData, userID); updateErr != nil {
				logger.Warn("批量更新：记录更新失败",
					logger.String("table_id", tableID),
					logger.String("record_id", item.ID),
					logger.ErrorField(updateErr))
				errorsList = append(errorsList, fmt.Sprintf("记录%s更新失败: %v", item.ID, updateErr))
				continue
			}

			// 保存（在事务中）
			// 注意：如果保存失败，这会导致事务回滚，所以我们需要捕获错误
			if saveErr := s.recordRepo.Save(txCtx, record); saveErr != nil {
				logger.Error("批量更新：记录保存失败（将导致事务回滚）",
					logger.String("table_id", tableID),
					logger.String("record_id", item.ID),
					logger.ErrorField(saveErr))
				errorsList = append(errorsList, fmt.Sprintf("记录%s保存失败: %v", item.ID, saveErr))
				// 保存失败会导致事务回滚，但我们仍然记录错误并继续处理
				// 注意：如果这里返回错误，整个事务会回滚
				// 为了批量更新的容错性，我们继续处理，但最终如果所有记录都失败，事务会回滚
				continue
			}

			// ✨ 添加事务提交后回调（更新 Link 字段标题）
			if s.linkTitleUpdateService != nil {
				recordID := record.ID().String()
				database.AddTxCallback(txCtx, func() {
					// 在事务提交后更新 Link 字段的 title
					if err := s.linkTitleUpdateService.UpdateLinkTitlesForRecord(
						context.Background(), // 使用新的 context，因为事务已提交
						tableID,
						recordID,
						record,
					); err != nil {
						logger.Error("批量更新时更新 Link 字段标题失败",
							logger.String("table_id", tableID),
							logger.String("record_id", recordID),
							logger.ErrorField(err))
						// 不中断主流程，只记录错误
					}
				})
			}

			// 添加到成功列表
			successRecords = append(successRecords, dto.FromRecordEntity(record))
		}

		// 如果所有记录都失败了，返回错误以触发回滚
		// 否则，即使部分记录失败，也提交事务（部分成功）
		if len(successRecords) == 0 && len(errorsList) > 0 {
			logger.Error("批量更新：所有记录都失败，事务将回滚",
				logger.String("table_id", tableID),
				logger.Int("total", len(req.Records)),
				logger.Int("failed", len(errorsList)))
			return fmt.Errorf("所有记录更新失败: %v", errorsList[0])
		}

		// 部分成功或全部成功，提交事务
		logger.Info("批量更新：事务将提交",
			logger.String("table_id", tableID),
			logger.Int("total", len(req.Records)),
			logger.Int("success", len(successRecords)),
			logger.Int("failed", len(errorsList)))
		return nil
	})

	if err != nil {
		logger.Error("批量更新记录事务失败",
			logger.String("table_id", tableID),
			logger.ErrorField(err))
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("批量更新记录失败: %v", err))
	}

	logger.Info("批量更新记录完成",
		logger.String("table_id", tableID),
		logger.Int("total", len(req.Records)),
		logger.Int("success", len(successRecords)),
		logger.Int("failed", len(errorsList)),
	)

	return &dto.BatchUpdateRecordResponse{
		Records:      successRecords,
		SuccessCount: len(successRecords),
		FailedCount:  len(errorsList),
		Errors:       errorsList,
	}, nil
}

// BatchDeleteRecords 批量删除记录（严格遵守：返回AppError）
func (s *RecordService) BatchDeleteRecords(ctx context.Context, tableID string, req dto.BatchDeleteRecordRequest) (*dto.BatchDeleteRecordResponse, error) {
	errorsList := make([]string, 0)
	successCount := 0

	// 遍历每条记录进行删除（使用 tableID）
	for _, recordID := range req.RecordIDs {
		id := valueobject.NewRecordID(recordID)

		// 删除记录（使用 tableID）
		if err := s.recordRepo.DeleteByTableAndID(ctx, tableID, id); err != nil {
			errorsList = append(errorsList, fmt.Sprintf("记录%s删除失败: %v", recordID, err))
			continue
		}

		successCount++
	}

	logger.Info("批量删除记录完成",
		logger.Int("total", len(req.RecordIDs)),
		logger.Int("success", successCount),
		logger.Int("failed", len(errorsList)),
	)

	return &dto.BatchDeleteRecordResponse{
		SuccessCount: successCount,
		FailedCount:  len(errorsList),
		Errors:       errorsList,
	}, nil
}

// publishRecordEvent 发布记录事件到 WebSocket
func (s *RecordService) publishRecordEvent(event *database.RecordEvent) {
	// 1. 发布到传统WebSocket广播器（保持向后兼容）
	if s.broadcaster != nil {
		switch event.EventType {
		case "record.create":
			s.broadcaster.BroadcastRecordCreate(event.TID, event.RID, event.Fields)
			logger.Info("WebSocket 事件已发布：创建",
				logger.String("table_id", event.TID),
				logger.String("record_id", event.RID))

		case "record.update":
			s.broadcaster.BroadcastRecordUpdate(event.TID, event.RID, event.Fields)
			logger.Info("WebSocket 事件已发布：更新",
				logger.String("table_id", event.TID),
				logger.String("record_id", event.RID),
				logger.Int64("version", event.NewVersion))

		case "record.delete":
			s.broadcaster.BroadcastRecordDelete(event.TID, event.RID)
			logger.Info("WebSocket 事件已发布：删除",
				logger.String("table_id", event.TID),
				logger.String("record_id", event.RID))

		default:
			logger.Warn("未知的事件类型",
				logger.String("event_type", event.EventType))
		}
	}

	// 2. 发布到ShareDB（实时协作）
	if s.shareDBService != nil && event.EventType == "record.update" {
		// 创建ShareDB操作
		op := sharedb.OTOperation{
			"p": []interface{}{"data", event.Fields}, // 设置路径操作
		}

		// 广播ShareDB操作
		err := s.shareDBService.BroadcastOperation(event.TID, event.RID, []sharedb.OTOperation{op})
		if err != nil {
			logger.Error("ShareDB广播失败", logger.String("error", err.Error()))
		} else {
			logger.Info("✅ ShareDB操作已广播",
				logger.String("table_id", event.TID),
				logger.String("record_id", event.RID))
		}
	}

	// 2. 发布到 ShareDB 实时协作系统 ✨
	if s.shareDBService != nil {
		ctx := context.Background()
		collection := fmt.Sprintf("rec_%s", event.TID)
		docID := event.RID

		// 构建 Teable 风格的 ShareDB EditOp
		// 基于 Teable 的 IOtOperation 格式
		operations := make([]sharedb.OTOperation, 0)

		// 为每个字段变化创建 OT 操作
		// 注意：ShareDB 文档结构是 { data: { fieldId: value } }，所以路径应该是 ["data", fieldId]
		for fieldId, fieldValue := range event.Fields {
			operation := sharedb.OTOperation{
				"p":  []interface{}{"data", fieldId}, // path: ["data", fieldId] - 与前端 submitFieldUpdate 保持一致
				"oi": fieldValue,                       // object insert: new value
			}
			operations = append(operations, operation)
		}

		// 转换为 opbuilder.Operation 类型
		opBuilderOp := &opbuilder.Operation{
			Path:     []interface{}{operations},
			OldValue: nil,
			NewValue: nil,
			Type:     opbuilder.OpTypeSet,
		}

		// 发布到 ShareDB
		err := s.shareDBService.PublishOp(ctx, collection, docID, opBuilderOp)
		if err != nil {
			logger.Error("ShareDB 操作发布失败",
				logger.String("collection", collection),
				logger.String("doc_id", docID),
				logger.String("event_type", event.EventType),
				logger.ErrorField(err))
		} else {
			logger.Info("ShareDB 操作已发布",
				logger.String("collection", collection),
				logger.String("doc_id", docID),
				logger.String("event_type", event.EventType),
				logger.Int64("version", event.NewVersion),
				logger.Int("operations_count", len(operations)))
		}
	}

	// 3. 发布到统一业务事件系统（支持SSE、WebSocket、Yjs）
	if s.businessEvents != nil {
		ctx := context.Background()
		var businessEventType events.BusinessEventType

		switch event.EventType {
		case "record.create":
			businessEventType = events.BusinessEventTypeRecordCreate
		case "record.update":
			businessEventType = events.BusinessEventTypeRecordUpdate
		case "record.delete":
			businessEventType = events.BusinessEventTypeRecordDelete
		default:
			logger.Warn("未知的业务事件类型",
				logger.String("event_type", event.EventType))
			return
		}

		err := s.businessEvents.PublishRecordEvent(
			ctx,
			businessEventType,
			event.TID,
			event.RID,
			event.Fields,
			event.UserID,
			event.NewVersion,
		)

		if err != nil {
			logger.Error("发布业务事件失败",
				logger.String("event_type", string(businessEventType)),
				logger.String("table_id", event.TID),
				logger.String("record_id", event.RID),
				logger.ErrorField(err))
		} else {
			logger.Info("业务事件已发布",
				logger.String("event_type", string(businessEventType)),
				logger.String("table_id", event.TID),
				logger.String("record_id", event.RID),
				logger.Int64("version", event.NewVersion))
		}
	}
}

// SetShareDBService 设置 ShareDB 服务
func (s *RecordService) SetShareDBService(shareDBService *sharedb.ShareDBService) {
	s.shareDBService = shareDBService
}
