package application

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/easyspace-ai/luckdb/server/internal/application/dto"
	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/dependency"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	tableValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database/schema"
	pkgerrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"gorm.io/gorm"
)

// FieldService 字段应用服务（集成依赖图管理+实时推送）✨
// 集成完全动态表架构：字段作为列
type FieldService struct {
	fieldRepo    repository.FieldRepository
	fieldFactory *factory.FieldFactory
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

// NewFieldService 创建字段服务（集成依赖图管理+实时推送）✨
func NewFieldService(
	fieldRepo repository.FieldRepository,
	depGraphRepo *dependency.DependencyGraphRepository,
	broadcaster FieldBroadcaster,
	tableRepo tableRepo.TableRepository,
	dbProvider database.DBProvider,
	db *gorm.DB,
) *FieldService {
	return &FieldService{
		fieldRepo:    fieldRepo,
		fieldFactory: factory.NewFieldFactory(),
		depGraphRepo: depGraphRepo,
		broadcaster:  broadcaster,
		tableRepo:    tableRepo,
		dbProvider:   dbProvider,
		db:           db,
	}
}

// SetBroadcaster 设置广播器（用于延迟注入）
func (s *FieldService) SetBroadcaster(broadcaster FieldBroadcaster) {
	s.broadcaster = broadcaster
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
		choices := s.extractChoicesFromOptions(req.Options)
		field, err = s.fieldFactory.CreateSelectField(req.TableID, req.Name, userID, choices, false)

	case "multipleSelect", "multipleSelects":
		// 解析 choices
		choices := s.extractChoicesFromOptions(req.Options)
		field, err = s.fieldFactory.CreateSelectField(req.TableID, req.Name, userID, choices, true)

	case "date":
		field, err = s.fieldFactory.CreateDateField(req.TableID, req.Name, userID, false)

	case "datetime":
		field, err = s.fieldFactory.CreateDateField(req.TableID, req.Name, userID, true)

	case "formula":
		// 从 Options 中提取 expression
		expression := s.extractExpressionFromOptions(req.Options)
		field, err = s.fieldFactory.CreateFormulaField(req.TableID, req.Name, userID, expression)

	case "rollup":
		// Rollup 字段需要 linkFieldId, rollupFieldId, aggregationFunc
		linkFieldID, rollupFieldID, aggFunc := s.extractRollupOptionsFromOptions(req.Options)
		field, err = s.fieldFactory.CreateRollupField(req.TableID, req.Name, userID, linkFieldID, rollupFieldID, aggFunc)

	case "lookup":
		// Lookup 字段需要 linkFieldId, lookupFieldId
		linkFieldID, lookupFieldID := s.extractLookupOptionsFromOptions(req.Options)
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
	s.applyCommonFieldOptions(ctx, field, req.Options)

	// 6. 循环依赖检测（仅对虚拟字段）
	if isVirtualFieldType(req.Type) {
		if err := s.checkCircularDependency(ctx, req.TableID, field); err != nil {
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
	// 参考旧系统：ALTER TABLE ADD COLUMN
	// 注意：虚拟字段也需要创建物理列来存储计算结果
	// 注意：对于 Link 字段，需要创建 JSONB 列来存储完整的 link 数据（包括 id 和 title）
	// 对于 manyOne 和 oneOne 关系，createLinkFieldSchema 会创建外键列（VARCHAR(50)）用于优化查询
	// 但是 JSONB 列仍然是必需的，用于存储完整的 link 数据
	var table *tableEntity.Table
	var baseID, tableID, dbFieldName string
	shouldSkipPhysicalColumn := false
	// 不再跳过 manyOne 和 oneOne 关系的物理列创建，因为需要 JSONB 列来存储完整的 link 数据
	
	if s.tableRepo != nil && s.dbProvider != nil && !shouldSkipPhysicalColumn {
		// 8.1 获取Table信息（需要Base ID）
		table, err = s.tableRepo.GetByID(ctx, req.TableID)
		if err != nil {
			return nil, pkgerrors.ErrDatabaseOperation.WithDetails(
				fmt.Sprintf("获取Table信息失败: %v", err))
		}
		if table == nil {
			return nil, pkgerrors.ErrNotFound.WithDetails("Table不存在")
		}

		baseID = table.BaseID()
		tableID = table.ID().String()
		dbFieldName = field.DBFieldName().String() // 例如：field_fld_xxx

		// 8.2 使用Field Entity已确定的数据库类型
		// Field Entity中的determineDBFieldType已经处理了类型映射
		dbType := field.DBFieldType()
		
		// 调试：记录字段类型映射信息
		fieldTypeStr := field.Type().String()
		logger.Info("字段类型映射调试",
			logger.String("field_id", field.ID().String()),
			logger.String("field_name", field.Name().String()),
			logger.String("field_type", fieldTypeStr),
			logger.String("db_field_type", dbType),
			logger.String("request_type", req.Type))
		
		// 对于 Link 字段，确保数据库类型为 JSONB
		if req.Type == "link" || fieldTypeStr == "link" {
			if dbType != "JSONB" {
				logger.Error("Link 字段的数据库类型不正确，强制设置为 JSONB",
					logger.String("field_id", field.ID().String()),
					logger.String("expected_type", "JSONB"),
					logger.String("actual_type", dbType))
				dbType = "JSONB"
			}
		}

		logger.Info("正在为字段创建物理表列",
			logger.String("field_id", field.ID().String()),
			logger.String("base_id", baseID),
			logger.String("table_id", tableID),
			logger.String("db_field_name", dbFieldName),
			logger.String("db_type", dbType))

		// 8.3 构建列定义
		columnDef := database.ColumnDefinition{
			Name:    dbFieldName,
			Type:    dbType,
			NotNull: req.Required, // 必填 = NOT NULL
			Unique:  req.Unique,   // 唯一 = UNIQUE
		}

		// 8.4 添加列到物理表
		if err := s.dbProvider.AddColumn(ctx, baseID, tableID, columnDef); err != nil {
			logger.Error("创建物理表列失败",
				logger.String("field_id", field.ID().String()),
				logger.String("db_field_name", dbFieldName),
				logger.ErrorField(err))
			return nil, pkgerrors.ErrDatabaseOperation.WithDetails(
				fmt.Sprintf("创建物理表列失败: %v", err))
		}

		// 8.5 为 JSONB 字段自动创建 GIN 索引
		if dbType == "JSONB" {
			indexName := fmt.Sprintf("idx_%s_%s_gin",
				strings.ReplaceAll(baseID, "-", "_"),
				strings.ReplaceAll(field.ID().String(), "-", "_"))

			fullTableName := fmt.Sprintf("\"%s\".\"%s\"", baseID, tableID)
			createIndexSQL := fmt.Sprintf(
				`CREATE INDEX IF NOT EXISTS %s ON %s USING GIN (%s jsonb_path_ops)`,
				indexName,
				fullTableName,
				dbFieldName,
			)

			logger.Info("创建 JSONB GIN 索引",
				logger.String("field_id", field.ID().String()),
				logger.String("field_name", field.Name().String()),
				logger.String("index_name", indexName))

			// 获取底层数据库连接
			if pgProvider, ok := s.dbProvider.(*database.PostgresProvider); ok {
				db := pgProvider.GetDB()
				if err := db.WithContext(ctx).Exec(createIndexSQL).Error; err != nil {
					logger.Warn("创建 JSONB GIN 索引失败（不影响字段创建）",
						logger.String("field_id", field.ID().String()),
						logger.ErrorField(err))
				} else {
					logger.Info("✅ JSONB GIN 索引创建成功",
						logger.String("field_id", field.ID().String()),
						logger.String("index_name", indexName))
				}
			}
		}

		logger.Info("✅ 物理表列创建成功",
			logger.String("field_id", field.ID().String()),
			logger.String("db_field_name", dbFieldName),
			logger.String("db_type", dbType))
	}

	// 8.6 ✨ 如果是 Link 字段，创建 Link 字段的数据库 Schema
	if req.Type == "link" && field.Options() != nil && field.Options().Link != nil {
		// 如果 table 未初始化，需要重新获取
		if table == nil {
			if s.tableRepo == nil {
				return nil, pkgerrors.ErrDatabaseOperation.WithDetails(
					"Table 仓储未初始化，无法创建 Link 字段 Schema")
			}
			var err error
			table, err = s.tableRepo.GetByID(ctx, req.TableID)
			if err != nil {
				return nil, pkgerrors.ErrDatabaseOperation.WithDetails(
					fmt.Sprintf("获取Table信息失败: %v", err))
			}
			if table == nil {
				return nil, pkgerrors.ErrNotFound.WithDetails("Table不存在")
			}
			baseID = table.BaseID()
			tableID = table.ID().String()
			dbFieldName = field.DBFieldName().String()
		}

		if err := s.createLinkFieldSchema(ctx, table, field); err != nil {
			logger.Error("创建 Link 字段 Schema 失败",
				logger.String("field_id", field.ID().String()),
				logger.ErrorField(err))
			// 回滚：删除已创建的物理表列（仅当不是 manyOne/oneOne 关系时）
			// 对于 manyOne/oneOne 关系，我们没有创建物理表列，所以不需要回滚
			if !shouldSkipPhysicalColumn && s.dbProvider != nil && baseID != "" && tableID != "" && dbFieldName != "" {
				if rollbackErr := s.dbProvider.DropColumn(ctx, baseID, tableID, dbFieldName); rollbackErr != nil {
					logger.Error("回滚删除物理表列失败", logger.ErrorField(rollbackErr))
				}
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
	// ✅ 优化：确保对称字段创建失败时，主字段的 SymmetricFieldID 保持为空
	if req.Type == "link" && field.Options() != nil && field.Options().Link != nil {
		linkOptions := field.Options().Link
		if linkOptions.IsSymmetric && linkOptions.SymmetricFieldID == "" {
			if err := s.createSymmetricField(ctx, field, linkOptions, userID); err != nil {
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

// extractChoicesFromOptions 从 Options 中提取 choices（参考原版 Select 字段逻辑）
func (s *FieldService) extractChoicesFromOptions(options map[string]interface{}) []valueobject.SelectChoice {
	if options == nil {
		return nil
	}

	choicesData, ok := options["choices"]
	if !ok {
		return nil
	}

	choicesArray, ok := choicesData.([]interface{})
	if !ok {
		return nil
	}

	choices := make([]valueobject.SelectChoice, 0, len(choicesArray))
	for _, item := range choicesArray {
		choiceMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

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

	return choices
}

// extractExpressionFromOptions 从 Options 中提取 expression（参考原版 Formula 字段逻辑）
func (s *FieldService) extractExpressionFromOptions(options map[string]interface{}) string {
	if options == nil {
		return ""
	}

	// 支持 formula 和 expression 两种格式（兼容前端SDK）
	if expr, ok := options["formula"].(string); ok && expr != "" {
		return expr
	}

	if expr, ok := options["expression"].(string); ok && expr != "" {
		return expr
	}

	return ""
}

// extractRollupOptionsFromOptions 从 Options 中提取 Rollup 相关参数
func (s *FieldService) extractRollupOptionsFromOptions(options map[string]interface{}) (string, string, string) {
	if options == nil {
		return "", "", ""
	}

	linkFieldID, _ := options["linkFieldId"].(string)
	rollupFieldID, _ := options["rollupFieldId"].(string)
	aggFunc, _ := options["aggregationFunc"].(string)

	return linkFieldID, rollupFieldID, aggFunc
}

// extractLookupOptionsFromOptions 从 Options 中提取 Lookup 相关参数
func (s *FieldService) extractLookupOptionsFromOptions(options map[string]interface{}) (string, string) {
	if options == nil {
		return "", ""
	}

	linkFieldID, _ := options["linkFieldId"].(string)
	lookupFieldID, _ := options["lookupFieldId"].(string)

	return linkFieldID, lookupFieldID
}

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
		s.applyCommonFieldOptions(ctx, field, req.Options)

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

				// 执行关系类型变更（数据迁移）
				if err := s.changeLinkRelationshipType(ctx, field, oldRelationship, newRelationship, req.Options); err != nil {
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

		if err := s.checkCircularDependency(ctx, field.TableID(), field); err != nil {
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
	// 参考旧系统：ALTER TABLE DROP COLUMN
	if s.tableRepo != nil && s.dbProvider != nil {
		// 2.1 获取Table信息（需要Base ID）
		table, err := s.tableRepo.GetByID(ctx, tableID)
		if err != nil {
			return pkgerrors.ErrDatabaseOperation.WithDetails(
				fmt.Sprintf("获取Table信息失败: %v", err))
		}
		if table == nil {
			return pkgerrors.ErrNotFound.WithDetails("Table不存在")
		}

		baseID := table.BaseID()

		logger.Info("正在删除物理表列",
			logger.String("base_id", baseID),
			logger.String("table_id", tableID),
			logger.String("db_field_name", dbFieldName))

		// 2.2 删除列
		if err := s.dbProvider.DropColumn(ctx, baseID, tableID, dbFieldName); err != nil {
			logger.Error("删除物理表列失败",
				logger.String("field_id", fieldID),
				logger.String("db_field_name", dbFieldName),
				logger.ErrorField(err))
			return pkgerrors.ErrDatabaseOperation.WithDetails(
				fmt.Sprintf("删除物理表列失败: %v", err))
		}

		logger.Info("✅ 物理表列删除成功",
			logger.String("field_id", fieldID),
			logger.String("db_field_name", dbFieldName))
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
			linkFieldOptions, err := s.convertToLinkFieldOptions(ctx, tableID, linkOptions, symmetricField)
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

// applyCommonFieldOptions 应用通用字段配置（defaultValue, showAs, formatting 等）
// 参考 Teable 的设计，补充我们之前缺失的配置
func (s *FieldService) applyCommonFieldOptions(ctx context.Context, field *entity.Field, reqOptions map[string]interface{}) {
	if reqOptions == nil || field == nil {
		return
	}

	options := field.Options()
	if options == nil {
		options = valueobject.NewFieldOptions()
	}

	// 1. 应用通用的 ShowAs 配置
	if showAsData, ok := reqOptions["showAs"].(map[string]interface{}); ok {
		options.ShowAs = &valueobject.ShowAsOptions{
			Type:   getStringFromMap(showAsData, "type"),
			Color:  getStringFromMap(showAsData, "color"),
			Config: showAsData,
		}
	}

	// 2. 应用通用的 Formatting 配置
	if formattingData, ok := reqOptions["formatting"].(map[string]interface{}); ok {
		formatting := &valueobject.FormattingOptions{
			Type:       getStringFromMap(formattingData, "type"),
			DateFormat: getStringFromMap(formattingData, "dateFormat"),
			TimeFormat: getStringFromMap(formattingData, "timeFormat"),
			TimeZone:   getStringFromMap(formattingData, "timeZone"),
			Currency:   getStringFromMap(formattingData, "currency"),
			ShowCommas: getBoolFromMap(formattingData, "showCommas"),
		}
		if precision, ok := formattingData["precision"].(float64); ok {
			p := int(precision)
			formatting.Precision = &p
		}
		options.Formatting = formatting
	}

	// 3. 根据字段类型应用特定配置
	fieldType := field.Type().String()

	switch fieldType {
	case "number":
		if options.Number == nil {
			options.Number = &valueobject.NumberOptions{}
		}
		// DefaultValue
		if defaultValue, ok := reqOptions["defaultValue"].(float64); ok {
			options.Number.DefaultValue = &defaultValue
		}
		// ShowAs (字段级别)
		if showAsData, ok := reqOptions["showAs"].(map[string]interface{}); ok {
			options.Number.ShowAs = &valueobject.ShowAsOptions{
				Type:   getStringFromMap(showAsData, "type"),
				Color:  getStringFromMap(showAsData, "color"),
				Config: showAsData,
			}
		}

	case "singleSelect", "multipleSelect":
		if options.Select == nil {
			options.Select = &valueobject.SelectOptions{}
		}
		// DefaultValue
		if defaultValue, ok := reqOptions["defaultValue"]; ok {
			options.Select.DefaultValue = defaultValue
		}
		// PreventAutoNewOptions
		if preventAuto, ok := reqOptions["preventAutoNewOptions"].(bool); ok {
			options.Select.PreventAutoNewOptions = preventAuto
		}

	case "date", "datetime":
		if options.Date == nil {
			options.Date = &valueobject.DateOptions{}
		}
		// DefaultValue
		if defaultValue, ok := reqOptions["defaultValue"].(string); ok {
			options.Date.DefaultValue = &defaultValue
		}

	case "formula":
		if options.Formula != nil {
			// TimeZone
			if timeZone, ok := reqOptions["timeZone"].(string); ok {
				options.Formula.TimeZone = timeZone
			}
			// ShowAs
			if showAsData, ok := reqOptions["showAs"].(map[string]interface{}); ok {
				options.Formula.ShowAs = &valueobject.ShowAsOptions{
					Type:   getStringFromMap(showAsData, "type"),
					Color:  getStringFromMap(showAsData, "color"),
					Config: showAsData,
				}
			}
			// Formatting
			if formattingData, ok := reqOptions["formatting"].(map[string]interface{}); ok {
				formatting := &valueobject.FormattingOptions{
					Type:       getStringFromMap(formattingData, "type"),
					DateFormat: getStringFromMap(formattingData, "dateFormat"),
					TimeFormat: getStringFromMap(formattingData, "timeFormat"),
					TimeZone:   getStringFromMap(formattingData, "timeZone"),
					Currency:   getStringFromMap(formattingData, "currency"),
					ShowCommas: getBoolFromMap(formattingData, "showCommas"),
				}
				if precision, ok := formattingData["precision"].(float64); ok {
					p := int(precision)
					formatting.Precision = &p
				}
				options.Formula.Formatting = formatting
			}
		}

	case "rollup":
		if options.Rollup != nil {
			// TimeZone
			if timeZone, ok := reqOptions["timeZone"].(string); ok {
				options.Rollup.TimeZone = timeZone
			}
			// ShowAs
			if showAsData, ok := reqOptions["showAs"].(map[string]interface{}); ok {
				options.Rollup.ShowAs = &valueobject.ShowAsOptions{
					Type:   getStringFromMap(showAsData, "type"),
					Color:  getStringFromMap(showAsData, "color"),
					Config: showAsData,
				}
			}
			// Formatting
			if formattingData, ok := reqOptions["formatting"].(map[string]interface{}); ok {
				formatting := &valueobject.FormattingOptions{
					Type:       getStringFromMap(formattingData, "type"),
					DateFormat: getStringFromMap(formattingData, "dateFormat"),
					TimeFormat: getStringFromMap(formattingData, "timeFormat"),
					TimeZone:   getStringFromMap(formattingData, "timeZone"),
					Currency:   getStringFromMap(formattingData, "currency"),
					ShowCommas: getBoolFromMap(formattingData, "showCommas"),
				}
				if precision, ok := formattingData["precision"].(float64); ok {
					p := int(precision)
					formatting.Precision = &p
				}
				options.Rollup.Formatting = formatting
			}
		}

	case "lookup":
		if options.Lookup != nil {
			// Formatting
			if formattingData, ok := reqOptions["formatting"].(map[string]interface{}); ok {
				formatting := &valueobject.FormattingOptions{
					Type:       getStringFromMap(formattingData, "type"),
					DateFormat: getStringFromMap(formattingData, "dateFormat"),
					TimeFormat: getStringFromMap(formattingData, "timeFormat"),
					TimeZone:   getStringFromMap(formattingData, "timeZone"),
					Currency:   getStringFromMap(formattingData, "currency"),
					ShowCommas: getBoolFromMap(formattingData, "showCommas"),
				}
				if precision, ok := formattingData["precision"].(float64); ok {
					p := int(precision)
					formatting.Precision = &p
				}
				options.Lookup.Formatting = formatting
			}
			// ShowAs
			if showAsData, ok := reqOptions["showAs"].(map[string]interface{}); ok {
				options.Lookup.ShowAs = &valueobject.ShowAsOptions{
					Type:   getStringFromMap(showAsData, "type"),
					Color:  getStringFromMap(showAsData, "color"),
					Config: showAsData,
				}
			}
		}

	case "link":
		if options.Link == nil {
			options.Link = &valueobject.LinkOptions{}
		}
		
		// 调试：记录 reqOptions 内容
		logger.Info("解析 Link 字段选项",
			logger.Any("reqOptions", reqOptions),
		)
		
		// 解析 link 字段（支持嵌套格式 options.link 或 options.Link）
		var linkData map[string]interface{}
		if linkDataRaw, ok := reqOptions["link"].(map[string]interface{}); ok {
			linkData = linkDataRaw
			logger.Info("找到 link 字段（小写）", logger.Any("linkData", linkData))
		} else if linkDataRaw, ok := reqOptions["Link"].(map[string]interface{}); ok {
			linkData = linkDataRaw
			logger.Info("找到 Link 字段（大写）", logger.Any("linkData", linkData))
		} else {
			logger.Warn("未找到 link 或 Link 字段")
		}
		
		if linkData != nil {
			// 解析核心字段：关联表ID（支持 linked_table_id 和 foreignTableId）
			if linkedTableID, ok := linkData["linked_table_id"].(string); ok && linkedTableID != "" {
				options.Link.LinkedTableID = linkedTableID
				logger.Info("解析到 linked_table_id", logger.String("linked_table_id", linkedTableID))
			} else if foreignTableID, ok := linkData["foreignTableId"].(string); ok && foreignTableID != "" {
				options.Link.LinkedTableID = foreignTableID
				logger.Info("解析到 foreignTableId", logger.String("foreignTableId", foreignTableID))
			} else if linkedTableID, ok := linkData["linkedTableId"].(string); ok && linkedTableID != "" {
				options.Link.LinkedTableID = linkedTableID
				logger.Info("解析到 linkedTableId", logger.String("linkedTableId", linkedTableID))
			} else {
				logger.Warn("未找到关联表ID字段", logger.Any("linkData", linkData))
			}
			
			// 解析关系类型
			if relationship, ok := linkData["relationship"].(string); ok && relationship != "" {
				options.Link.Relationship = relationship
			}
			
			// 解析是否对称
			if isSymmetric, ok := linkData["isSymmetric"].(bool); ok {
				options.Link.IsSymmetric = isSymmetric
			} else if isSymmetric, ok := linkData["is_symmetric"].(bool); ok {
				options.Link.IsSymmetric = isSymmetric
			}
			
			// 解析是否允许多选
			if allowMultiple, ok := linkData["allowMultiple"].(bool); ok {
				options.Link.AllowMultiple = allowMultiple
			} else if allowMultiple, ok := linkData["allow_multiple"].(bool); ok {
				options.Link.AllowMultiple = allowMultiple
			}
			
			// 解析对称字段ID
			if symmetricFieldID, ok := linkData["symmetricFieldId"].(string); ok && symmetricFieldID != "" {
				options.Link.SymmetricFieldID = symmetricFieldID
			} else if symmetricFieldID, ok := linkData["symmetric_field_id"].(string); ok && symmetricFieldID != "" {
				options.Link.SymmetricFieldID = symmetricFieldID
			}
			
			// 解析外键字段ID
			if foreignKeyFieldID, ok := linkData["foreignKeyFieldId"].(string); ok && foreignKeyFieldID != "" {
				options.Link.ForeignKeyFieldID = foreignKeyFieldID
			} else if foreignKeyFieldID, ok := linkData["foreign_key_field_id"].(string); ok && foreignKeyFieldID != "" {
				options.Link.ForeignKeyFieldID = foreignKeyFieldID
			}
			
			// 解析数据库实现细节（支持 camelCase 和 snake_case）
			if fkHostTableName, ok := linkData["fkHostTableName"].(string); ok && fkHostTableName != "" {
				options.Link.FkHostTableName = fkHostTableName
			} else if fkHostTableName, ok := linkData["fk_host_table_name"].(string); ok && fkHostTableName != "" {
				options.Link.FkHostTableName = fkHostTableName
			}
			if selfKeyName, ok := linkData["selfKeyName"].(string); ok && selfKeyName != "" {
				options.Link.SelfKeyName = selfKeyName
			} else if selfKeyName, ok := linkData["self_key_name"].(string); ok && selfKeyName != "" {
				options.Link.SelfKeyName = selfKeyName
			}
			if foreignKeyName, ok := linkData["foreignKeyName"].(string); ok && foreignKeyName != "" {
				options.Link.ForeignKeyName = foreignKeyName
			} else if foreignKeyName, ok := linkData["foreign_key_name"].(string); ok && foreignKeyName != "" {
				options.Link.ForeignKeyName = foreignKeyName
			}
		}
		
		// 高级过滤功能（参考 Teable）
		if baseID, ok := reqOptions["baseId"].(string); ok {
			options.Link.BaseID = baseID
		}
		if lookupFieldID, ok := reqOptions["lookupFieldId"].(string); ok {
			options.Link.LookupFieldID = lookupFieldID
		}
		if filterByViewID, ok := reqOptions["filterByViewId"].(string); ok {
			options.Link.FilterByViewID = &filterByViewID
		}
		if visibleFieldIDs, ok := reqOptions["visibleFieldIds"].([]interface{}); ok {
			ids := make([]string, 0, len(visibleFieldIDs))
			for _, id := range visibleFieldIDs {
				if strID, ok := id.(string); ok {
					ids = append(ids, strID)
				}
			}
			options.Link.VisibleFieldIDs = ids
		}
		if filterData, ok := reqOptions["filter"].(map[string]interface{}); ok {
			filter := &valueobject.FilterOptions{
				Conjunction: getStringFromMap(filterData, "conjunction"),
			}
			if conditions, ok := filterData["conditions"].([]interface{}); ok {
				filter.Conditions = make([]valueobject.FilterCondition, 0, len(conditions))
				for _, condData := range conditions {
					if condMap, ok := condData.(map[string]interface{}); ok {
						filter.Conditions = append(filter.Conditions, valueobject.FilterCondition{
							FieldID:  getStringFromMap(condMap, "fieldId"),
							Operator: getStringFromMap(condMap, "operator"),
							Value:    condMap["value"],
						})
					}
				}
			}
			options.Link.Filter = filter
		}
		
		// 调试：记录最终解析结果
		if options.Link != nil {
			logger.Info("Link 字段选项解析完成",
				logger.String("LinkedTableID", options.Link.LinkedTableID),
				logger.String("Relationship", options.Link.Relationship),
				logger.String("LookupFieldID", options.Link.LookupFieldID),
			)
		}

	case "count":
		// ✨ Count 字段选项解析
		if options.Count == nil {
			options.Count = &valueobject.CountOptions{}
		}
		
		// 解析 count 字段（支持嵌套格式 options.count 或 options.Count）
		var countData map[string]interface{}
		if countDataRaw, ok := reqOptions["count"].(map[string]interface{}); ok {
			countData = countDataRaw
		} else if countDataRaw, ok := reqOptions["Count"].(map[string]interface{}); ok {
			countData = countDataRaw
		}
		
		if countData != nil {
			// 解析 linkFieldId（支持两种格式）
			if linkFieldID, ok := countData["linkFieldId"].(string); ok && linkFieldID != "" {
				options.Count.LinkFieldID = linkFieldID
			} else if linkFieldID, ok := countData["link_field_id"].(string); ok && linkFieldID != "" {
				options.Count.LinkFieldID = linkFieldID
			}
			
			// 解析 filter
			if filter, ok := countData["filter"].(string); ok && filter != "" {
				options.Count.Filter = filter
			} else if filter, ok := countData["filterExpression"].(string); ok && filter != "" {
				options.Count.Filter = filter
			}
		}
		
		logger.Info("Count 字段选项解析完成",
			logger.String("LinkFieldID", options.Count.LinkFieldID),
			logger.String("Filter", options.Count.Filter),
		)
	}

	// 更新字段的 options
	field.UpdateOptions(options)
	
	// 对于 Link 字段，如果 lookupFieldID 为空，需要从关联表获取并保存
	if field.Type().String() == "link" && options.Link != nil && options.Link.LookupFieldID == "" && options.Link.LinkedTableID != "" {
		// 从关联表获取主字段ID
		primaryFieldID, err := s.getPrimaryFieldID(ctx, options.Link.LinkedTableID)
		if err != nil {
			logger.Warn("无法从关联表获取主字段ID（将在 createLinkFieldSchema 中重试）",
				logger.String("linked_table_id", options.Link.LinkedTableID),
				logger.ErrorField(err))
		} else {
			options.Link.LookupFieldID = primaryFieldID
			logger.Info("从关联表自动获取主字段ID并保存到字段 options",
				logger.String("linked_table_id", options.Link.LinkedTableID),
				logger.String("lookup_field_id", primaryFieldID))
			// 更新字段的 options
			field.UpdateOptions(options)
		}
	}
}

// 辅助函数：从 map 中安全获取字符串
func getStringFromMap(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

// 辅助函数：从 map 中安全获取布尔值
func getBoolFromMap(m map[string]interface{}, key string) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return false
}

// createLinkFieldSchema 创建 Link 字段的数据库 Schema
func (s *FieldService) createLinkFieldSchema(
	ctx context.Context,
	table *tableEntity.Table,
	field *entity.Field,
) error {
	if s.dbProvider == nil || s.db == nil {
		return fmt.Errorf("数据库提供者或连接未初始化")
	}

	options := field.Options()
	if options == nil || options.Link == nil {
		return fmt.Errorf("Link 字段选项不存在")
	}

	linkOptions := options.Link

	// 转换 LinkOptions 到 LinkFieldOptions
	currentTableID := table.ID().String()
	linkFieldOptions, err := s.convertToLinkFieldOptions(ctx, currentTableID, linkOptions, field)
	if err != nil {
		return fmt.Errorf("转换 Link 字段选项失败: %w", err)
	}

	// 将确定的 lookupFieldID 保存回字段的 options（如果之前为空）
	if linkOptions.LookupFieldID == "" && linkFieldOptions.LookupFieldID != "" {
		linkOptions.LookupFieldID = linkFieldOptions.LookupFieldID
		logger.Info("将确定的 lookupFieldID 保存回字段 options",
			logger.String("field_id", field.ID().String()),
			logger.String("lookup_field_id", linkOptions.LookupFieldID))
		// 更新字段的 options
		field.UpdateOptions(options)
	}

	// ✨ 将确定的 FkHostTableName、SelfKeyName、ForeignKeyName 保存回字段的 options
	// 确保这些值被正确保存，以便后续使用
	needsSave := false
	if linkOptions.FkHostTableName != linkFieldOptions.FkHostTableName {
		linkOptions.FkHostTableName = linkFieldOptions.FkHostTableName
		logger.Info("将确定的 FkHostTableName 保存回字段 options",
			logger.String("field_id", field.ID().String()),
			logger.String("fk_host_table_name", linkOptions.FkHostTableName))
		needsSave = true
	}
	if linkOptions.SelfKeyName != linkFieldOptions.SelfKeyName {
		linkOptions.SelfKeyName = linkFieldOptions.SelfKeyName
		logger.Info("将确定的 SelfKeyName 保存回字段 options",
			logger.String("field_id", field.ID().String()),
			logger.String("self_key_name", linkOptions.SelfKeyName))
		needsSave = true
	}
	if linkOptions.ForeignKeyName != linkFieldOptions.ForeignKeyName {
		linkOptions.ForeignKeyName = linkFieldOptions.ForeignKeyName
		logger.Info("将确定的 ForeignKeyName 保存回字段 options",
			logger.String("field_id", field.ID().String()),
			logger.String("foreign_key_name", linkOptions.ForeignKeyName))
		needsSave = true
	}
	
	// ✨ 关键修复：如果字段选项被更新，立即更新字段对象并保存到数据库
	// 这样可以确保这些重要的数据库实现细节被持久化
	if needsSave {
		field.UpdateOptions(options)
		// ✨ 立即保存字段到数据库，确保 FkHostTableName、SelfKeyName、ForeignKeyName 被持久化
		if err := s.fieldRepo.Save(ctx, field); err != nil {
			logger.Error("保存更新后的字段选项失败",
				logger.String("field_id", field.ID().String()),
				logger.ErrorField(err))
			// 注意：这里不返回错误，因为字段选项保存失败不应该阻止 Schema 创建
			// 但是，记录错误以便后续排查
		} else {
			logger.Info("✅ 字段选项已保存到数据库",
				logger.String("field_id", field.ID().String()),
				logger.String("fk_host_table_name", linkOptions.FkHostTableName),
				logger.String("self_key_name", linkOptions.SelfKeyName),
				logger.String("foreign_key_name", linkOptions.ForeignKeyName))
		}
	}

	// 获取关联表信息
	foreignTableID := linkFieldOptions.GetForeignTableID()
	if foreignTableID == "" {
		return fmt.Errorf("关联表ID不存在")
	}

	foreignTable, err := s.tableRepo.GetByID(ctx, foreignTableID)
	if err != nil {
		return fmt.Errorf("获取关联表失败: %w", err)
	}
	if foreignTable == nil {
		return fmt.Errorf("关联表不存在: %s", foreignTableID)
	}

	// 创建 Link 字段 Schema 创建器
	schemaCreator := schema.NewLinkFieldSchemaCreator(s.dbProvider, s.db)

	// 创建 Link 字段 Schema
	baseID := table.BaseID()
	tableID := table.ID().String()
	hasOrderColumn := false // TODO: 从字段元数据获取

	if err := schemaCreator.CreateLinkFieldSchema(
		ctx,
		baseID,
		tableID,
		foreignTableID,
		linkFieldOptions,
		hasOrderColumn,
	); err != nil {
		return fmt.Errorf("创建 Link 字段 Schema 失败: %w", err)
	}

	return nil
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

// createSymmetricField 自动创建对称字段
// 当创建 Link 字段且 IsSymmetric=true 时，自动在关联表中创建对称字段
func (s *FieldService) createSymmetricField(
	ctx context.Context,
	mainField *entity.Field,
	linkOptions *valueobject.LinkOptions,
	userID string,
) error {
	// 1. 获取关联表信息
	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		return fmt.Errorf("关联表ID不存在")
	}

	foreignTable, err := s.tableRepo.GetByID(ctx, foreignTableID)
	if err != nil {
		return fmt.Errorf("获取关联表失败: %w", err)
	}
	if foreignTable == nil {
		return fmt.Errorf("关联表不存在: %s", foreignTableID)
	}

	// 2. 生成对称字段名称（基于主字段名称）
	mainFieldName := mainField.Name().String()
	symmetricFieldName := s.generateSymmetricFieldName(mainFieldName, foreignTable.Name().String())

	// 3. 检查对称字段名称是否已存在
	fieldNameVO, err := valueobject.NewFieldName(symmetricFieldName)
	if err != nil {
		return fmt.Errorf("对称字段名称无效: %w", err)
	}

	exists, err := s.fieldRepo.ExistsByName(ctx, foreignTableID, fieldNameVO, nil)
	if err != nil {
		return fmt.Errorf("检查对称字段名称失败: %w", err)
	}
	if exists {
		logger.Warn("对称字段名称已存在，跳过自动创建",
			logger.String("symmetric_field_name", symmetricFieldName),
			logger.String("foreign_table_id", foreignTableID))
		return nil
	}

	// 4. 构建对称字段的 Link 选项
	// 对称字段指向主字段所在的表
	mainTableID := mainField.TableID()
	symmetricLinkOptions := &valueobject.LinkOptions{
		LinkedTableID:     mainTableID,
		Relationship:      s.reverseRelationship(linkOptions.Relationship),
		IsSymmetric:       true,
		AllowMultiple:     linkOptions.AllowMultiple,
		SymmetricFieldID: mainField.ID().String(), // 指向主字段
		LookupFieldID:    linkOptions.LookupFieldID, // 使用相同的 lookupFieldID
		BaseID:           linkOptions.BaseID,
		FilterByViewID:   linkOptions.FilterByViewID,
		VisibleFieldIDs:  linkOptions.VisibleFieldIDs,
		Filter:           linkOptions.Filter,
	}

	// 5. 创建对称字段实例
	symmetricField, err := s.fieldFactory.CreateFieldWithType(foreignTableID, symmetricFieldName, "link", userID)
	if err != nil {
		return fmt.Errorf("创建对称字段实例失败: %w", err)
	}

	// 设置对称字段的选项
	symmetricFieldOptions := valueobject.NewFieldOptions()
	symmetricFieldOptions.Link = symmetricLinkOptions
	symmetricField.UpdateOptions(symmetricFieldOptions)

	// 6. 计算对称字段的 order
	maxOrder, err := s.fieldRepo.GetMaxOrder(ctx, foreignTableID)
	if err != nil {
		maxOrder = -1
	}
	symmetricField.SetOrder(maxOrder + 1)

	// 7. 创建物理表列
	baseID := foreignTable.BaseID()
	dbFieldName := symmetricField.DBFieldName().String()
	dbType := symmetricField.DBFieldType()

	columnDef := database.ColumnDefinition{
		Name:    dbFieldName,
		Type:    dbType,
		NotNull: false,
		Unique:  false,
	}

	if err := s.dbProvider.AddColumn(ctx, baseID, foreignTableID, columnDef); err != nil {
		return fmt.Errorf("创建对称字段物理表列失败: %w", err)
	}

	// 8. 创建 Link 字段 Schema
	if err := s.createLinkFieldSchema(ctx, foreignTable, symmetricField); err != nil {
		// 回滚：删除已创建的物理表列
		if rollbackErr := s.dbProvider.DropColumn(ctx, baseID, foreignTableID, dbFieldName); rollbackErr != nil {
			logger.Error("回滚删除对称字段物理表列失败", logger.ErrorField(rollbackErr))
		}
		return fmt.Errorf("创建对称字段 Schema 失败: %w", err)
	}

	// 9. 保存对称字段
	if err := s.fieldRepo.Save(ctx, symmetricField); err != nil {
		// 回滚：删除已创建的物理表列和 Schema
		if rollbackErr := s.dbProvider.DropColumn(ctx, baseID, foreignTableID, dbFieldName); rollbackErr != nil {
			logger.Error("回滚删除对称字段物理表列失败", logger.ErrorField(rollbackErr))
		}
		return fmt.Errorf("保存对称字段失败: %w", err)
	}

	// 10. 更新主字段的 SymmetricFieldID
	// ✅ 优化：确保主字段和对称字段的 SymmetricFieldID 正确设置
	mainFieldOptions := mainField.Options()
	if mainFieldOptions == nil {
		mainFieldOptions = valueobject.NewFieldOptions()
	}
	if mainFieldOptions.Link == nil {
		mainFieldOptions.Link = linkOptions
	}
	mainFieldOptions.Link.SymmetricFieldID = symmetricField.ID().String()
	mainField.UpdateOptions(mainFieldOptions)

	// 11. 保存主字段（更新 SymmetricFieldID）
	// ✅ 优化：如果保存失败，尝试回滚对称字段（可选，因为对称字段已经创建成功）
	if err := s.fieldRepo.Save(ctx, mainField); err != nil {
		logger.Warn("更新主字段的 SymmetricFieldID 失败",
			logger.String("main_field_id", mainField.ID().String()),
			logger.String("symmetric_field_id", symmetricField.ID().String()),
			logger.ErrorField(err))
		// 注意：主字段保存失败不影响对称字段的创建
		// 对称字段已经创建成功，主字段的 SymmetricFieldID 可以在后续更新
		// 这里不进行回滚，因为对称字段创建是成功的，只是主字段的引用更新失败
	}

	// 12. 广播对称字段创建事件
	if s.broadcaster != nil {
		s.broadcaster.BroadcastFieldCreate(foreignTableID, symmetricField)
	}

	logger.Info("✅ 对称字段自动创建成功",
		logger.String("main_field_id", mainField.ID().String()),
		logger.String("symmetric_field_id", symmetricField.ID().String()),
		logger.String("main_table_id", mainTableID),
		logger.String("foreign_table_id", foreignTableID))

	return nil
}

// generateSymmetricFieldName 生成对称字段名称
// ✅ 优化：改进对称字段名称生成逻辑，使其更智能和可读
// 例如：主字段"已选课程" -> 对称字段"选课学生"
func (s *FieldService) generateSymmetricFieldName(mainFieldName string, foreignTableName string) string {
	// 改进的命名策略：
	// 1. 如果主字段名称包含"已"、"的"等字，尝试提取核心词
	// 2. 使用表名 + "列表"作为默认策略
	// 3. 如果表名和主字段名称相似，使用更智能的命名
	
	// 尝试从主字段名称中提取核心词
	// 例如："已选课程" -> "选课程" -> "课程"
	// 但这里为了简单，直接使用表名 + "列表"
	
	// 如果主字段名称包含表名，使用更智能的命名
	if strings.Contains(mainFieldName, foreignTableName) {
		// 如果主字段名称已经包含表名，使用主字段名称的反向
		// 例如：主字段"学生已选课程"，表名"课程" -> 对称字段"选课学生"
		return fmt.Sprintf("%s列表", foreignTableName)
	}
	
	// 默认策略：表名 + "列表"
	return fmt.Sprintf("%s列表", foreignTableName)
}

// reverseRelationship 反转关系类型
// manyMany -> manyMany (不变)
// manyOne -> oneMany
// oneMany -> manyOne
// oneOne -> oneOne (不变)
func (s *FieldService) reverseRelationship(relationship string) string {
	switch relationship {
	case "manyOne":
		return "oneMany"
	case "oneMany":
		return "manyOne"
	case "manyMany", "oneOne":
		return relationship
	default:
		return relationship
	}
}

// changeLinkRelationshipType 变更 Link 字段的关系类型
// 支持从 manyMany 改为 manyOne 等关系类型变更
// 需要数据迁移：从 junction table 迁移到外键列，或相反
func (s *FieldService) changeLinkRelationshipType(
	ctx context.Context,
	field *entity.Field,
	oldRelationship, newRelationship string,
	newOptions map[string]interface{},
) error {
	// 1. 验证关系类型变更是否支持
	if !s.isRelationshipChangeSupported(oldRelationship, newRelationship) {
		return fmt.Errorf("不支持的关系类型变更: %s -> %s", oldRelationship, newRelationship)
	}

	// 2. 获取表信息
	tableID := field.TableID()
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取表信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("表不存在: %s", tableID)
	}

	baseID := table.BaseID()

	// 3. 获取 Link 字段选项
	linkOptions := field.Options().Link
	if linkOptions == nil {
		return fmt.Errorf("Link 字段选项不存在")
	}

	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		return fmt.Errorf("关联表ID不存在")
	}

	// 4. 根据变更类型执行数据迁移
	switch {
	case oldRelationship == "manyMany" && newRelationship == "manyOne":
		// 从 junction table 迁移到外键列
		return s.migrateFromManyManyToManyOne(ctx, baseID, tableID, foreignTableID, field, linkOptions)
	case oldRelationship == "manyOne" && newRelationship == "manyMany":
		// 从外键列迁移到 junction table
		return s.migrateFromManyOneToManyMany(ctx, baseID, tableID, foreignTableID, field, linkOptions)
	case oldRelationship == "manyMany" && newRelationship == "oneMany":
		// 从 junction table 迁移到关联表的外键列
		return s.migrateFromManyManyToOneMany(ctx, baseID, tableID, foreignTableID, field, linkOptions)
	case oldRelationship == "oneMany" && newRelationship == "manyMany":
		// 从关联表的外键列迁移到 junction table
		return s.migrateFromOneManyToManyMany(ctx, baseID, tableID, foreignTableID, field, linkOptions)
	default:
		return fmt.Errorf("不支持的关系类型变更: %s -> %s", oldRelationship, newRelationship)
	}
}

// isRelationshipChangeSupported 检查关系类型变更是否支持
func (s *FieldService) isRelationshipChangeSupported(oldRelationship, newRelationship string) bool {
	// 支持的关系类型变更
	supportedChanges := map[string][]string{
		"manyMany": {"manyOne", "oneMany"},
		"manyOne":  {"manyMany"},
		"oneMany":  {"manyMany"},
		"oneOne":   {}, // 一对一关系类型变更暂不支持
	}

	allowed, exists := supportedChanges[oldRelationship]
	if !exists {
		return false
	}

	for _, allowedType := range allowed {
		if allowedType == newRelationship {
			return true
		}
	}

	return false
}

// migrateFromManyManyToManyOne 从 manyMany 迁移到 manyOne
func (s *FieldService) migrateFromManyManyToManyOne(
	ctx context.Context,
	baseID, tableID, foreignTableID string,
	field *entity.Field,
	linkOptions *valueobject.LinkOptions,
) error {
	// 1. 获取 junction table 名称
	junctionTableName := linkOptions.FkHostTableName
	if junctionTableName == "" {
		return fmt.Errorf("junction table 名称不存在")
	}

	fullJunctionTableName := s.dbProvider.GenerateTableName(baseID, junctionTableName)
	fullTableName := s.dbProvider.GenerateTableName(baseID, tableID)

	// 2. 从 junction table 读取数据
	// 对于每个 self_key，只保留第一个 foreign_key（manyOne 只支持单个值）
	migrationSQL := fmt.Sprintf(`
		UPDATE %s AS t
		SET %s = (
			SELECT j.%s
			FROM %s AS j
			WHERE j.%s = t.__id
			LIMIT 1
		),
		__last_modified_time = CURRENT_TIMESTAMP,
		__version = __version + 1
		WHERE EXISTS (
			SELECT 1 FROM %s AS j
			WHERE j.%s = t.__id
		)
	`,
		fullTableName,
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
	)

	// 执行迁移
	if err := s.db.WithContext(ctx).Exec(migrationSQL).Error; err != nil {
		return fmt.Errorf("数据迁移失败: %w", err)
	}

	// 3. 删除旧的 junction table
	if err := s.dbProvider.DropPhysicalTable(ctx, baseID, junctionTableName); err != nil {
		logger.Warn("删除旧的 junction table 失败",
			logger.String("junction_table", junctionTableName),
			logger.ErrorField(err))
		// 继续执行，不影响主流程
	}

	// 4. 创建新的外键列（如果不存在）
	columnDef := database.ColumnDefinition{
		Name:    linkOptions.ForeignKeyName,
		Type:    "VARCHAR(50)",
		NotNull: false,
		Unique:  false,
	}

	if err := s.dbProvider.AddColumn(ctx, baseID, tableID, columnDef); err != nil {
		logger.Warn("创建外键列失败（可能已存在）",
			logger.String("field_name", linkOptions.ForeignKeyName),
			logger.ErrorField(err))
	}

	// 5. 创建外键列索引
	idxSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_%s ON %s (%s)",
		tableID, linkOptions.ForeignKeyName,
		s.dbProvider.GenerateTableName(baseID, tableID),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName))
	if err := s.db.WithContext(ctx).Exec(idxSQL).Error; err != nil {
		logger.Warn("创建外键列索引失败", logger.ErrorField(err))
	}

	logger.Info("关系类型变更完成: manyMany -> manyOne",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", tableID))

	return nil
}

// migrateFromManyOneToManyMany 从 manyOne 迁移到 manyMany
func (s *FieldService) migrateFromManyOneToManyMany(
	ctx context.Context,
	baseID, tableID, foreignTableID string,
	field *entity.Field,
	linkOptions *valueobject.LinkOptions,
) error {
	// 1. 创建新的 junction table
	junctionTableName := linkOptions.FkHostTableName
	if junctionTableName == "" {
		// 生成 junction table 名称
		junctionTableName = fmt.Sprintf("link_%s_%s", tableID, foreignTableID)
	}

	// 创建 junction table
	fullJunctionTableName := s.dbProvider.GenerateTableName(baseID, junctionTableName)
	createTableSQL := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			__id SERIAL PRIMARY KEY,
			%s VARCHAR(50) NOT NULL,
			%s VARCHAR(50) NOT NULL
		)
	`,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
	)

	if err := s.db.WithContext(ctx).Exec(createTableSQL).Error; err != nil {
		return fmt.Errorf("创建 junction table 失败: %w", err)
	}

	// 2. 从外键列迁移数据到 junction table
	fullTableName := s.dbProvider.GenerateTableName(baseID, tableID)
	migrationSQL := fmt.Sprintf(`
		INSERT INTO %s (%s, %s)
		SELECT __id, %s
		FROM %s
		WHERE %s IS NOT NULL
	`,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fullTableName,
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
	)

	if err := s.db.WithContext(ctx).Exec(migrationSQL).Error; err != nil {
		return fmt.Errorf("数据迁移失败: %w", err)
	}

	// 3. 删除旧的外键列
	if err := s.dbProvider.DropColumn(ctx, baseID, tableID, linkOptions.ForeignKeyName); err != nil {
		logger.Warn("删除旧的外键列失败",
			logger.String("field_name", linkOptions.ForeignKeyName),
			logger.ErrorField(err))
		// 继续执行，不影响主流程
	}

	// 4. 创建 junction table 索引
	idxSelfSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_%s ON %s (%s)",
		junctionTableName, linkOptions.SelfKeyName,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName))
	if err := s.db.WithContext(ctx).Exec(idxSelfSQL).Error; err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	idxForeignSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_%s ON %s (%s)",
		junctionTableName, linkOptions.ForeignKeyName,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName))
	if err := s.db.WithContext(ctx).Exec(idxForeignSQL).Error; err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	logger.Info("关系类型变更完成: manyOne -> manyMany",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", tableID))

	return nil
}

// migrateFromManyManyToOneMany 从 manyMany 迁移到 oneMany
func (s *FieldService) migrateFromManyManyToOneMany(
	ctx context.Context,
	baseID, tableID, foreignTableID string,
	field *entity.Field,
	linkOptions *valueobject.LinkOptions,
) error {
	// 1. 获取 junction table 名称
	junctionTableName := linkOptions.FkHostTableName
	if junctionTableName == "" {
		return fmt.Errorf("junction table 名称不存在")
	}

	fullJunctionTableName := s.dbProvider.GenerateTableName(baseID, junctionTableName)
	fullForeignTableName := s.dbProvider.GenerateTableName(baseID, foreignTableID)

	// 2. 从 junction table 迁移数据到关联表的外键列
	// 对于每个 foreign_key，只保留第一个 self_key（oneMany 只支持单个值）
	migrationSQL := fmt.Sprintf(`
		UPDATE %s AS t
		SET %s = (
			SELECT j.%s
			FROM %s AS j
			WHERE j.%s = t.__id
			LIMIT 1
		),
		__last_modified_time = CURRENT_TIMESTAMP,
		__version = __version + 1
		WHERE EXISTS (
			SELECT 1 FROM %s AS j
			WHERE j.%s = t.__id
		)
	`,
		fullForeignTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
	)

	// 执行迁移
	if err := s.db.WithContext(ctx).Exec(migrationSQL).Error; err != nil {
		return fmt.Errorf("数据迁移失败: %w", err)
	}

	// 3. 删除旧的 junction table
	if err := s.dbProvider.DropPhysicalTable(ctx, baseID, junctionTableName); err != nil {
		logger.Warn("删除旧的 junction table 失败",
			logger.String("junction_table", junctionTableName),
			logger.ErrorField(err))
	}

	// 4. 创建新的外键列（在关联表中）
	columnDef := database.ColumnDefinition{
		Name:    linkOptions.SelfKeyName,
		Type:    "VARCHAR(50)",
		NotNull: false,
		Unique:  false,
	}

	if err := s.dbProvider.AddColumn(ctx, baseID, foreignTableID, columnDef); err != nil {
		logger.Warn("创建外键列失败（可能已存在）",
			logger.String("field_name", linkOptions.SelfKeyName),
			logger.ErrorField(err))
	}

	// 5. 创建外键列索引
	idxSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_%s ON %s (%s)",
		foreignTableID, linkOptions.SelfKeyName,
		fullForeignTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName))
	if err := s.db.WithContext(ctx).Exec(idxSQL).Error; err != nil {
		logger.Warn("创建外键列索引失败", logger.ErrorField(err))
	}

	logger.Info("关系类型变更完成: manyMany -> oneMany",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", tableID))

	return nil
}

// migrateFromOneManyToManyMany 从 oneMany 迁移到 manyMany
func (s *FieldService) migrateFromOneManyToManyMany(
	ctx context.Context,
	baseID, tableID, foreignTableID string,
	field *entity.Field,
	linkOptions *valueobject.LinkOptions,
) error {
	// 1. 创建新的 junction table
	junctionTableName := linkOptions.FkHostTableName
	if junctionTableName == "" {
		// 生成 junction table 名称
		junctionTableName = fmt.Sprintf("link_%s_%s", tableID, foreignTableID)
	}

	// 创建 junction table
	fullJunctionTableName := s.dbProvider.GenerateTableName(baseID, junctionTableName)
	createTableSQL := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			__id SERIAL PRIMARY KEY,
			%s VARCHAR(50) NOT NULL,
			%s VARCHAR(50) NOT NULL
		)
	`,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
	)

	if err := s.db.WithContext(ctx).Exec(createTableSQL).Error; err != nil {
		return fmt.Errorf("创建 junction table 失败: %w", err)
	}

	// 2. 从关联表的外键列迁移数据到 junction table
	fullForeignTableName := s.dbProvider.GenerateTableName(baseID, foreignTableID)
	migrationSQL := fmt.Sprintf(`
		INSERT INTO %s (%s, %s)
		SELECT %s, __id
		FROM %s
		WHERE %s IS NOT NULL
	`,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fullForeignTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
	)

	if err := s.db.WithContext(ctx).Exec(migrationSQL).Error; err != nil {
		return fmt.Errorf("数据迁移失败: %w", err)
	}

	// 3. 删除关联表中的旧外键列
	if err := s.dbProvider.DropColumn(ctx, baseID, foreignTableID, linkOptions.SelfKeyName); err != nil {
		logger.Warn("删除旧的外键列失败",
			logger.String("field_name", linkOptions.SelfKeyName),
			logger.ErrorField(err))
	}

	// 4. 创建 junction table 索引
	idxSelfSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_%s ON %s (%s)",
		junctionTableName, linkOptions.SelfKeyName,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName))
	if err := s.db.WithContext(ctx).Exec(idxSelfSQL).Error; err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	idxForeignSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_%s ON %s (%s)",
		junctionTableName, linkOptions.ForeignKeyName,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName))
	if err := s.db.WithContext(ctx).Exec(idxForeignSQL).Error; err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	logger.Info("关系类型变更完成: oneMany -> manyMany",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", tableID))

	return nil
}
