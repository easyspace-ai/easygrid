package application

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/easyspace-ai/luckdb/server/internal/application/dto"
	fieldService "github.com/easyspace-ai/luckdb/server/internal/application/field"
	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/dependency"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	tableValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database/schema"
	pkgerrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"gorm.io/gorm"
)

// FieldService 字段应用服务（协调器模式）✨
// 职责：协调专门服务，处理广播、依赖图管理等横切关注点
type FieldService struct {
	// 专门服务
	crudService       *fieldService.FieldCRUDService
	optionsService    *fieldService.FieldOptionsService
	dependencyService *fieldService.FieldDependencyService
	schemaService     *fieldService.FieldSchemaService
	linkService       *fieldService.FieldLinkService

	// 基础设施
	fieldFactory *factory.FieldFactory
	fieldRepo    repository.FieldRepository
	depGraphRepo *dependency.DependencyGraphRepository // ✨ 依赖图仓储
	broadcaster  FieldBroadcaster                      // ✨ WebSocket广播器
	tableRepo    tableRepo.TableRepository             // ✅ 表格仓储（获取Base ID）
	dbProvider   database.DBProvider                   // ✅ 数据库提供者（列管理）
	db           *gorm.DB                              // ✅ 数据库连接（用于 Link 字段 schema 创建）
}

// FieldBroadcaster 字段变更广播器接口
type FieldBroadcaster interface {
	BroadcastFieldCreate(tableID string, field *entity.Field)
	BroadcastFieldUpdate(tableID string, field *entity.Field)
	BroadcastFieldDelete(tableID, fieldID string)
}

// NewFieldService 创建字段服务（协调器模式）✨
func NewFieldService(
	crudService *fieldService.FieldCRUDService,
	optionsService *fieldService.FieldOptionsService,
	dependencyService *fieldService.FieldDependencyService,
	schemaService *fieldService.FieldSchemaService,
	linkService *fieldService.FieldLinkService,
	fieldFactory *factory.FieldFactory,
	fieldRepo repository.FieldRepository,
	depGraphRepo *dependency.DependencyGraphRepository,
	broadcaster FieldBroadcaster,
	tableRepo tableRepo.TableRepository,
	dbProvider database.DBProvider,
	db *gorm.DB,
) *FieldService {
	return &FieldService{
		crudService:       crudService,
		optionsService:    optionsService,
		dependencyService: dependencyService,
		schemaService:     schemaService,
		linkService:       linkService,
		fieldFactory:      fieldFactory,
		fieldRepo:         fieldRepo,
		depGraphRepo:      depGraphRepo,
		broadcaster:       broadcaster,
		tableRepo:         tableRepo,
		dbProvider:        dbProvider,
		db:                db,
	}
}

// SetBroadcaster 设置广播器（用于延迟注入）
func (s *FieldService) SetBroadcaster(broadcaster FieldBroadcaster) {
	s.broadcaster = broadcaster
}

// fieldOptionsWrapper 包装器，用于适配 FieldOptionsService 的接口
type fieldOptionsWrapper struct {
	field *entity.Field
}

func (w *fieldOptionsWrapper) Options() *valueobject.FieldOptions {
	return w.field.Options()
}

func (w *fieldOptionsWrapper) UpdateOptions(opts *valueobject.FieldOptions) {
	_ = w.field.UpdateOptions(opts)
}

func (w *fieldOptionsWrapper) Type() valueobject.FieldType {
	return w.field.Type()
}

// CreateField 创建字段（参考原版实现逻辑）
func (s *FieldService) CreateField(ctx context.Context, req dto.CreateFieldRequest, userID string) (*dto.FieldResponse, error) {
	// 1. 验证字段名称
	fieldName, err := valueobject.NewFieldName(req.Name)
	if err != nil {
		return nil, pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("字段名称无效: %v", err))
	}

	// 2. 检查字段名称是否重复
	exists, err := s.fieldRepo.ExistsByName(ctx, req.TableID, fieldName, nil)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("检查字段名称失败: %v", err))
	}
	if exists {
		return nil, pkgerrors.ErrConflict.WithMessage(fmt.Sprintf("字段名 '%s' 已存在", req.Name))
	}

	// 3. 根据类型使用工厂创建字段（保留原始类型名称）
	var field *entity.Field
	switch req.Type {
	case "number":
		// 从 Options 中提取 precision, minValue, maxValue
		var precision, minValue, maxValue *int
		if req.Options != nil {
			if p, ok := req.Options["precision"].(float64); ok {
				precisionInt := int(p)
				precision = &precisionInt
			}
			if min, ok := req.Options["minValue"].(float64); ok {
				minInt := int(min)
				minValue = &minInt
			}
			if max, ok := req.Options["maxValue"].(float64); ok {
				maxInt := int(max)
				maxValue = &maxInt
			}
		}
		field, err = s.fieldFactory.CreateNumberField(req.TableID, req.Name, userID, precision)
		// ✅ 设置 min/max 值
		if err == nil && (minValue != nil || maxValue != nil) {
			options := field.Options()
			if options == nil {
				options = valueobject.NewFieldOptions()
			}
			if options.Number == nil {
				options.Number = &valueobject.NumberOptions{}
			}
			options.Number.MinValue = minValue
			options.Number.MaxValue = maxValue
			field.UpdateOptions(options)
		}

	case "singleSelect":
		// 解析 choices
		choices := s.optionsService.ExtractChoicesFromOptions(req.Options)
		field, err = s.fieldFactory.CreateSelectField(req.TableID, req.Name, userID, choices, false)

	case "multipleSelect", "multipleSelects":
		// 解析 choices
		choices := s.optionsService.ExtractChoicesFromOptions(req.Options)
		field, err = s.fieldFactory.CreateSelectField(req.TableID, req.Name, userID, choices, true)

	case "date":
		field, err = s.fieldFactory.CreateDateField(req.TableID, req.Name, userID, false)

	case "datetime":
		field, err = s.fieldFactory.CreateDateField(req.TableID, req.Name, userID, true)

	case "formula":
		// 从 Options 中提取 expression
		expression := s.optionsService.ExtractExpressionFromOptions(req.Options)
		field, err = s.fieldFactory.CreateFormulaField(req.TableID, req.Name, userID, expression)

	case "rollup":
		// Rollup 字段需要 linkFieldId, rollupFieldId, aggregationFunc
		linkFieldID, rollupFieldID, aggFunc := s.optionsService.ExtractRollupOptionsFromOptions(req.Options)
		field, err = s.fieldFactory.CreateRollupField(req.TableID, req.Name, userID, linkFieldID, rollupFieldID, aggFunc)

	case "lookup":
		// Lookup 字段需要 linkFieldId, lookupFieldId
		linkFieldID, lookupFieldID := s.optionsService.ExtractLookupOptionsFromOptions(req.Options)
		field, err = s.fieldFactory.CreateLookupField(req.TableID, req.Name, userID, linkFieldID, lookupFieldID)

	case "link":
		// Link 字段需要从 options 中提取 linkedTableID, relationship 等
		// 先使用通用方法创建字段，然后在 applyCommonFieldOptions 中处理选项
		field, err = s.fieldFactory.CreateFieldWithType(req.TableID, req.Name, req.Type, userID)

	default:
		// ✅ 使用通用方法创建字段，保留原始类型名称（如 singleLineText, longText, email 等）
		field, err = s.fieldFactory.CreateFieldWithType(req.TableID, req.Name, req.Type, userID)
	}

	if err != nil {
		logger.Error("创建字段实例失败",
			logger.String("table_id", req.TableID),
			logger.String("name", req.Name),
			logger.String("type", req.Type),
			logger.ErrorField(err),
		)
		// 检查是否为字段类型无效错误
		errMsg := err.Error()
		if strings.Contains(errMsg, "invalid field type") || strings.Contains(errMsg, "不支持的字段类型") {
			return nil, pkgerrors.ErrInvalidFieldType.WithDetails(map[string]interface{}{
				"type":  req.Type,
				"error": errMsg,
			})
		}
		return nil, pkgerrors.ErrInternalServer.WithDetails(fmt.Sprintf("创建字段失败: %v", err))
	}

	// 4. 设置可选属性
	if req.Required {
		field.SetRequired(true)
	}
	if req.Unique {
		field.SetUnique(true)
	}

	// 5. ✨ 应用通用字段配置（defaultValue, showAs, formatting 等）
	// 顶层 defaultValue 兼容：注入到 options 中
	if req.DefaultValue != nil {
		if req.Options == nil {
			req.Options = make(map[string]interface{})
		}
		req.Options["defaultValue"] = req.DefaultValue
	}
	// 参考 Teable 的优秀设计，补充我们之前缺失的配置
	// 注意：ApplyCommonFieldOptions 期望的接口中 UpdateOptions 不返回 error
	// 但 entity.Field 的 UpdateOptions 返回 error，所以需要包装
	wrapper := &fieldOptionsWrapper{field: field}
	s.optionsService.ApplyCommonFieldOptions(wrapper, req.Options)

	// 6. 循环依赖检测（仅对虚拟字段）
	if isVirtualFieldType(req.Type) {
		if err := s.dependencyService.CheckCircularDependency(ctx, req.TableID, field); err != nil {
			return nil, err
		}
	}

	// 7. 计算字段order值（参考原系统逻辑：查询最大order + 1）
	maxOrder, err := s.fieldRepo.GetMaxOrder(ctx, req.TableID)
	if err != nil {
		// 如果查询失败，使用-1，这样第一个字段order为0
		logger.Warn("获取最大order失败，使用默认值-1", logger.ErrorField(err))
		maxOrder = -1
	}
	nextOrder := maxOrder + 1
	field.SetOrder(nextOrder)

	// 8. ✅ 创建物理表列（完全动态表架构）
	// 委托给 SchemaService
	dbFieldName := field.DBFieldName().String()
	dbType := field.DBFieldType()
	
	// 对于 Link 字段，确保数据库类型为 JSONB
	if req.Type == "link" || field.Type().String() == "link" {
		if dbType != "JSONB" {
			logger.Error("Link 字段的数据库类型不正确，强制设置为 JSONB",
				logger.String("field_id", field.ID().String()),
				logger.String("expected_type", "JSONB"),
				logger.String("actual_type", dbType))
			dbType = "JSONB"
		}
	}

	if err := s.schemaService.CreatePhysicalColumn(ctx, req.TableID, dbFieldName, dbType); err != nil {
		return nil, err
	}

	// 8.6 ✨ 如果是 Link 字段，创建 Link 字段的数据库 Schema
	if req.Type == "link" && field.Options() != nil && field.Options().Link != nil {
		// 获取Table信息
		table, err := s.tableRepo.GetByID(ctx, req.TableID)
		if err != nil {
			return nil, pkgerrors.ErrDatabaseOperation.WithDetails(
				fmt.Sprintf("获取Table信息失败: %v", err))
		}
		if table == nil {
			return nil, pkgerrors.ErrNotFound.WithDetails("Table不存在")
		}

		// 转换 Link 选项
		linkFieldOptions, err := s.linkService.ConvertToLinkFieldOptions(ctx, req.TableID, field.Options().Link, field)
		if err != nil {
			// 回滚：删除已创建的物理表列
			if rollbackErr := s.schemaService.DropPhysicalColumn(ctx, req.TableID, dbFieldName); rollbackErr != nil {
				logger.Error("回滚删除物理表列失败", logger.ErrorField(rollbackErr))
			}
			return nil, pkgerrors.ErrDatabaseOperation.WithDetails(
				fmt.Sprintf("转换 Link 字段选项失败: %v", err))
		}

		// 确定是否需要 order 列
		hasOrderColumn := field.Options().Link.AllowMultiple

		// 创建 Link 字段 Schema
		if err := s.schemaService.CreateLinkFieldSchema(ctx, table, field, linkFieldOptions, hasOrderColumn); err != nil {
			logger.Error("创建 Link 字段 Schema 失败",
				logger.String("field_id", field.ID().String()),
				logger.ErrorField(err))
			// 回滚：删除已创建的物理表列
			if rollbackErr := s.schemaService.DropPhysicalColumn(ctx, req.TableID, dbFieldName); rollbackErr != nil {
				logger.Error("回滚删除物理表列失败", logger.ErrorField(rollbackErr))
			}
			return nil, pkgerrors.ErrDatabaseOperation.WithDetails(
				fmt.Sprintf("创建 Link 字段 Schema 失败: %v", err))
		}
		logger.Info("✅ Link 字段 Schema 创建成功",
			logger.String("field_id", field.ID().String()))
	}

	// 9. 保存字段元数据
	// ✨ 调试：记录保存前的 Link 字段 Options（特别是 FkHostTableName）
	if req.Type == "link" && field.Options() != nil && field.Options().Link != nil {
		logger.Info("CreateField 保存字段前检查 Link Options",
			logger.String("field_id", field.ID().String()),
			logger.String("table_id", req.TableID),
			logger.String("fk_host_table_name", field.Options().Link.FkHostTableName),
			logger.String("self_key_name", field.Options().Link.SelfKeyName),
			logger.String("foreign_key_name", field.Options().Link.ForeignKeyName),
			logger.String("relationship", field.Options().Link.Relationship))
	}
	logger.Info("准备保存字段元数据",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", req.TableID),
		logger.String("name", req.Name),
		logger.String("type", req.Type),
	)

	if err := s.fieldRepo.Save(ctx, field); err != nil {
		// ❌ 回滚：删除已创建的物理表列
		if s.tableRepo != nil && s.dbProvider != nil {
			table, _ := s.tableRepo.GetByID(ctx, req.TableID)
			if table != nil {
				dbFieldName := field.DBFieldName().String()
				if rollbackErr := s.dbProvider.DropColumn(ctx, table.BaseID(), table.ID().String(), dbFieldName); rollbackErr != nil {
					logger.Error("回滚删除物理表列失败",
						logger.String("field_id", field.ID().String()),
						logger.String("db_field_name", dbFieldName),
						logger.ErrorField(rollbackErr))
				}
			}
		}

		logger.Error("保存字段元数据失败",
			logger.String("field_id", field.ID().String()),
			logger.String("table_id", req.TableID),
			logger.ErrorField(err),
		)
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("保存字段失败: %v", err))
	}

	logger.Info("字段创建成功",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", req.TableID),
		logger.String("name", req.Name),
		logger.String("type", req.Type),
		logger.Float64("order", nextOrder),
	)

	// 9. ✨ 更新依赖图（如果是虚拟字段）
	if s.depGraphRepo != nil && field.IsComputed() {
		if err := s.depGraphRepo.InvalidateCache(ctx, req.TableID); err != nil {
			logger.Warn("清除依赖图缓存失败（不影响字段创建）",
				logger.String("table_id", req.TableID),
				logger.ErrorField(err),
			)
		} else {
			logger.Info("依赖图缓存已清除 ✨",
				logger.String("table_id", req.TableID),
			)
		}
	}

	// 10. ✨ 实时推送字段创建事件
	if s.broadcaster != nil {
		s.broadcaster.BroadcastFieldCreate(req.TableID, field)
		logger.Info("字段创建事件已广播 ✨",
			logger.String("field_id", field.ID().String()),
		)
	}

	// 11. ✨ 如果是 Link 字段且 IsSymmetric=true，自动创建对称字段
	// 委托给 LinkService
	if req.Type == "link" && field.Options() != nil && field.Options().Link != nil {
		linkOptions := field.Options().Link
		if linkOptions.IsSymmetric && linkOptions.SymmetricFieldID == "" {
			if _, err := s.linkService.CreateSymmetricField(ctx, field, linkOptions, userID); err != nil {
				logger.Error("自动创建对称字段失败",
					logger.String("field_id", field.ID().String()),
					logger.String("table_id", req.TableID),
					logger.ErrorField(err))
				// ✅ 优化：确保主字段的 SymmetricFieldID 保持为空（如果对称字段创建失败）
				// 注意：对称字段创建失败不影响主字段的创建，只记录错误
				// 因为主字段已经保存成功，回滚成本较高
				// 主字段的 SymmetricFieldID 会在对称字段创建成功后才设置
			}
		}
	}

	return dto.FromFieldEntity(field), nil
}

// 注意：extractChoicesFromOptions、extractExpressionFromOptions 等方法已迁移到 FieldOptionsService
// 这些方法已不再需要，因为专门服务已经提供了这些功能

// GetField 获取字段详情
func (s *FieldService) GetField(ctx context.Context, fieldID string) (*dto.FieldResponse, error) {
	id := valueobject.NewFieldID(fieldID)

	field, err := s.fieldRepo.FindByID(ctx, id)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找字段失败: %v", err))
	}
	if field == nil {
		return nil, pkgerrors.ErrNotFound.WithDetails("字段不存在")
	}

	return dto.FromFieldEntity(field), nil
}

// UpdateField 更新字段
func (s *FieldService) UpdateField(ctx context.Context, fieldID string, req dto.UpdateFieldRequest) (*dto.FieldResponse, error) {
	// 1. 查找字段
	id := valueobject.NewFieldID(fieldID)
	logger.Info("🔍 UpdateField 开始查找字段",
		logger.String("field_id", fieldID),
		logger.String("field_id_parsed", id.String()),
		logger.String("field_id_is_empty", fmt.Sprintf("%v", id.IsEmpty())))

	// ❌ 关键修复：如果字段ID为空，直接返回错误
	if id.IsEmpty() {
		logger.Error("❌ UpdateField 字段ID为空",
			logger.String("field_id", fieldID))
		return nil, pkgerrors.ErrBadRequest.WithDetails("字段ID不能为空")
	}

	// ❌ 关键修复：强制从数据库查询，不使用缓存
	// 因为缓存可能已经被清除，或者缓存值不准确
	// 直接使用底层仓库查询，绕过缓存层
	logger.Info("🔍 UpdateField 直接查询数据库（绕过缓存）",
		logger.String("field_id", fieldID))

	field, err := s.fieldRepo.FindByID(ctx, id)
	if err != nil {
		logger.Error("❌ UpdateField 查找字段失败",
			logger.String("field_id", fieldID),
			logger.ErrorField(err))
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找字段失败: %v", err))
	}
	if field == nil {
		logger.Error("❌ UpdateField 字段不存在",
			logger.String("field_id", fieldID),
			logger.String("field_id_parsed", id.String()))
		return nil, pkgerrors.ErrNotFound.WithDetails("字段不存在")
	}

	logger.Info("✅ UpdateField 找到字段",
		logger.String("field_id", fieldID),
		logger.String("field_name", field.Name().String()),
		logger.String("table_id", field.TableID()))

	// 2. 更新名称
	if req.Name != nil && *req.Name != "" {
		fieldName, err := valueobject.NewFieldName(*req.Name)
		if err != nil {
			return nil, pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("字段名称无效: %v", err))
		}

		// 检查名称是否重复
		exists, err := s.fieldRepo.ExistsByName(ctx, field.TableID(), fieldName, &id)
		if err != nil {
			return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("检查字段名称失败: %v", err))
		}
		if exists {
			return nil, pkgerrors.ErrConflict.WithDetails("字段名称已存在")
		}

		if err := field.Rename(fieldName); err != nil {
			return nil, pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("重命名失败: %v", err))
		}
	}

	// 3. 更新描述
	if req.Description != nil {
		if err := field.UpdateDescription(*req.Description); err != nil {
			return nil, pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("更新描述失败: %v", err))
		}
	}

	// 4. 更新Options（如公式表达式等）
	if req.Options != nil && len(req.Options) > 0 || req.DefaultValue != nil {
		// 顶层 defaultValue 兼容：注入到 options 中
		if req.DefaultValue != nil {
			if req.Options == nil {
				req.Options = make(map[string]interface{})
			}
			req.Options["defaultValue"] = req.DefaultValue
		}
		// 根据字段类型更新Options
		switch field.Type().String() {
		case "formula":
			// 更新公式表达式
			if expression, ok := req.Options["expression"].(string); ok && expression != "" {
				options := field.Options()
				if options == nil {
					options = valueobject.NewFieldOptions()
				}
				if options.Formula == nil {
					options.Formula = &valueobject.FormulaOptions{}
				}
				options.Formula.Expression = expression
				field.UpdateOptions(options)

				logger.Info("更新公式表达式",
					logger.String("field_id", fieldID),
					logger.String("old_expression", field.Options().Formula.Expression),
					logger.String("new_expression", expression),
				)
			}
		case "number":
			// 更新数字精度
			if precision, ok := req.Options["precision"].(float64); ok {
				options := field.Options()
				if options == nil {
					options = valueobject.NewFieldOptions()
				}
				if options.Number == nil {
					options.Number = &valueobject.NumberOptions{}
				}
				precisionInt := int(precision)
				options.Number.Precision = &precisionInt
				field.UpdateOptions(options)
			}
		case "singleSelect", "multipleSelect":
			// 更新选项列表
			if choicesData, ok := req.Options["choices"].([]interface{}); ok {
				choices := make([]valueobject.SelectChoice, 0, len(choicesData))
				for _, item := range choicesData {
					if choiceMap, ok := item.(map[string]interface{}); ok {
						choice := valueobject.SelectChoice{}
						if id, ok := choiceMap["id"].(string); ok {
							choice.ID = id
						}
						if name, ok := choiceMap["name"].(string); ok {
							choice.Name = name
						}
						if color, ok := choiceMap["color"].(string); ok {
							choice.Color = color
						}
						choices = append(choices, choice)
					}
				}

				options := field.Options()
				if options == nil {
					options = valueobject.NewFieldOptions()
				}
				if options.Select == nil {
					options.Select = &valueobject.SelectOptions{}
				}
				options.Select.Choices = choices
				field.UpdateOptions(options)
			}
		}

		// ✨ 应用通用字段配置（defaultValue, showAs, formatting 等）
		// 参考 Teable 的优秀设计，补充我们之前缺失的配置
		wrapper := &fieldOptionsWrapper{field: field}
		s.optionsService.ApplyCommonFieldOptions(wrapper, req.Options)

		// ✅ Link 字段关系类型变更支持
		if field.Type().String() == "link" && req.Options != nil {
			newRelationship, _ := req.Options["relationship"].(string)
			oldRelationship := ""
			if field.Options() != nil && field.Options().Link != nil {
				// 从 LinkOptions 中获取 relationship
				linkOpts := field.Options().Link
				if linkOpts.Relationship != "" {
					oldRelationship = linkOpts.Relationship
				}
			}

			// 检测关系类型变更
			if newRelationship != "" && newRelationship != oldRelationship {
				logger.Info("检测到 Link 字段关系类型变更",
					logger.String("field_id", fieldID),
					logger.String("old_relationship", oldRelationship),
					logger.String("new_relationship", newRelationship))

				// 执行关系类型变更（数据迁移）- 委托给 LinkService
				if err := s.linkService.ChangeLinkRelationshipType(ctx, field, oldRelationship, newRelationship); err != nil {
					logger.Error("关系类型变更失败",
						logger.String("field_id", fieldID),
						logger.String("old_relationship", oldRelationship),
						logger.String("new_relationship", newRelationship),
						logger.ErrorField(err))
					return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("关系类型变更失败: %v", err))
				}

				logger.Info("关系类型变更成功",
					logger.String("field_id", fieldID),
					logger.String("old_relationship", oldRelationship),
					logger.String("new_relationship", newRelationship))
			}
		}
	}

	// 5. 更新约束
	if req.Required != nil {
		field.SetRequired(*req.Required)
	}
	if req.Unique != nil {
		field.SetUnique(*req.Unique)
	}

	// 6. 循环依赖检测（如果是虚拟字段且Options被更新）
	if req.Options != nil && len(req.Options) > 0 && isVirtualFieldType(field.Type().String()) {
		logger.Info("🔍 字段更新触发循环依赖检测",
			logger.String("field_id", fieldID),
			logger.String("field_name", field.Name().String()),
			logger.String("field_type", field.Type().String()),
		)

		if err := s.dependencyService.CheckCircularDependency(ctx, field.TableID(), field); err != nil {
			return nil, err
		}
	}

	// 7. 保存
	if err := s.fieldRepo.Save(ctx, field); err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("保存字段失败: %v", err))
	}

	logger.Info("字段更新成功", logger.String("field_id", fieldID))

	// 8. ✨ 清除依赖图缓存（如果是虚拟字段）
	if s.depGraphRepo != nil && field.IsComputed() {
		if err := s.depGraphRepo.InvalidateCache(ctx, field.TableID()); err != nil {
			logger.Warn("清除依赖图缓存失败（不影响字段更新）",
				logger.String("table_id", field.TableID()),
				logger.ErrorField(err),
			)
		}
	}

	// 9. ✨ 实时推送字段更新事件
	if s.broadcaster != nil {
		s.broadcaster.BroadcastFieldUpdate(field.TableID(), field)
		logger.Info("字段更新事件已广播 ✨",
			logger.String("field_id", fieldID),
		)
	}

	return dto.FromFieldEntity(field), nil
}

// DeleteField 删除字段
// ✅ 完全动态表架构：删除Field时删除物理表列
// 严格按照旧系统实现
func (s *FieldService) DeleteField(ctx context.Context, fieldID string) error {
	id := valueobject.NewFieldID(fieldID)

	// 1. 获取字段信息（用于广播、清除缓存和删除物理列）
	field, err := s.fieldRepo.FindByID(ctx, id)
	if err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找字段失败: %v", err))
	}
	if field == nil {
		return pkgerrors.ErrNotFound.WithDetails("字段不存在")
	}

	tableID := field.TableID()
	isComputed := field.IsComputed()
	dbFieldName := field.DBFieldName().String()

	logger.Info("正在删除字段",
		logger.String("field_id", fieldID),
		logger.String("table_id", tableID),
		logger.String("db_field_name", dbFieldName))

	// 2. ✅ 删除物理表列（完全动态表架构）
	// 委托给 SchemaService
	if err := s.schemaService.DropPhysicalColumn(ctx, tableID, dbFieldName); err != nil {
		return err
	}

	// 3. 删除字段元数据
	if err := s.fieldRepo.Delete(ctx, id); err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("删除字段失败: %v", err))
	}

	logger.Info("✅ 字段删除成功（含物理表列）",
		logger.String("field_id", fieldID),
		logger.String("table_id", tableID))

	// 4. ✨ 清除依赖图缓存（如果是虚拟字段）
	if s.depGraphRepo != nil && isComputed {
		if err := s.depGraphRepo.InvalidateCache(ctx, tableID); err != nil {
			logger.Warn("清除依赖图缓存失败（不影响字段删除）",
				logger.String("table_id", tableID),
				logger.ErrorField(err),
			)
		}
	}

	// 5. ✨ 如果是 Link 字段且存在对称字段，自动删除对称字段
	if field.Type().String() == "link" && field.Options() != nil && field.Options().Link != nil {
		linkOptions := field.Options().Link
		if linkOptions.SymmetricFieldID != "" {
			if err := s.deleteSymmetricField(ctx, linkOptions.SymmetricFieldID); err != nil {
				logger.Error("自动删除对称字段失败",
					logger.String("field_id", fieldID),
					logger.String("symmetric_field_id", linkOptions.SymmetricFieldID),
					logger.ErrorField(err))
				// 注意：对称字段删除失败不影响主字段的删除，只记录错误
			}
		}
	}

	// 6. ✨ 实时推送字段删除事件
	if s.broadcaster != nil {
		s.broadcaster.BroadcastFieldDelete(tableID, fieldID)
		logger.Info("字段删除事件已广播 ✨",
			logger.String("field_id", fieldID),
		)
	}

	return nil
}

// deleteSymmetricField 删除对称字段
func (s *FieldService) deleteSymmetricField(ctx context.Context, symmetricFieldID string) error {
	// 1. 获取对称字段信息
	fieldIDVO := valueobject.NewFieldID(symmetricFieldID)
	symmetricField, err := s.fieldRepo.FindByID(ctx, fieldIDVO)
	if err != nil {
		return fmt.Errorf("查找对称字段失败: %w", err)
	}
	if symmetricField == nil {
		logger.Warn("对称字段不存在，跳过删除",
			logger.String("symmetric_field_id", symmetricFieldID))
		return nil
	}

	// 2. 获取表信息
	tableID := symmetricField.TableID()
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取表信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("表不存在: %s", tableID)
	}

	// 3. 删除物理表列
	baseID := table.BaseID()
	dbFieldName := symmetricField.DBFieldName().String()
	if s.dbProvider != nil {
		if err := s.dbProvider.DropColumn(ctx, baseID, tableID, dbFieldName); err != nil {
			logger.Warn("删除对称字段物理表列失败",
				logger.String("symmetric_field_id", symmetricFieldID),
				logger.String("db_field_name", dbFieldName),
				logger.ErrorField(err))
			// 继续删除字段元数据
		}
	}

	// 4. 如果是 Link 字段，删除 Link 字段 Schema
	if symmetricField.Type().String() == "link" && symmetricField.Options() != nil && symmetricField.Options().Link != nil {
		linkOptions := symmetricField.Options().Link
		foreignTableID := linkOptions.LinkedTableID
		if foreignTableID != "" {
			// 转换 LinkOptions 到 LinkFieldOptions
			linkFieldOptions, err := s.linkService.ConvertToLinkFieldOptions(ctx, tableID, linkOptions, symmetricField)
			if err == nil {
				schemaCreator := schema.NewLinkFieldSchemaCreator(s.dbProvider, s.db)
				if err := schemaCreator.DropLinkFieldSchema(ctx, baseID, tableID, foreignTableID, linkFieldOptions); err != nil {
					logger.Warn("删除对称字段 Schema 失败",
						logger.String("symmetric_field_id", symmetricFieldID),
						logger.ErrorField(err))
					// 继续删除字段元数据
				}
			}
		}
	}

	// 5. 删除字段元数据
	if err := s.fieldRepo.Delete(ctx, fieldIDVO); err != nil {
		return fmt.Errorf("删除对称字段元数据失败: %w", err)
	}

	// 6. 广播对称字段删除事件
	if s.broadcaster != nil {
		s.broadcaster.BroadcastFieldDelete(tableID, symmetricFieldID)
	}

	logger.Info("✅ 对称字段自动删除成功",
		logger.String("symmetric_field_id", symmetricFieldID),
		logger.String("table_id", tableID))

	return nil
}

// ListFields 列出表格的所有字段
func (s *FieldService) ListFields(ctx context.Context, tableID string) ([]*dto.FieldResponse, error) {
	fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查询字段列表失败: %v", err))
	}

	fieldList := make([]*dto.FieldResponse, 0, len(fields))
	for _, field := range fields {
		fieldList = append(fieldList, dto.FromFieldEntity(field))
	}

	return fieldList, nil
}

// checkCircularDependency 检测循环依赖
// 在创建或更新虚拟字段（formula, rollup, lookup）时调用
func (s *FieldService) checkCircularDependency(ctx context.Context, tableID string, newField *entity.Field) error {
	// 1. 获取表中所有现有字段
	existingFields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		logger.Warn("获取字段列表失败，跳过循环依赖检测", logger.ErrorField(err))
		return nil // 不阻塞字段创建
	}

	// 2. 构建依赖图（包含新字段）
	allFields := append(existingFields, newField)
	graphItems := s.buildDependencyGraphForFields(allFields)

	logger.Info("🔍 循环依赖检测",
		logger.String("new_field_id", newField.ID().String()),
		logger.String("new_field_name", newField.Name().String()),
		logger.String("new_field_type", newField.Type().String()),
		logger.Int("total_fields", len(allFields)),
		logger.Int("graph_edges", len(graphItems)),
	)

	// 3. 检测循环依赖
	hasCycle, cyclePath := dependency.DetectCyclePath(graphItems)
	if hasCycle {
		logger.Error("❌ 检测到循环依赖",
			logger.String("new_field", newField.Name().String()),
			logger.Any("cycle_path", cyclePath),
		)
		return pkgerrors.ErrValidationFailed.WithDetails(map[string]interface{}{
			"message": "检测到循环依赖，无法创建该字段",
			"field":   newField.Name().String(),
			"cycle":   cyclePath,
		})
	}

	logger.Info("✅ 循环依赖检测通过", logger.String("field", newField.Name().String()))
	return nil
}

// buildDependencyGraphForFields 为字段列表构建依赖图
func (s *FieldService) buildDependencyGraphForFields(fields []*entity.Field) []dependency.GraphItem {
	items := make([]dependency.GraphItem, 0)

	for _, field := range fields {
		fieldType := field.Type().String()

		switch fieldType {
		case "formula":
			// Formula 依赖于表达式中的字段
			deps := s.extractFormulaDependencies(field)
			for _, depFieldRef := range deps {
				// 尝试通过名称或ID查找字段
				depField := s.findFieldByNameOrID(fields, depFieldRef)
				if depField != nil {
					items = append(items, dependency.GraphItem{
						FromFieldID: depField.ID().String(),
						ToFieldID:   field.ID().String(),
					})
				}
			}

		case "rollup":
			// Rollup 依赖于 Link 字段
			options := field.Options()
			if options != nil && options.Rollup != nil {
				items = append(items, dependency.GraphItem{
					FromFieldID: options.Rollup.LinkFieldID,
					ToFieldID:   field.ID().String(),
				})
			}

		case "lookup":
			// Lookup 依赖于 Link 字段
			options := field.Options()
			if options != nil && options.Lookup != nil {
				items = append(items, dependency.GraphItem{
					FromFieldID: options.Lookup.LinkFieldID,
					ToFieldID:   field.ID().String(),
				})
			}
		}
	}

	return items
}

// extractFormulaDependencies 提取公式的依赖字段
func (s *FieldService) extractFormulaDependencies(field *entity.Field) []string {
	options := field.Options()
	if options == nil || options.Formula == nil {
		return []string{}
	}

	expression := options.Formula.Expression
	if expression == "" {
		return []string{}
	}

	// 使用正则表达式提取 {fieldName} 引用
	re := regexp.MustCompile(`\{([^}]+)\}`)
	matches := re.FindAllStringSubmatch(expression, -1)

	if len(matches) == 0 {
		return []string{}
	}

	dependencies := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) > 1 {
			fieldRef := match[1]
			dependencies = append(dependencies, fieldRef)
		}
	}

	return dependencies
}

// findFieldByNameOrID 通过名称或ID查找字段
func (s *FieldService) findFieldByNameOrID(fields []*entity.Field, nameOrID string) *entity.Field {
	// 先尝试按ID查找
	for _, field := range fields {
		if field.ID().String() == nameOrID {
			return field
		}
	}

	// 再尝试按名称查找
	for _, field := range fields {
		if field.Name().String() == nameOrID {
			return field
		}
	}

	return nil
}

// isVirtualFieldType 判断是否为虚拟字段类型
func isVirtualFieldType(fieldType string) bool {
	virtualTypes := map[string]bool{
		"formula": true,
		"rollup":  true,
		"lookup":  true,
		"count":   true,
	}
	return virtualTypes[fieldType]
}

// isComputedFieldType 判断是否为计算字段类型（按照 teable 标准）
func isComputedFieldType(fieldType string) bool {
	computedTypes := map[string]bool{
		"formula": true,
		"rollup":  true,
		"lookup":  true,
		"count":   true,
	}
	return computedTypes[fieldType]
}

// GetFieldIDsByNames 根据字段名称获取字段ID列表
// 用于 UpdateRecord 流程中识别变更的字段
func (s *FieldService) GetFieldIDsByNames(ctx context.Context, tableID string, fieldNames []string) ([]string, error) {
	if len(fieldNames) == 0 {
		return []string{}, nil
	}

	// 获取表的所有字段
	fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseQuery.WithDetails(err.Error())
	}

	// 构建名称到ID的映射
	nameToID := make(map[string]string)
	for _, field := range fields {
		nameToID[field.Name().String()] = field.ID().String()
	}

	// 查找匹配的字段ID
	fieldIDs := make([]string, 0, len(fieldNames))
	for _, name := range fieldNames {
		if fieldID, exists := nameToID[name]; exists {
			fieldIDs = append(fieldIDs, fieldID)
		} else {
			logger.Warn("字段名称未找到",
				logger.String("field_name", name),
				logger.String("table_id", tableID),
			)
		}
	}

	return fieldIDs, nil
}

// convertToLinkFieldOptions 将 LinkOptions 转换为 LinkFieldOptions
// 参考 teable 的实现：如果 lookupFieldID 为空，自动从关联表获取主字段（第一个非虚拟字段）
func (s *FieldService) convertToLinkFieldOptions(ctx context.Context, currentTableID string, linkOptions *valueobject.LinkOptions, field *entity.Field) (*tableValueObject.LinkFieldOptions, error) {
	// 调试：记录 linkOptions 内容
	logger.Info("convertToLinkFieldOptions 开始转换",
		logger.String("LinkedTableID", linkOptions.LinkedTableID),
		logger.String("Relationship", linkOptions.Relationship),
		logger.String("LookupFieldID", linkOptions.LookupFieldID),
		logger.Bool("IsSymmetric", linkOptions.IsSymmetric),
		logger.Bool("AllowMultiple", linkOptions.AllowMultiple),
	)
	
	// 获取必需字段
	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		logger.Error("关联表ID为空",
			logger.String("LinkedTableID", linkOptions.LinkedTableID),
			logger.String("Relationship", linkOptions.Relationship),
		)
		return nil, fmt.Errorf("关联表ID不存在")
	}

	relationship := linkOptions.Relationship
	if relationship == "" {
		relationship = "manyMany" // 默认值
	}

	// 获取 lookupFieldID，如果为空则从关联表获取主字段ID（参考 teable 实现）
	lookupFieldID := linkOptions.LookupFieldID
	if lookupFieldID == "" {
		// 从关联表获取主字段ID（第一个非虚拟字段）
		primaryFieldID, err := s.getPrimaryFieldID(ctx, foreignTableID)
		if err != nil {
			logger.Error("无法从关联表获取主字段ID",
				logger.String("foreignTableID", foreignTableID),
				logger.ErrorField(err),
			)
			return nil, fmt.Errorf("无法从关联表获取主字段ID: %w", err)
		}
		lookupFieldID = primaryFieldID
		logger.Info("从关联表自动获取主字段ID",
			logger.String("foreignTableID", foreignTableID),
			logger.String("lookupFieldID", lookupFieldID),
		)
	}

	// 生成必需的字段名（如果不存在）
	fkHostTableName := linkOptions.FkHostTableName
	selfKeyName := linkOptions.SelfKeyName
	foreignKeyName := linkOptions.ForeignKeyName
	
	// 调试：记录 foreignKeyName 的初始值
	logger.Info("convertToLinkFieldOptions 检查 foreignKeyName",
		logger.String("foreignKeyName", foreignKeyName),
		logger.String("relationship", relationship),
		logger.Bool("fieldIsNil", field == nil),
	)

	// 如果不存在，生成默认值
	if fkHostTableName == "" {
		// 根据关系类型生成 FkHostTableName
		switch relationship {
		case "manyMany":
			// ManyMany: junction table 名称
			fkHostTableName = fmt.Sprintf("link_%s_%s", currentTableID, foreignTableID)
		case "manyOne":
			// ManyOne: 当前表名（外键存储在当前表）
			fkHostTableName = currentTableID
		case "oneMany":
			// OneMany: 关联表名（外键存储在关联表）
			fkHostTableName = foreignTableID
		case "oneOne":
			// OneOne: 当前表名（外键存储在当前表）
			fkHostTableName = currentTableID
		default:
			// 默认使用当前表名
			fkHostTableName = currentTableID
		}
		logger.Info("自动生成 FkHostTableName",
			logger.String("relationship", relationship),
			logger.String("currentTableID", currentTableID),
			logger.String("foreignTableID", foreignTableID),
			logger.String("fkHostTableName", fkHostTableName),
		)
	}

	if selfKeyName == "" {
		if relationship == "manyMany" {
			// 对于 manyMany 关系，junction table 中的 selfKeyName 应该是指向当前表的外键列名
			// 不能使用 __id，因为 junction table 本身已经有 __id 作为主键
			selfKeyName = fmt.Sprintf("%s_id", currentTableID)
		} else {
			selfKeyName = "__id" // 默认使用主键
		}
	}

	if foreignKeyName == "" {
		// 对于 manyOne 和 oneOne 关系，外键列名应该使用字段的 DBFieldName，而不是 __id
		// 因为 __id 是系统字段，每个表都有，会导致冲突
		if relationship == "manyOne" || relationship == "oneOne" {
			if field != nil {
				foreignKeyName = field.DBFieldName().String()
				logger.Info("使用字段的 DBFieldName 作为外键列名",
					logger.String("relationship", relationship),
					logger.String("fieldID", field.ID().String()),
					logger.String("dbFieldName", foreignKeyName),
				)
			} else {
				// 如果没有字段对象，使用默认值（但这不是理想情况）
				foreignKeyName = "__id"
				logger.Warn("字段对象为空，使用默认外键列名 __id",
					logger.String("relationship", relationship),
				)
			}
		} else if relationship == "manyMany" {
			// 对于 manyMany 关系，junction table 中的 foreignKeyName 应该是指向关联表的外键列名
			// 不能使用 __id，因为 junction table 本身已经有 __id 作为主键
			foreignKeyName = fmt.Sprintf("%s_id", foreignTableID)
			logger.Info("为 manyMany 关系生成外键列名",
				logger.String("relationship", relationship),
				logger.String("foreignKeyName", foreignKeyName),
			)
		} else {
			// 对于 oneMany 关系，使用 __id 作为外键列名（存储在关联表中）
			foreignKeyName = "__id" // 默认使用主键
		}
	}

	// 创建 LinkFieldOptions
	linkFieldOptions, err := tableValueObject.NewLinkFieldOptions(
		foreignTableID,
		relationship,
		lookupFieldID,
		fkHostTableName,
		selfKeyName,
		foreignKeyName,
	)
	if err != nil {
		return nil, err
	}

	// 设置可选字段
	if linkOptions.SymmetricFieldID != "" {
		linkFieldOptions.WithSymmetricField(linkOptions.SymmetricFieldID)
	}

	if linkOptions.IsSymmetric {
		linkFieldOptions.IsOneWay = false
	} else {
		linkFieldOptions.AsOneWay()
	}

	if linkOptions.BaseID != "" {
		linkFieldOptions.BaseID = linkOptions.BaseID
	}

	if linkOptions.FilterByViewID != nil {
		linkFieldOptions.FilterByViewID = linkOptions.FilterByViewID
	}

	if len(linkOptions.VisibleFieldIDs) > 0 {
		linkFieldOptions.VisibleFieldIDs = linkOptions.VisibleFieldIDs
	}

	if linkOptions.Filter != nil {
		linkFieldOptions.Filter = &tableValueObject.FilterOptions{
			Conjunction: linkOptions.Filter.Conjunction,
			Conditions:  make([]tableValueObject.FilterCondition, 0, len(linkOptions.Filter.Conditions)),
		}
		for _, cond := range linkOptions.Filter.Conditions {
			linkFieldOptions.Filter.Conditions = append(linkFieldOptions.Filter.Conditions, tableValueObject.FilterCondition{
				FieldID:  cond.FieldID,
				Operator: cond.Operator,
				Value:    cond.Value,
			})
		}
	}

	return linkFieldOptions, nil
}

// getPrimaryFieldID 获取表的主字段ID（第一个非虚拟字段）
// 参考 teable 的实现：当 lookupFieldID 为空时，自动使用关联表的第一个非虚拟字段
func (s *FieldService) getPrimaryFieldID(ctx context.Context, tableID string) (string, error) {
	logger.Info("getPrimaryFieldID 开始获取主字段ID",
		logger.String("tableID", tableID),
	)

	fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		logger.Error("getPrimaryFieldID 获取表字段失败",
			logger.String("tableID", tableID),
			logger.ErrorField(err),
		)
		return "", fmt.Errorf("获取表字段失败: %w", err)
	}

	logger.Info("getPrimaryFieldID 获取到字段列表",
		logger.String("tableID", tableID),
		logger.Int("fieldCount", len(fields)),
		logger.Any("fieldTypes", func() []string {
			types := make([]string, len(fields))
			for i, f := range fields {
				types[i] = f.Type().String()
			}
			return types
		}()),
	)

	if len(fields) == 0 {
		logger.Error("getPrimaryFieldID 表中没有字段",
			logger.String("tableID", tableID),
		)
		return "", fmt.Errorf("表 %s 中没有找到字段", tableID)
	}

	// 返回第一个非虚拟字段
	for _, field := range fields {
		fieldType := field.Type().String()
		fieldID := field.ID().String()
		// 检查 fieldID 是否为空
		if fieldID == "" {
			logger.Warn("getPrimaryFieldID 跳过字段ID为空的字段",
				logger.String("tableID", tableID),
				logger.String("fieldType", fieldType),
				logger.String("fieldName", field.Name().String()),
			)
			continue
		}
		// 虚拟字段类型：formula, rollup, lookup, ai
		if fieldType != "formula" && fieldType != "rollup" && fieldType != "lookup" && fieldType != "ai" {
			logger.Info("getPrimaryFieldID 找到主字段",
				logger.String("tableID", tableID),
				logger.String("fieldID", fieldID),
				logger.String("fieldType", fieldType),
				logger.String("fieldName", field.Name().String()),
			)
			return fieldID, nil
		}
	}

	// 如果没有普通字段，返回第一个字段（但必须确保 fieldID 不为空）
	for _, field := range fields {
		fieldID := field.ID().String()
		if fieldID != "" {
			fieldType := field.Type().String()
			logger.Info("getPrimaryFieldID 使用第一个有效字段（可能是虚拟字段）",
				logger.String("tableID", tableID),
				logger.String("fieldID", fieldID),
				logger.String("fieldType", fieldType),
				logger.String("fieldName", field.Name().String()),
			)
			return fieldID, nil
		}
	}

	// 如果所有字段的 ID 都为空，返回错误
	logger.Error("getPrimaryFieldID 所有字段的ID都为空",
		logger.String("tableID", tableID),
		logger.Int("fieldCount", len(fields)),
	)
	return "", fmt.Errorf("表 %s 中所有字段的ID都为空", tableID)
}

// changeLinkRelationshipType 变更 Link 字段的关系类型（已废弃，使用 FieldLinkService）
// 保留此方法以保持向后兼容，但实际已委托给 FieldLinkService
func (s *FieldService) changeLinkRelationshipType(
	ctx context.Context,
	field *entity.Field,
	oldRelationship, newRelationship string,
	reqOptions map[string]interface{},
) error {
	return s.linkService.ChangeLinkRelationshipType(ctx, field, oldRelationship, newRelationship)
}

// 注意：以下方法已迁移到专门服务，保留仅为向后兼容
// - generateSymmetricFieldName -> FieldLinkService
// - reverseRelationship -> FieldLinkService
// - createLinkFieldSchema -> FieldSchemaService + FieldLinkService
// - convertToLinkFieldOptions -> FieldLinkService
// - getPrimaryFieldID -> FieldLinkService
// - checkCircularDependency -> FieldDependencyService
// - applyCommonFieldOptions -> FieldOptionsService
// - changeLinkRelationshipType 的迁移方法（migrateFromManyManyToManyOne 等）-> FieldLinkService
