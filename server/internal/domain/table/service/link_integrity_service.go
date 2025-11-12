package service

import (
	"context"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// LinkIntegrityService Link 字段完整性检查服务
// 参考 teable 的实现：apps/nestjs-backend/src/features/integrity/link-field.service.ts
// 检查 Link 字段的数据一致性并修复问题
type LinkIntegrityService struct {
	db        *gorm.DB
	fieldRepo LinkIntegrityFieldRepository
	tableRepo LinkIntegrityTableRepository // 用于获取表信息（baseID）
}

// LinkIntegrityTableRepository Link 完整性检查表仓储接口
type LinkIntegrityTableRepository interface {
	GetByID(ctx context.Context, tableID string) (interface{ GetBaseID() string }, error)
}

// LinkIntegrityFieldRepository Link 完整性检查字段仓储接口
type LinkIntegrityFieldRepository interface {
	FindByID(ctx context.Context, fieldID string) (*entity.Field, error)
}

// IntegrityIssue 完整性问题
type IntegrityIssue struct {
	Type    string // 问题类型
	FieldID string // 字段ID
	Message string // 问题描述
}

// NewLinkIntegrityService 创建 Link 完整性检查服务
func NewLinkIntegrityService(
	db *gorm.DB,
	fieldRepo LinkIntegrityFieldRepository,
	tableRepo LinkIntegrityTableRepository,
) *LinkIntegrityService {
	return &LinkIntegrityService{
		db:        db,
		fieldRepo: fieldRepo,
		tableRepo: tableRepo,
	}
}

// GetIssues 检查 Link 字段的完整性问题
// 参考 teable 的 getIssues 方法
func (s *LinkIntegrityService) GetIssues(
	ctx context.Context,
	tableID string,
	field *entity.Field,
) ([]*IntegrityIssue, error) {
	options := field.Options()
	if options == nil || options.Link == nil {
		return nil, nil
	}

	linkOptions := options.Link

	// 检查链接一致性
	inconsistentRecords, err := s.checkLinks(ctx, tableID, field, linkOptions)
	if err != nil {
		return nil, fmt.Errorf("检查链接失败: %w", err)
	}

	if len(inconsistentRecords) > 0 {
		return []*IntegrityIssue{
			{
				Type:    "InvalidLinkReference",
				FieldID: field.ID().String(),
				Message: fmt.Sprintf("发现 %d 个不一致的链接", len(inconsistentRecords)),
			},
		}, nil
	}

	return nil, nil
}

// checkLinks 检查链接一致性
// 检查 JSON 列中的 link 值与外键表的一致性
// 参考 teable 的 checkLinks 方法
func (s *LinkIntegrityService) checkLinks(
	ctx context.Context,
	tableID string,
	field *entity.Field,
	linkOptions *fieldValueObject.LinkOptions,
) ([]string, error) {
	// 获取表名和字段名
	// TODO: 从 tableRepo 获取表信息
	dbTableName := tableID // 临时使用 tableID，实际应该从 tableRepo 获取
	linkDbFieldName := field.DBFieldName().String()

	// 检查 link 列是否存在
	// TODO: 实现列存在性检查
	// 如果列不存在，跳过检查
	linkColumnExists := true // 临时假设列存在
	if !linkColumnExists {
		return nil, nil
	}

	fkHostTableName := linkOptions.FkHostTableName
	selfKeyName := linkOptions.SelfKeyName
	foreignKeyName := linkOptions.ForeignKeyName
	isMultiValue := linkOptions.AllowMultiple

	// 构建 SQL 查询
	var query string
	if isMultiValue {
		// 多值关系：检查 JSON 数组中的 ID 是否与外键表一致
		query = s.buildCheckLinksMultiValueQuery(
			dbTableName,
			fkHostTableName,
			selfKeyName,
			foreignKeyName,
			linkDbFieldName,
		)
	} else {
		// 单值关系：检查 JSON 对象中的 ID 是否与外键列一致
		if fkHostTableName == dbTableName {
			// 外键在当前表
			query = s.buildCheckLinksSingleValueSameTableQuery(
				dbTableName,
				foreignKeyName,
				linkDbFieldName,
			)
		} else {
			// 外键在其他表
			query = s.buildCheckLinksSingleValueDifferentTableQuery(
				dbTableName,
				fkHostTableName,
				selfKeyName,
				foreignKeyName,
				linkDbFieldName,
			)
		}
	}

	// 执行查询
	type Result struct {
		ID string `gorm:"column:id"`
	}
	var results []Result
	if err := s.db.WithContext(ctx).Raw(query).Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("执行完整性检查查询失败: %w", err)
	}

	// 提取记录ID列表
	recordIDs := make([]string, 0, len(results))
	for _, result := range results {
		recordIDs = append(recordIDs, result.ID)
	}

	logger.Debug("检查链接一致性完成",
		logger.String("table_id", tableID),
		logger.String("field_id", field.ID().String()),
		logger.Int("inconsistent_count", len(recordIDs)))

	return recordIDs, nil
}

// buildCheckLinksMultiValueQuery 构建多值关系的完整性检查查询
func (s *LinkIntegrityService) buildCheckLinksMultiValueQuery(
	dbTableName string,
	fkHostTableName string,
	selfKeyName string,
	foreignKeyName string,
	linkDbFieldName string,
) string {
	// 参考 teable 的多值关系检查逻辑
	// 检查 JSON 数组中的 ID 是否与外键表中的记录一致
	return fmt.Sprintf(`
		SELECT t1.__id as id
		FROM %s t1
		LEFT JOIN (
			SELECT %s, GROUP_CONCAT(%s) as fk_ids
			FROM %s
			WHERE %s IS NOT NULL
			GROUP BY %s
		) fk_grouped ON t1.__id = fk_grouped.%s
		WHERE (
			fk_grouped.%s IS NULL AND t1.%s IS NOT NULL
			OR (
				t1.%s IS NOT NULL
				AND fk_grouped.fk_ids != (
					SELECT GROUP_CONCAT(id)
					FROM (
						SELECT json_extract(link.value, '$.id') as id
						FROM json_each(t1.%s) as link
					) t
				)
			)
		)
	`, s.quoteIdentifier(dbTableName),
		s.quoteIdentifier(selfKeyName),
		s.quoteIdentifier(foreignKeyName),
		s.quoteIdentifier(fkHostTableName),
		s.quoteIdentifier(selfKeyName),
		s.quoteIdentifier(selfKeyName),
		s.quoteIdentifier(selfKeyName),
		s.quoteIdentifier(selfKeyName),
		s.quoteIdentifier(linkDbFieldName),
		s.quoteIdentifier(linkDbFieldName),
		s.quoteIdentifier(linkDbFieldName))
}

// buildCheckLinksSingleValueSameTableQuery 构建单值关系（外键在同一表）的完整性检查查询
func (s *LinkIntegrityService) buildCheckLinksSingleValueSameTableQuery(
	dbTableName string,
	foreignKeyName string,
	linkDbFieldName string,
) string {
	// 检查 JSON 对象中的 ID 是否与外键列一致
	return fmt.Sprintf(`
		SELECT __id as id
		FROM %s
		WHERE (
			%s IS NULL AND %s IS NOT NULL
			OR (
				%s IS NOT NULL
				AND json_extract(%s, '$.id') != CAST(%s AS TEXT)
			)
		)
	`, s.quoteIdentifier(dbTableName),
		s.quoteIdentifier(foreignKeyName),
		s.quoteIdentifier(linkDbFieldName),
		s.quoteIdentifier(linkDbFieldName),
		s.quoteIdentifier(linkDbFieldName),
		s.quoteIdentifier(foreignKeyName))
}

// buildCheckLinksSingleValueDifferentTableQuery 构建单值关系（外键在不同表）的完整性检查查询
func (s *LinkIntegrityService) buildCheckLinksSingleValueDifferentTableQuery(
	dbTableName string,
	fkHostTableName string,
	selfKeyName string,
	foreignKeyName string,
	linkDbFieldName string,
) string {
	// 检查 JSON 对象中的 ID 是否与外键表中的记录一致
	return fmt.Sprintf(`
		SELECT t1.__id as id
		FROM %s t1
		LEFT JOIN %s t2 ON t2.%s = t1.__id
		WHERE (
			t2.%s IS NULL AND t1.%s IS NOT NULL
			OR (
				t1.%s IS NOT NULL
				AND json_extract(t1.%s, '$.id') != CAST(t2.%s AS TEXT)
			)
		)
	`, s.quoteIdentifier(dbTableName),
		s.quoteIdentifier(fkHostTableName),
		s.quoteIdentifier(selfKeyName),
		s.quoteIdentifier(foreignKeyName),
		s.quoteIdentifier(linkDbFieldName),
		s.quoteIdentifier(linkDbFieldName),
		s.quoteIdentifier(linkDbFieldName),
		s.quoteIdentifier(foreignKeyName))
}

// quoteIdentifier 引用标识符
func (s *LinkIntegrityService) quoteIdentifier(name string) string {
	return fmt.Sprintf(`"%s"`, name)
}

// Fix 修复完整性问题
// 参考 teable 的 fix 方法
func (s *LinkIntegrityService) Fix(
	ctx context.Context,
	fieldID string,
) (*IntegrityIssue, error) {
	// 查找字段
	field, err := s.fieldRepo.FindByID(ctx, fieldID)
	if err != nil {
		return nil, fmt.Errorf("查找字段失败: %w", err)
	}

	if field == nil {
		return nil, fmt.Errorf("字段不存在: %s", fieldID)
	}

	options := field.Options()
	if options == nil || options.Link == nil {
		return nil, fmt.Errorf("字段不是 Link 类型: %s", fieldID)
	}

	linkOptions := options.Link

	// 获取表信息
	tableID := field.TableID()

	// 获取关联表信息
	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		return nil, fmt.Errorf("关联表ID不存在")
	}

	// 检查不一致的链接
	inconsistentRecords, err := s.checkLinks(ctx, tableID, field, linkOptions)
	if err != nil {
		return nil, fmt.Errorf("检查链接失败: %w", err)
	}

	if len(inconsistentRecords) == 0 {
		return nil, nil
	}

	// 修复不一致的链接
	// ✅ 优化：确保所有关系类型都能正确修复，添加详细的错误处理和日志
	// 1. 从外键表获取正确的链接值
	// 2. 更新 JSON 列中的 link 值
	// 3. 删除无效的链接

	logger.Info("开始修复链接完整性问题",
		logger.String("field_id", fieldID),
		logger.String("table_id", tableID),
		logger.String("relationship", linkOptions.Relationship),
		logger.Int("inconsistent_count", len(inconsistentRecords)))

	fixedCount := 0
	failedCount := 0
	for _, recordID := range inconsistentRecords {
		if err := s.fixLinkForRecord(ctx, tableID, recordID, field, linkOptions); err != nil {
			logger.Error("修复记录链接失败",
				logger.String("record_id", recordID),
				logger.String("field_id", fieldID),
				logger.String("relationship", linkOptions.Relationship),
				logger.ErrorField(err))
			failedCount++
			continue
		}
		fixedCount++
	}

	logger.Info("✅ 链接完整性修复完成",
		logger.String("field_id", fieldID),
		logger.String("table_id", tableID),
		logger.String("relationship", linkOptions.Relationship),
		logger.Int("total_count", len(inconsistentRecords)),
		logger.Int("fixed_count", fixedCount),
		logger.Int("failed_count", failedCount))

	return &IntegrityIssue{
		Type:    "InvalidLinkReference",
		FieldID: fieldID,
		Message: fmt.Sprintf("修复了 %d 个不一致的链接（共 %d 个，失败 %d 个）", fixedCount, len(inconsistentRecords), failedCount),
	}, nil
}

// fixLinkForRecord 修复单个记录的链接完整性问题
func (s *LinkIntegrityService) fixLinkForRecord(
	ctx context.Context,
	tableID string,
	recordID string,
	field *entity.Field,
	linkOptions *fieldValueObject.LinkOptions,
) error {
	// 1. 从外键表获取正确的链接值
	// 根据关系类型，从外键表或 junction table 获取正确的链接值
	correctLinkValue, err := s.getCorrectLinkValue(ctx, tableID, recordID, field, linkOptions)
	if err != nil {
		return fmt.Errorf("获取正确的链接值失败: %w", err)
	}

	// 2. 更新 JSON 列中的 link 值
	// 使用 SQL 直接更新 JSONB 字段
	if err := s.updateLinkFieldValue(ctx, tableID, recordID, field, correctLinkValue); err != nil {
		return fmt.Errorf("更新 Link 字段值失败: %w", err)
	}

	logger.Debug("✅ 修复记录链接成功",
		logger.String("record_id", recordID),
		logger.String("field_id", field.ID().String()))

	return nil
}

// getCorrectLinkValue 从外键表获取正确的链接值
func (s *LinkIntegrityService) getCorrectLinkValue(
	ctx context.Context,
	tableID string,
	recordID string,
	field *entity.Field,
	linkOptions *fieldValueObject.LinkOptions,
) (interface{}, error) {
	relationship := linkOptions.Relationship
	foreignTableID := linkOptions.LinkedTableID
	fkHostTableName := linkOptions.FkHostTableName
	selfKeyName := linkOptions.SelfKeyName
	foreignKeyName := linkOptions.ForeignKeyName

	// 根据关系类型获取正确的链接值
	// ✅ 优化：确保所有关系类型都正确处理，添加详细的错误处理
	switch relationship {
	case "manyMany":
		// 从 junction table 获取
		if fkHostTableName == "" || selfKeyName == "" || foreignKeyName == "" {
			return nil, fmt.Errorf("manyMany 关系缺少必要的配置: fkHostTableName=%s, selfKeyName=%s, foreignKeyName=%s",
				fkHostTableName, selfKeyName, foreignKeyName)
		}
		return s.getLinkValueFromJunctionTable(ctx, fkHostTableName, selfKeyName, foreignKeyName, recordID)
	case "manyOne", "oneOne":
		// 从当前表的外键列获取
		if foreignKeyName == "" {
			return nil, fmt.Errorf("%s 关系缺少外键列名", relationship)
		}
		return s.getLinkValueFromForeignKeyColumn(ctx, tableID, foreignKeyName, recordID, foreignTableID, linkOptions)
	case "oneMany":
		// 从关联表的外键列获取
		if selfKeyName == "" {
			return nil, fmt.Errorf("oneMany 关系缺少外键列名")
		}
		return s.getLinkValueFromForeignKeyColumn(ctx, foreignTableID, selfKeyName, recordID, foreignTableID, linkOptions)
	default:
		return nil, fmt.Errorf("不支持的关系类型: %s", relationship)
	}
}

// getLinkValueFromJunctionTable 从 junction table 获取链接值
func (s *LinkIntegrityService) getLinkValueFromJunctionTable(
	ctx context.Context,
	junctionTableName string,
	selfKeyName string,
	foreignKeyName string,
	recordID string,
) (interface{}, error) {
	// 注意：junction table 的完整名称需要包含 baseID
	// 这里暂时使用 junctionTableName，实际应该从字段或表信息获取 baseID
	// TODO: 完善 baseID 获取逻辑（需要从字段的 tableID 获取 baseID）
	
	// 查询 junction table（假设 junctionTableName 已经是完整表名或需要从字段获取 baseID）
	// 这里先使用简单的查询，后续可以完善
	var results []struct {
		ForeignKey string `gorm:"column:foreign_key"`
	}
	
	query := fmt.Sprintf(`
		SELECT %s as foreign_key
		FROM %s
		WHERE %s = $1
	`, s.quoteIdentifier(foreignKeyName),
		s.quoteIdentifier(junctionTableName),
		s.quoteIdentifier(selfKeyName))

	if err := s.db.WithContext(ctx).Raw(query, recordID).Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("查询 junction table 失败: %w", err)
	}

	// 转换为 Link 值数组
	linkValues := make([]interface{}, 0, len(results))
	for _, result := range results {
		linkValues = append(linkValues, map[string]interface{}{
			"id": result.ForeignKey,
		})
	}

	if len(linkValues) == 0 {
		return nil, nil
	}
	if len(linkValues) == 1 {
		return linkValues[0], nil
	}
	return linkValues, nil
}

// getLinkValueFromForeignKeyColumn 从外键列获取链接值
func (s *LinkIntegrityService) getLinkValueFromForeignKeyColumn(
	ctx context.Context,
	tableID string,
	foreignKeyName string,
	recordID string,
	foreignTableID string,
	linkOptions *fieldValueObject.LinkOptions,
) (interface{}, error) {
	// 获取表信息以获取 baseID
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return nil, fmt.Errorf("获取表信息失败: %w", err)
	}
	if table == nil {
		return nil, fmt.Errorf("表不存在: %s", tableID)
	}

	baseID := table.GetBaseID()
	fullTableName := fmt.Sprintf(`%s.%s`, s.quoteIdentifier(baseID), s.quoteIdentifier(tableID))

	// 查询外键列的值
	var result struct {
		ForeignKey *string `gorm:"column:foreign_key"`
	}
	
	query := fmt.Sprintf(`
		SELECT %s as foreign_key
		FROM %s
		WHERE __id = $1
	`, s.quoteIdentifier(foreignKeyName),
		fullTableName)

	if err := s.db.WithContext(ctx).Raw(query, recordID).Scan(&result).Error; err != nil {
		return nil, fmt.Errorf("查询外键列失败: %w", err)
	}

	if result.ForeignKey == nil || *result.ForeignKey == "" {
		return nil, nil
	}

	// 转换为 Link 值
	return map[string]interface{}{
		"id": *result.ForeignKey,
	}, nil
}

// updateLinkFieldValue 更新 Link 字段值
func (s *LinkIntegrityService) updateLinkFieldValue(
	ctx context.Context,
	tableID string,
	recordID string,
	field *entity.Field,
	linkValue interface{},
) error {
	// 获取表信息以获取 baseID
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取表信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("表不存在: %s", tableID)
	}

	baseID := table.GetBaseID()
	fullTableName := fmt.Sprintf(`%s.%s`, s.quoteIdentifier(baseID), s.quoteIdentifier(tableID))

	// 获取字段的数据库字段名
	dbFieldName := field.DBFieldName().String()
	
	// 将 linkValue 转换为 JSON
	linkValueJSON, err := json.Marshal(linkValue)
	if err != nil {
		return fmt.Errorf("序列化 Link 值失败: %w", err)
	}

	// 使用 SQL 直接更新 JSONB 字段
	query := fmt.Sprintf(`
		UPDATE %s
		SET %s = $1::jsonb
		WHERE __id = $2
	`, fullTableName,
		s.quoteIdentifier(dbFieldName))

	if err := s.db.WithContext(ctx).Exec(query, linkValueJSON, recordID).Error; err != nil {
		return fmt.Errorf("更新 Link 字段值失败: %w", err)
	}

	return nil
}

