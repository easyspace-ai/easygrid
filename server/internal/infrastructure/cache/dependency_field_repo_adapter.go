package cache

import (
	"context"

	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldRepo "github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
)

// FieldRepositoryAdapter 将fieldRepo.FieldRepository适配为dependency.FieldRepository接口
type FieldRepositoryAdapter struct {
	FieldRepo fieldRepo.FieldRepository
}

// FindByTableID 根据表ID查询所有字段
func (a *FieldRepositoryAdapter) FindByTableID(ctx context.Context, tableID string) ([]*fieldEntity.Field, error) {
	return a.FieldRepo.FindByTableID(ctx, tableID)
}

// FindByID 根据字段ID查询字段
func (a *FieldRepositoryAdapter) FindByID(ctx context.Context, fieldID string) (*fieldEntity.Field, error) {
	fieldIDVO := fieldValueObject.NewFieldID(fieldID)
	return a.FieldRepo.FindByID(ctx, fieldIDVO)
}

// FindLinkFieldsToTable 查找指向指定表的Link字段
func (a *FieldRepositoryAdapter) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*fieldEntity.Field, error) {
	// FieldRepository接口已经有这个方法，直接调用
	return a.FieldRepo.FindLinkFieldsToTable(ctx, tableID)
}

