package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/valueobject"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	pkgDatabase "github.com/easyspace-ai/luckdb/server/pkg/database"
	"github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// RecordRepositoryDynamic 记录仓储实现（完全动态表架构）
// 严格按照旧系统实现：每个Table的Record存储在独立的物理表中
type RecordRepositoryDynamic struct {
	db         *gorm.DB
	dbProvider database.DBProvider
	tableRepo  tableRepo.TableRepository
	fieldRepo  repository.FieldRepository
	fieldCache *FieldMappingCache // ✅ 字段映射缓存
}

// GetDB 获取数据库连接（用于事务管理）
func (r *RecordRepositoryDynamic) GetDB() *gorm.DB {
	return r.db
}

// NewRecordRepositoryDynamic 创建记录仓储（完全动态表架构）
func NewRecordRepositoryDynamic(
	db *gorm.DB,
	dbProvider database.DBProvider,
	tableRepo tableRepo.TableRepository,
	fieldRepo repository.FieldRepository,
) recordRepo.RecordRepository {
	return &RecordRepositoryDynamic{
		db:         db,
		dbProvider: dbProvider,
		tableRepo:  tableRepo,
		fieldRepo:  fieldRepo,
		fieldCache: NewFieldMappingCache(),
	}
}

// ==================== 核心查询方法 ====================

// FindByID 根据ID查找记录（从物理表查询）
// ⚠️ 废弃：此方法需要 record_meta 表（已移除），请使用 FindByIDs(tableID, []recordID) 替代
// 参考旧系统：Teable 不支持只通过 record_id 查找，必须提供 table_id
func (r *RecordRepositoryDynamic) FindByID(ctx context.Context, id valueobject.RecordID) (*entity.Record, error) {
	// ❌ 已移除对 record_meta 的依赖（对齐 Teable 架构）
	// Teable 所有 API 都需要提供 table_id，不支持只用 record_id 查找
	return nil, fmt.Errorf("FindByID is deprecated: please use FindByIDs with table_id instead")
}

// FindTableIDByRecordID 通过记录ID查找表ID（临时兼容方法）
// 这个方法用于支持旧路由，通过查询所有表来找到包含该记录的表
func (r *RecordRepositoryDynamic) FindTableIDByRecordID(ctx context.Context, recordID valueobject.RecordID) (string, error) {
	recordIDStr := recordID.String()

	// 1. 直接查询数据库获取所有表
	var tables []struct {
		ID     string `gorm:"column:id"`
		BaseID string `gorm:"column:base_id"`
	}

	err := r.db.WithContext(ctx).
		Table("table_meta").
		Select("id, base_id").
		Where("deleted_time IS NULL").
		Find(&tables).Error

	if err != nil {
		return "", fmt.Errorf("获取表列表失败: %w", err)
	}

	// 2. 遍历所有表，查找包含该记录的表
	for _, table := range tables {
		tableID := table.ID
		baseID := table.BaseID

		// 3. 构建物理表名
		fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

		// 4. 查询该表是否包含该记录
		var count int64
		err := r.db.WithContext(ctx).
			Table(fullTableName).
			Where("__id = ?", recordIDStr).
			Count(&count).Error

		if err != nil {
			// 如果表不存在，继续下一个
			continue
		}

		if count > 0 {
			return tableID, nil
		}
	}

	return "", fmt.Errorf("记录不存在: %s", recordIDStr)
}

// FindByIDs 根据ID列表查询记录（需要提供 tableID）
// ✅ 对齐 Teable 架构：所有记录操作都需要 tableID
func (r *RecordRepositoryDynamic) FindByIDs(ctx context.Context, tableID string, ids []valueobject.RecordID) ([]*entity.Record, error) {
	if len(ids) == 0 {
		return []*entity.Record{}, nil
	}

	logger.Info("正在从物理表查询记录列表",
		logger.String("table_id", tableID),
		logger.Int("record_count", len(ids)))

	// 1. 获取 Table 信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return nil, fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		// ✅ 返回 AppError 而不是普通错误，确保返回 404 而不是 500
		return nil, errors.ErrTableNotFound.WithDetails(tableID)
	}

	baseID := table.BaseID()

	// 2. 获取字段列表
	fields, err := r.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return nil, fmt.Errorf("获取字段列表失败: %w", err)
	}

	// 调试：记录字段列表信息
	logger.Info("FindByIDs: 获取字段列表",
		logger.String("table_id", tableID),
		logger.Int("field_count", len(fields)))
	for i, field := range fields {
		logger.Info("FindByIDs: 字段信息",
			logger.String("table_id", tableID),
			logger.Int("field_index", i),
			logger.String("field_id", field.ID().String()),
			logger.String("field_name", field.Name().String()),
			logger.String("field_type", field.Type().String()),
			logger.String("db_field_name", field.DBFieldName().String()))
	}

	// 3. ✅ 从物理表查询（使用完整表名）
	fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

	// 构建 SELECT 列
	selectCols := []string{
		"__id",
		"__auto_number",
		"__created_time",
		"__created_by",
		"__last_modified_time",
		"__last_modified_by",
		"__version",
	}

	// 选择所有字段的数据库列（包括虚拟字段的计算结果列）
	// 过滤掉空字符串，避免 SQL 语法错误
	userFieldCount := 0
	for _, field := range fields {
		dbFieldName := field.DBFieldName().String()
		if dbFieldName != "" {
			selectCols = append(selectCols, dbFieldName)
			userFieldCount++
		} else {
			logger.Warn("FindByIDs: 字段的 DBFieldName 为空，跳过",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()),
				logger.String("field_name", field.Name().String()),
				logger.String("field_type", field.Type().String()))
		}
	}
	
	logger.Info("FindByIDs: 构建 SELECT 列",
		logger.String("table_id", tableID),
		logger.Int("total_field_count", len(fields)),
		logger.Int("user_field_count", userFieldCount),
		logger.Int("select_col_count", len(selectCols)),
		logger.Any("select_cols", selectCols))

	// 转换 ID 为字符串数组
	recordIDStrs := make([]string, len(ids))
	for i, id := range ids {
		recordIDStrs[i] = id.String()
	}

	// 查询指定 ID 的记录
	var results []map[string]interface{}
	err = r.db.WithContext(ctx).
		Table(fullTableName).
		Select(selectCols).
		Where("__id IN ?", recordIDStrs).
		Find(&results).Error

	if err != nil {
		logger.Error("从物理表查询记录失败",
			logger.String("table_id", tableID),
			logger.String("physical_table", fullTableName),
			logger.Strings("select_cols", selectCols),
			logger.Strings("record_ids", recordIDStrs),
			logger.ErrorField(err))
		return nil, err
	}
	
	// ✅ 添加详细日志：查询结果
	logger.Debug("查询结果详情",
		logger.String("table_id", tableID),
		logger.String("physical_table", fullTableName),
		logger.Int("result_count", len(results)),
		logger.Int("requested_count", len(ids)))
	
	for i, result := range results {
		logger.Debug("查询结果详情",
			logger.Int("index", i),
			logger.Any("result_keys", getMapKeys(result)),
			logger.String("record_id", fmt.Sprintf("%v", result["__id"])))
	}

	// 4. 转换为实体
	records := make([]*entity.Record, 0, len(results))
	for _, result := range results {
		// 使用辅助方法转换
		record, err := r.toDomainEntity(result, fields, tableID)
		if err != nil {
			logger.Warn("转换记录实体失败，跳过",
				logger.String("record_id", fmt.Sprintf("%v", result["__id"])),
				logger.ErrorField(err))
			continue
		}
		records = append(records, record)
	}

	logger.Info("✅ 从物理表查询记录成功",
		logger.String("table_id", tableID),
		logger.Int("requested_count", len(ids)),
		logger.Int("found_count", len(records)))
	
	if len(records) == 0 {
		logger.Warn("⚠️ FindByIDs: 查询成功但未找到记录",
			logger.String("table_id", tableID),
			logger.Strings("requested_ids", recordIDStrs))
	}

	return records, nil
}

// FindByTableAndID 根据表ID和记录ID查找单条记录
// ✅ 对齐 Teable 架构：所有记录操作都需要 tableID
func (r *RecordRepositoryDynamic) FindByTableAndID(ctx context.Context, tableID string, id valueobject.RecordID) (*entity.Record, error) {
	logger.Info("FindByTableAndID: 开始查询",
		logger.String("table_id", tableID),
		logger.String("record_id", id.String()))
	
	records, err := r.FindByIDs(ctx, tableID, []valueobject.RecordID{id})
	if err != nil {
		logger.Error("FindByTableAndID: FindByIDs 失败",
			logger.String("table_id", tableID),
			logger.String("record_id", id.String()),
			logger.ErrorField(err))
		return nil, err
	}
	if len(records) == 0 {
		logger.Warn("FindByTableAndID: 记录不存在",
			logger.String("table_id", tableID),
			logger.String("record_id", id.String()))
		return nil, nil // 记录不存在
	}
	logger.Info("FindByTableAndID: 查询成功",
		logger.String("table_id", tableID),
		logger.String("record_id", id.String()))
	return records[0], nil
}

// FindByTableID 查找表的所有记录（从物理表查询）
func (r *RecordRepositoryDynamic) FindByTableID(ctx context.Context, tableID string) ([]*entity.Record, error) {
	logger.Info("正在从物理表查询记录列表",
		logger.String("table_id", tableID))

	// 1. 获取 Table 信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return nil, fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		// ✅ 返回 AppError 而不是普通错误，确保返回 404 而不是 500
		return nil, errors.ErrTableNotFound.WithDetails(tableID)
	}

	baseID := table.BaseID()

	// 2. 获取字段列表
	fields, err := r.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return nil, fmt.Errorf("获取字段列表失败: %w", err)
	}

	// 3. ✅ 从物理表查询列表（使用完整表名）
	fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

	// 构建 SELECT 列
	selectCols := []string{
		"__id",
		"__auto_number",
		"__created_time",
		"__created_by",
		"__last_modified_time",
		"__last_modified_by",
		"__version",
	}

	// 选择所有字段的数据库列（包括虚拟字段的计算结果列）
	// 过滤掉空字符串，避免 SQL 语法错误
	for _, field := range fields {
		dbFieldName := field.DBFieldName().String()
		if dbFieldName != "" {
			selectCols = append(selectCols, dbFieldName)
		}
	}

	// 查询所有记录
	var results []map[string]interface{}
	if err := r.db.WithContext(ctx).
		Table(fullTableName).
		Select(selectCols).
		Find(&results).Error; err != nil {
		return nil, fmt.Errorf("从物理表查询列表失败: %w", err)
	}

	logger.Info("✅ 记录列表查询成功（物理表）",
		logger.String("table_id", tableID),
		logger.String("physical_table", fullTableName),
		logger.Int("count", len(results)))

	// 5. 转换为 Domain 实体列表
	records := make([]*entity.Record, 0, len(results))
	for _, result := range results {
		record, err := r.toDomainEntity(result, fields, tableID)
		if err != nil {
			logger.Warn("转换记录失败，跳过",
				logger.String("record_id", fmt.Sprintf("%v", result["__id"])),
				logger.ErrorField(err))
			continue
		}
		records = append(records, record)
	}

	return records, nil
}

// getMapKeys 获取 map 的所有键（用于调试）
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// ==================== 保存方法 ====================

// Save 保存记录（保存到物理表）✨ 支持乐观锁
// 参考旧系统：INSERT/UPDATE 到物理表
// ✅ 新增：乐观锁版本检查、约束错误友好提示
func (r *RecordRepositoryDynamic) Save(ctx context.Context, record *entity.Record) error {
	tableID := record.TableID()

	logger.Info("正在保存记录到物理表",
		logger.String("record_id", record.ID().String()),
		logger.String("table_id", tableID),
		logger.Int64("version", record.Version().Value()))

	// ✅ 关键修复：使用事务数据库连接（如果存在）
	db := pkgDatabase.WithTx(ctx, r.db)

	// 1. 获取 Table 信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("Table不存在: %s", tableID)
	}

	baseID := table.BaseID()

	// 2. 获取字段列表
	logger.Info("🔍 Save 方法：准备调用 FindByTableID",
		logger.String("record_id", record.ID().String()),
		logger.String("table_id", tableID),
		logger.String("base_id", baseID))
	
	fields, err := r.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		logger.Error("❌ Save 方法：FindByTableID 失败",
			logger.String("table_id", tableID),
			logger.ErrorField(err))
		return fmt.Errorf("获取字段列表失败: %w", err)
	}

	logger.Info("🔍 Save 方法：FindByTableID 返回结果",
		logger.String("record_id", record.ID().String()),
		logger.String("table_id", tableID),
		logger.Int("field_count", len(fields)),
		logger.Any("field_ids", func() []string {
			ids := make([]string, len(fields))
			for i, f := range fields {
				ids[i] = f.ID().String()
			}
			return ids
		}()))

	// 3. ✅ 构建数据映射（使用完整表名）
	fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

	// 5. ✅ 检查记录是否已存在（用于判断INSERT还是UPDATE）
	var count int64
	err = db.WithContext(ctx).
		Table(fullTableName).
		Where("__id = ?", record.ID().String()).
		Count(&count).Error

	if err != nil {
		return fmt.Errorf("检查记录是否存在失败: %w", err)
	}

	isNewRecord := count == 0

	// 构建数据
	data := make(map[string]interface{})

	// 系统字段
	data["__id"] = record.ID().String()
	data["__last_modified_by"] = record.UpdatedBy()
	data["__last_modified_time"] = record.UpdatedAt()

	if isNewRecord {
		// ✅ 新记录：设置初始版本和创建信息
		data["__created_by"] = record.CreatedBy()
		data["__created_time"] = record.CreatedAt()
		data["__version"] = record.Version().Value() // 使用entity的版本，通常是1
	} else {
		// ✅ 更新记录：直接设置Entity已递增的版本号
		// 注意：record.Update()已经递增了版本，这里直接设置新版本
		data["__version"] = record.Version().Value()
	}

	// 用户字段（field_id -> db_field_name）
	recordData := record.Data()
	recordDataMap := recordData.ToMap()

	// ✅ 关键修复：在保存前清理 record.data 中的冗余键，确保只保留字段ID
	// 如果同时存在字段名和字段ID，删除字段名（因为数据库使用字段ID作为键）
	logger.Info("🔵 Save: 开始清理冗余键",
		logger.String("record_id", record.ID().String()),
		logger.String("table_id", tableID),
		logger.Int("record_data_keys_count", len(recordDataMap)))
	
	// 构建字段名到字段ID的映射
	nameToID := make(map[string]string)
	idToName := make(map[string]string)
	for _, field := range fields {
		fieldName := field.Name().String()
		fieldID := field.ID().String()
		nameToID[fieldName] = fieldID
		idToName[fieldID] = fieldName
	}

	// 清理冗余键：如果同时存在字段名和字段ID，删除字段名
	cleanedRecordDataMap := make(map[string]interface{})
	cleanedKeys := make([]string, 0)
	
	// 先复制所有数据
	for k, v := range recordDataMap {
		cleanedRecordDataMap[k] = v
	}
	
	// 检查并清理冗余键
	for _, field := range fields {
		fieldID := field.ID().String()
		fieldName := field.Name().String()
		
		// 如果同时存在字段名和字段ID，删除字段名（保留字段ID）
		_, hasFieldID := cleanedRecordDataMap[fieldID]
		_, hasFieldName := cleanedRecordDataMap[fieldName]
		
		if hasFieldID && hasFieldName {
			delete(cleanedRecordDataMap, fieldName)
			cleanedKeys = append(cleanedKeys, fieldName)
			logger.Info("清理冗余键：删除字段名（保留字段ID）",
				logger.String("record_id", record.ID().String()),
				logger.String("field_id", fieldID),
				logger.String("field_name", fieldName))
		}
	}
	
	if len(cleanedKeys) > 0 {
		logger.Info("✅ Save: 清理冗余键完成",
			logger.String("record_id", record.ID().String()),
			logger.String("table_id", tableID),
			logger.Int("cleaned_count", len(cleanedKeys)),
			logger.Strings("cleaned_keys", cleanedKeys),
			logger.Int("old_data_keys", len(recordDataMap)),
			logger.Int("cleaned_data_keys", len(cleanedRecordDataMap)))
		
		// 如果清理了数据，创建新的 RecordData
		cleanedRecordData, err := valueobject.NewRecordData(cleanedRecordDataMap)
		if err != nil {
			logger.Warn("创建清理后的记录数据失败，使用原始数据",
				logger.String("record_id", record.ID().String()),
				logger.String("table_id", tableID),
				logger.ErrorField(err))
		} else {
			recordData = cleanedRecordData
			logger.Info("✅ Save: 已更新 record.data（清理冗余键后）",
				logger.String("record_id", record.ID().String()),
				logger.String("table_id", tableID))
		}
	}

	// ✅ 添加详细日志：记录保存前的字段数据（使用 Info 级别以便调试）
	logger.Info("记录保存前的字段数据",
		logger.String("record_id", record.ID().String()),
		logger.Any("record_data", recordData.ToMap()),
		logger.Int("field_count", len(fields)))

	for _, field := range fields {
		fieldID := field.ID().String()
		fieldName := field.Name().String()
		dbFieldName := field.DBFieldName().String()

		// ✅ 关键修复：优先使用字段名对应的值（新值），如果不存在则使用字段ID的值
		// 因为 record.Update 使用 Merge 方法合并数据时，可能同时存在字段名和字段ID
		// 字段名对应的值是新值，字段ID对应的值可能是旧值
		var value interface{}
		var exists bool
		
		// 先尝试通过字段名获取值（新值）
		value, exists = recordData.Get(fieldName)
		if !exists {
			// 如果字段名不存在，再尝试通过字段ID获取值
			value, exists = recordData.Get(fieldID)
		}
		
		// ✅ 添加详细日志：每个字段的转换过程（使用 Info 级别以便调试）
		logger.Info("处理字段值",
			logger.String("field_id", fieldID),
			logger.String("field_name", fieldName),
			logger.String("db_field_name", dbFieldName),
			logger.String("field_type", field.Type().String()),
			logger.String("db_field_type", field.DBFieldType()),
			logger.Any("value", value),
			logger.Bool("exists", exists),
			logger.Bool("from_field_name", exists && recordData.HasField(fieldName)))

		// ✅ 关键修复：使用字段实体的类型转换方法（参考 teable 设计）
		// field.ConvertCellValueToDBValue 会根据字段类型和数据库类型进行正确的转换
		convertedValue := field.ConvertCellValueToDBValue(value)

		// ✅ 对于JSONB类型，需要包装为 datatypes.JSON
		if field.DBFieldType() == "JSONB" || field.DBFieldType() == "JSON" {
			convertedValue = r.wrapJSONBValue(convertedValue)
		}

		data[dbFieldName] = convertedValue
		
		// ✅ 添加详细日志：转换后的值（使用 Info 级别以便调试）
		logger.Info("字段值转换完成",
			logger.String("field_id", fieldID),
			logger.String("db_field_name", dbFieldName),
			logger.Any("converted_value", convertedValue))
	}

	// ✅ 添加详细日志：最终保存的数据（使用 Info 级别以便调试）
	logger.Info("准备保存到数据库的数据",
		logger.String("record_id", record.ID().String()),
		logger.String("table_id", tableID),
		logger.String("physical_table", fullTableName),
		logger.Any("data", data),
		logger.Int("field_count", len(fields)),
		logger.Int("data_keys_count", len(data)))

	// 6. ✅ 执行保存（带乐观锁检查）
	var result *gorm.DB

	if isNewRecord {
		// ✅ 新记录：直接 INSERT
		logger.Debug("执行 INSERT 操作",
			logger.String("record_id", record.ID().String()),
			logger.String("physical_table", fullTableName))
		result = db.WithContext(ctx).
			Table(fullTableName).
			Create(data)
		
		// ✅ 添加详细日志：INSERT 操作结果
		if result.Error != nil {
			logger.Error("INSERT 操作失败",
				logger.String("record_id", record.ID().String()),
				logger.String("physical_table", fullTableName),
				logger.ErrorField(result.Error),
				logger.Any("data", data))
		} else {
			logger.Debug("INSERT 操作成功",
				logger.String("record_id", record.ID().String()),
				logger.Int64("rows_affected", result.RowsAffected))
		}
	} else {
		// ✅ 更新记录：乐观锁检查
		// Entity的版本已经递增，使用 version - 1 作为WHERE条件
		// 直接SET为新版本（不再使用SQL表达式递增）
		currentVersion := record.Version().Value() // 新版本（已递增）
		checkVersion := currentVersion - 1         // 检查版本（旧版本）

		result = db.WithContext(ctx).
			Table(fullTableName).
			Where("__id = ?", record.ID().String()).
			Where("__version = ?", checkVersion). // WHERE __version = 旧版本
			Updates(data)                         // SET __version = 新版本（直接设置，不再递增）
	}

	// 7. ✅ 处理错误（约束错误友好提示）
	if result.Error != nil {
		logger.Error("数据库操作失败",
			logger.String("record_id", record.ID().String()),
			logger.String("physical_table", fullTableName),
			logger.Bool("is_new", isNewRecord),
			logger.ErrorField(result.Error),
			logger.Any("data", data))
		// 使用约束错误处理工具
		constraintErr := pkgDatabase.HandleDBConstraintError(result.Error, tableID, r.fieldRepo, ctx)
		return constraintErr
	}
	
	// ✅ 添加详细日志：INSERT 操作结果
	if isNewRecord {
		logger.Info("INSERT 操作完成",
			logger.String("record_id", record.ID().String()),
			logger.String("physical_table", fullTableName),
			logger.Int64("rows_affected", result.RowsAffected),
			logger.Any("data_keys", getMapKeys(data)))
	}

	// 8. ✅ 乐观锁：检查是否有行被更新（版本冲突检测）
	if !isNewRecord && result.RowsAffected == 0 {
		logger.Warn("记录版本冲突",
			logger.String("record_id", record.ID().String()),
			logger.Int64("expected_version", record.Version().Value()-1))

		return errors.ErrConflict.WithDetails(map[string]interface{}{
			"type":             "version_conflict",
			"message":          "记录已被其他用户修改，请刷新后重试",
			"record_id":        record.ID().String(),
			"expected_version": record.Version().Value() - 1,
		})
	}

	// ✅ 添加详细日志：保存后的验证
	logger.Debug("记录保存完成，验证数据",
		logger.String("record_id", record.ID().String()),
		logger.String("physical_table", fullTableName),
		logger.Int64("rows_affected", result.RowsAffected),
		logger.Bool("is_new", isNewRecord))

	// ✅ 记录保存到物理表完成（对齐 Teable：不使用 record_meta）

	logger.Info("✅ 记录保存成功（物理表+乐观锁）",
		logger.String("record_id", record.ID().String()),
		logger.String("table_id", tableID),
		logger.String("physical_table", fullTableName),
		logger.Bool("is_new", isNewRecord),
		logger.Int64("version", record.Version().Value()),
		logger.Int("field_count", len(fields)),
		logger.Int64("rows_affected", result.RowsAffected))

	return nil
}

// ==================== 删除方法 ====================

// Delete 删除记录（软删除）
// ⚠️ 废弃：此方法需要 record_meta 表（已移除），请使用 RecordService.DeleteRecord(tableID, recordID) 替代
func (r *RecordRepositoryDynamic) Delete(ctx context.Context, id valueobject.RecordID) error {
	// ❌ 已移除对 record_meta 的依赖（对齐 Teable 架构）
	return fmt.Errorf("Delete is deprecated: please use RecordService methods with table_id instead")
}

// DeleteByTableAndID 根据表ID和记录ID删除记录（从物理表删除）
// ✅ 对齐 Teable 架构：所有记录操作都需要 tableID
func (r *RecordRepositoryDynamic) DeleteByTableAndID(ctx context.Context, tableID string, id valueobject.RecordID) error {
	logger.Info("正在从物理表删除记录",
		logger.String("table_id", tableID),
		logger.String("record_id", id.String()))

	// 1. 获取 Table 信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("Table不存在: %s", tableID)
	}

	baseID := table.BaseID()
	fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

	// 2. 从物理表删除记录
	err = r.db.WithContext(ctx).
		Table(fullTableName).
		Where("__id = ?", id.String()).
		Delete(nil).Error

	if err != nil {
		logger.Error("从物理表删除记录失败",
			logger.String("table_id", tableID),
			logger.String("record_id", id.String()),
			logger.ErrorField(err))
		return err
	}

	logger.Info("✅ 从物理表删除记录成功",
		logger.String("table_id", tableID),
		logger.String("record_id", id.String()))

	return nil
}

// BatchSave 批量保存记录（包括创建和更新）
func (r *RecordRepositoryDynamic) BatchSave(ctx context.Context, records []*entity.Record) error {
	// 简单实现：使用 BatchUpdate
	return r.BatchUpdate(ctx, records)
}

// CountByTableID 统计表的记录数量（从物理表查询）
func (r *RecordRepositoryDynamic) CountByTableID(ctx context.Context, tableID string) (int64, error) {
	// 1. 获取 Table 信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return 0, fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		// ✅ 返回 AppError 而不是普通错误，确保返回 404 而不是 500
		return 0, errors.ErrTableNotFound.WithDetails(tableID)
	}

	baseID := table.BaseID()
	fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

	// 2. 从物理表统计
	var count int64
	if err := r.db.WithContext(ctx).
		Table(fullTableName).
		Count(&count).Error; err != nil {
		return 0, fmt.Errorf("统计记录数量失败: %w", err)
	}

	return count, nil
}

// FindWithVersion 根据ID和版本查找记录（乐观锁）
func (r *RecordRepositoryDynamic) FindWithVersion(ctx context.Context, tableID string, id valueobject.RecordID, expectedVersion valueobject.RecordVersion) (*entity.Record, error) {
	// 先查找记录
	record, err := r.FindByTableAndID(ctx, tableID, id)
	if err != nil {
		return nil, err
	}
	if record == nil {
		return nil, nil
	}

	// 检查版本是否匹配
	if record.Version().Value() != expectedVersion.Value() {
		return nil, fmt.Errorf("版本不匹配: 期望 %d, 实际 %d", expectedVersion.Value(), record.Version().Value())
	}

	return record, nil
}

// List 查询记录列表（带过滤条件和分页）
func (r *RecordRepositoryDynamic) List(ctx context.Context, filter recordRepo.RecordFilter) ([]*entity.Record, int64, error) {
	// 1. 提取 tableID
	if filter.TableID == nil {
		return nil, 0, fmt.Errorf("TableID is required")
	}
	tableID := *filter.TableID

	// 2. 统计总数
	total, err := r.CountByTableID(ctx, tableID)
	if err != nil {
		return nil, 0, err
	}

	// 3. 获取 Table 信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return nil, 0, fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		return nil, 0, fmt.Errorf("Table不存在: %s", tableID)
	}

	baseID := table.BaseID()

	// 4. 获取字段列表
	fields, err := r.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return nil, 0, fmt.Errorf("获取字段列表失败: %w", err)
	}

	// 5. ✅ 从物理表查询（带分页和过滤）
	// 使用完整表名（包含schema）："baseID"."tableID"
	fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

	// 构建 SELECT 列
	selectCols := []string{
		"__id",
		"__auto_number",
		"__created_time",
		"__created_by",
		"__last_modified_time",
		"__last_modified_by",
		"__version",
	}

	// 选择所有字段的数据库列（包括虚拟字段的计算结果列）
	// 过滤掉空字符串，避免 SQL 语法错误
	for _, field := range fields {
		dbFieldName := field.DBFieldName().String()
		if dbFieldName != "" {
			selectCols = append(selectCols, dbFieldName)
		}
	}

	// 构建查询
	query := r.db.WithContext(ctx).
		Table(fullTableName).
		Select(selectCols)

	// 应用过滤条件
	if filter.CreatedBy != nil {
		query = query.Where("__created_by = ?", *filter.CreatedBy)
	}
	if filter.UpdatedBy != nil {
		query = query.Where("__last_modified_by = ?", *filter.UpdatedBy)
	}

	// ✅ 优化：应用排序（使用索引优化）
	if filter.OrderBy != "" {
		orderDir := "ASC"
		if filter.OrderDir == "desc" {
			orderDir = "DESC"
		}
		// 如果使用游标分页，优先使用 __auto_number 排序（性能更好）
		if filter.Cursor != "" {
			query = query.Order(fmt.Sprintf("__auto_number %s", orderDir))
		} else {
			query = query.Order(fmt.Sprintf("%s %s", filter.OrderBy, orderDir))
		}
	} else {
		// 默认按创建时间倒序（使用索引）
		// ✅ 优化：如果使用游标分页，使用 __auto_number 排序（性能更好）
		if filter.Cursor != "" {
			query = query.Order("__auto_number ASC")
		} else {
			query = query.Order("__created_time DESC")
		}
	}

	// ✅ 优化：使用游标分页代替偏移分页（提高大偏移量查询性能）
	if filter.Cursor != "" {
		// 使用游标分页（基于 __auto_number）
		cursorID, err := strconv.ParseInt(filter.Cursor, 10, 64)
		if err == nil {
			query = query.Where("__auto_number > ?", cursorID)
		} else {
			logger.Warn("游标解析失败，使用偏移分页",
				logger.String("cursor", filter.Cursor),
				logger.ErrorField(err))
		}
	} else if filter.Offset > 0 {
		// 如果偏移量过大（> 1000），建议使用游标分页
		if filter.Offset > 1000 {
			logger.Warn("大偏移量查询，建议使用游标分页",
				logger.Int("offset", filter.Offset),
				logger.String("table_id", tableID))
		}
		query = query.Offset(filter.Offset)
	}

	// 应用分页限制
	if filter.Limit > 0 {
		// ✅ 优化：游标分页时多查询一条记录，用于判断是否有下一页
		if filter.Cursor != "" {
			query = query.Limit(filter.Limit + 1)
		} else {
			query = query.Limit(filter.Limit)
		}
	}

	// 查询记录列表
	var results []map[string]interface{}
	if err := query.Find(&results).Error; err != nil {
		return nil, 0, fmt.Errorf("从物理表查询列表失败: %w", err)
	}

	logger.Info("✅ 记录列表查询成功（物理表，分页+过滤）",
		logger.String("table_id", tableID),
		logger.String("physical_table", fullTableName),
		logger.Int("offset", filter.Offset),
		logger.Int("limit", filter.Limit),
		logger.Int("count", len(results)),
		logger.Int64("total", total))

	// 7. 转换为 Domain 实体列表
	records := make([]*entity.Record, 0, len(results))
	for _, result := range results {
		record, err := r.toDomainEntity(result, fields, tableID)
		if err != nil {
			logger.Warn("转换记录失败，跳过",
				logger.String("record_id", fmt.Sprintf("%v", result["__id"])),
				logger.ErrorField(err))
			continue
		}
		records = append(records, record)
	}

	return records, total, nil
}

// NextID 生成下一个记录ID
func (r *RecordRepositoryDynamic) NextID() valueobject.RecordID {
	return valueobject.NewRecordID("")
}

// ==================== 辅助方法 ====================

// Exists 检查记录是否存在
func (r *RecordRepositoryDynamic) Exists(ctx context.Context, id valueobject.RecordID) (bool, error) {
	// ❌ 已移除对 record_meta 的依赖（对齐 Teable 架构）
	return false, fmt.Errorf("Exists is deprecated: please use table-specific existence checks")
}

// toDomainEntity 将物理表查询结果转换为 Domain 实体
func (r *RecordRepositoryDynamic) toDomainEntity(
	result map[string]interface{},
	fields []*fieldEntity.Field,
	tableID string,
) (*entity.Record, error) {
	// 提取系统字段
	recordID := valueobject.NewRecordID(fmt.Sprintf("%v", result["__id"]))
	createdBy := fmt.Sprintf("%v", result["__created_by"])
	updatedBy := fmt.Sprintf("%v", result["__last_modified_by"])

	createdAt, _ := result["__created_time"].(time.Time)
	updatedAt, _ := result["__last_modified_time"].(time.Time)

	// __version 可能是 int32 或 int64，需要安全转换
	var versionInt int64
	switch v := result["__version"].(type) {
	case int64:
		versionInt = v
	case int32:
		versionInt = int64(v)
	case int:
		versionInt = int64(v)
	default:
		versionInt = 1 // 默认版本
	}
	version, _ := valueobject.NewRecordVersion(versionInt)

	// 提取用户字段数据
	data := make(map[string]interface{})
	
	// ✅ 添加详细日志：查询结果的字段数据
	logger.Debug("开始转换查询结果",
		logger.String("record_id", fmt.Sprintf("%v", result["__id"])),
		logger.Int("field_count", len(fields)),
		logger.Any("result_keys", getMapKeys(result)))
	
	for _, field := range fields {
		fieldID := field.ID().String()
		dbFieldName := field.DBFieldName().String()

		// 从物理表结果中获取值
		if value, ok := result[dbFieldName]; ok {
			// ✅ 添加详细日志：字段值转换
			logger.Debug("转换字段值",
				logger.String("field_id", fieldID),
				logger.String("db_field_name", dbFieldName),
				logger.String("field_type", field.Type().String()),
				logger.Any("raw_value", value),
				logger.String("value_type", fmt.Sprintf("%T", value)))
			
			// 转换值（从数据库类型到应用类型）
			convertedValue := r.convertValueFromDB(field, value)
			data[fieldID] = convertedValue
			
			logger.Debug("字段值转换完成",
				logger.String("field_id", fieldID),
				logger.Any("converted_value", convertedValue))
		} else {
			// ✅ 添加警告：字段不存在于查询结果中
			logger.Debug("字段不存在于查询结果",
				logger.String("field_id", fieldID),
				logger.String("db_field_name", dbFieldName))
		}
	}
	
	// ✅ 添加详细日志：最终转换的数据
	logger.Info("记录数据转换完成",
		logger.String("record_id", fmt.Sprintf("%v", result["__id"])),
		logger.Int("data_field_count", len(data)),
		logger.Any("data", data),
		logger.Any("data_keys", getMapKeys(data)))

	recordData, err := valueobject.NewRecordData(data)
	if err != nil {
		return nil, fmt.Errorf("创建RecordData失败: %w", err)
	}

	// 重建实体
	return entity.ReconstructRecord(
		recordID,
		tableID,
		recordData,
		version,
		createdBy,
		updatedBy,
		createdAt,
		updatedAt,
		nil, // deletedAt
	), nil
}

// wrapJSONBValue 包装JSONB值为 datatypes.JSON（GORM专用）
func (r *RecordRepositoryDynamic) wrapJSONBValue(value interface{}) interface{} {
	if value == nil {
		return nil
	}

	// 如果值已经是 datatypes.JSON，直接返回
	if _, ok := value.(datatypes.JSON); ok {
		return value
	}

	// 如果值已经是[]byte（字段实体已经转换为JSON字节），包装为 datatypes.JSON
	if jsonBytes, ok := value.([]byte); ok {
		return datatypes.JSON(jsonBytes)
	}

	// 如果值已经是字符串，假设它是JSON格式，包装为 datatypes.JSON
	if str, ok := value.(string); ok {
		return datatypes.JSON(str)
	}

	// 否则，序列化为JSON并包装为 datatypes.JSON
	jsonData, err := json.Marshal(value)
	if err != nil {
		logger.Error("序列化字段值为JSON失败", logger.Any("value", value), logger.ErrorField(err))
		return nil
	}

	// 返回 datatypes.JSON 类型，GORM 会正确处理
	return datatypes.JSON(jsonData)
}

// convertValueForDB 将应用层值转换为数据库值（已弃用，保留用于兼容）
// ⚠️ 新代码应使用 field.ConvertCellValueToDBValue() 方法
func (r *RecordRepositoryDynamic) convertValueForDB(field *fieldEntity.Field, value interface{}) interface{} {
	if value == nil {
		return nil
	}

	fieldType := field.Type().String()
	dbFieldType := field.DBFieldType() // 获取数据库字段类型

	// ✅ 关键修复：根据数据库字段类型判断，而不是应用层字段类型
	// 参考 GORM 官方文档：https://gorm.io/docs/data_types
	if dbFieldType == "JSONB" || dbFieldType == "JSON" {
		// 如果值已经是 datatypes.JSON，直接返回
		if _, ok := value.(datatypes.JSON); ok {
			return value
		}

		// 如果值已经是字符串，假设它是JSON格式，包装为 datatypes.JSON
		if str, ok := value.(string); ok {
			return datatypes.JSON(str)
		}

		// 否则，序列化为JSON并包装为 datatypes.JSON
		jsonData, err := json.Marshal(value)
		if err != nil {
			logger.Error("序列化字段值为JSON失败",
				logger.String("field_id", field.ID().String()),
				logger.String("field_name", field.Name().String()),
				logger.String("field_type", fieldType),
				logger.ErrorField(err))
			return nil
		}

		// 返回 datatypes.JSON 类型，GORM 会正确处理
		return datatypes.JSON(jsonData)
	}

	// 其他类型根据应用层字段类型处理
	switch fieldType {
	case "checkbox":
		// 布尔类型
		if b, ok := value.(bool); ok {
			return b
		}
		return false

	case "number", "rating", "percent", "currency", "rollup":
		// 数字类型
		return value

	case "date", "createdTime", "lastModifiedTime":
		// 时间类型
		if t, ok := value.(time.Time); ok {
			return t
		}
		return value

	default:
		// 文本类型：VARCHAR, TEXT
		return value
	}
}

// convertValueFromDB 将数据库值转换为应用层值
func (r *RecordRepositoryDynamic) convertValueFromDB(field *fieldEntity.Field, value interface{}) interface{} {
	if value == nil {
		return nil
	}

	fieldType := field.Type().String()

	switch fieldType {
	case "multipleSelect", "user", "attachment", "link", "lookup":
		// ✅ JSONB 类型：需要从JSON反序列化
		// GORM 可能返回 []byte 或 string 类型的 JSON 数据
		var result interface{}

		switch v := value.(type) {
		case []byte:
			if err := json.Unmarshal(v, &result); err != nil {
				logger.Error("从JSON反序列化字段值失败",
					logger.String("field_id", field.ID().String()),
					logger.String("field_type", fieldType),
					logger.ErrorField(err))
				return nil
			}
		case string:
			if err := json.Unmarshal([]byte(v), &result); err != nil {
				logger.Error("从JSON反序列化字段值失败",
					logger.String("field_id", field.ID().String()),
					logger.String("field_type", fieldType),
					logger.ErrorField(err))
				return nil
			}
		case datatypes.JSON:
			if err := json.Unmarshal(v, &result); err != nil {
				logger.Error("从JSON反序列化字段值失败",
					logger.String("field_id", field.ID().String()),
					logger.String("field_type", fieldType),
					logger.ErrorField(err))
				return nil
			}
		default:
			// 如果 GORM 已经反序列化了，直接返回
			// ✅ 添加调试日志：记录 GORM 反序列化后的值
			if fieldType == "link" {
				logger.Info("convertValueFromDB: Link 字段值（GORM已反序列化）",
					logger.String("field_id", field.ID().String()),
					logger.String("field_name", field.Name().String()),
					logger.Any("value", value),
					logger.String("value_type", fmt.Sprintf("%T", value)))
			}
			return value
		}

		// ✅ 添加调试日志：记录反序列化后的值
		if fieldType == "link" {
			logger.Info("convertValueFromDB: Link 字段值（已反序列化）",
				logger.String("field_id", field.ID().String()),
				logger.String("field_name", field.Name().String()),
				logger.Any("result", result))
		}

		return result

	case "checkbox":
		// 布尔类型
		if b, ok := value.(bool); ok {
			return b
		}
		return false

	case "number", "rating", "percent", "currency", "rollup":
		// 数字类型
		return value

	case "date", "createdTime", "lastModifiedTime":
		// 时间类型
		if t, ok := value.(time.Time); ok {
			return t
		}
		return value

	default:
		// 文本类型
		return value
	}
}

// ==================== 批量操作方法 ====================

// BatchCreate 批量创建记录（原子事务）
// 参考旧系统：批量INSERT到物理表
func (r *RecordRepositoryDynamic) BatchCreate(ctx context.Context, records []*entity.Record) error {
	if len(records) == 0 {
		return nil
	}

	// 确保所有记录属于同一个表
	tableID := records[0].TableID()
	for _, record := range records {
		if record.TableID() != tableID {
			return fmt.Errorf("批量创建要求所有记录属于同一个表")
		}
	}

	logger.Info("正在批量创建记录到物理表",
		logger.String("table_id", tableID),
		logger.Int("count", len(records)))

	// 1. 获取 Table 信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("Table不存在: %s", tableID)
	}

	baseID := table.BaseID()

	// 2. 获取字段列表
	fields, err := r.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取字段列表失败: %w", err)
	}

	// 3. ✅ 开启事务（原子性保证）
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 3.1 使用完整表名（包含schema）："baseID"."tableID"
		fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

		// 3.2 批量插入到物理表
		dataList := make([]map[string]interface{}, 0, len(records))

		for _, record := range records {
			// 构建数据映射
			data := make(map[string]interface{})
			data["__id"] = record.ID().String()
			data["__created_by"] = record.CreatedBy()
			data["__created_time"] = record.CreatedAt()
			data["__version"] = record.Version().Value()

			// 用户字段
			recordData := record.Data()
			for _, field := range fields {
				fieldID := field.ID().String()
				dbFieldName := field.DBFieldName().String()
				value, _ := recordData.Get(fieldID)
				data[dbFieldName] = r.convertValueForDB(field, value)
			}

			dataList = append(dataList, data)
		}

		// 3.3 批量插入物理表（使用 CreateInBatches 提高性能）
		if err := tx.Table(fullTableName).CreateInBatches(dataList, 500).Error; err != nil {
			return fmt.Errorf("批量插入物理表失败: %w", err)
		}

		return nil
	})
}

// BatchUpdate 批量更新记录（原子事务）
func (r *RecordRepositoryDynamic) BatchUpdate(ctx context.Context, records []*entity.Record) error {
	if len(records) == 0 {
		return nil
	}

	// 确保所有记录属于同一个表
	tableID := records[0].TableID()
	for _, record := range records {
		if record.TableID() != tableID {
			return fmt.Errorf("批量更新要求所有记录属于同一个表")
		}
	}

	logger.Info("正在批量更新记录到物理表",
		logger.String("table_id", tableID),
		logger.Int("count", len(records)))

	// 批量更新：逐条保存（使用事务保证原子性）
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, record := range records {
			if err := r.Save(ctx, record); err != nil {
				return fmt.Errorf("批量更新记录 %s 失败: %w", record.ID().String(), err)
			}
		}
		return nil
	})
}

// BatchDelete 批量删除记录（软删除，原子事务）
// ⚠️ 废弃：此方法需要 record_meta 表（已移除），请使用 RecordService 方法替代
func (r *RecordRepositoryDynamic) BatchDelete(ctx context.Context, ids []valueobject.RecordID) error {
	// ❌ 已移除对 record_meta 的依赖（对齐 Teable 架构）
	return fmt.Errorf("BatchDelete is deprecated: please use RecordService methods with table_id instead")
}

// FindRecordsByLinkValue 查找 Link 字段值包含指定 recordIDs 的所有记录
// 查询指定表中指定 Link 字段的值包含指定 recordIDs 的所有记录
// Link 字段值可能是单个对象 {id: "xxx", title: "yyy"} 或数组 [{id: "xxx"}, ...]
// 使用 JSONB 查询（PostgreSQL 的 JSONB 操作符）
func (r *RecordRepositoryDynamic) FindRecordsByLinkValue(
	ctx context.Context,
	tableID string,
	linkFieldID string,
	linkedRecordIDs []string,
) ([]string, error) {
	if len(linkedRecordIDs) == 0 {
		return []string{}, nil
	}

	logger.Info("🔵 FindRecordsByLinkValue: 开始查找 Link 字段值包含指定 recordIDs 的记录",
		logger.String("table_id", tableID),
		logger.String("link_field_id", linkFieldID),
		logger.Int("linked_record_count", len(linkedRecordIDs)),
		logger.Strings("linked_record_ids", linkedRecordIDs))

	// 1. 获取 Table 信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return nil, fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		return nil, errors.ErrTableNotFound.WithDetails(tableID)
	}

	baseID := table.BaseID()

	// 2. 获取 Link 字段信息
	fieldIDVO := fieldValueObject.NewFieldID(linkFieldID)
	linkField, err := r.fieldRepo.FindByID(ctx, fieldIDVO)
	if err != nil {
		return nil, fmt.Errorf("获取Link字段信息失败: %w", err)
	}
	if linkField == nil {
		return nil, fmt.Errorf("Link字段不存在: %s", linkFieldID)
	}

	fieldTypeStr := linkField.Type().String()
	
	// 如果字段类型为空，说明缓存可能有问题，尝试清除缓存并重新查询
	if fieldTypeStr == "" {
		logger.Warn("FindRecordsByLinkValue: 字段类型为空，可能是缓存问题，尝试清除缓存并重新查询",
			logger.String("link_field_id", linkFieldID))
		
		// 如果 fieldRepo 是 CachedFieldRepository，清除字段缓存
		if cachedFieldRepo, ok := r.fieldRepo.(*CachedFieldRepository); ok {
			// 清除字段缓存
			logger.Info("FindRecordsByLinkValue: 清除字段缓存",
				logger.String("link_field_id", linkFieldID))
			
			// 使用公开方法清除缓存
			if err := cachedFieldRepo.ClearFieldCache(ctx, linkFieldID); err != nil {
				logger.Warn("FindRecordsByLinkValue: 清除字段缓存失败",
					logger.String("link_field_id", linkFieldID),
					logger.ErrorField(err))
			}
			
			// 重新查询（清除缓存后，会从数据库查询）
			linkField, err = r.fieldRepo.FindByID(ctx, fieldIDVO)
			if err != nil {
				return nil, fmt.Errorf("重新获取Link字段信息失败: %w", err)
			}
			if linkField == nil {
				return nil, fmt.Errorf("Link字段不存在: %s", linkFieldID)
			}
			fieldTypeStr = linkField.Type().String()
			logger.Info("FindRecordsByLinkValue: 重新查询后的字段类型",
				logger.String("link_field_id", linkFieldID),
				logger.String("field_type", fieldTypeStr))
		} else {
			// 如果不是缓存仓库，直接返回错误
			return nil, fmt.Errorf("字段类型为空且无法清除缓存: %s", linkFieldID)
		}
	}

	if fieldTypeStr != "link" {
		logger.Error("FindRecordsByLinkValue: 字段类型不匹配",
			logger.String("link_field_id", linkFieldID),
			logger.String("expected_type", "link"),
			logger.String("actual_type", fieldTypeStr))
		return nil, fmt.Errorf("字段不是Link类型: %s (实际类型: %s)", linkFieldID, fieldTypeStr)
	}

	// 3. 获取物理表名和字段的数据库列名
	fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)
	dbFieldName := linkField.DBFieldName().String()

	// 4. 检查字段的实际数据库类型
	// 查询 information_schema.columns 获取字段类型
	var columnType string
	queryTypeSQL := `
		SELECT data_type 
		FROM information_schema.columns 
		WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
	`
	err = r.db.WithContext(ctx).Raw(queryTypeSQL, baseID, tableID, dbFieldName).Scan(&columnType).Error
	if err != nil {
		logger.Warn("无法查询字段类型，假设为 JSONB",
			logger.String("table_id", tableID),
			logger.String("field_name", dbFieldName),
			logger.String("schema", baseID),
			logger.ErrorField(err))
		columnType = "jsonb" // 默认假设为 JSONB
	}

	logger.Info("检查字段数据库类型",
		logger.String("table_id", tableID),
		logger.String("field_name", dbFieldName),
		logger.String("schema", baseID),
		logger.String("column_type", columnType))

	// 根据字段类型选择查询方式
	// PostgreSQL 中，JSONB 类型的 data_type 可能是 "jsonb" 或 "USER-DEFINED"（如果是自定义类型）
	// VARCHAR/TEXT 类型的 data_type 是 "character varying" 或 "text"
	isJSONB := columnType == "jsonb" || columnType == "USER-DEFINED"
	isVarchar := columnType == "character varying" || columnType == "varchar" || columnType == "text"
	
	// 如果无法确定类型，尝试使用 CAST 方式（兼容性更好）
	if !isJSONB && !isVarchar {
		logger.Warn("未知的字段类型，使用 CAST 方式查询",
			logger.String("column_type", columnType),
			logger.String("field_name", dbFieldName))
		isVarchar = true // 假设是 VARCHAR，使用 CAST 转换
	}

	// 5. 使用 PostgreSQL 的 JSONB 查询功能
	// Link 字段值可能是：
	// - 单个对象: {"id": "rec_xxx", "title": "yyy"}
	// - 数组: [{"id": "rec_xxx", "title": "yyy"}, ...]
	// 需要查询包含指定 recordIDs 的记录

	// 使用事务连接（如果存在）
	db := pkgDatabase.WithTx(ctx, r.db)

	// 构建查询条件：根据字段类型使用不同的查询方式
	query := db.WithContext(ctx).
		Table(fullTableName).
		Select("__id")

	// 构建查询条件
	// 对于每个 linkedRecordID，检查两种情况：
	// 1. 如果是数组：field @> '[{"id": "rec_xxx"}]'::jsonb
	// 2. 如果是单个对象：field->>'id' = 'rec_xxx'
	var orConditions []string
	var orArgs []interface{}

	quotedFieldName := fmt.Sprintf(`"%s"`, dbFieldName)

	for _, linkedRecordID := range linkedRecordIDs {
		if isJSONB {
			// JSONB 类型：直接使用 JSONB 操作符
			// 条件1：数组包含该记录ID
			// field @> '[{"id": "rec_xxx"}]'::jsonb
			arrayCondition := fmt.Sprintf("%s @> ?::jsonb", quotedFieldName)
			arrayValue := fmt.Sprintf(`[{"id": "%s"}]`, linkedRecordID)
			orConditions = append(orConditions, arrayCondition)
			orArgs = append(orArgs, arrayValue)

			// 条件2：单个对象匹配该记录ID
			// field->>'id' = 'rec_xxx'
			objectCondition := fmt.Sprintf("%s->>'id' = ?", quotedFieldName)
			orConditions = append(orConditions, objectCondition)
			orArgs = append(orArgs, linkedRecordID)
		} else {
			// VARCHAR/TEXT 类型：需要先转换为 JSONB 后查询
			// 使用 CAST 或 ::jsonb 转换，然后使用 JSONB 操作符
			// 注意：如果字段值不是有效的 JSON，CAST 会失败，需要使用错误处理
			
			// 方案：转换为 JSONB 后查询（使用 CASE WHEN 处理无效 JSON）
			// CAST(field AS jsonb) @> '[{"id": "rec_xxx"}]'::jsonb
			// 使用 CASE WHEN 处理无效 JSON，避免查询失败
			arrayCondition := fmt.Sprintf("(CASE WHEN %s IS NULL THEN false ELSE (CAST(%s AS jsonb) @> ?::jsonb) END)", quotedFieldName, quotedFieldName)
			arrayValue := fmt.Sprintf(`[{"id": "%s"}]`, linkedRecordID)
			orConditions = append(orConditions, arrayCondition)
			orArgs = append(orArgs, arrayValue)

			// CAST(field AS jsonb)->>'id' = 'rec_xxx'
			objectCondition := fmt.Sprintf("(CASE WHEN %s IS NULL THEN false ELSE (CAST(%s AS jsonb)->>'id' = ?) END)", quotedFieldName, quotedFieldName)
			orConditions = append(orConditions, objectCondition)
			orArgs = append(orArgs, linkedRecordID)
		}
	}

	// 使用 OR 连接所有条件
	if len(orConditions) > 0 {
		// 构建完整的 WHERE 子句：将所有条件用 OR 连接
		whereClause := "(" + orConditions[0]
		for i := 1; i < len(orConditions); i++ {
			whereClause += " OR " + orConditions[i]
		}
		whereClause += ")"

		logger.Info("🔵 构建 SQL WHERE 子句",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("db_field_name", dbFieldName),
			logger.String("where_clause", whereClause),
			logger.Int("condition_count", len(orConditions)),
			logger.Int("arg_count", len(orArgs)),
			logger.Any("linked_record_ids", linkedRecordIDs))

		query = query.Where(whereClause, orArgs...)
	} else {
		logger.Warn("⚠️ 没有构建任何查询条件",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("db_field_name", dbFieldName))
	}

	// 执行查询
	var results []struct {
		ID string `gorm:"column:__id"`
	}
	
	logger.Info("🔵 执行 SQL 查询",
		logger.String("table_id", tableID),
		logger.String("link_field_id", linkFieldID),
		logger.String("db_field_name", dbFieldName),
		logger.String("full_table_name", fullTableName))
	
	if err := query.Find(&results).Error; err != nil {
		logger.Error("❌ 查找 Link 字段值包含指定 recordIDs 的记录失败",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("db_field_name", dbFieldName),
			logger.String("full_table_name", fullTableName),
			logger.ErrorField(err))
		return nil, fmt.Errorf("查找记录失败: %w", err)
	}

	// 提取记录ID列表
	recordIDs := make([]string, 0, len(results))
	for _, result := range results {
		recordIDs = append(recordIDs, result.ID)
	}

	logger.Info("✅ 查找 Link 字段值包含指定 recordIDs 的记录成功",
		logger.String("table_id", tableID),
		logger.String("link_field_id", linkFieldID),
		logger.String("db_field_name", dbFieldName),
		logger.String("full_table_name", fullTableName),
		logger.Int("linked_record_count", len(linkedRecordIDs)),
		logger.Int("found_record_count", len(recordIDs)),
		logger.Any("found_record_ids", recordIDs))

	return recordIDs, nil
}

// BatchUpdateLinkFieldTitle 批量更新 Link 字段的 title
// 使用 PostgreSQL 的 jsonb_set 函数直接更新 JSONB 字段，避免读取整个记录
// 性能优化：一次 SQL 更新多条记录，而不是逐条更新
func (r *RecordRepositoryDynamic) BatchUpdateLinkFieldTitle(
	ctx context.Context,
	tableID string,
	linkFieldID string,
	sourceRecordID string,
	newTitle string,
) error {
	if sourceRecordID == "" || newTitle == "" {
		return nil
	}

	logger.Info("🔵 BatchUpdateLinkFieldTitle: 开始批量更新 Link 字段标题",
		logger.String("table_id", tableID),
		logger.String("link_field_id", linkFieldID),
		logger.String("source_record_id", sourceRecordID),
		logger.String("new_title", newTitle),
		logger.Int("new_title_length", len(newTitle)))

	// 1. 获取表信息
	table, err := r.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取Table信息失败: %w", err)
	}
	if table == nil {
		return errors.ErrTableNotFound.WithDetails(tableID)
	}

	baseID := table.BaseID()
	// fullTableName 格式是 "schema.table"，需要分别对 schema 和 table 加引号
	quotedFullTableName := fmt.Sprintf(`%s.%s`, r.quoteIdentifier(baseID), r.quoteIdentifier(tableID))

	// 2. 获取 Link 字段信息
	fieldIDVO := fieldValueObject.NewFieldID(linkFieldID)
	
	linkField, err := r.fieldRepo.FindByID(ctx, fieldIDVO)
	if err != nil {
		return fmt.Errorf("获取Link字段信息失败: %w", err)
	}
	if linkField == nil {
		return fmt.Errorf("Link字段不存在: %s", linkFieldID)
	}

	// 调试：记录字段类型信息
	fieldTypeStr := linkField.Type().String()
	logger.Info("BatchUpdateLinkFieldTitle: 检查字段类型",
		logger.String("link_field_id", linkFieldID),
		logger.String("field_type", fieldTypeStr),
		logger.String("field_name", linkField.Name().String()),
		logger.String("db_field_type", linkField.DBFieldType()))

	// 如果字段类型为空，说明缓存可能有问题，尝试清除缓存并重新查询
	if fieldTypeStr == "" {
		logger.Warn("BatchUpdateLinkFieldTitle: 字段类型为空，可能是缓存问题，尝试清除缓存并重新查询",
			logger.String("link_field_id", linkFieldID))
		
		// 如果 fieldRepo 是 CachedFieldRepository，清除字段缓存
		if cachedFieldRepo, ok := r.fieldRepo.(*CachedFieldRepository); ok {
			// 清除字段缓存
			logger.Info("BatchUpdateLinkFieldTitle: 清除字段缓存",
				logger.String("link_field_id", linkFieldID))
			
			// 使用公开方法清除缓存
			if err := cachedFieldRepo.ClearFieldCache(ctx, linkFieldID); err != nil {
				logger.Warn("BatchUpdateLinkFieldTitle: 清除字段缓存失败",
					logger.String("link_field_id", linkFieldID),
					logger.ErrorField(err))
			}
			
			// 重新查询（清除缓存后，会从数据库查询）
			linkField, err = r.fieldRepo.FindByID(ctx, fieldIDVO)
			if err != nil {
				return fmt.Errorf("重新获取Link字段信息失败: %w", err)
			}
			if linkField == nil {
				return fmt.Errorf("Link字段不存在: %s", linkFieldID)
			}
			fieldTypeStr = linkField.Type().String()
			logger.Info("BatchUpdateLinkFieldTitle: 重新查询后的字段类型",
				logger.String("link_field_id", linkFieldID),
				logger.String("field_type", fieldTypeStr))
		} else {
			// 如果不是缓存仓库，直接返回错误
			return fmt.Errorf("字段类型为空且无法清除缓存: %s", linkFieldID)
		}
	}

	if fieldTypeStr != "link" {
		logger.Error("字段类型不匹配",
			logger.String("link_field_id", linkFieldID),
			logger.String("expected_type", "link"),
			logger.String("actual_type", fieldTypeStr))
		return fmt.Errorf("字段不是Link类型: %s (实际类型: %s)", linkFieldID, fieldTypeStr)
	}

	dbFieldName := linkField.DBFieldName().String()

	logger.Info("🔵 Link 字段信息",
		logger.String("table_id", tableID),
		logger.String("link_field_id", linkFieldID),
		logger.String("link_field_name", linkField.Name().String()),
		logger.String("db_field_name", dbFieldName),
		logger.String("field_type", fieldTypeStr))

	// 3. 检查字段的实际数据库类型（用于决定 SQL 中是否需要 CAST）
	var columnType string
	var characterMaximumLength *int // ✅ 添加字段长度限制
	queryTypeSQL := `
		SELECT data_type, character_maximum_length
		FROM information_schema.columns 
		WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
	`
	type ColumnInfo struct {
		DataType              string
		CharacterMaximumLength *int `gorm:"column:character_maximum_length"`
	}
	var columnInfo ColumnInfo
	err = r.db.WithContext(ctx).Raw(queryTypeSQL, baseID, tableID, dbFieldName).Scan(&columnInfo).Error
	if err != nil {
		logger.Warn("无法查询字段类型，假设为 JSONB",
			logger.String("table_id", tableID),
			logger.String("field_name", dbFieldName),
			logger.String("schema", baseID),
			logger.ErrorField(err))
		columnType = "jsonb" // 默认假设为 JSONB
		characterMaximumLength = nil
	} else {
		columnType = columnInfo.DataType
		characterMaximumLength = columnInfo.CharacterMaximumLength
	}

	logger.Info("批量更新：检查字段数据库类型",
		logger.String("table_id", tableID),
		logger.String("field_name", dbFieldName),
		logger.String("schema", baseID),
		logger.String("column_type", columnType),
		logger.Any("character_maximum_length", characterMaximumLength))

	// 根据字段类型选择 SQL 语法
	isJSONB := columnType == "jsonb" || columnType == "USER-DEFINED"
	isVarchar := columnType == "character varying" || columnType == "varchar" || columnType == "text"
	
	// ✅ 修复：如果是 VARCHAR 类型且有长度限制，自动修改为 TEXT（不限长度）
	// 测试开发阶段：不考虑兼容性，直接修改所有 VARCHAR 字段为 TEXT
	if isVarchar && characterMaximumLength != nil && *characterMaximumLength > 0 {
		logger.Warn("⚠️ Link 字段有长度限制，自动修改为 TEXT（不限长度）",
			logger.String("table_id", tableID),
			logger.String("field_name", dbFieldName),
			logger.String("schema", baseID),
			logger.Int("old_max_length", *characterMaximumLength))
		
		// 直接使用 SQL 修改字段类型为 TEXT
		alterSQL := fmt.Sprintf("ALTER TABLE %s.%s ALTER COLUMN %s TYPE TEXT",
			r.quoteIdentifier(baseID),
			r.quoteIdentifier(tableID),
			r.quoteIdentifier(dbFieldName))
		
		if err := r.db.WithContext(ctx).Exec(alterSQL).Error; err != nil {
			logger.Error("❌ 修改字段类型为 TEXT 失败",
				logger.String("table_id", tableID),
				logger.String("field_name", dbFieldName),
				logger.String("schema", baseID),
				logger.ErrorField(err))
			return fmt.Errorf("修改字段类型为 TEXT 失败: %w", err)
		} else {
			logger.Info("✅ 字段类型已修改为 TEXT（不限长度）",
				logger.String("table_id", tableID),
				logger.String("field_name", dbFieldName),
				logger.String("schema", baseID))
			// 更新字段类型信息
			columnType = "text"
			characterMaximumLength = nil // TEXT 类型没有长度限制
			isVarchar = true // TEXT 也是 VARCHAR 类型
		}
	}
	
	// 如果无法确定类型，假设是 VARCHAR（更安全）
	if !isJSONB && !isVarchar {
		logger.Warn("未知的字段类型，假设为 VARCHAR",
			logger.String("column_type", columnType),
			logger.String("field_name", dbFieldName))
		isVarchar = true
	}

	// ✅ 关键修复：Link 字段标题更新在事务外执行（通过 AddTxCallback），
	// 所以不应该使用 WithTx，而应该直接使用 r.db
	// 使用事务连接（如果存在）
	// 注意：BatchUpdateLinkFieldTitle 通常在事务外执行（通过 AddTxCallback），
	// 所以这里不应该使用 WithTx，而应该直接使用 r.db
	// 但是，如果确实在事务中，我们也应该支持
	db := r.db
	if pkgDatabase.InTransaction(ctx) {
		// 如果在事务中，使用事务连接
		db = pkgDatabase.WithTx(ctx, r.db)
		logger.Info("BatchUpdateLinkFieldTitle: 在事务中执行",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID))
	} else {
		logger.Info("BatchUpdateLinkFieldTitle: 在事务外执行",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID))
	}

	quotedFieldName := r.quoteIdentifier(dbFieldName)
	
	// 方案1：更新数组格式的 Link 字段值
	// 使用 jsonb_agg 重新构建数组，更新匹配项的 title
	var updateArraySQL string
	if isJSONB {
		// JSONB 类型：直接使用 JSONB 操作符
		// ✅ 修复：确保只更新数组格式的字段，并且正确处理 NULL 值
		updateArraySQL = fmt.Sprintf(`
			UPDATE %s
			SET %s = (
				SELECT jsonb_agg(
					CASE
						WHEN elem->>'id' = $1 THEN
							jsonb_set(elem, '{title}', $2::jsonb, true)
						ELSE
							elem
					END
				)
				FROM jsonb_array_elements(%s) AS elem
			)
			WHERE %s IS NOT NULL 
			  AND jsonb_typeof(%s) = 'array'
			  AND %s @> $3::jsonb
		`, quotedFullTableName, quotedFieldName,
			quotedFieldName, quotedFieldName, quotedFieldName, quotedFieldName)
	} else {
		// VARCHAR 类型：需要 CAST 转换
		// ✅ 修复：确保只更新数组格式的字段，并且正确处理 NULL 值
		updateArraySQL = fmt.Sprintf(`
			UPDATE %s
			SET %s = (
				SELECT jsonb_agg(
					CASE
						WHEN elem->>'id' = $1 THEN
							jsonb_set(elem, '{title}', $2::jsonb, true)
						ELSE
							elem
					END
				)
				FROM jsonb_array_elements(CAST(%s AS jsonb)) AS elem
			)::text
			WHERE %s IS NOT NULL 
			  AND jsonb_typeof(CAST(%s AS jsonb)) = 'array'
			  AND CAST(%s AS jsonb) @> $3::jsonb
		`, quotedFullTableName, quotedFieldName,
			quotedFieldName, quotedFieldName, quotedFieldName, quotedFieldName)
	}

	// ✅ 修复字段长度限制：如果是 VARCHAR 且有长度限制，应该已经在上面的逻辑中修改为 TEXT
	// 测试开发阶段：不需要截断逻辑，因为所有 VARCHAR 字段都会被修改为 TEXT（不限长度）
	// 如果 characterMaximumLength 不为 nil，说明修改字段类型失败，应该返回错误
	if isVarchar && characterMaximumLength != nil && *characterMaximumLength > 0 {
		logger.Error("❌ 字段类型修改失败，仍有长度限制",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("field_name", dbFieldName),
			logger.Int("max_length", *characterMaximumLength))
		return fmt.Errorf("字段类型修改失败，仍有长度限制: %d", *characterMaximumLength)
	}

	arrayValue := fmt.Sprintf(`[{"id": "%s"}]`, sourceRecordID)
	
	// ✅ 修复：使用 json.Marshal 确保正确的 JSON 编码，避免无效的 UTF-8 字节序列
	// 直接使用 fmt.Sprintf 可能在截断后产生无效的 UTF-8 字节序列
	newTitleJSONBytes, err := json.Marshal(newTitle)
	if err != nil {
		logger.Error("❌ JSON 编码失败",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("new_title", newTitle),
			logger.ErrorField(err))
		return fmt.Errorf("JSON 编码失败: %w", err)
	}
	newTitleJSON := string(newTitleJSONBytes)

	logger.Info("🔵 执行数组格式 Link 字段标题更新 SQL",
		logger.String("table_id", tableID),
		logger.String("link_field_id", linkFieldID),
		logger.String("source_record_id", sourceRecordID),
		logger.String("new_title", newTitle),
		logger.String("new_title_json", newTitleJSON),
		logger.String("array_value", arrayValue),
		logger.Bool("is_jsonb", isJSONB),
		logger.String("sql", updateArraySQL),
		logger.String("full_table_name", quotedFullTableName),
		logger.String("db_field_name", dbFieldName))

	// ✅ 修复 SQL 参数传递问题：使用 Exec 方法，但确保参数正确传递
	// 注意：GORM 的 Exec 方法支持 PostgreSQL 的 $1, $2, $3 占位符
	// 如果 Exec 方法不能正确传递参数，使用底层 sql.DB 执行
	result := db.WithContext(ctx).Exec(updateArraySQL, sourceRecordID, newTitleJSON, arrayValue)
	if result.Error != nil {
		// 如果 Exec 方法失败，尝试使用底层 sql.DB 执行
		logger.Warn("GORM Exec 方法失败，尝试使用底层 sql.DB 执行",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.ErrorField(result.Error))
		
		// 获取底层 sql.DB
		var sqlDB *sql.DB
		sqlDB, err = db.DB()
		if err == nil {
			// 使用底层 sql.DB 执行
			execResult, execErr := sqlDB.ExecContext(ctx, updateArraySQL, sourceRecordID, newTitleJSON, arrayValue)
			if execErr != nil {
				result.Error = execErr
			} else {
				// 获取影响的行数
				rowsAffected, _ := execResult.RowsAffected()
				result.RowsAffected = rowsAffected
				result.Error = nil
			}
		}
	}
	if result.Error != nil {
		logger.Error("❌ 批量更新数组格式 Link 字段标题失败",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("source_record_id", sourceRecordID),
			logger.String("sql", updateArraySQL),
			logger.String("full_table_name", quotedFullTableName),
			logger.String("db_field_name", dbFieldName),
			logger.ErrorField(result.Error))
		// 不中断，继续处理单个对象格式
	} else {
		logger.Info("✅ 批量更新数组格式 Link 字段标题成功",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("source_record_id", sourceRecordID),
			logger.String("full_table_name", quotedFullTableName),
			logger.String("db_field_name", dbFieldName),
			logger.Int64("rows_affected", result.RowsAffected))
		
		if result.RowsAffected == 0 {
			logger.Warn("⚠️ 数组格式更新未影响任何行，可能没有匹配的记录",
				logger.String("table_id", tableID),
				logger.String("link_field_id", linkFieldID),
				logger.String("source_record_id", sourceRecordID))
		}
	}

	// 方案2：更新单个对象格式的 Link 字段值
	// 使用 jsonb_set 直接更新 title
	var updateObjectSQL string
	if isJSONB {
		// JSONB 类型：直接使用 JSONB 操作符
		// ✅ 关键修复：将 create_missing 设置为 true，确保如果 title 路径不存在时会创建
		// ✅ 修复：确保只更新对象格式的字段，并且正确处理 NULL 值
		updateObjectSQL = fmt.Sprintf(`
			UPDATE %s
			SET %s = jsonb_set(%s, '{title}', $1::jsonb, true)
			WHERE %s IS NOT NULL 
			  AND jsonb_typeof(%s) = 'object'
			  AND %s->>'id' = $2
		`, quotedFullTableName, quotedFieldName,
			quotedFieldName, quotedFieldName, quotedFieldName, quotedFieldName)
	} else {
		// VARCHAR 类型：需要 CAST 转换
		// ✅ 修复：确保只更新对象格式的字段，并且正确处理 NULL 值
		updateObjectSQL = fmt.Sprintf(`
			UPDATE %s
			SET %s = jsonb_set(CAST(%s AS jsonb), '{title}', $1::jsonb, true)::text
			WHERE %s IS NOT NULL 
			  AND jsonb_typeof(CAST(%s AS jsonb)) = 'object'
			  AND CAST(%s AS jsonb)->>'id' = $2
		`, quotedFullTableName, quotedFieldName,
			quotedFieldName, quotedFieldName, quotedFieldName, quotedFieldName)
	}

	logger.Info("🔵 执行单个对象格式 Link 字段标题更新 SQL",
		logger.String("table_id", tableID),
		logger.String("link_field_id", linkFieldID),
		logger.String("source_record_id", sourceRecordID),
		logger.String("new_title", newTitle),
		logger.String("new_title_json", newTitleJSON),
		logger.Bool("is_jsonb", isJSONB),
		logger.String("sql", updateObjectSQL),
		logger.String("full_table_name", quotedFullTableName),
		logger.String("db_field_name", dbFieldName))

	// ✅ 修复 SQL 参数传递问题：使用 Exec 方法，但确保参数正确传递
	result2 := db.WithContext(ctx).Exec(updateObjectSQL, newTitleJSON, sourceRecordID)
	if result2.Error != nil {
		// 如果 Exec 方法失败，尝试使用底层 sql.DB 执行
		logger.Warn("GORM Exec 方法失败，尝试使用底层 sql.DB 执行",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.ErrorField(result2.Error))
		
		// 获取底层 sql.DB
		var sqlDB *sql.DB
		sqlDB, err = db.DB()
		if err == nil {
			// 使用底层 sql.DB 执行
			execResult, execErr := sqlDB.ExecContext(ctx, updateObjectSQL, newTitleJSON, sourceRecordID)
			if execErr != nil {
				result2.Error = execErr
			} else {
				// 获取影响的行数
				rowsAffected, _ := execResult.RowsAffected()
				result2.RowsAffected = rowsAffected
				result2.Error = nil
			}
		}
	}
	if result2.Error != nil {
		logger.Error("❌ 批量更新单个对象格式 Link 字段标题失败",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("source_record_id", sourceRecordID),
			logger.String("sql", updateObjectSQL),
			logger.String("full_table_name", quotedFullTableName),
			logger.String("db_field_name", dbFieldName),
			logger.String("new_title_json", newTitleJSON),
			logger.ErrorField(result2.Error))
		// 不中断，继续
	} else {
		logger.Info("✅ 批量更新单个对象格式 Link 字段标题成功",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("source_record_id", sourceRecordID),
			logger.String("full_table_name", quotedFullTableName),
			logger.String("db_field_name", dbFieldName),
			logger.Int64("rows_affected", result2.RowsAffected),
			logger.String("new_title", newTitle),
			logger.String("new_title_json", newTitleJSON))
		
		if result2.RowsAffected == 0 {
			logger.Warn("⚠️ 对象格式更新未影响任何行，可能没有匹配的记录",
				logger.String("table_id", tableID),
				logger.String("link_field_id", linkFieldID),
				logger.String("source_record_id", sourceRecordID))
		}
		
		// ✅ 添加调试：查询更新后的实际值
		var updatedValue string
		checkSQL := fmt.Sprintf("SELECT %s::text FROM %s WHERE %s->>'id' = $1",
			quotedFieldName, quotedFullTableName, quotedFieldName)
		if err := db.WithContext(ctx).Raw(checkSQL, sourceRecordID).Scan(&updatedValue).Error; err == nil {
			logger.Info("🔍 更新后的 Link 字段值（数据库查询）",
				logger.String("table_id", tableID),
				logger.String("link_field_id", linkFieldID),
				logger.String("source_record_id", sourceRecordID),
				logger.String("updated_value", updatedValue))
		} else {
			logger.Warn("无法查询更新后的 Link 字段值",
				logger.String("table_id", tableID),
				logger.String("link_field_id", linkFieldID),
				logger.String("source_record_id", sourceRecordID),
				logger.ErrorField(err))
		}
	}

	totalRowsAffected := result.RowsAffected + result2.RowsAffected
	logger.Info("✅ BatchUpdateLinkFieldTitle: 批量更新 Link 字段标题完成",
		logger.String("table_id", tableID),
		logger.String("link_field_id", linkFieldID),
		logger.String("source_record_id", sourceRecordID),
		logger.String("new_title", newTitle),
		logger.Int64("array_rows_affected", result.RowsAffected),
		logger.Int64("object_rows_affected", result2.RowsAffected),
		logger.Int64("total_rows_affected", totalRowsAffected))
	
	if totalRowsAffected == 0 {
		logger.Warn("⚠️ BatchUpdateLinkFieldTitle: 未影响任何行，可能没有匹配的记录",
			logger.String("table_id", tableID),
			logger.String("link_field_id", linkFieldID),
			logger.String("source_record_id", sourceRecordID),
			logger.String("new_title", newTitle))
	}

	return nil
}

// quoteIdentifier 引用标识符（根据数据库类型）
func (r *RecordRepositoryDynamic) quoteIdentifier(name string) string {
	if r.dbProvider.DriverName() == "postgres" {
		return fmt.Sprintf(`"%s"`, name)
	}
	return fmt.Sprintf("`%s`", name)
}
