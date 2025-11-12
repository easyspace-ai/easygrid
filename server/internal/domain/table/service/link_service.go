package service

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// LinkService Link 字段服务
// 参考 teable 的实现：apps/nestjs-backend/src/features/calculation/link.service.ts
// 处理 Link 字段的外键管理、对称字段同步等
type LinkService struct {
	db         *gorm.DB
	fieldRepo  LinkFieldRepository
	recordRepo LinkRecordRepository
	tableRepo  LinkTableRepository  // ✨ 添加表仓储，用于获取 baseID
	dbProvider LinkDBProvider       // ✨ 添加数据库提供者，用于生成完整表名
}

// LinkTableRepository 表仓储接口（用于获取 baseID）
type LinkTableRepository interface {
	GetByID(ctx context.Context, tableID string) (LinkTable, error)
}

// LinkTable 表接口（用于获取 baseID）
type LinkTable interface {
	BaseID() string // ✨ 修复：使用 BaseID() 而不是 GetBaseID()，与 tableEntity.Table 保持一致
}

// linkTableWrapper 包装 Table 实体以适配 LinkTable 接口
type linkTableWrapper struct {
	table interface {
		BaseID() string
	}
}

func (w *linkTableWrapper) BaseID() string {
	return w.table.BaseID()
}

// NewLinkTableRepositoryAdapter 创建表仓储适配器
// 将 TableRepository 适配为 LinkTableRepository
func NewLinkTableRepositoryAdapter(tableRepo interface {
	GetByID(ctx context.Context, tableID string) (*tableEntity.Table, error)
}) LinkTableRepository {
	return &linkTableRepositoryAdapter{tableRepo: tableRepo}
}

type linkTableRepositoryAdapter struct {
	tableRepo interface {
		GetByID(ctx context.Context, tableID string) (*tableEntity.Table, error)
	}
}

func (a *linkTableRepositoryAdapter) GetByID(ctx context.Context, tableID string) (LinkTable, error) {
	table, err := a.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return nil, err
	}
	// 包装 Table 实体以适配 LinkTable 接口
	return &linkTableWrapper{table: table}, nil
}

// LinkDBProvider 数据库提供者接口（用于生成完整表名）
type LinkDBProvider interface {
	GenerateTableName(baseID, tableID string) string
}

// LinkFieldRepository Link 字段仓储接口
type LinkFieldRepository interface {
	FindByID(ctx context.Context, fieldID string) (*entity.Field, error)
	FindByIDs(ctx context.Context, fieldIDs []string) ([]*entity.Field, error)
	FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error)
	// ✨ 添加 Save 方法，用于保存修正后的字段
	Save(ctx context.Context, field *entity.Field) error
}

// LinkRecordRepository Link 记录仓储接口
type LinkRecordRepository interface {
	FindByIDs(ctx context.Context, tableID string, recordIDs []string) (map[string]map[string]interface{}, error)
	UpdateField(ctx context.Context, tableID, recordID, fieldID string, value interface{}) error
	BatchUpdateFields(ctx context.Context, tableID string, updates []FieldUpdate) error
}

// FieldUpdate 字段更新
type FieldUpdate struct {
	RecordID string
	FieldID  string
	Value    interface{}
}

// NewLinkService 创建 Link 服务
func NewLinkService(
	db *gorm.DB,
	fieldRepo LinkFieldRepository,
	recordRepo LinkRecordRepository,
	tableRepo LinkTableRepository,
	dbProvider LinkDBProvider,
) *LinkService {
	return &LinkService{
		db:         db,
		fieldRepo:  fieldRepo,
		recordRepo: recordRepo,
		tableRepo:  tableRepo,
		dbProvider: dbProvider,
	}
}

// LinkCellContext Link 单元格上下文
type LinkCellContext struct {
	RecordID string
	FieldID  string
	OldValue interface{} // *LinkCellValue 或 []*LinkCellValue
	NewValue interface{} // *LinkCellValue 或 []*LinkCellValue
}

// FkRecordItem 外键记录项
type FkRecordItem struct {
	OldKey interface{} // string 或 []string 或 nil
	NewKey interface{} // string 或 []string 或 nil
}

// FkRecordMap 外键记录映射
// fieldID -> recordID -> FkRecordItem
type FkRecordMap map[string]map[string]*FkRecordItem

// GetDerivateByLink 获取 Link 字段变更的衍生影响
// 参考 teable 的 getDerivateByLink 方法
func (s *LinkService) GetDerivateByLink(
	ctx context.Context,
	tableID string,
	cellContexts []LinkCellContext,
) (*LinkDerivation, error) {
	logger.Info("GetDerivateByLink 开始处理",
		logger.String("table_id", tableID),
		logger.Int("cell_context_count", len(cellContexts)))
	// 过滤出 Link 字段的变更
	linkContexts := s.filterLinkContext(cellContexts)
	logger.Info("GetDerivateByLink 过滤后",
		logger.String("table_id", tableID),
		logger.Int("link_context_count", len(linkContexts)))
	if len(linkContexts) == 0 {
		return nil, nil
	}

	// 获取相关字段信息
	fieldIDs := make([]string, 0, len(linkContexts))
	for _, ctx := range linkContexts {
		fieldIDs = append(fieldIDs, ctx.FieldID)
	}

	fields, err := s.fieldRepo.FindByIDs(ctx, fieldIDs)
	if err != nil {
		return nil, fmt.Errorf("查找字段失败: %w", err)
	}

	fieldMap := make(map[string]*entity.Field)
	for _, field := range fields {
		fieldMap[field.ID().String()] = field
	}

	// 获取外键记录映射
	fkRecordMap, err := s.getFkRecordMap(ctx, tableID, fieldMap, linkContexts)
	if err != nil {
		return nil, fmt.Errorf("获取外键记录映射失败: %w", err)
	}

	// 保存外键到数据库
	if err := s.saveForeignKeyToDb(ctx, tableID, fieldMap, fkRecordMap); err != nil {
		return nil, fmt.Errorf("保存外键失败: %w", err)
	}

	// 更新对称字段
	cellChanges, err := s.updateSymmetricFields(ctx, tableID, fieldMap, fkRecordMap, linkContexts)
	if err != nil {
		return nil, fmt.Errorf("更新对称字段失败: %w", err)
	}

	return &LinkDerivation{
		CellChanges: cellChanges,
		FkRecordMap: fkRecordMap,
	}, nil
}

// LinkDerivation Link 字段衍生影响
type LinkDerivation struct {
	CellChanges []CellChange
	FkRecordMap FkRecordMap
}

// CellChange 单元格变更
type CellChange struct {
	TableID  string
	RecordID string
	FieldID  string
	OldValue interface{}
	NewValue interface{}
}

// filterLinkContext 过滤 Link 字段的变更上下文
func (s *LinkService) filterLinkContext(contexts []LinkCellContext) []LinkCellContext {
	filtered := make([]LinkCellContext, 0)
	for _, ctx := range contexts {
		// 检查是否有 Link 字段的值
		if s.isLinkCellValue(ctx.NewValue) || s.isLinkCellValue(ctx.OldValue) {
			filtered = append(filtered, ctx)
		}
	}
	return filtered
}

// isLinkCellValue 判断是否为 Link 单元格值
func (s *LinkService) isLinkCellValue(value interface{}) bool {
	if value == nil {
		return false
	}

	// 检查是否为单个 LinkCellValue
	if m, ok := value.(map[string]interface{}); ok {
		if id, exists := m["id"]; exists && id != nil {
			return true
		}
	}

	// 检查是否为 LinkCellValue 数组
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

// getFkRecordMap 获取外键记录映射
func (s *LinkService) getFkRecordMap(
	ctx context.Context,
	tableID string,
	fieldMap map[string]*entity.Field,
	linkContexts []LinkCellContext,
) (FkRecordMap, error) {
	fkRecordMap := make(FkRecordMap)

	// 按字段分组
	fieldGroups := make(map[string][]LinkCellContext)
	for _, ctx := range linkContexts {
		fieldGroups[ctx.FieldID] = append(fieldGroups[ctx.FieldID], ctx)
	}

	for fieldID, contexts := range fieldGroups {
		field, exists := fieldMap[fieldID]
		if !exists {
			continue
		}

		// 获取字段选项
		options := field.Options()
		if options == nil || options.Link == nil {
			continue
		}

		// 解析外键记录项
		fkMap := make(map[string]*FkRecordItem)
		for _, ctx := range contexts {
			fkItem, err := s.parseFkRecordItem(field, ctx, options.Link)
			if err != nil {
				return nil, fmt.Errorf("解析外键记录项失败: %w", err)
			}
			if fkItem != nil {
				fkMap[ctx.RecordID] = fkItem
			}
		}

		if len(fkMap) > 0 {
			fkRecordMap[fieldID] = fkMap
		}
	}

	return fkRecordMap, nil
}

// parseFkRecordItem 解析外键记录项
func (s *LinkService) parseFkRecordItem(
	field *entity.Field,
	ctx LinkCellContext,
	linkOptions *fieldValueObject.LinkOptions,
) (*FkRecordItem, error) {
	relationship := linkOptions.Relationship
	if relationship == "" {
		relationship = "manyMany" // 默认值
	}

	// 提取旧值和新值的记录ID
	oldKey := s.extractRecordIDs(ctx.OldValue)
	newKey := s.extractRecordIDs(ctx.NewValue)

	// 根据关系类型处理
	switch relationship {
	case "oneOne", "manyOne":
		// 单值关系
		var oldKeyStr string
		if len(oldKey) > 0 {
			oldKeyStr = oldKey[0]
		}
		var newKeyStr string
		if len(newKey) > 0 {
			newKeyStr = newKey[0]
		}
		return &FkRecordItem{
			OldKey: oldKeyStr,
			NewKey: newKeyStr,
		}, nil

	case "manyMany", "oneMany":
		// 多值关系
		return &FkRecordItem{
			OldKey: oldKey,
			NewKey: newKey,
		}, nil

	default:
		return nil, fmt.Errorf("不支持的关系类型: %s", relationship)
	}
}

// extractRecordIDs 从 Link 单元格值中提取记录ID
func (s *LinkService) extractRecordIDs(value interface{}) []string {
	if value == nil {
		return nil
	}

	// 如果是数组
	if arr, ok := value.([]interface{}); ok {
		ids := make([]string, 0, len(arr))
		for _, item := range arr {
			if id := s.extractRecordID(item); id != "" {
				ids = append(ids, id)
			}
		}
		return ids
	}

	// 如果是单个值
	if id := s.extractRecordID(value); id != "" {
		return []string{id}
	}

	return nil
}

// extractRecordID 从值中提取记录ID
func (s *LinkService) extractRecordID(value interface{}) string {
	if value == nil {
		return ""
	}

	if m, ok := value.(map[string]interface{}); ok {
		if id, exists := m["id"]; exists {
			if idStr, ok := id.(string); ok {
				return idStr
			}
		}
	}

	if idStr, ok := value.(string); ok {
		return idStr
	}

	return ""
}

// saveForeignKeyToDb 保存外键到数据库
func (s *LinkService) saveForeignKeyToDb(
	ctx context.Context,
	tableID string,
	fieldMap map[string]*entity.Field,
	fkRecordMap FkRecordMap,
) error {
	logger.Info("saveForeignKeyToDb 开始处理",
		logger.String("table_id", tableID),
		logger.Int("field_count", len(fkRecordMap)),
		logger.Int("field_map_count", len(fieldMap)))
	for fieldID, fkMap := range fkRecordMap {
		logger.Info("saveForeignKeyToDb 处理字段循环",
			logger.String("field_id", fieldID),
			logger.String("table_id", tableID))
		field, exists := fieldMap[fieldID]
		if !exists {
			continue
		}

		options := field.Options()
		if options == nil || options.Link == nil {
			continue
		}

		linkOptions := options.Link

		// ✨ 调试：记录字段的 LinkOptions 信息
		logger.Info("saveForeignKeyToDb 处理字段",
			logger.String("field_id", fieldID),
			logger.String("table_id", tableID),
			logger.String("linked_table_id", linkOptions.LinkedTableID),
			logger.String("relationship", linkOptions.Relationship),
			logger.String("fk_host_table_name", linkOptions.FkHostTableName),
			logger.String("self_key_name", linkOptions.SelfKeyName),
			logger.String("foreign_key_name", linkOptions.ForeignKeyName))

		// ✨ 关键修复：转换 LinkOptions 到 table/valueobject.LinkFieldOptions
		// 这里必须传入 tableID 作为 currentTableID，以确保 manyMany 关系的 junction table 名称正确
		linkFieldOptions, err := s.convertLinkOptions(tableID, linkOptions)
		if err != nil {
			return fmt.Errorf("转换 Link 选项失败: %w", err)
		}
		
		// ✨ 关键修复：如果 convertLinkOptions 修正了 FkHostTableName，需要更新字段的 options 并保存到数据库
		// 这样可以确保下次加载字段时，FkHostTableName 是正确的
		if linkOptions.FkHostTableName != linkFieldOptions.FkHostTableName {
			logger.Warn("saveForeignKeyToDb 检测到 FkHostTableName 需要修正",
				logger.String("field_id", fieldID),
				logger.String("table_id", tableID),
				logger.String("old_fk_host_table_name", linkOptions.FkHostTableName),
				logger.String("new_fk_host_table_name", linkFieldOptions.FkHostTableName),
				logger.String("relationship", linkOptions.Relationship))
			// 更新字段的 options（内存中）
			linkOptions.FkHostTableName = linkFieldOptions.FkHostTableName
			linkOptions.SelfKeyName = linkFieldOptions.SelfKeyName
			linkOptions.ForeignKeyName = linkFieldOptions.ForeignKeyName
			field.UpdateOptions(options)
			// ✨ 关键修复：保存修正后的字段到数据库，确保 FkHostTableName 被持久化
			if err := s.fieldRepo.Save(ctx, field); err != nil {
				logger.Error("saveForeignKeyToDb 保存修正后的字段失败",
					logger.String("field_id", fieldID),
					logger.String("table_id", tableID),
					logger.ErrorField(err))
				// 注意：这里不返回错误，因为字段修正失败不应该阻止外键保存
				// 但是，记录错误以便后续排查
			} else {
				logger.Info("saveForeignKeyToDb 保存修正后的字段成功",
					logger.String("field_id", fieldID),
					logger.String("table_id", tableID),
					logger.String("new_fk_host_table_name", linkFieldOptions.FkHostTableName))
			}
		}

		relationship := linkFieldOptions.GetRelationship()
		if relationship == "" {
			relationship = "manyMany"
		}

		switch relationship {
		case "manyMany":
			if err := s.saveForeignKeyForManyMany(ctx, tableID, linkFieldOptions, fkMap); err != nil {
				return fmt.Errorf("保存多对多外键失败: %w", err)
			}
		case "manyOne":
			if err := s.saveForeignKeyForManyOne(ctx, linkFieldOptions, fkMap); err != nil {
				return fmt.Errorf("保存多对一外键失败: %w", err)
			}
		case "oneMany":
			if err := s.saveForeignKeyForOneMany(ctx, linkFieldOptions, fkMap); err != nil {
				return fmt.Errorf("保存一对多外键失败: %w", err)
			}
		case "oneOne":
			if err := s.saveForeignKeyForOneOne(ctx, linkFieldOptions, fkMap); err != nil {
				return fmt.Errorf("保存一对一外键失败: %w", err)
			}
		}
	}

	return nil
}

// convertLinkOptions 转换 LinkOptions 到 LinkFieldOptions
func (s *LinkService) convertLinkOptions(currentTableID string, linkOptions *fieldValueObject.LinkOptions) (*valueobject.LinkFieldOptions, error) {
	// 获取必需字段
	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		return nil, fmt.Errorf("关联表ID不存在")
	}

	relationship := linkOptions.Relationship
	if relationship == "" {
		relationship = "manyMany"
	}

	// 生成必需的字段名（如果不存在或格式不正确）
	fkHostTableName := linkOptions.FkHostTableName
	selfKeyName := linkOptions.SelfKeyName
	foreignKeyName := linkOptions.ForeignKeyName
	
	// ✨ 调试：记录字段加载时的 FkHostTableName 值
	logger.Info("convertLinkOptions 开始转换",
		logger.String("currentTableID", currentTableID),
		logger.String("foreignTableID", foreignTableID),
		logger.String("relationship", relationship),
		logger.String("fkHostTableName_from_field", fkHostTableName),
		logger.String("selfKeyName_from_field", selfKeyName),
		logger.String("foreignKeyName_from_field", foreignKeyName))

	// ✨ 验证并修正 FkHostTableName（特别是 manyMany 关系）
	shouldRegenerate := false
	logger.Info("convertLinkOptions 验证 FkHostTableName",
		logger.String("current", fkHostTableName),
		logger.String("currentTableID", currentTableID),
		logger.String("foreignTableID", foreignTableID),
		logger.String("relationship", relationship))
	
	if fkHostTableName == "" {
		shouldRegenerate = true
		logger.Info("FkHostTableName 为空，需要生成")
	} else if relationship == "manyMany" {
		// 对于 manyMany 关系，验证 FkHostTableName 格式是否正确
		// 正确的格式应该是：link_tbl_xxx_tbl_yyy（包含两个表的 ID）
		expectedPattern := fmt.Sprintf("link_%s_%s", currentTableID, foreignTableID)
		// 也检查反向顺序（因为两个表的顺序可能不同）
		expectedPatternReverse := fmt.Sprintf("link_%s_%s", foreignTableID, currentTableID)
		
		logger.Info("验证 manyMany 关系的 FkHostTableName",
			logger.String("current", fkHostTableName),
			logger.String("expectedPattern", expectedPattern),
			logger.String("expectedPatternReverse", expectedPatternReverse))
		
		if fkHostTableName != expectedPattern && fkHostTableName != expectedPatternReverse {
			// 如果格式不正确（比如包含 "manyMany"），需要重新生成
			if strings.Contains(fkHostTableName, "manyMany") {
				logger.Warn("检测到错误的 FkHostTableName 格式（包含 manyMany），将重新生成",
					logger.String("current", fkHostTableName),
					logger.String("expected", expectedPattern),
					logger.String("relationship", relationship))
				shouldRegenerate = true
			} else {
				// 即使不包含 "manyMany"，如果格式不匹配，也应该重新生成
				logger.Warn("FkHostTableName 格式不匹配，将重新生成",
					logger.String("current", fkHostTableName),
					logger.String("expected", expectedPattern),
					logger.String("expectedReverse", expectedPatternReverse),
					logger.String("relationship", relationship))
				shouldRegenerate = true
			}
		}
	}

	if shouldRegenerate {
		// 根据关系类型生成 FkHostTableName（与 field_service.go 保持一致）
		switch relationship {
		case "manyMany":
			// ManyMany: junction table 名称，需要包含两个表的 ID
			fkHostTableName = fmt.Sprintf("link_%s_%s", currentTableID, foreignTableID)
		case "manyOne":
			// ManyOne: 当前表名（外键存储在当前表）
			fkHostTableName = currentTableID
		case "oneMany":
			// OneMany: 关联表名（外键存储在关联表）
			fkHostTableName = foreignTableID
		case "oneOne":
			// OneOne: 当前表名（外键存储在当前表）
			fkHostTableName = currentTableID
		default:
			// 默认使用当前表名
			fkHostTableName = currentTableID
		}
		logger.Info("自动生成/修正 FkHostTableName（LinkService）",
			logger.String("relationship", relationship),
			logger.String("currentTableID", currentTableID),
			logger.String("foreignTableID", foreignTableID),
			logger.String("fkHostTableName", fkHostTableName),
		)
	}

	if selfKeyName == "" {
		if relationship == "manyMany" {
			// 对于 manyMany 关系，junction table 中的 selfKeyName 应该是指向当前表的外键列名
			selfKeyName = fmt.Sprintf("%s_id", currentTableID)
		} else {
			selfKeyName = "__id" // 默认使用主键
		}
	}

	if foreignKeyName == "" {
		if relationship == "manyMany" {
			// 对于 manyMany 关系，junction table 中的 foreignKeyName 应该是指向关联表的外键列名
			foreignKeyName = fmt.Sprintf("%s_id", foreignTableID)
		} else {
			foreignKeyName = "__id" // 默认使用主键
		}
	}

	// 创建 LinkFieldOptions
	linkFieldOptions, err := valueobject.NewLinkFieldOptions(
		foreignTableID,
		relationship,
		linkOptions.LookupFieldID,
		fkHostTableName,
		selfKeyName,
		foreignKeyName,
	)
	if err != nil {
		return nil, err
	}

	// 设置可选字段
	if linkOptions.SymmetricFieldID != "" {
		linkFieldOptions.WithSymmetricField(linkOptions.SymmetricFieldID)
	}

	if !linkOptions.IsSymmetric {
		linkFieldOptions.AsOneWay()
	}

	return linkFieldOptions, nil
}

// saveForeignKeyForManyMany 保存多对多关系的外键
// 参考 teable 的 saveForeignKeyForManyMany 方法
func (s *LinkService) saveForeignKeyForManyMany(
	ctx context.Context,
	tableID string, // ✨ 添加 tableID 参数，用于获取 baseID
	options *valueobject.LinkFieldOptions,
	fkMap map[string]*FkRecordItem,
) error {
	// 获取 junction table 名称
	junctionTableName := options.FkHostTableName
	logger.Info("saveForeignKeyForManyMany 获取 junction table 名称",
		logger.String("table_id", tableID),
		logger.String("junction_table_name", junctionTableName),
		logger.String("options_fk_host_table_name", options.FkHostTableName))
	if junctionTableName == "" {
		return fmt.Errorf("junction table name is required for many-many relationship")
	}

	// ✨ 生成完整的 junction table 名称（包含 baseID）
	var fullJunctionTableName string
	if s.tableRepo != nil && s.dbProvider != nil {
		// 从 tableID 获取 baseID
		table, err := s.tableRepo.GetByID(ctx, tableID)
		if err != nil {
			logger.Warn("无法获取表信息，使用原始 junction table 名称",
				logger.String("table_id", tableID),
				logger.ErrorField(err))
			fullJunctionTableName = junctionTableName
		} else if table != nil {
			baseID := table.BaseID() // ✨ 修复：使用 BaseID() 而不是 GetBaseID()
			fullJunctionTableName = s.dbProvider.GenerateTableName(baseID, junctionTableName)
			logger.Info("生成完整 junction table 名称",
				logger.String("base_id", baseID),
				logger.String("junction_table_name", junctionTableName),
				logger.String("full_junction_table_name", fullJunctionTableName))
		} else {
			fullJunctionTableName = junctionTableName
		}
	} else {
		// 如果没有 tableRepo 或 dbProvider，使用原始名称（向后兼容）
		fullJunctionTableName = junctionTableName
	}

	// 收集需要删除和添加的记录
	toDelete := make([][]string, 0)
	toAdd := make([][]string, 0)

	for recordID, fkItem := range fkMap {
		oldKeys := s.extractStringArray(fkItem.OldKey)
		newKeys := s.extractStringArray(fkItem.NewKey)

		// 计算差异
		toDeleteKeys := s.difference(oldKeys, newKeys)
		toAddKeys := s.difference(newKeys, oldKeys)

		// 添加到删除列表
		for _, key := range toDeleteKeys {
			toDelete = append(toDelete, []string{recordID, key})
		}

		// 添加到添加列表
		for _, key := range toAddKeys {
			toAdd = append(toAdd, []string{recordID, key})
		}
	}

	// 执行删除
	if len(toDelete) > 0 {
		// 使用 GORM 的批量删除
		for _, pair := range toDelete {
			deleteSQL := fmt.Sprintf(`
				DELETE FROM %s 
				WHERE %s = ? AND %s = ?
			`, s.quoteIdentifier(fullJunctionTableName),
				s.quoteIdentifier(options.SelfKeyName),
				s.quoteIdentifier(options.ForeignKeyName))

			if err := s.db.WithContext(ctx).Exec(deleteSQL, pair[0], pair[1]).Error; err != nil {
				return fmt.Errorf("删除多对多外键失败: %w", err)
			}
		}
		logger.Debug("删除多对多外键", logger.Int("count", len(toDelete)))
	}

	// 执行添加
	if len(toAdd) > 0 {
		// 使用 GORM 的批量插入
		for _, pair := range toAdd {
			insertSQL := fmt.Sprintf(`
				INSERT INTO %s (%s, %s) VALUES (?, ?)
			`, s.quoteIdentifier(fullJunctionTableName),
				s.quoteIdentifier(options.SelfKeyName),
				s.quoteIdentifier(options.ForeignKeyName))

			logger.Info("saveForeignKeyForManyMany 执行 INSERT",
				logger.String("full_junction_table_name", fullJunctionTableName),
				logger.String("junction_table_name", junctionTableName),
				logger.String("options_fk_host_table_name", options.FkHostTableName),
				logger.String("self_key_name", options.SelfKeyName),
				logger.String("foreign_key_name", options.ForeignKeyName),
				logger.String("sql", insertSQL),
				logger.String("pair_0", pair[0]),
				logger.String("pair_1", pair[1]))

			if err := s.db.WithContext(ctx).Exec(insertSQL, pair[0], pair[1]).Error; err != nil {
				return fmt.Errorf("添加多对多外键失败: %w", err)
			}
		}
		logger.Debug("添加多对多外键", logger.Int("count", len(toAdd)))
	}

	return nil
}

// saveForeignKeyForManyOne 保存多对一关系的外键
// 参考 teable 的 saveForeignKeyForManyOne 方法
func (s *LinkService) saveForeignKeyForManyOne(
	ctx context.Context,
	options *valueobject.LinkFieldOptions,
	fkMap map[string]*FkRecordItem,
) error {
	// 获取表名（当前表）
	tableName := options.FkHostTableName
	if tableName == "" {
		return fmt.Errorf("table name is required for many-one relationship")
	}

	// 收集需要更新和清空的记录
	toUpdate := make(map[string]string) // recordID -> foreignKey
	toClear := make([]string, 0)

	for recordID, fkItem := range fkMap {
		oldKey := s.extractString(fkItem.OldKey)
		newKey := s.extractString(fkItem.NewKey)

		if newKey != "" {
			// 需要更新外键
			toUpdate[recordID] = newKey
		} else if oldKey != "" {
			// 需要清空外键
			toClear = append(toClear, recordID)
		}
	}

	// 执行更新
	if len(toUpdate) > 0 {
		for recordID, foreignKey := range toUpdate {
			updateSQL := fmt.Sprintf(`
				UPDATE %s 
				SET %s = ? 
				WHERE __id = ?
			`, s.quoteIdentifier(tableName),
				s.quoteIdentifier(options.ForeignKeyName))

			if err := s.db.WithContext(ctx).Exec(updateSQL, foreignKey, recordID).Error; err != nil {
				return fmt.Errorf("更新多对一外键失败: %w", err)
			}
		}
		logger.Debug("更新多对一外键", logger.Int("count", len(toUpdate)))
	}

	// 执行清空
	if len(toClear) > 0 {
		// 使用 GORM 的批量更新
		for _, recordID := range toClear {
			clearSQL := fmt.Sprintf(`
				UPDATE %s 
				SET %s = NULL 
				WHERE __id = ?
			`, s.quoteIdentifier(tableName),
				s.quoteIdentifier(options.ForeignKeyName))

			if err := s.db.WithContext(ctx).Exec(clearSQL, recordID).Error; err != nil {
				return fmt.Errorf("清空多对一外键失败: %w", err)
			}
		}
		logger.Debug("清空多对一外键", logger.Int("count", len(toClear)))
	}

	return nil
}

// saveForeignKeyForOneMany 保存一对多关系的外键
// 参考 teable 的 saveForeignKeyForOneMany 方法
func (s *LinkService) saveForeignKeyForOneMany(
	ctx context.Context,
	options *valueobject.LinkFieldOptions,
	fkMap map[string]*FkRecordItem,
) error {
	// 获取表名（关联表）
	tableName := options.FkHostTableName
	if tableName == "" {
		return fmt.Errorf("table name is required for one-many relationship")
	}

	// 收集需要更新和清空的记录
	// recordID (source) -> []foreignRecordID (targets)
	toUpdate := make(map[string][]string)
	toClear := make([]string, 0)

	for recordID, fkItem := range fkMap {
		oldKeys := s.extractStringArray(fkItem.OldKey)
		newKeys := s.extractStringArray(fkItem.NewKey)

		if len(newKeys) > 0 {
			// 需要更新外键
			toUpdate[recordID] = newKeys
		} else if len(oldKeys) > 0 {
			// 需要清空外键（所有关联记录）
			toClear = append(toClear, oldKeys...)
		}
	}

	// 执行清空（先清空旧的外键）
	if len(toClear) > 0 {
		// 使用 GORM 的批量更新
		for _, recordID := range toClear {
			clearSQL := fmt.Sprintf(`
				UPDATE %s 
				SET %s = NULL 
				WHERE __id = ?
			`, s.quoteIdentifier(tableName),
				s.quoteIdentifier(options.SelfKeyName))

			if err := s.db.WithContext(ctx).Exec(clearSQL, recordID).Error; err != nil {
				return fmt.Errorf("清空一对多外键失败: %w", err)
			}
		}
		logger.Debug("清空一对多外键", logger.Int("count", len(toClear)))
	}

	// 执行更新（设置新的外键）
	if len(toUpdate) > 0 {
		for recordID, foreignKeys := range toUpdate {
			for _, foreignKey := range foreignKeys {
				updateSQL := fmt.Sprintf(`
					UPDATE %s 
					SET %s = ? 
					WHERE __id = ?
				`, s.quoteIdentifier(tableName),
					s.quoteIdentifier(options.SelfKeyName))

				if err := s.db.WithContext(ctx).Exec(updateSQL, recordID, foreignKey).Error; err != nil {
					return fmt.Errorf("更新一对多外键失败: %w", err)
				}
			}
		}
		logger.Debug("更新一对多外键", logger.Int("count", len(toUpdate)))
	}

	return nil
}

// saveForeignKeyForOneOne 保存一对一关系的外键
// 参考 teable 的 saveForeignKeyForOneOne 方法
func (s *LinkService) saveForeignKeyForOneOne(
	ctx context.Context,
	options *valueobject.LinkFieldOptions,
	fkMap map[string]*FkRecordItem,
) error {
	// 获取表名（当前表）
	tableName := options.FkHostTableName
	if tableName == "" {
		return fmt.Errorf("table name is required for one-one relationship")
	}

	// 收集需要更新和清空的记录
	toUpdate := make(map[string]string) // recordID -> foreignKey
	toClear := make([]string, 0)

	for recordID, fkItem := range fkMap {
		oldKey := s.extractString(fkItem.OldKey)
		newKey := s.extractString(fkItem.NewKey)

		if newKey != "" {
			// 需要更新外键
			toUpdate[recordID] = newKey
		} else if oldKey != "" {
			// 需要清空外键
			toClear = append(toClear, recordID)
		}
	}

	// 执行更新
	if len(toUpdate) > 0 {
		for recordID, foreignKey := range toUpdate {
			updateSQL := fmt.Sprintf(`
				UPDATE %s 
				SET %s = ? 
				WHERE __id = ?
			`, s.quoteIdentifier(tableName),
				s.quoteIdentifier(options.ForeignKeyName))

			if err := s.db.WithContext(ctx).Exec(updateSQL, foreignKey, recordID).Error; err != nil {
				return fmt.Errorf("更新一对一外键失败: %w", err)
			}
		}
		logger.Debug("更新一对一外键", logger.Int("count", len(toUpdate)))
	}

	// 执行清空
	if len(toClear) > 0 {
		// 使用 GORM 的批量更新
		for _, recordID := range toClear {
			clearSQL := fmt.Sprintf(`
				UPDATE %s 
				SET %s = NULL 
				WHERE __id = ?
			`, s.quoteIdentifier(tableName),
				s.quoteIdentifier(options.ForeignKeyName))

			if err := s.db.WithContext(ctx).Exec(clearSQL, recordID).Error; err != nil {
				return fmt.Errorf("清空一对一外键失败: %w", err)
			}
		}
		logger.Debug("清空一对一外键", logger.Int("count", len(toClear)))
	}

	return nil
}

// updateSymmetricFields 更新对称字段
// 参考 teable 的 updateLinkRecord 方法
func (s *LinkService) updateSymmetricFields(
	ctx context.Context,
	tableID string,
	fieldMap map[string]*entity.Field,
	fkRecordMap FkRecordMap,
	linkContexts []LinkCellContext,
) ([]CellChange, error) {
	cellChanges := make([]CellChange, 0)

	// 遍历所有 Link 字段
	for fieldID, fkMap := range fkRecordMap {
		field, exists := fieldMap[fieldID]
		if !exists {
			continue
		}

		options := field.Options()
		if options == nil || options.Link == nil {
			continue
		}

		linkOptions := options.Link

		// 转换 LinkOptions 到 LinkFieldOptions
		linkFieldOptions, err := s.convertLinkOptions(tableID, linkOptions)
		if err != nil {
			logger.Warn("转换 Link 选项失败",
				logger.String("field_id", fieldID),
				logger.ErrorField(err))
			continue
		}

		// 检查是否有对称字段
		if linkFieldOptions.IsOneWay || linkFieldOptions.SymmetricFieldID == "" {
			continue
		}

		// 获取对称字段
		symmetricFieldID := linkFieldOptions.SymmetricFieldID
		foreignTableID := linkFieldOptions.GetForeignTableID()

		// 获取对称字段信息
		symmetricField, err := s.fieldRepo.FindByID(ctx, symmetricFieldID)
		if err != nil || symmetricField == nil {
			logger.Warn("对称字段不存在",
				logger.String("symmetric_field_id", symmetricFieldID),
				logger.ErrorField(err))
			continue
		}

		relationship := linkFieldOptions.GetRelationship()
		if relationship == "" {
			relationship = "manyMany"
		}

		// 根据关系类型更新对称字段
		for recordID, fkItem := range fkMap {
			// 根据关系类型调用不同的更新方法
			var changes []CellChange
			switch relationship {
			case "manyMany":
				changes = s.updateForeignCellForManyMany(ctx, fkItem, recordID, symmetricFieldID, foreignTableID, field)
			case "manyOne":
				changes = s.updateForeignCellForManyOne(ctx, fkItem, recordID, symmetricFieldID, foreignTableID, field)
			case "oneMany":
				changes = s.updateForeignCellForOneMany(ctx, fkItem, recordID, symmetricFieldID, foreignTableID, field)
			case "oneOne":
				changes = s.updateForeignCellForOneOne(ctx, fkItem, recordID, symmetricFieldID, foreignTableID, field)
			}
			cellChanges = append(cellChanges, changes...)
		}
	}

	// ✨ 实际应用对称字段的更新
	if len(cellChanges) > 0 {
		if err := s.applySymmetricFieldUpdates(ctx, cellChanges); err != nil {
			return nil, fmt.Errorf("应用对称字段更新失败: %w", err)
		}
	}

	return cellChanges, nil
}

// updateForeignCellForManyMany 更新多对多关系的对称字段
func (s *LinkService) updateForeignCellForManyMany(
	ctx context.Context,
	fkItem *FkRecordItem,
	recordID string,
	symmetricFieldID string,
	foreignTableID string,
	mainField *entity.Field,
) []CellChange {
	changes := make([]CellChange, 0)

	oldKeys := s.extractStringArray(fkItem.OldKey)
	newKeys := s.extractStringArray(fkItem.NewKey)

	toDelete := s.difference(oldKeys, newKeys)
	toAdd := s.difference(newKeys, oldKeys)

	// 获取源记录的 lookup field 值（用于生成 title）
	// 注意：recordID 是主字段所在表的记录ID，需要从主字段的表获取 lookup field 值
	mainTableID := mainField.TableID()
	lookupTitle := s.getLookupFieldTitle(ctx, mainTableID, recordID, mainField)

	// 删除对称字段中的引用
	for _, foreignRecordID := range toDelete {
		oldValue, _ := s.recordRepo.FindByIDs(ctx, foreignTableID, []string{foreignRecordID})
		oldLinkValue := s.extractLinkFieldValue(ctx, oldValue[foreignRecordID], symmetricFieldID)
		newLinkValue := s.removeLinkValueFromArray(oldLinkValue, recordID)
		
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: foreignRecordID,
			FieldID:  symmetricFieldID,
			OldValue: oldLinkValue,
			NewValue: newLinkValue,
		})
	}

	// 添加对称字段中的引用
	for _, foreignRecordID := range toAdd {
		oldValue, _ := s.recordRepo.FindByIDs(ctx, foreignTableID, []string{foreignRecordID})
		oldLinkValue := s.extractLinkFieldValue(ctx, oldValue[foreignRecordID], symmetricFieldID)
		newLinkValue := s.addLinkValueToArray(oldLinkValue, recordID, lookupTitle)
		
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: foreignRecordID,
			FieldID:  symmetricFieldID,
			OldValue: oldLinkValue,
			NewValue: newLinkValue,
		})
	}

	return changes
}

// updateForeignCellForManyOne 更新多对一关系的对称字段
func (s *LinkService) updateForeignCellForManyOne(
	ctx context.Context,
	fkItem *FkRecordItem,
	recordID string,
	symmetricFieldID string,
	foreignTableID string,
	mainField *entity.Field,
) []CellChange {
	changes := make([]CellChange, 0)

	oldKey := s.extractString(fkItem.OldKey)
	newKey := s.extractString(fkItem.NewKey)

	// 获取源记录的 lookup field 值（用于生成 title）
	// 注意：recordID 是主字段所在表的记录ID，需要从主字段的表获取 lookup field 值
	mainTableID := mainField.TableID()
	lookupTitle := s.getLookupFieldTitle(ctx, mainTableID, recordID, mainField)

	// 从旧的外键记录中移除引用
	if oldKey != "" {
		oldValue, _ := s.recordRepo.FindByIDs(ctx, foreignTableID, []string{oldKey})
		oldLinkValue := s.extractLinkFieldValue(ctx, oldValue[oldKey], symmetricFieldID)
		newLinkValue := s.removeLinkValueFromArray(oldLinkValue, recordID)
		
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: oldKey,
			FieldID:  symmetricFieldID,
			OldValue: oldLinkValue,
			NewValue: newLinkValue,
		})
	}

	// 在新的外键记录中添加引用
	if newKey != "" {
		oldValue, _ := s.recordRepo.FindByIDs(ctx, foreignTableID, []string{newKey})
		oldLinkValue := s.extractLinkFieldValue(ctx, oldValue[newKey], symmetricFieldID)
		newLinkValue := s.addLinkValueToArray(oldLinkValue, recordID, lookupTitle)
		
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: newKey,
			FieldID:  symmetricFieldID,
			OldValue: oldLinkValue,
			NewValue: newLinkValue,
		})
	}

	return changes
}

// updateForeignCellForOneMany 更新一对多关系的对称字段
func (s *LinkService) updateForeignCellForOneMany(
	ctx context.Context,
	fkItem *FkRecordItem,
	recordID string,
	symmetricFieldID string,
	foreignTableID string,
	mainField *entity.Field,
) []CellChange {
	changes := make([]CellChange, 0)

	oldKeys := s.extractStringArray(fkItem.OldKey)
	newKeys := s.extractStringArray(fkItem.NewKey)

	toDelete := s.difference(oldKeys, newKeys)
	toAdd := s.difference(newKeys, oldKeys)

	// 获取源记录的 lookup field 值（用于生成 title）
	// 注意：recordID 是主字段所在表的记录ID，需要从主字段的表获取 lookup field 值
	mainTableID := mainField.TableID()
	lookupTitle := s.getLookupFieldTitle(ctx, mainTableID, recordID, mainField)

	// 删除对称字段中的引用（设置为 null）
	for _, foreignRecordID := range toDelete {
		oldValue, _ := s.recordRepo.FindByIDs(ctx, foreignTableID, []string{foreignRecordID})
		oldLinkValue := s.extractLinkFieldValue(ctx, oldValue[foreignRecordID], symmetricFieldID)
		
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: foreignRecordID,
			FieldID:  symmetricFieldID,
			OldValue: oldLinkValue,
			NewValue: nil, // 一对多关系，设置为 null
		})
	}

	// 添加对称字段中的引用（设置为单个值）
	for _, foreignRecordID := range toAdd {
		oldValue, _ := s.recordRepo.FindByIDs(ctx, foreignTableID, []string{foreignRecordID})
		oldLinkValue := s.extractLinkFieldValue(ctx, oldValue[foreignRecordID], symmetricFieldID)
		newLinkValue := map[string]interface{}{
			"id":    recordID,
			"title": lookupTitle,
		}
		
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: foreignRecordID,
			FieldID:  symmetricFieldID,
			OldValue: oldLinkValue,
			NewValue: newLinkValue,
		})
	}

	return changes
}

// updateForeignCellForOneOne 更新一对一关系的对称字段
func (s *LinkService) updateForeignCellForOneOne(
	ctx context.Context,
	fkItem *FkRecordItem,
	recordID string,
	symmetricFieldID string,
	foreignTableID string,
	mainField *entity.Field,
) []CellChange {
	changes := make([]CellChange, 0)

	oldKey := s.extractString(fkItem.OldKey)
	newKey := s.extractString(fkItem.NewKey)

	// 获取源记录的 lookup field 值（用于生成 title）
	// 注意：recordID 是主字段所在表的记录ID，需要从主字段的表获取 lookup field 值
	mainTableID := mainField.TableID()
	lookupTitle := s.getLookupFieldTitle(ctx, mainTableID, recordID, mainField)

	// 从旧的外键记录中移除引用（设置为 null）
	if oldKey != "" {
		oldValue, _ := s.recordRepo.FindByIDs(ctx, foreignTableID, []string{oldKey})
		oldLinkValue := s.extractLinkFieldValue(ctx, oldValue[oldKey], symmetricFieldID)
		
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: oldKey,
			FieldID:  symmetricFieldID,
			OldValue: oldLinkValue,
			NewValue: nil, // 一对一关系，设置为 null
		})
	}

	// 在新的外键记录中添加引用（设置为单个值）
	if newKey != "" {
		oldValue, _ := s.recordRepo.FindByIDs(ctx, foreignTableID, []string{newKey})
		oldLinkValue := s.extractLinkFieldValue(ctx, oldValue[newKey], symmetricFieldID)
		newLinkValue := map[string]interface{}{
			"id":    recordID,
			"title": lookupTitle,
		}
		
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: newKey,
			FieldID:  symmetricFieldID,
			OldValue: oldLinkValue,
			NewValue: newLinkValue,
		})
	}

	return changes
}

// 辅助方法

// extractString 从值中提取字符串
func (s *LinkService) extractString(value interface{}) string {
	if value == nil {
		return ""
	}
	if str, ok := value.(string); ok {
		return str
	}
	return ""
}

// extractStringArray 从值中提取字符串数组
func (s *LinkService) extractStringArray(value interface{}) []string {
	if value == nil {
		return nil
	}
	if arr, ok := value.([]string); ok {
		return arr
	}
	if arr, ok := value.([]interface{}); ok {
		result := make([]string, 0, len(arr))
		for _, item := range arr {
			if str, ok := item.(string); ok {
				result = append(result, str)
			}
		}
		return result
	}
	return nil
}

// difference 计算两个数组的差集 (a - b)
func (s *LinkService) difference(a, b []string) []string {
	bSet := make(map[string]bool)
	for _, item := range b {
		bSet[item] = true
	}

	result := make([]string, 0)
	for _, item := range a {
		if !bSet[item] {
			result = append(result, item)
		}
	}
	return result
}

// quoteIdentifier 引用标识符
func (s *LinkService) quoteIdentifier(name string) string {
	// PostgreSQL 使用双引号，SQLite 使用反引号
	// 这里默认使用双引号（PostgreSQL）
	return fmt.Sprintf(`"%s"`, name)
}

// applySymmetricFieldUpdates 应用对称字段的更新
func (s *LinkService) applySymmetricFieldUpdates(ctx context.Context, cellChanges []CellChange) error {
	if len(cellChanges) == 0 {
		return nil
	}

	// 按表分组更新
	updatesByTable := make(map[string][]FieldUpdate)
	for _, change := range cellChanges {
		updatesByTable[change.TableID] = append(updatesByTable[change.TableID], FieldUpdate{
			RecordID: change.RecordID,
			FieldID:  change.FieldID,
			Value:    change.NewValue,
		})
	}

	// 批量更新每个表的对称字段
	for tableID, updates := range updatesByTable {
		if err := s.recordRepo.BatchUpdateFields(ctx, tableID, updates); err != nil {
			return fmt.Errorf("批量更新对称字段失败 (table: %s): %w", tableID, err)
		}
		logger.Info("✅ 对称字段批量更新成功",
			logger.String("table_id", tableID),
			logger.Int("update_count", len(updates)))
	}

	return nil
}

// getLookupFieldTitle 获取记录的 lookup field 值作为 title
func (s *LinkService) getLookupFieldTitle(ctx context.Context, tableID string, recordID string, field *entity.Field) string {
	options := field.Options()
	if options == nil || options.Link == nil {
		return ""
	}

	lookupFieldID := options.Link.LookupFieldID
	if lookupFieldID == "" {
		return ""
	}

	// 获取记录
	records, err := s.recordRepo.FindByIDs(ctx, tableID, []string{recordID})
	if err != nil || len(records) == 0 {
		return ""
	}

	record := records[recordID]
	if record == nil {
		return ""
	}

	// 获取 lookup field 的值
	lookupValue, exists := record[lookupFieldID]
	if !exists {
		// 尝试使用字段名
		lookupField, err := s.fieldRepo.FindByID(ctx, lookupFieldID)
		if err == nil && lookupField != nil {
			fieldName := lookupField.Name().String()
			lookupValue, exists = record[fieldName]
		}
	}

	if !exists || lookupValue == nil {
		return ""
	}

	return fmt.Sprintf("%v", lookupValue)
}

// extractLinkFieldValue 从记录中提取 Link 字段的值
func (s *LinkService) extractLinkFieldValue(ctx context.Context, record map[string]interface{}, fieldID string) interface{} {
	if record == nil {
		return nil
	}

	// 先尝试使用字段ID
	if value, exists := record[fieldID]; exists {
		return value
	}

	// 尝试使用字段名
	field, err := s.fieldRepo.FindByID(ctx, fieldID)
	if err == nil && field != nil {
		fieldName := field.Name().String()
		if value, exists := record[fieldName]; exists {
			return value
		}
	}

	return nil
}

// removeLinkValueFromArray 从 Link 值数组中移除指定记录ID
func (s *LinkService) removeLinkValueFromArray(linkValue interface{}, recordID string) interface{} {
	if linkValue == nil {
		return nil
	}

	// 如果是数组
	if arr, ok := linkValue.([]interface{}); ok {
		result := make([]interface{}, 0, len(arr))
		for _, item := range arr {
			if itemMap, ok := item.(map[string]interface{}); ok {
				if id, _ := itemMap["id"].(string); id != recordID {
					result = append(result, item)
				}
			} else if id, ok := item.(string); ok && id != recordID {
				result = append(result, item)
			}
		}
		if len(result) == 0 {
			return nil
		}
		return result
	}

	// 如果是单个值
	if itemMap, ok := linkValue.(map[string]interface{}); ok {
		if id, _ := itemMap["id"].(string); id == recordID {
			return nil
		}
		return linkValue
	}

	if id, ok := linkValue.(string); ok && id == recordID {
		return nil
	}

	return linkValue
}

// addLinkValueToArray 向 Link 值数组中添加指定记录ID
func (s *LinkService) addLinkValueToArray(linkValue interface{}, recordID string, title string) interface{} {
	newItem := map[string]interface{}{
		"id": recordID,
	}
	if title != "" {
		newItem["title"] = title
	}

	if linkValue == nil {
		return []interface{}{newItem}
	}

	// 如果是数组
	if arr, ok := linkValue.([]interface{}); ok {
		// 检查是否已存在
		for _, item := range arr {
			if itemMap, ok := item.(map[string]interface{}); ok {
				if id, _ := itemMap["id"].(string); id == recordID {
					return linkValue // 已存在，不重复添加
				}
			} else if id, ok := item.(string); ok && id == recordID {
				return linkValue // 已存在，不重复添加
			}
		}
		// 添加新项
		return append(arr, newItem)
	}

	// 如果是单个值，转换为数组
	if itemMap, ok := linkValue.(map[string]interface{}); ok {
		if id, _ := itemMap["id"].(string); id == recordID {
			return linkValue // 已存在
		}
		return []interface{}{itemMap, newItem}
	}

	if id, ok := linkValue.(string); ok && id == recordID {
		return linkValue // 已存在
	}

	return []interface{}{linkValue, newItem}
}

