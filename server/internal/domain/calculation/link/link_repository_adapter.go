package link

import (
	"context"
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldRepo "github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
)

// LinkFieldRepositoryAdapter 适配器：将 FieldRepository 适配为 LinkService 需要的 FieldRepository 接口
type LinkFieldRepositoryAdapter struct {
	repo fieldRepo.FieldRepository
}

// NewLinkFieldRepositoryAdapter 创建 LinkFieldRepository 适配器
func NewLinkFieldRepositoryAdapter(repo fieldRepo.FieldRepository) FieldRepository {
	return &LinkFieldRepositoryAdapter{repo: repo}
}

// FindLinkFieldsToTable 查找所有指向指定表的 Link 字段
func (a *LinkFieldRepositoryAdapter) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error) {
	return a.repo.FindLinkFieldsToTable(ctx, tableID)
}

// FindByID 根据字段ID查找字段
func (a *LinkFieldRepositoryAdapter) FindByID(ctx context.Context, fieldID string) (*entity.Field, error) {
	fieldIDVO := fieldValueObject.NewFieldID(fieldID)
	return a.repo.FindByID(ctx, fieldIDVO)
}

// LinkRecordRepositoryAdapter 适配器：将 RecordRepository 适配为 LinkService 需要的 RecordRepository 接口
type LinkRecordRepositoryAdapter struct {
	repo recordRepo.RecordRepository
}

// NewLinkRecordRepositoryAdapter 创建 LinkRecordRepository 适配器
func NewLinkRecordRepositoryAdapter(repo recordRepo.RecordRepository) RecordRepository {
	return &LinkRecordRepositoryAdapter{repo: repo}
}

// FindRecordsByLinkValue 查找 Link 字段值包含指定 recordIDs 的所有记录
func (a *LinkRecordRepositoryAdapter) FindRecordsByLinkValue(
	ctx context.Context,
	tableID string,
	linkFieldID string,
	linkedRecordIDs []string,
) ([]string, error) {
	// 检查 repo 是否实现了 FindRecordsByLinkValue 方法
	// 支持 RecordRepositoryDynamic 和 CachedRecordRepository
	if repoWithMethod, ok := a.repo.(interface {
		FindRecordsByLinkValue(ctx context.Context, tableID string, linkFieldID string, linkedRecordIDs []string) ([]string, error)
	}); ok {
		return repoWithMethod.FindRecordsByLinkValue(ctx, tableID, linkFieldID, linkedRecordIDs)
	}

	// 否则，返回未实现错误
	return nil, fmt.Errorf("method FindRecordsByLinkValue is not implemented for RecordRepository")
}

