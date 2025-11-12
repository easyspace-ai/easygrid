package record

import (
	"context"
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	tableService "github.com/easyspace-ai/luckdb/server/internal/domain/table/service"
	infraRepository "github.com/easyspace-ai/luckdb/server/internal/infrastructure/repository"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// RecordLinkService Link字段相关操作服务
// 职责：Link字段相关操作
type RecordLinkService struct {
	recordRepo recordRepo.RecordRepository
	fieldRepo  repository.FieldRepository
	linkService *tableService.LinkService
}

// NewRecordLinkService 创建Link字段服务
func NewRecordLinkService(
	recordRepo recordRepo.RecordRepository,
	fieldRepo repository.FieldRepository,
	linkService *tableService.LinkService,
) *RecordLinkService {
	return &RecordLinkService{
		recordRepo: recordRepo,
		fieldRepo:  fieldRepo,
		linkService: linkService,
	}
}

// ExtractLinkCellContexts 提取Link单元格上下文
func (s *RecordLinkService) ExtractLinkCellContexts(
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

	// 检查每个字段是否为Link字段
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

// IsLinkCellValue 判断是否为 Link 单元格值（公开方法）
func (s *RecordLinkService) IsLinkCellValue(value interface{}) bool {
	return s.isLinkCellValue(value)
}

// isLinkCellValue 判断是否为Link单元格值（内部方法）
func (s *RecordLinkService) isLinkCellValue(value interface{}) bool {
	if value == nil {
		return false
	}

	// 检查是否为单个LinkCellValue
	if m, ok := value.(map[string]interface{}); ok {
		if id, exists := m["id"]; exists && id != nil {
			return true
		}
	}

	// 检查是否为LinkCellValue数组
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

// CleanupLinkReferences 清理Link字段引用
// 当删除记录时，需要从所有引用该记录的Link字段中移除该记录的引用
func (s *RecordLinkService) CleanupLinkReferences(ctx context.Context, tableID, recordID string) error {
	// 1. 查找所有指向该表的Link字段
	linkFields, err := s.fieldRepo.FindLinkFieldsToTable(ctx, tableID)
	if err != nil {
		return fmt.Errorf("查找Link字段失败: %w", err)
	}

	if len(linkFields) == 0 {
		return nil // 没有Link字段引用该表
	}

	logger.Info("开始清理Link字段引用",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID),
		logger.Int("link_field_count", len(linkFields)))

	// 2. 对每个Link字段，查找包含该记录引用的所有记录
	for _, linkField := range linkFields {
		linkTableID := linkField.TableID()
		linkFieldID := linkField.ID().String()

		// 查找包含该记录引用的所有记录
		recordRepoDynamic, ok := s.recordRepo.(*infraRepository.RecordRepositoryDynamic)
		if !ok {
			logger.Warn("RecordRepository不是RecordRepositoryDynamic类型，跳过Link清理",
				logger.String("link_field_id", linkFieldID))
			continue
		}

		referencingRecordIDs, err := recordRepoDynamic.FindRecordsByLinkValue(
			ctx, linkTableID, linkFieldID, []string{recordID})
		if err != nil {
			logger.Warn("查找引用记录失败",
				logger.String("link_field_id", linkFieldID),
				logger.String("link_table_id", linkTableID),
				logger.ErrorField(err))
			continue
		}

		if len(referencingRecordIDs) == 0 {
			continue // 没有记录引用该记录
		}

		// 3. 从这些记录的Link字段中移除该记录的引用
		for _, refRecordID := range referencingRecordIDs {
			if err := s.RemoveLinkReference(ctx, linkTableID, refRecordID, linkFieldID, recordID); err != nil {
				logger.Warn("移除Link引用失败",
					logger.String("link_field_id", linkFieldID),
					logger.String("ref_record_id", refRecordID),
					logger.ErrorField(err))
				// 继续处理其他记录
			}
		}
	}

	logger.Info("Link字段引用清理完成",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID))

	return nil
}

// RemoveLinkReference 移除Link引用
func (s *RecordLinkService) RemoveLinkReference(ctx context.Context, tableID, recordID, fieldID, linkedRecordID string) error {
	// 获取数据库连接
	recordRepoDynamic, ok := s.recordRepo.(*infraRepository.RecordRepositoryDynamic)
	if !ok {
		return fmt.Errorf("RecordRepository不是RecordRepositoryDynamic类型")
	}

	db := recordRepoDynamic.GetDB()

	// 构建更新SQL（使用jsonb操作符移除引用）
	// 这里需要根据实际的Link字段存储格式来实现
	// 假设Link字段存储为JSONB格式，包含id数组或对象数组
	updateSQL := `
		UPDATE "record" 
		SET data = jsonb_set(
			data,
			ARRAY[$1::text],
			COALESCE(
				(
					SELECT jsonb_agg(elem)
					FROM jsonb_array_elements(data->$1::text) elem
					WHERE elem->>'id' != $2::text
				),
				'[]'::jsonb
			)
		)
		WHERE __id = $3
	`

	// 执行更新
	if err := db.WithContext(ctx).Exec(updateSQL, fieldID, linkedRecordID, recordID).Error; err != nil {
		return fmt.Errorf("更新Link字段失败: %w", err)
	}

	return nil
}

