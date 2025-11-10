package service

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
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
}

// LinkFieldRepository Link 字段仓储接口
type LinkFieldRepository interface {
	FindByID(ctx context.Context, fieldID string) (*entity.Field, error)
	FindByIDs(ctx context.Context, fieldIDs []string) ([]*entity.Field, error)
	FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error)
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
) *LinkService {
	return &LinkService{
		db:         db,
		fieldRepo:  fieldRepo,
		recordRepo: recordRepo,
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
	// 过滤出 Link 字段的变更
	linkContexts := s.filterLinkContext(cellContexts)
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

		// 转换 LinkOptions 到 table/valueobject.LinkFieldOptions
		linkFieldOptions, err := s.convertLinkOptions(linkOptions)
		if err != nil {
			return fmt.Errorf("转换 Link 选项失败: %w", err)
		}

		relationship := linkFieldOptions.GetRelationship()
		if relationship == "" {
			relationship = "manyMany"
		}

		switch relationship {
		case "manyMany":
			if err := s.saveForeignKeyForManyMany(ctx, linkFieldOptions, fkMap); err != nil {
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
func (s *LinkService) convertLinkOptions(linkOptions *fieldValueObject.LinkOptions) (*valueobject.LinkFieldOptions, error) {
	// 获取必需字段
	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		return nil, fmt.Errorf("关联表ID不存在")
	}

	relationship := linkOptions.Relationship
	if relationship == "" {
		relationship = "manyMany"
	}

	// 生成必需的字段名（如果不存在）
	fkHostTableName := linkOptions.FkHostTableName
	selfKeyName := linkOptions.SelfKeyName
	foreignKeyName := linkOptions.ForeignKeyName

	if fkHostTableName == "" {
		if relationship == "manyMany" {
			fkHostTableName = fmt.Sprintf("link_%s_%s", linkOptions.LinkedTableID, relationship)
		} else {
			fkHostTableName = linkOptions.LinkedTableID
		}
	}

	if selfKeyName == "" {
		selfKeyName = "__id"
	}

	if foreignKeyName == "" {
		foreignKeyName = "__id"
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
	options *valueobject.LinkFieldOptions,
	fkMap map[string]*FkRecordItem,
) error {
	// 获取 junction table 名称
	junctionTableName := options.FkHostTableName
	if junctionTableName == "" {
		return fmt.Errorf("junction table name is required for many-many relationship")
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
			`, s.quoteIdentifier(junctionTableName),
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
			`, s.quoteIdentifier(junctionTableName),
				s.quoteIdentifier(options.SelfKeyName),
				s.quoteIdentifier(options.ForeignKeyName))

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
		linkFieldOptions, err := s.convertLinkOptions(linkOptions)
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
			// 获取源记录的 lookup field 值（用于生成 title）
			// TODO: 实现获取 lookup field 值的逻辑

			// 根据关系类型调用不同的更新方法
			switch relationship {
			case "manyMany":
				changes := s.updateForeignCellForManyMany(ctx, fkItem, recordID, symmetricFieldID, foreignTableID)
				cellChanges = append(cellChanges, changes...)
			case "manyOne":
				changes := s.updateForeignCellForManyOne(ctx, fkItem, recordID, symmetricFieldID, foreignTableID)
				cellChanges = append(cellChanges, changes...)
			case "oneMany":
				changes := s.updateForeignCellForOneMany(ctx, fkItem, recordID, symmetricFieldID, foreignTableID)
				cellChanges = append(cellChanges, changes...)
			case "oneOne":
				changes := s.updateForeignCellForOneOne(ctx, fkItem, recordID, symmetricFieldID, foreignTableID)
				cellChanges = append(cellChanges, changes...)
			}
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
) []CellChange {
	changes := make([]CellChange, 0)

	oldKeys := s.extractStringArray(fkItem.OldKey)
	newKeys := s.extractStringArray(fkItem.NewKey)

	toDelete := s.difference(oldKeys, newKeys)
	toAdd := s.difference(newKeys, oldKeys)

	// 删除对称字段中的引用
	for _, foreignRecordID := range toDelete {
		// TODO: 从对称字段中移除当前记录的引用
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: foreignRecordID,
			FieldID:  symmetricFieldID,
			OldValue: nil, // TODO: 获取旧值
			NewValue: nil, // TODO: 计算新值（移除当前记录）
		})
	}

	// 添加对称字段中的引用
	for _, foreignRecordID := range toAdd {
		// TODO: 在对称字段中添加当前记录的引用
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: foreignRecordID,
			FieldID:  symmetricFieldID,
			OldValue: nil, // TODO: 获取旧值
			NewValue: nil, // TODO: 计算新值（添加当前记录）
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
) []CellChange {
	changes := make([]CellChange, 0)

	oldKey := s.extractString(fkItem.OldKey)
	newKey := s.extractString(fkItem.NewKey)

	// 从旧的外键记录中移除引用
	if oldKey != "" {
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: oldKey,
			FieldID:  symmetricFieldID,
			OldValue: nil, // TODO: 获取旧值
			NewValue: nil, // TODO: 计算新值（移除当前记录）
		})
	}

	// 在新的外键记录中添加引用
	if newKey != "" {
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: newKey,
			FieldID:  symmetricFieldID,
			OldValue: nil, // TODO: 获取旧值
			NewValue: nil, // TODO: 计算新值（添加当前记录）
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
) []CellChange {
	changes := make([]CellChange, 0)

	oldKeys := s.extractStringArray(fkItem.OldKey)
	newKeys := s.extractStringArray(fkItem.NewKey)

	toDelete := s.difference(oldKeys, newKeys)
	toAdd := s.difference(newKeys, oldKeys)

	// 删除对称字段中的引用
	for _, foreignRecordID := range toDelete {
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: foreignRecordID,
			FieldID:  symmetricFieldID,
			OldValue: nil, // TODO: 获取旧值
			NewValue: nil, // 一对一关系，设置为 null
		})
	}

	// 添加对称字段中的引用
	for _, foreignRecordID := range toAdd {
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: foreignRecordID,
			FieldID:  symmetricFieldID,
			OldValue: nil, // TODO: 获取旧值
			NewValue: map[string]interface{}{ // 一对一关系，设置为单个值
				"id": recordID,
			},
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
) []CellChange {
	changes := make([]CellChange, 0)

	oldKey := s.extractString(fkItem.OldKey)
	newKey := s.extractString(fkItem.NewKey)

	// 从旧的外键记录中移除引用
	if oldKey != "" {
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: oldKey,
			FieldID:  symmetricFieldID,
			OldValue: nil, // TODO: 获取旧值
			NewValue: nil, // 一对一关系，设置为 null
		})
	}

	// 在新的外键记录中添加引用
	if newKey != "" {
		changes = append(changes, CellChange{
			TableID:  foreignTableID,
			RecordID: newKey,
			FieldID:  symmetricFieldID,
			OldValue: nil, // TODO: 获取旧值
			NewValue: map[string]interface{}{ // 一对一关系，设置为单个值
				"id": recordID,
			},
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

