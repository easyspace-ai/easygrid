package application

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/valueobject"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"gorm.io/gorm"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// BatchService 批量操作服务
// 负责优化批量数据库操作，避免N+1查询问题
type BatchService struct {
	fieldRepo    repository.FieldRepository
	recordRepo   recordRepo.RecordRepository
	tableRepo    tableRepo.TableRepository
	dbProvider   database.DBProvider
	db           *gorm.DB
	errorService *ErrorService
	batchSize    int
	maxRetries   int
	retryDelay   time.Duration
}

// NewBatchService 创建批量操作服务
func NewBatchService(
	fieldRepo repository.FieldRepository,
	recordRepo recordRepo.RecordRepository,
	tableRepo tableRepo.TableRepository,
	dbProvider database.DBProvider,
	db *gorm.DB,
	errorService *ErrorService,
) *BatchService {
	return &BatchService{
		fieldRepo:    fieldRepo,
		recordRepo:   recordRepo,
		tableRepo:    tableRepo,
		dbProvider:  dbProvider,
		db:          db,
		errorService: errorService,
		batchSize:    100,                    // 默认批量大小（可根据数据量动态调整）
		maxRetries:   3,                      // 最大重试次数
		retryDelay:   100 * time.Millisecond, // 重试延迟
	}
}

// BatchUpdateStrategy 批量更新策略
type BatchUpdateStrategy int

const (
	// BatchUpdateAllOrNothing 全部成功或全部回滚
	BatchUpdateAllOrNothing BatchUpdateStrategy = iota
	// BatchUpdateBestEffort 尽力而为，返回成功和失败列表
	BatchUpdateBestEffort
)

// BatchUpdateResult 批量更新结果
type BatchUpdateResult struct {
	SuccessCount int
	FailedCount  int
	Errors       []string
}

// BatchUpdateRecords 批量更新记录
// ✅ 优化：支持两种事务策略（全部成功或部分成功）
func (s *BatchService) BatchUpdateRecords(ctx context.Context, updates []RecordUpdate) error {
	return s.BatchUpdateRecordsWithStrategy(ctx, updates, BatchUpdateBestEffort)
}

// BatchUpdateRecordsWithStrategy 批量更新记录（带策略）
func (s *BatchService) BatchUpdateRecordsWithStrategy(
	ctx context.Context,
	updates []RecordUpdate,
	strategy BatchUpdateStrategy,
) error {
	if len(updates) == 0 {
		return nil
	}

	// 按表分组
	updatesByTable := s.groupUpdatesByTable(updates)

	if strategy == BatchUpdateAllOrNothing {
		// 使用单个事务，全部成功或全部回滚
		return s.batchUpdateInTransaction(ctx, updatesByTable)
	} else {
		// 尽力而为，允许部分成功
		return s.batchUpdateBestEffort(ctx, updatesByTable)
	}
}

// batchUpdateInTransaction 在事务中批量更新（全部成功或全部回滚）
func (s *BatchService) batchUpdateInTransaction(ctx context.Context, updatesByTable map[string][]RecordUpdate) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 临时保存原始 db，使用事务 db
		originalDB := s.db
		s.db = tx
		defer func() { s.db = originalDB }()

		// 处理每个表的更新
		for tableID, tableUpdates := range updatesByTable {
			if err := s.batchUpdateTableRecords(ctx, tableID, tableUpdates); err != nil {
				return fmt.Errorf("failed to update table %s: %w", tableID, err)
			}
		}

		return nil
	})
}

// batchUpdateBestEffort 尽力而为批量更新（允许部分成功）
func (s *BatchService) batchUpdateBestEffort(ctx context.Context, updatesByTable map[string][]RecordUpdate) error {
	// 并发处理每个表的更新
	var wg sync.WaitGroup
	errChan := make(chan error, len(updatesByTable))

	for tableID, tableUpdates := range updatesByTable {
		wg.Add(1)
		go func(tID string, tUpdates []RecordUpdate) {
			defer wg.Done()
			if err := s.batchUpdateTableRecords(ctx, tID, tUpdates); err != nil {
				errChan <- fmt.Errorf("failed to update table %s: %w", tID, err)
			}
		}(tableID, tableUpdates)
	}

	// 等待所有goroutine完成
	go func() {
		wg.Wait()
		close(errChan)
	}()

	// 收集错误
	var lastError error
	for err := range errChan {
		if err != nil {
			lastError = err
			logger.Error("batch update error", logger.ErrorField(err))
		}
	}

	return lastError
}

// BatchCreateRecords 批量创建记录
func (s *BatchService) BatchCreateRecords(ctx context.Context, tableID string, records []*entity.Record) error {
	if len(records) == 0 {
		return nil
	}

	// 分批处理
	batches := s.splitIntoBatches(records, s.batchSize)

	for i, batch := range batches {
		// 使用BatchSave方法批量创建
		if err := s.recordRepo.BatchSave(ctx, batch); err != nil {
			return s.errorService.HandleDatabaseError(ctx, "BatchSave",
				fmt.Errorf("batch %d failed: %w", i, err))
		}

		logger.Debug("batch create completed",
			logger.String("table_id", tableID),
			logger.Int("batch_index", i),
			logger.Int("batch_size", len(batch)))
	}

	logger.Info("batch create records completed",
		logger.String("table_id", tableID),
		logger.Int("total_records", len(records)),
		logger.Int("total_batches", len(batches)))

	return nil
}

// BatchDeleteRecords 批量删除记录
func (s *BatchService) BatchDeleteRecords(ctx context.Context, tableID string, recordIDs []string) error {
	if len(recordIDs) == 0 {
		return nil
	}

	// 分批处理
	batches := s.splitStringIntoBatches(recordIDs, s.batchSize)

	for i, batch := range batches {
		// 转换字符串ID为RecordID类型
		recordIDs := make([]valueobject.RecordID, len(batch))
		for j, id := range batch {
			recordIDs[j] = valueobject.NewRecordID(id)
		}

		// 使用BatchDelete方法批量删除
		if err := s.recordRepo.BatchDelete(ctx, recordIDs); err != nil {
			return s.errorService.HandleDatabaseError(ctx, "BatchDelete",
				fmt.Errorf("batch %d failed: %w", i, err))
		}

		logger.Debug("batch delete completed",
			logger.String("table_id", tableID),
			logger.Int("batch_index", i),
			logger.Int("batch_size", len(batch)))
	}

	logger.Info("batch delete records completed",
		logger.String("table_id", tableID),
		logger.Int("total_records", len(recordIDs)),
		logger.Int("total_batches", len(batches)))

	return nil
}

// BatchQueryRecords 批量查询记录
func (s *BatchService) BatchQueryRecords(ctx context.Context, tableID string, recordIDs []string, fieldIDs []string) (map[string]map[string]interface{}, error) {
	if len(recordIDs) == 0 {
		return map[string]map[string]interface{}{}, nil
	}

	// 分批查询
	batches := s.splitStringIntoBatches(recordIDs, s.batchSize)
	result := make(map[string]map[string]interface{})

	for i, batch := range batches {
		// 转换字符串ID为RecordID类型
		recordIDs := make([]valueobject.RecordID, len(batch))
		for j, id := range batch {
			recordIDs[j] = valueobject.NewRecordID(id)
		}

		batchResult, err := s.recordRepo.FindByIDs(ctx, tableID, recordIDs)
		if err != nil {
			return nil, s.errorService.HandleDatabaseError(ctx, "FindByIDs",
				fmt.Errorf("batch %d failed: %w", i, err))
		}

		// 合并结果
		for _, record := range batchResult {
			recordData := record.Data().ToMap()

			// 如果指定了字段ID，只返回这些字段
			if len(fieldIDs) > 0 {
				filteredData := make(map[string]interface{})
				for _, fieldID := range fieldIDs {
					if value, exists := recordData[fieldID]; exists {
						filteredData[fieldID] = value
					}
				}
				result[record.ID().String()] = filteredData
			} else {
				result[record.ID().String()] = recordData
			}
		}

		logger.Debug("batch query completed",
			logger.String("table_id", tableID),
			logger.Int("batch_index", i),
			logger.Int("batch_size", len(batch)))
	}

	logger.Info("batch query records completed",
		logger.String("table_id", tableID),
		logger.Int("total_records", len(recordIDs)),
		logger.Int("total_batches", len(batches)),
		logger.Int("result_count", len(result)))

	return result, nil
}

// BatchQueryFields 批量查询字段
func (s *BatchService) BatchQueryFields(ctx context.Context, tableID string, fieldIDs []string) ([]*fieldEntity.Field, error) {
	if len(fieldIDs) == 0 {
		return []*fieldEntity.Field{}, nil
	}

	// 分批查询
	batches := s.splitStringIntoBatches(fieldIDs, s.batchSize)
	var result []*fieldEntity.Field

	for i, batch := range batches {
		// 使用现有的FindByTableID方法，然后过滤字段
		allFields, err := s.fieldRepo.FindByTableID(ctx, tableID)
		if err != nil {
			return nil, s.errorService.HandleDatabaseError(ctx, "FindByTableID",
				fmt.Errorf("batch %d failed: %w", i, err))
		}

		// 过滤出需要的字段
		var batchResult []*fieldEntity.Field
		for _, field := range allFields {
			for _, fieldID := range batch {
				if field.ID().String() == fieldID {
					batchResult = append(batchResult, field)
					break
				}
			}
		}

		result = append(result, batchResult...)

		logger.Debug("batch query fields completed",
			logger.String("table_id", tableID),
			logger.Int("batch_index", i),
			logger.Int("batch_size", len(batch)))
	}

	logger.Info("batch query fields completed",
		logger.String("table_id", tableID),
		logger.Int("total_fields", len(fieldIDs)),
		logger.Int("total_batches", len(batches)),
		logger.Int("result_count", len(result)))

	return result, nil
}

// calculateOptimalBatchSize 计算最优批量大小
// 根据数据量动态调整批量大小，避免单次 SQL 过大
func (s *BatchService) calculateOptimalBatchSize(recordCount int) int {
	// 基础批量大小
	baseSize := s.batchSize

	// 如果记录数较少，使用较小的批量大小
	if recordCount < 50 {
		return min(baseSize, recordCount)
	}

	// 如果记录数较多，适当增加批量大小（但不超过 500，避免 SQL 过大）
	if recordCount > 1000 {
		return min(500, recordCount)
	}

	// 中等数量，使用基础批量大小
	return baseSize
}

// min 返回两个整数中的较小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// batchUpdateTableRecords 批量更新单个表的记录
// ✅ 优化：使用 PostgreSQL 批量 UPDATE 代替逐条更新
// ✅ 优化：根据数据量动态调整批量大小
func (s *BatchService) batchUpdateTableRecords(ctx context.Context, tableID string, updates []RecordUpdate) error {
	// 合并同一记录的多个字段更新
	mergedUpdates := s.mergeRecordUpdates(updates)

	if len(mergedUpdates) == 0 {
		return nil
	}

	// 获取表信息
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取表信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("表不存在: %s", tableID)
	}

	baseID := table.BaseID()
	fullTableName := s.dbProvider.GenerateTableName(baseID, tableID)

	// 获取字段信息（用于确定字段类型）
	fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取字段列表失败: %w", err)
	}

	// 创建字段映射
	fieldMap := make(map[string]*fieldEntity.Field)
	for _, field := range fields {
		fieldMap[field.ID().String()] = field
	}

	// 按字段分组更新（每个字段一个批量 UPDATE）
	updatesByField := make(map[string]map[string]interface{}) // fieldID -> recordID -> value
	for _, update := range mergedUpdates {
		for fieldID, value := range update.FieldUpdates {
			if updatesByField[fieldID] == nil {
				updatesByField[fieldID] = make(map[string]interface{})
			}
			updatesByField[fieldID][update.RecordID] = value
		}
	}

	// ✅ 优化：根据记录数量动态调整批量大小
	optimalBatchSize := s.calculateOptimalBatchSize(len(updates))
	if optimalBatchSize != s.batchSize {
		logger.Info("动态调整批量大小",
			logger.String("table_id", tableID),
			logger.Int("original_size", s.batchSize),
			logger.Int("optimal_size", optimalBatchSize),
			logger.Int("total_updates", len(updates)))
	}

	// 对每个字段执行批量 UPDATE
	for fieldID, recordValues := range updatesByField {
		field, exists := fieldMap[fieldID]
		if !exists {
			logger.Warn("字段不存在，跳过更新",
				logger.String("table_id", tableID),
				logger.String("field_id", fieldID))
			continue
		}

		// 如果记录数超过最优批量大小，分批处理
		if len(recordValues) > optimalBatchSize {
			// 分批处理
			recordValueSlice := make([]struct {
				recordID string
				value    interface{}
			}, 0, len(recordValues))
			for recordID, value := range recordValues {
				recordValueSlice = append(recordValueSlice, struct {
					recordID string
					value    interface{}
				}{recordID: recordID, value: value})
			}

			// 分批执行
			for i := 0; i < len(recordValueSlice); i += optimalBatchSize {
				end := min(i+optimalBatchSize, len(recordValueSlice))
				batch := recordValueSlice[i:end]
				
				// 构建批量更新的 map
				batchMap := make(map[string]interface{})
				for _, item := range batch {
					batchMap[item.recordID] = item.value
				}

				// 执行批量更新
				if err := s.executeBatchUpdate(ctx, tableID, fieldID, field, fullTableName, batchMap); err != nil {
					return err
				}
			}
			continue
		}

		// 执行批量更新
		if err := s.executeBatchUpdate(ctx, tableID, fieldID, field, fullTableName, recordValues); err != nil {
			return err
		}
	}

	return nil
}

// executeBatchUpdate 执行批量更新
func (s *BatchService) executeBatchUpdate(
	ctx context.Context,
	tableID, fieldID string,
	field *fieldEntity.Field,
	fullTableName string,
	recordValues map[string]interface{},
) error {
	dbFieldName := field.DBFieldName().String()
	if dbFieldName == "" {
		logger.Warn("字段的 DBFieldName 为空，跳过更新",
			logger.String("table_id", tableID),
			logger.String("field_id", fieldID))
		return nil
	}

	// 构建批量 UPDATE SQL（使用 CASE WHEN）
	recordIDs := make([]string, 0, len(recordValues))
	caseClauses := make([]string, 0, len(recordValues))
	args := make([]interface{}, 0, len(recordValues)*2)

	for recordID, value := range recordValues {
		recordIDs = append(recordIDs, recordID)
		// 根据字段类型转换值
		convertedValue, err := s.convertFieldValue(value, field)
		if err != nil {
			logger.Warn("字段值转换失败，跳过",
				logger.String("table_id", tableID),
				logger.String("field_id", fieldID),
				logger.String("record_id", recordID),
				logger.ErrorField(err))
			continue
		}
		caseClauses = append(caseClauses, fmt.Sprintf("WHEN __id = $%d THEN $%d", len(args)+1, len(args)+2))
		args = append(args, recordID, convertedValue)
	}

	if len(caseClauses) == 0 {
		return nil
	}

	// 构建 WHERE 子句的占位符（从 args 长度之后开始）
	wherePlaceholders := make([]string, len(recordIDs))
	for i := range recordIDs {
		wherePlaceholders[i] = fmt.Sprintf("$%d", len(args)+i+1)
	}

	// 构建完整的 UPDATE SQL
	updateSQL := fmt.Sprintf(`
		UPDATE %s 
		SET %s = CASE 
			%s
		END,
		__last_modified_time = CURRENT_TIMESTAMP,
		__version = __version + 1
		WHERE __id IN (%s)
	`, 
		s.quoteIdentifier(fullTableName),
		s.quoteIdentifier(dbFieldName),
		strings.Join(caseClauses, " "),
		strings.Join(wherePlaceholders, ", "),
	)

	// 添加 recordIDs 到参数列表
	for _, recordID := range recordIDs {
		args = append(args, recordID)
	}

	// 执行批量 UPDATE
	if err := s.db.WithContext(ctx).Exec(updateSQL, args...).Error; err != nil {
		logger.Error("批量更新字段失败",
			logger.String("table_id", tableID),
			logger.String("field_id", fieldID),
			logger.String("db_field_name", dbFieldName),
			logger.ErrorField(err))
		return fmt.Errorf("批量更新字段失败: %w", err)
	}

	logger.Debug("批量更新字段成功",
		logger.String("table_id", tableID),
		logger.String("field_id", fieldID),
		logger.Int("record_count", len(recordIDs)))

	return nil
}

// convertFieldValue 根据字段类型转换值
func (s *BatchService) convertFieldValue(value interface{}, field *fieldEntity.Field) (interface{}, error) {
	fieldType := field.Type().String()

	switch fieldType {
	case "link", "multipleSelects", "multipleRecordLinks":
		// JSONB 类型，需要序列化为 JSON
		if value == nil {
			return nil, nil
		}
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			return nil, fmt.Errorf("序列化 JSON 失败: %w", err)
		}
		return string(jsonBytes), nil
	case "date", "dateTime":
		// 日期类型，保持原样
		return value, nil
	default:
		// 其他类型，直接返回
		return value, nil
	}
}

// quoteIdentifier 引用标识符（防止 SQL 注入）
func (s *BatchService) quoteIdentifier(identifier string) string {
	// PostgreSQL 使用双引号
	cleaned := strings.ReplaceAll(identifier, `"`, `""`)
	return fmt.Sprintf(`"%s"`, cleaned)
}


// groupUpdatesByTable 按表分组更新
func (s *BatchService) groupUpdatesByTable(updates []RecordUpdate) map[string][]RecordUpdate {
	groups := make(map[string][]RecordUpdate)

	for _, update := range updates {
		groups[update.TableID] = append(groups[update.TableID], update)
	}

	return groups
}

// mergeRecordUpdates 合并同一记录的多个字段更新
func (s *BatchService) mergeRecordUpdates(updates []RecordUpdate) []RecordUpdate {
	recordMap := make(map[string]*RecordUpdate)

	for _, update := range updates {
		key := update.RecordID
		if existing, exists := recordMap[key]; exists {
			// 合并字段更新
			for fieldID, value := range update.FieldUpdates {
				existing.FieldUpdates[fieldID] = value
			}
		} else {
			// 创建新的更新记录
			recordMap[key] = &RecordUpdate{
				TableID:      update.TableID,
				RecordID:     update.RecordID,
				FieldUpdates: make(map[string]interface{}),
			}
			// 复制字段更新
			for fieldID, value := range update.FieldUpdates {
				recordMap[key].FieldUpdates[fieldID] = value
			}
		}
	}

	// 转换为切片
	result := make([]RecordUpdate, 0, len(recordMap))
	for _, update := range recordMap {
		result = append(result, *update)
	}

	return result
}

// splitIntoBatches 将记录切片分批
func (s *BatchService) splitIntoBatches(records []*entity.Record, batchSize int) [][]*entity.Record {
	if batchSize <= 0 {
		batchSize = s.batchSize
	}

	var batches [][]*entity.Record
	for i := 0; i < len(records); i += batchSize {
		end := i + batchSize
		if end > len(records) {
			end = len(records)
		}
		batches = append(batches, records[i:end])
	}

	return batches
}

// splitStringIntoBatches 将字符串切片分批
func (s *BatchService) splitStringIntoBatches(items []string, batchSize int) [][]string {
	if batchSize <= 0 {
		batchSize = s.batchSize
	}

	var batches [][]string
	for i := 0; i < len(items); i += batchSize {
		end := i + batchSize
		if end > len(items) {
			end = len(items)
		}
		batches = append(batches, items[i:end])
	}

	return batches
}

// splitRecordUpdatesIntoBatches 将记录更新切片分批
func (s *BatchService) splitRecordUpdatesIntoBatches(updates []RecordUpdate, batchSize int) [][]RecordUpdate {
	if batchSize <= 0 {
		batchSize = s.batchSize
	}

	var batches [][]RecordUpdate
	for i := 0; i < len(updates); i += batchSize {
		end := i + batchSize
		if end > len(updates) {
			end = len(updates)
		}
		batches = append(batches, updates[i:end])
	}

	return batches
}

// GetOptimalBatchSize 获取最优批量大小
func (s *BatchService) GetOptimalBatchSize(totalRecords int) int {
	if totalRecords < 100 {
		return totalRecords
	}
	if totalRecords < 1000 {
		return 100
	}
	if totalRecords < 10000 {
		return 500
	}
	return 1000
}

// SetBatchSize 设置批量大小
func (s *BatchService) SetBatchSize(size int) {
	if size > 0 {
		s.batchSize = size
	}
}

// SetRetryConfig 设置重试配置
func (s *BatchService) SetRetryConfig(maxRetries int, retryDelay time.Duration) {
	s.maxRetries = maxRetries
	s.retryDelay = retryDelay
}

// RecordUpdate 记录更新结构
type RecordUpdate struct {
	TableID      string                 `json:"table_id"`
	RecordID     string                 `json:"record_id"`
	FieldUpdates map[string]interface{} `json:"field_updates"`
}
