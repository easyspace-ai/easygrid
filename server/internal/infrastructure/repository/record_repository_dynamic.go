package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
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
	for _, field := range fields {
		selectCols = append(selectCols, field.DBFieldName().String())
	}

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
			logger.ErrorField(err))
		return nil, err
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

	return records, nil
}

// FindByTableAndID 根据表ID和记录ID查找单条记录
// ✅ 对齐 Teable 架构：所有记录操作都需要 tableID
func (r *RecordRepositoryDynamic) FindByTableAndID(ctx context.Context, tableID string, id valueobject.RecordID) (*entity.Record, error) {
	records, err := r.FindByIDs(ctx, tableID, []valueobject.RecordID{id})
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, nil // 记录不存在
	}
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
	for _, field := range fields {
		selectCols = append(selectCols, field.DBFieldName().String())
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

	// 3. ✅ 构建数据映射（使用完整表名）
	fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)

	// 5. ✅ 检查记录是否已存在（用于判断INSERT还是UPDATE）
	var count int64
	err = r.db.WithContext(ctx).
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

	for _, field := range fields {
		fieldID := field.ID().String()
		dbFieldName := field.DBFieldName().String()

		// 获取字段值
		value, _ := recordData.Get(fieldID)

		// ✅ 关键修复：使用字段实体的类型转换方法（参考 teable 设计）
		// field.ConvertCellValueToDBValue 会根据字段类型和数据库类型进行正确的转换
		convertedValue := field.ConvertCellValueToDBValue(value)

		// ✅ 对于JSONB类型，需要包装为 datatypes.JSON
		if field.DBFieldType() == "JSONB" || field.DBFieldType() == "JSON" {
			convertedValue = r.wrapJSONBValue(convertedValue)
		}

		data[dbFieldName] = convertedValue
	}

	// 6. ✅ 执行保存（带乐观锁检查）
	var result *gorm.DB

	if isNewRecord {
		// ✅ 新记录：直接 INSERT
		result = r.db.WithContext(ctx).
			Table(fullTableName).
			Create(data)
	} else {
		// ✅ 更新记录：乐观锁检查
		// Entity的版本已经递增，使用 version - 1 作为WHERE条件
		// 直接SET为新版本（不再使用SQL表达式递增）
		currentVersion := record.Version().Value() // 新版本（已递增）
		checkVersion := currentVersion - 1         // 检查版本（旧版本）

		result = r.db.WithContext(ctx).
			Table(fullTableName).
			Where("__id = ?", record.ID().String()).
			Where("__version = ?", checkVersion). // WHERE __version = 旧版本
			Updates(data)                         // SET __version = 新版本（直接设置，不再递增）
	}

	// 7. ✅ 处理错误（约束错误友好提示）
	if result.Error != nil {
		// 使用约束错误处理工具
		constraintErr := pkgDatabase.HandleDBConstraintError(result.Error, tableID, r.fieldRepo, ctx)
		return constraintErr
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

	// ✅ 记录保存到物理表完成（对齐 Teable：不使用 record_meta）

	logger.Info("✅ 记录保存成功（物理表+乐观锁）",
		logger.String("record_id", record.ID().String()),
		logger.String("table_id", tableID),
		logger.String("physical_table", fullTableName),
		logger.Bool("is_new", isNewRecord),
		logger.Int64("version", record.Version().Value()))

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
	for _, field := range fields {
		selectCols = append(selectCols, field.DBFieldName().String())
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

	// 应用排序
	if filter.OrderBy != "" {
		orderDir := "ASC"
		if filter.OrderDir == "desc" {
			orderDir = "DESC"
		}
		query = query.Order(fmt.Sprintf("%s %s", filter.OrderBy, orderDir))
	} else {
		// 默认按创建时间倒序
		query = query.Order("__created_time DESC")
	}

	// 应用分页
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
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
	for _, field := range fields {
		fieldID := field.ID().String()
		dbFieldName := field.DBFieldName().String()

		// 从物理表结果中获取值
		if value, ok := result[dbFieldName]; ok {
			// 转换值（从数据库类型到应用类型）
			convertedValue := r.convertValueFromDB(field, value)
			data[fieldID] = convertedValue
		}
	}

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
			return value
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
