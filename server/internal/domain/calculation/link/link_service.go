package link

import (
	"context"
	"fmt"

	"go.uber.org/zap"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
)

// FieldRepository 字段仓储接口
type FieldRepository interface {
	FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error)
	FindByID(ctx context.Context, fieldID string) (*entity.Field, error)
}

// RecordRepository 记录仓储接口
type RecordRepository interface {
	FindRecordsByLinkValue(ctx context.Context, tableID, linkFieldID string, linkedRecordIDs []string) ([]string, error)
}

// LinkService Link字段服务
// 处理Link字段的衍生影响
type LinkService struct {
	fieldRepo  FieldRepository
	recordRepo RecordRepository
	logger     *zap.Logger
}

// NewLinkService 创建Link服务
func NewLinkService(
	fieldRepo FieldRepository,
	recordRepo RecordRepository,
	logger *zap.Logger,
) *LinkService {
	return &LinkService{
		fieldRepo:  fieldRepo,
		recordRepo: recordRepo,
		logger:     logger,
	}
}

// GetAffectedRecordsByLink 获取受Link字段影响的记录
// 当表A的记录变化时，查找表B中通过Link字段引用这些记录的记录
func (s *LinkService) GetAffectedRecordsByLink(
	ctx context.Context,
	tableID string,
	fieldID string,
	recordIDs []string,
) (map[string][]string, error) {
	// 入口参数日志
	s.logger.Info("GetAffectedRecordsByLink: 入参",
		zap.String("table_id", tableID),
		zap.String("field_id", fieldID),
		zap.Int("record_ids_count", len(recordIDs)),
		zap.Any("record_ids", recordIDs),
	)
	if len(recordIDs) == 0 {
		s.logger.Info("GetAffectedRecordsByLink: 记录ID为空，直接返回空结果",
			zap.String("table_id", tableID))
		return make(map[string][]string), nil
	}

	// 查询哪些表有Link字段指向当前表
	linkFields, err := s.fieldRepo.FindLinkFieldsToTable(ctx, tableID)
	if err != nil {
		s.logger.Error("Failed to find link fields",
			zap.String("table_id", tableID),
			zap.Error(err),
		)
		return nil, fmt.Errorf("failed to find link fields: %w", err)
	}
	
	s.logger.Info("查找指向表的 Link 字段",
		zap.String("table_id", tableID),
		zap.Int("link_fields_count", len(linkFields)),
	)
	
	if len(linkFields) == 0 {
		s.logger.Info("没有找到指向该表的 Link 字段",
			zap.String("table_id", tableID),
		)
		return make(map[string][]string), nil
	}

	affectedRecords := make(map[string][]string)

	for _, linkField := range linkFields {
		// 查询链接到这些记录的目标记录
		targetTableID := linkField.TableID()
		linkFieldID := linkField.ID().String()
		
		s.logger.Info("查找引用记录的 Link 字段值",
			zap.String("link_field_id", linkFieldID),
			zap.String("target_table_id", targetTableID),
			zap.String("source_table_id", tableID),
			zap.Int("record_ids_count", len(recordIDs)),
		)
		
		linkedRecords, err := s.recordRepo.FindRecordsByLinkValue(
			ctx,
			targetTableID,
			linkFieldID,
			recordIDs,
		)
		if err != nil {
			s.logger.Error("Failed to find records by link value",
				zap.String("link_field_id", linkFieldID),
				zap.String("target_table_id", targetTableID),
				zap.Error(err),
			)
			continue
		}

		s.logger.Info("找到引用记录的记录",
			zap.String("link_field_id", linkFieldID),
			zap.String("target_table_id", targetTableID),
			zap.Int("linked_records_count", len(linkedRecords)),
			zap.Any("linked_records", linkedRecords),
		)

		if len(linkedRecords) > 0 {
			affectedRecords[targetTableID] = append(
				affectedRecords[targetTableID],
				linkedRecords...,
			)
		}
	}

	s.logger.Info("✅ Found affected records by link",
		zap.String("table_id", tableID),
		zap.Int("record_count", len(recordIDs)),
		zap.Int("link_fields_count", len(linkFields)),
		zap.Int("affected_tables", len(affectedRecords)),
		zap.Any("affected_tables", affectedRecords),
	)

	return affectedRecords, nil
}

// GetLinkDerivation 计算Link字段的衍生变更
// 返回因Link字段变化而受影响的记录
type LinkDerivation struct {
	AffectedRecords map[string][]string // tableID -> recordIDs
	CellChanges     []CellChange
}

type CellChange struct {
	TableID  string
	RecordID string
	FieldID  string
	OldValue interface{}
	NewValue interface{}
}

// GetLinkDerivation 获取Link字段的衍生影响
func (s *LinkService) GetLinkDerivation(
	ctx context.Context,
	tableID string,
	changes []CellChange,
) (*LinkDerivation, error) {
	derivation := &LinkDerivation{
		AffectedRecords: make(map[string][]string),
		CellChanges:     []CellChange{},
	}

	// 收集所有变更的记录ID
	recordIDSet := make(map[string]bool)
	for _, change := range changes {
		recordIDSet[change.RecordID] = true
	}

	recordIDs := make([]string, 0, len(recordIDSet))
	for recordID := range recordIDSet {
		recordIDs = append(recordIDs, recordID)
	}

	// 查找受影响的记录
	affectedRecords, err := s.GetAffectedRecordsByLink(ctx, tableID, "", recordIDs)
	if err != nil {
		return nil, err
	}

	derivation.AffectedRecords = affectedRecords

	return derivation, nil
}
