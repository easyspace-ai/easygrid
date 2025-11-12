package mapper

import (
	"encoding/json"
	"strings"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database/models"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// ToFieldEntity 将数据库模型转换为领域实体
func ToFieldEntity(dbField *models.Field) (*entity.Field, error) {
	if dbField == nil {
		return nil, nil
	}

	// 创建 FieldID
	fieldID := valueobject.NewFieldID(dbField.ID)

	// 创建 FieldName
	fieldName, err := valueobject.NewFieldName(dbField.Name)
	if err != nil {
		return nil, err
	}

	// 创建 FieldType
	fieldType, err := valueobject.NewFieldType(dbField.Type)
	if err != nil {
		return nil, err
	}

	// 创建 DBFieldName
	dbFieldName, err := valueobject.NewDBFieldNameFromString(dbField.DBFieldName)
	if err != nil {
		return nil, err
	}

	// 解析 Options 字段
	options := valueobject.NewFieldOptions()
	// ✨ 调试：记录 Options 字段状态（无论是否为空）
	optionsValue := "<nil>"
	if dbField.Options != nil {
		optionsValue = *dbField.Options
	}
	logger.Info("ToFieldEntity 开始解析 Options",
		logger.String("field_id", dbField.ID),
		logger.String("field_name", dbField.Name),
		logger.String("field_type", dbField.Type),
		logger.Bool("options_is_nil", dbField.Options == nil),
		logger.String("options_value", optionsValue))
	if dbField.Options != nil && *dbField.Options != "" {
		// ✨ 调试：记录原始 Options 值
		logger.Info("ToFieldEntity 解析 Options",
			logger.String("field_id", dbField.ID),
			logger.String("field_name", dbField.Name),
			logger.String("field_type", dbField.Type),
			logger.String("raw_options", *dbField.Options))
		// 解析 JSON 到 FieldOptions
		if err := json.Unmarshal([]byte(*dbField.Options), options); err != nil {
			// 如果解析失败，记录错误但继续（使用空 Options）
			// 这样即使 Options 格式有问题也不会导致整个字段加载失败
			logger.Warn("ToFieldEntity Options 解析失败",
				logger.String("field_id", dbField.ID),
				logger.String("field_name", dbField.Name),
				logger.String("field_type", dbField.Type),
				logger.ErrorField(err))
			options = valueobject.NewFieldOptions()
		} else if dbField.Type == "link" {
			// ✨ 调试：记录 Link 字段信息（无论 options.Link 是否为 nil）
			logger.Info("ToFieldEntity 检测到 Link 字段",
				logger.String("field_id", dbField.ID),
				logger.String("field_name", dbField.Name),
				logger.Bool("options_link_is_nil", options.Link == nil))
			if options.Link != nil {
				// ✨ 调试：记录 Link 字段加载时的 FkHostTableName
				logger.Info("ToFieldEntity 加载 Link 字段",
					logger.String("field_id", dbField.ID),
					logger.String("field_name", dbField.Name),
					logger.String("fk_host_table_name", options.Link.FkHostTableName),
					logger.String("fk_host_table_name_camel", options.Link.FkHostTableName),
					logger.String("relationship", options.Link.Relationship),
					logger.String("raw_options", *dbField.Options))
				// ✨ 检查是否有错误的格式
				if strings.Contains(options.Link.FkHostTableName, "manyMany") {
					logger.Warn("⚠️ ToFieldEntity 检测到错误的 FkHostTableName 格式（包含 manyMany）",
						logger.String("field_id", dbField.ID),
						logger.String("field_name", dbField.Name),
						logger.String("fk_host_table_name", options.Link.FkHostTableName),
						logger.String("relationship", options.Link.Relationship))
					// ✨ 关键修复：如果检测到错误的格式，尝试从原始 JSON 中解析正确的值
					// 或者使用 relationship 和 linked_table_id 来重新生成
					// 但这里我们只是记录警告，实际的修正应该在 saveForeignKeyToDb 中完成
				}
				// ✨ 关键修复：如果 FkHostTableName 为空或格式错误（包含 "manyMany"），尝试修正
				if options.Link.FkHostTableName == "" || strings.Contains(options.Link.FkHostTableName, "manyMany") {
					// 尝试从原始 JSON 中解析 fkHostTableName（camelCase）或 fk_host_table_name（snake_case）
					var rawOptions map[string]interface{}
					if err := json.Unmarshal([]byte(*dbField.Options), &rawOptions); err == nil {
						if linkMap, ok := rawOptions["link"].(map[string]interface{}); ok {
							// 尝试从 camelCase 读取
							if fkHostTableName, ok := linkMap["fkHostTableName"].(string); ok && fkHostTableName != "" && !strings.Contains(fkHostTableName, "manyMany") {
								options.Link.FkHostTableName = fkHostTableName
								logger.Info("ToFieldEntity 从原始 JSON 中解析 fkHostTableName（camelCase）",
									logger.String("field_id", dbField.ID),
									logger.String("fk_host_table_name", fkHostTableName))
							} else if fkHostTableName, ok := linkMap["fk_host_table_name"].(string); ok && fkHostTableName != "" && !strings.Contains(fkHostTableName, "manyMany") {
								// 尝试从 snake_case 读取
								options.Link.FkHostTableName = fkHostTableName
								logger.Info("ToFieldEntity 从原始 JSON 中解析 fk_host_table_name（snake_case）",
									logger.String("field_id", dbField.ID),
									logger.String("fk_host_table_name", fkHostTableName))
							} else if options.Link.LinkedTableID != "" && options.Link.Relationship == "manyMany" {
								// ✨ 关键修复：如果从 JSON 中无法解析到正确的值，且是 manyMany 关系，使用 linked_table_id 和当前表名重新生成
								// 注意：这里我们无法获取当前表名，所以只能从 junction table 名称中提取
								// 或者，我们可以尝试从错误的 FkHostTableName 中提取表名
								// 但更简单的方法是：如果包含 "manyMany"，直接清除它，让 convertLinkOptions 重新生成
								logger.Warn("ToFieldEntity 检测到错误的 FkHostTableName，将在 convertLinkOptions 中修正",
									logger.String("field_id", dbField.ID),
									logger.String("current_fk_host_table_name", options.Link.FkHostTableName),
									logger.String("linked_table_id", options.Link.LinkedTableID),
									logger.String("relationship", options.Link.Relationship))
								// 清除错误的 FkHostTableName，让 convertLinkOptions 重新生成
								options.Link.FkHostTableName = ""
							}
							// 同样处理 selfKeyName 和 foreignKeyName
							if selfKeyName, ok := linkMap["selfKeyName"].(string); ok && selfKeyName != "" {
								options.Link.SelfKeyName = selfKeyName
							} else if selfKeyName, ok := linkMap["self_key_name"].(string); ok && selfKeyName != "" {
								options.Link.SelfKeyName = selfKeyName
							}
							if foreignKeyName, ok := linkMap["foreignKeyName"].(string); ok && foreignKeyName != "" {
								options.Link.ForeignKeyName = foreignKeyName
							} else if foreignKeyName, ok := linkMap["foreign_key_name"].(string); ok && foreignKeyName != "" {
								options.Link.ForeignKeyName = foreignKeyName
							}
						}
					}
				}
			}
		}
	}

	// 处理版本
	version := 1
	if dbField.Version != nil {
		version = *dbField.Version
	}

	// 处理 LastModifiedTime
	updatedAt := dbField.CreatedTime
	if dbField.LastModifiedTime != nil {
		updatedAt = *dbField.LastModifiedTime
	}

	// 重建实体
	field := entity.ReconstructField(
		fieldID,
		dbField.TableID,
		fieldName,
		fieldType,
		dbFieldName,
		dbField.DBFieldType,
		options,
		dbField.FieldOrder,
		version,
		dbField.CreatedBy,
		dbField.CreatedTime,
		updatedAt,
	)

	// 设置额外属性
	if dbField.Description != nil {
		field.UpdateDescription(*dbField.Description)
	}

	// 设置约束
	field.SetRequired(dbField.IsRequired)
	field.SetUnique(dbField.IsUnique)

	return field, nil
}

// ToFieldModel 将领域实体转换为数据库模型（参考原版 dbCreateField 逻辑）
func ToFieldModel(field *entity.Field) (*models.Field, error) {
	if field == nil {
		return nil, nil
	}

	// 序列化 Options（参考原版会 JSON.stringify options）
	var optionsStr *string
	if field.Options() != nil {
		// ✨ 调试：记录序列化前的 Options 内容（特别是 Link 字段）
		if field.Type().String() == "link" && field.Options().Link != nil {
			logger.Info("ToFieldModel 序列化 Link 字段 Options",
				logger.String("field_id", field.ID().String()),
				logger.String("field_name", field.Name().String()),
				logger.String("fk_host_table_name", field.Options().Link.FkHostTableName),
				logger.String("self_key_name", field.Options().Link.SelfKeyName),
				logger.String("foreign_key_name", field.Options().Link.ForeignKeyName),
				logger.String("relationship", field.Options().Link.Relationship))
		}
		optionsJSON, err := json.Marshal(field.Options())
		if err == nil {
			optionsJSONStr := string(optionsJSON)
			optionsStr = &optionsJSONStr
			// ✨ 调试：记录序列化后的 JSON 内容（特别是 Link 字段）
			if field.Type().String() == "link" {
				logger.Info("ToFieldModel 序列化后的 JSON",
					logger.String("field_id", field.ID().String()),
					logger.String("field_name", field.Name().String()),
					logger.String("options_json", optionsJSONStr))
			}
		} else {
			logger.Error("ToFieldModel 序列化 Options 失败",
				logger.String("field_id", field.ID().String()),
				logger.String("field_name", field.Name().String()),
				logger.ErrorField(err))
		}
	}

	version := field.Version()
	updatedAt := field.UpdatedAt()

	// 处理布尔值（参考原版 dbCreateField 的字段设置）
	isComputed := field.IsComputed()
	isRequired := field.IsRequired()
	isUnique := field.IsUnique()
	isPrimary := field.IsPrimary()

	// 初始化布尔指针字段为 false（参考原版所有布尔字段都需要设置）
	falseVal := false
	notNull := &falseVal
	isLookup := &falseVal
	isMultipleCellValue := &falseVal
	hasError := &falseVal
	isPending := &falseVal

	// 设置Order字段
	orderValue := field.Order()

	dbField := &models.Field{
		ID:                  field.ID().String(),
		TableID:             field.TableID(),
		Name:                field.Name().String(),
		Type:                field.Type().String(),
		CellValueType:       field.Type().String(),
		DBFieldType:         field.DBFieldType(),
		DBFieldName:         field.DBFieldName().String(),
		IsComputed:          &isComputed,
		IsRequired:          isRequired,
		IsUnique:            isUnique,
		IsPrimary:           &isPrimary,
		NotNull:             notNull,
		IsLookup:            isLookup,
		IsMultipleCellValue: isMultipleCellValue,
		HasError:            hasError,
		IsPending:           isPending,
		FieldOrder:          field.Order(),
		Order:               &orderValue,
		Options:             optionsStr,
		Version:             &version,
		CreatedBy:           field.CreatedBy(),
		CreatedTime:         field.CreatedAt(),
		LastModifiedTime:    &updatedAt,
	}

	// Description
	if field.Description() != nil && *field.Description() != "" {
		dbField.Description = field.Description()
	}

	return dbField, nil
}

// ToFieldList 批量转换
func ToFieldList(dbFields []*models.Field) ([]*entity.Field, error) {
	fields := make([]*entity.Field, 0, len(dbFields))
	for _, dbField := range dbFields {
		field, err := ToFieldEntity(dbField)
		if err != nil {
			return nil, err
		}
		if field != nil {
			fields = append(fields, field)
		}
	}
	return fields, nil
}
