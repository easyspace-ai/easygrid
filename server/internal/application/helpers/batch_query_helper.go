package helpers

import (
	"context"

	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldRepo "github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
)

// BatchQueryHelper 批量查询助手
// 用于优化N+1查询问题
type BatchQueryHelper struct {
	fieldRepo fieldRepo.FieldRepository
}

// NewBatchQueryHelper 创建批量查询助手
func NewBatchQueryHelper(fieldRepo fieldRepo.FieldRepository) *BatchQueryHelper {
	return &BatchQueryHelper{
		fieldRepo: fieldRepo,
	}
}

// BatchGetFieldsByIDs 批量获取字段（优化N+1查询）
// 注意：由于FieldRepository没有FindByIDs方法，这里使用循环调用FindByID
// 如果需要真正的批量查询优化，应该在FieldRepository中添加FindByIDs方法
func (h *BatchQueryHelper) BatchGetFieldsByIDs(ctx context.Context, fieldIDs []string) (map[string]*fieldEntity.Field, error) {
	if len(fieldIDs) == 0 {
		return make(map[string]*fieldEntity.Field), nil
	}

	// 构建字段ID到字段的映射
	fieldMap := make(map[string]*fieldEntity.Field, len(fieldIDs))
	
	// 循环查询每个字段（注意：这不是最优的，但FieldRepository接口不支持批量查询）
	for _, id := range fieldIDs {
		fieldID := fieldValueObject.NewFieldID(id)
		field, err := h.fieldRepo.FindByID(ctx, fieldID)
		if err != nil {
			// 如果某个字段查询失败，跳过它（不中断整个批量查询）
			continue
		}
		if field != nil {
			fieldMap[field.ID().String()] = field
		}
	}

	return fieldMap, nil
}

// BatchGetFieldsByTableID 根据表ID批量获取所有字段（并构建映射）
func (h *BatchQueryHelper) BatchGetFieldsByTableID(ctx context.Context, tableID string) (map[string]*fieldEntity.Field, error) {
	fields, err := h.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return nil, err
	}

	// 构建字段ID到字段的映射
	fieldMap := make(map[string]*fieldEntity.Field, len(fields))
	for _, field := range fields {
		fieldMap[field.ID().String()] = field
	}

	return fieldMap, nil
}

