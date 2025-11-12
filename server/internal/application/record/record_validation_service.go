package record

import (
	"context"
	"fmt"
	"strings"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	pkgerrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// TypecastService 类型转换服务接口（避免循环依赖）
type TypecastService interface {
	ValidateAndTypecastRecord(ctx context.Context, tableID string, data map[string]interface{}, allowTypecast bool) (map[string]interface{}, error)
}

// RecordValidationService 记录验证服务
// 职责：记录数据验证和转换
type RecordValidationService struct {
	fieldRepo      repository.FieldRepository
	typecastService TypecastService
}

// NewRecordValidationService 创建记录验证服务
func NewRecordValidationService(
	fieldRepo repository.FieldRepository,
	typecastService TypecastService,
) *RecordValidationService {
	return &RecordValidationService{
		fieldRepo:      fieldRepo,
		typecastService: typecastService,
	}
}

// ValidateRequiredFields 验证必填字段
func (s *RecordValidationService) ValidateRequiredFields(ctx context.Context, tableID string, data map[string]interface{}) error {
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

// ConvertFieldNamesToIDs 将字段名转换为字段ID
// 如果 updateData 中的键是字段名（如 "name"），则转换为字段ID（如 "fld_xxx"）
// 如果已经是字段ID，则保持不变
func (s *RecordValidationService) ConvertFieldNamesToIDs(ctx context.Context, tableID string, updateData map[string]interface{}) (map[string]interface{}, error) {
	if updateData == nil || len(updateData) == 0 {
		logger.Info("ConvertFieldNamesToIDs: 输入数据为空，直接返回",
			logger.String("table_id", tableID))
		return updateData, nil
	}

	logger.Info("开始字段名转换",
		logger.String("table_id", tableID),
		logger.Int("input_keys_count", len(updateData)))

	// 检查键的类型（字段名还是字段ID）
	fieldIDKeys := make([]string, 0)
	fieldNameKeys := make([]string, 0)

	for key := range updateData {
		if strings.HasPrefix(key, "fld_") {
			fieldIDKeys = append(fieldIDKeys, key)
		} else {
			fieldNameKeys = append(fieldNameKeys, key)
		}
	}

	// 如果所有键都是字段ID格式，直接返回
	if len(fieldIDKeys) > 0 && len(fieldNameKeys) == 0 {
		logger.Info("所有键都是字段ID格式，无需转换",
			logger.String("table_id", tableID))
		return updateData, nil
	}

	// 如果存在字段名，需要转换
	if len(fieldNameKeys) > 0 {
		// 获取表的所有字段
		fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
		if err != nil {
			return nil, fmt.Errorf("获取字段列表失败: %w", err)
		}

		// 构建字段名到字段ID的映射
		nameToID := make(map[string]string)
		for _, field := range fields {
			fieldName := field.Name().String()
			fieldID := field.ID().String()
			nameToID[fieldName] = fieldID
		}

		// 转换字段名为字段ID
		convertedData := make(map[string]interface{})
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
			} else {
				// 如果找不到对应的字段ID，保持原样
				convertedData[key] = value
				notFoundKeys = append(notFoundKeys, key)
				logger.Warn("字段名未找到对应字段ID，保持原样",
					logger.String("table_id", tableID),
					logger.String("key", key))
			}
		}

		logger.Info("字段名转换完成",
			logger.String("table_id", tableID),
			logger.Int("converted_count", len(fieldNameKeys)-len(notFoundKeys)),
			logger.Int("not_found_count", len(notFoundKeys)))

		return convertedData, nil
	}

	return updateData, nil
}

// ValidateAndTypecast 验证并类型转换记录数据
func (s *RecordValidationService) ValidateAndTypecast(ctx context.Context, tableID string, data map[string]interface{}, allowTypecast bool) (map[string]interface{}, error) {
	if s.typecastService == nil {
		return data, nil
	}

	return s.typecastService.ValidateAndTypecastRecord(ctx, tableID, data, allowTypecast)
}

// CleanRedundantKeys 清理冗余的字段名/字段ID键
// 如果新数据使用字段ID，删除旧数据中对应的字段名
// 如果新数据使用字段名，删除旧数据中对应的字段ID
// 返回清理后的数据映射
func (s *RecordValidationService) CleanRedundantKeys(
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

