package service

import (
	"context"
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldRepo "github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	recordValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/record/valueobject"
)

// LinkFieldRepositoryAdapter 适配器：将 FieldRepository 适配为 LinkFieldRepository
type LinkFieldRepositoryAdapter struct {
	repo fieldRepo.FieldRepository
}

// NewLinkFieldRepositoryAdapter 创建 LinkFieldRepository 适配器
func NewLinkFieldRepositoryAdapter(repo fieldRepo.FieldRepository) LinkFieldRepository {
	return &LinkFieldRepositoryAdapter{repo: repo}
}

// FindByID 根据字段ID查找字段
func (a *LinkFieldRepositoryAdapter) FindByID(ctx context.Context, fieldID string) (*entity.Field, error) {
	fieldIDVO := fieldValueObject.NewFieldID(fieldID)
	return a.repo.FindByID(ctx, fieldIDVO)
}

// FindByIDs 根据字段ID列表查找字段
func (a *LinkFieldRepositoryAdapter) FindByIDs(ctx context.Context, fieldIDs []string) ([]*entity.Field, error) {
	// 逐个查找字段（因为 FieldRepository 没有 FindByIDs 方法）
	fields := make([]*entity.Field, 0, len(fieldIDs))
	for _, id := range fieldIDs {
		fieldIDVO := fieldValueObject.NewFieldID(id)
		field, err := a.repo.FindByID(ctx, fieldIDVO)
		if err != nil {
			continue
		}
		if field != nil {
			fields = append(fields, field)
		}
	}
	return fields, nil
}

// FindByTableID 根据表ID查找字段列表
func (a *LinkFieldRepositoryAdapter) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	return a.repo.FindByTableID(ctx, tableID)
}

// LinkRecordRepositoryAdapter 适配器：将 RecordRepository 适配为 LinkRecordRepository
type LinkRecordRepositoryAdapter struct {
	repo recordRepo.RecordRepository
}

// NewLinkRecordRepositoryAdapter 创建 LinkRecordRepository 适配器
func NewLinkRecordRepositoryAdapter(repo recordRepo.RecordRepository) LinkRecordRepository {
	return &LinkRecordRepositoryAdapter{repo: repo}
}

// FindByIDs 根据记录ID列表查找记录
func (a *LinkRecordRepositoryAdapter) FindByIDs(ctx context.Context, tableID string, recordIDs []string) (map[string]map[string]interface{}, error) {
	if len(recordIDs) == 0 {
		return make(map[string]map[string]interface{}), nil
	}

	// 转换字符串ID为 RecordID
	recordIDVOs := make([]recordValueObject.RecordID, 0, len(recordIDs))
	for _, id := range recordIDs {
		recordIDVO := recordValueObject.NewRecordID(id)
		recordIDVOs = append(recordIDVOs, recordIDVO)
	}

	// 从 RecordRepository 获取记录
	records, err := a.repo.FindByIDs(ctx, tableID, recordIDVOs)
	if err != nil {
		return nil, fmt.Errorf("查找记录失败: %w", err)
	}

	// 转换为 map[string]map[string]interface{}
	result := make(map[string]map[string]interface{})
	for _, record := range records {
		if record == nil {
			continue
		}
		recordID := record.ID().String()
		// 将 Record 实体转换为 map
		result[recordID] = record.Data().ToMap()
	}

	return result, nil
}

// UpdateField 更新记录字段
func (a *LinkRecordRepositoryAdapter) UpdateField(ctx context.Context, tableID, recordID, fieldID string, value interface{}) error {
	// 获取记录
	recordIDVO := recordValueObject.NewRecordID(recordID)

	record, err := a.repo.FindByTableAndID(ctx, tableID, recordIDVO)
	if err != nil {
		return fmt.Errorf("查找记录失败: %w", err)
	}
	if record == nil {
		return fmt.Errorf("记录不存在: %s", recordID)
	}

	// 更新字段值
	data := record.Data().ToMap()
	data[fieldID] = value

	// 转换为 RecordData
	newData, err := recordValueObject.NewRecordData(data)
	if err != nil {
		return fmt.Errorf("创建记录数据失败: %w", err)
	}

	// 更新记录
	if err := record.Update(newData, record.UpdatedBy()); err != nil {
		return fmt.Errorf("更新记录失败: %w", err)
	}

	// 保存记录
	return a.repo.Save(ctx, record)
}

// BatchUpdateFields 批量更新字段
func (a *LinkRecordRepositoryAdapter) BatchUpdateFields(ctx context.Context, tableID string, updates []FieldUpdate) error {
	// 按记录ID分组
	recordUpdates := make(map[string]map[string]interface{})
	for _, update := range updates {
		if recordUpdates[update.RecordID] == nil {
			recordUpdates[update.RecordID] = make(map[string]interface{})
		}
		recordUpdates[update.RecordID][update.FieldID] = update.Value
	}

	// 批量获取记录
	recordIDs := make([]string, 0, len(recordUpdates))
	for recordID := range recordUpdates {
		recordIDs = append(recordIDs, recordID)
	}

	records, err := a.FindByIDs(ctx, tableID, recordIDs)
	if err != nil {
		return fmt.Errorf("批量查找记录失败: %w", err)
	}

	// 批量更新记录
	for recordID, fieldUpdates := range recordUpdates {
		recordData, exists := records[recordID]
		if !exists {
			continue
		}

		// 合并更新
		for fieldID, value := range fieldUpdates {
			recordData[fieldID] = value
		}

		// 获取记录实体并更新
		recordIDVO := recordValueObject.NewRecordID(recordID)

		record, err := a.repo.FindByTableAndID(ctx, tableID, recordIDVO)
		if err != nil || record == nil {
			continue
		}

		// 转换为 RecordData
		newData, err := recordValueObject.NewRecordData(recordData)
		if err != nil {
			continue
		}

		// 更新记录
		if err := record.Update(newData, record.UpdatedBy()); err != nil {
			continue
		}

		// 保存记录
		if err := a.repo.Save(ctx, record); err != nil {
			return fmt.Errorf("批量保存记录失败: %w", err)
		}
	}

	return nil
}

