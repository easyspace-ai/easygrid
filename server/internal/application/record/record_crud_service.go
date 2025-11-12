package record

import (
	"context"
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/valueobject"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	pkgerrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// RecordCRUDService 记录CRUD服务
// 职责：基础的CRUD操作（不含计算、验证、广播）
type RecordCRUDService struct {
	recordRepo recordRepo.RecordRepository
	tableRepo tableRepo.TableRepository
}

// NewRecordCRUDService 创建记录CRUD服务
func NewRecordCRUDService(
	recordRepo recordRepo.RecordRepository,
	tableRepo tableRepo.TableRepository,
) *RecordCRUDService {
	return &RecordCRUDService{
		recordRepo: recordRepo,
		tableRepo:  tableRepo,
	}
}

// CreateRecord 创建记录实体并保存（不含验证、计算、广播）
func (s *RecordCRUDService) CreateRecord(ctx context.Context, tableID string, recordData map[string]interface{}, userID string) (*entity.Record, error) {
	// 检查表是否存在
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找表失败: %v", err))
	}
	if table == nil {
		return nil, pkgerrors.ErrTableNotFound.WithDetails(map[string]interface{}{
			"table_id": tableID,
		})
	}

	// 创建记录数据值对象
	data, err := valueobject.NewRecordData(recordData)
	if err != nil {
		return nil, pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("记录数据无效: %v", err))
	}

	// 创建记录实体
	record, err := entity.NewRecord(tableID, data, userID)
	if err != nil {
		return nil, pkgerrors.ErrInternalServer.WithDetails(fmt.Sprintf("创建记录实体失败: %v", err))
	}

	// 保存记录
	if err := s.recordRepo.Save(ctx, record); err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("保存记录失败: %v", err))
	}

	logger.Info("记录创建成功",
		logger.String("record_id", record.ID().String()),
		logger.String("table_id", tableID))

	return record, nil
}

// GetRecord 获取记录（不含计算）
func (s *RecordCRUDService) GetRecord(ctx context.Context, tableID, recordID string) (*entity.Record, error) {
	id := valueobject.NewRecordID(recordID)

	record, err := s.recordRepo.FindByTableAndID(ctx, tableID, id)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找记录失败: %v", err))
	}
	if record == nil {
		return nil, pkgerrors.ErrNotFound.WithDetails("记录不存在")
	}

	return record, nil
}

// UpdateRecord 更新记录实体（不含验证、计算、广播）
func (s *RecordCRUDService) UpdateRecord(ctx context.Context, tableID, recordID string, newData map[string]interface{}, userID string) (*entity.Record, error) {
	// 查找记录
	id := valueobject.NewRecordID(recordID)
	records, err := s.recordRepo.FindByIDs(ctx, tableID, []valueobject.RecordID{id})
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找记录失败: %v", err))
	}
	if len(records) == 0 {
		return nil, pkgerrors.ErrNotFound.WithDetails("记录不存在")
	}
	record := records[0]

	// 创建新数据值对象
	data, err := valueobject.NewRecordData(newData)
	if err != nil {
		return nil, pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("记录数据无效: %v", err))
	}

	// 更新记录
	if err := record.Update(data, userID); err != nil {
		return nil, pkgerrors.ErrInternalServer.WithDetails(fmt.Sprintf("更新记录失败: %v", err))
	}

	// 保存记录
	if err := s.recordRepo.Save(ctx, record); err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("保存记录失败: %v", err))
	}

	logger.Info("记录更新成功",
		logger.String("record_id", recordID),
		logger.String("table_id", tableID))

	return record, nil
}

// DeleteRecord 删除记录（不含Link清理、广播）
func (s *RecordCRUDService) DeleteRecord(ctx context.Context, tableID, recordID string) error {
	id := valueobject.NewRecordID(recordID)

	// 检查记录是否存在
	record, err := s.recordRepo.FindByTableAndID(ctx, tableID, id)
	if err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找记录失败: %v", err))
	}
	if record == nil {
		return pkgerrors.ErrNotFound.WithDetails("记录不存在")
	}

	// 删除记录
	if err := s.recordRepo.DeleteByTableAndID(ctx, tableID, id); err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("删除记录失败: %v", err))
	}

	logger.Info("记录删除成功",
		logger.String("record_id", recordID),
		logger.String("table_id", tableID))

	return nil
}

// ListRecords 列出记录（不含计算）
func (s *RecordCRUDService) ListRecords(ctx context.Context, tableID string, limit, offset int) ([]*entity.Record, int64, error) {
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

	return records, total, nil
}

// BatchCreateRecords 批量创建记录（不含验证、计算、广播）
func (s *RecordCRUDService) BatchCreateRecords(ctx context.Context, tableID string, recordsData []map[string]interface{}, userID string) ([]*entity.Record, []error) {
	successRecords := make([]*entity.Record, 0, len(recordsData))
	errorsList := make([]error, 0)

	for i, data := range recordsData {
		record, err := s.CreateRecord(ctx, tableID, data, userID)
		if err != nil {
			errorsList = append(errorsList, fmt.Errorf("记录%d创建失败: %w", i+1, err))
			continue
		}
		successRecords = append(successRecords, record)
	}

	return successRecords, errorsList
}

// BatchUpdateRecords 批量更新记录（不含验证、计算、广播）
func (s *RecordCRUDService) BatchUpdateRecords(ctx context.Context, tableID string, updates []struct {
	RecordID string
	Data     map[string]interface{}
}, userID string) ([]*entity.Record, []error) {
	successRecords := make([]*entity.Record, 0, len(updates))
	errorsList := make([]error, 0)

	for _, update := range updates {
		record, err := s.UpdateRecord(ctx, tableID, update.RecordID, update.Data, userID)
		if err != nil {
			errorsList = append(errorsList, fmt.Errorf("记录%s更新失败: %w", update.RecordID, err))
			continue
		}
		successRecords = append(successRecords, record)
	}

	return successRecords, errorsList
}

// BatchDeleteRecords 批量删除记录（不含Link清理、广播）
func (s *RecordCRUDService) BatchDeleteRecords(ctx context.Context, tableID string, recordIDs []string) (int, []error) {
	successCount := 0
	errorsList := make([]error, 0)

	for _, recordID := range recordIDs {
		if err := s.DeleteRecord(ctx, tableID, recordID); err != nil {
			errorsList = append(errorsList, fmt.Errorf("记录%s删除失败: %w", recordID, err))
			continue
		}
		successCount++
	}

	return successCount, errorsList
}

