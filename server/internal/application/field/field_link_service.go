package field

import (
	"context"
	"fmt"
	"strings"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	tableValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"gorm.io/gorm"
)

// FieldLinkService Link字段特殊处理服务
// 职责：Link字段特殊处理（关系管理、迁移）
type FieldLinkService struct {
	fieldRepo    repository.FieldRepository
	tableRepo    tableRepo.TableRepository
	fieldFactory *factory.FieldFactory
	dbProvider   database.DBProvider
	db           *gorm.DB
}

// NewFieldLinkService 创建Link字段服务
func NewFieldLinkService(
	fieldRepo repository.FieldRepository,
	tableRepo tableRepo.TableRepository,
	fieldFactory *factory.FieldFactory,
	dbProvider database.DBProvider,
	db *gorm.DB,
) *FieldLinkService {
	return &FieldLinkService{
		fieldRepo:    fieldRepo,
		tableRepo:    tableRepo,
		fieldFactory: fieldFactory,
		dbProvider:   dbProvider,
		db:           db,
	}
}

// ConvertToLinkFieldOptions 转换Link选项
func (s *FieldLinkService) ConvertToLinkFieldOptions(
	ctx context.Context,
	currentTableID string,
	linkOptions *valueobject.LinkOptions,
	field *entity.Field,
) (*tableValueObject.LinkFieldOptions, error) {
	// 获取必需字段
	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		return nil, fmt.Errorf("关联表ID不存在")
	}

	relationship := linkOptions.Relationship
	if relationship == "" {
		relationship = "manyMany" // 默认值
	}

	// 获取 lookupFieldID，如果为空则从关联表获取主字段ID
	lookupFieldID := linkOptions.LookupFieldID
	if lookupFieldID == "" {
		primaryFieldID, err := s.GetPrimaryFieldID(ctx, foreignTableID)
		if err != nil {
			return nil, fmt.Errorf("无法从关联表获取主字段ID: %w", err)
		}
		lookupFieldID = primaryFieldID
	}

	// 生成必需的字段名（如果不存在）
	fkHostTableName := linkOptions.FkHostTableName
	selfKeyName := linkOptions.SelfKeyName
	foreignKeyName := linkOptions.ForeignKeyName

	// 如果不存在，生成默认值
	if fkHostTableName == "" {
		switch relationship {
		case "manyMany":
			fkHostTableName = fmt.Sprintf("link_%s_%s", currentTableID, foreignTableID)
		case "manyOne", "oneOne":
			fkHostTableName = currentTableID
		case "oneMany":
			fkHostTableName = foreignTableID
		default:
			fkHostTableName = currentTableID
		}
	}

	if selfKeyName == "" {
		if relationship == "manyMany" {
			selfKeyName = fmt.Sprintf("%s_id", currentTableID)
		} else {
			selfKeyName = "__id"
		}
	}

	if foreignKeyName == "" {
		if relationship == "manyOne" || relationship == "oneOne" {
			if field != nil {
				foreignKeyName = field.DBFieldName().String()
			} else {
				foreignKeyName = "__id"
			}
		} else if relationship == "manyMany" {
			foreignKeyName = fmt.Sprintf("%s_id", foreignTableID)
		} else {
			foreignKeyName = "__id"
		}
	}

	// 创建 LinkFieldOptions
	linkFieldOptions, err := tableValueObject.NewLinkFieldOptions(
		foreignTableID,
		relationship,
		lookupFieldID,
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

	if linkOptions.IsSymmetric {
		linkFieldOptions.IsOneWay = false
	} else {
		linkFieldOptions.AsOneWay()
	}

	if linkOptions.BaseID != "" {
		linkFieldOptions.BaseID = linkOptions.BaseID
	}

	if linkOptions.FilterByViewID != nil {
		linkFieldOptions.FilterByViewID = linkOptions.FilterByViewID
	}

	if len(linkOptions.VisibleFieldIDs) > 0 {
		linkFieldOptions.VisibleFieldIDs = linkOptions.VisibleFieldIDs
	}

	if linkOptions.Filter != nil {
		linkFieldOptions.Filter = &tableValueObject.FilterOptions{
			Conjunction: linkOptions.Filter.Conjunction,
			Conditions:  make([]tableValueObject.FilterCondition, 0, len(linkOptions.Filter.Conditions)),
		}
		for _, cond := range linkOptions.Filter.Conditions {
			linkFieldOptions.Filter.Conditions = append(linkFieldOptions.Filter.Conditions, tableValueObject.FilterCondition{
				FieldID:  cond.FieldID,
				Operator: cond.Operator,
				Value:    cond.Value,
			})
		}
	}

	return linkFieldOptions, nil
}

// GetPrimaryFieldID 获取表的主字段ID（第一个非虚拟字段）
func (s *FieldLinkService) GetPrimaryFieldID(ctx context.Context, tableID string) (string, error) {
	fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return "", fmt.Errorf("获取表字段失败: %w", err)
	}

	if len(fields) == 0 {
		return "", fmt.Errorf("表 %s 中没有找到字段", tableID)
	}

	// 返回第一个非虚拟字段
	for _, field := range fields {
		fieldType := field.Type().String()
		fieldID := field.ID().String()
		if fieldID == "" {
			continue
		}
		// 虚拟字段类型：formula, rollup, lookup, ai
		if fieldType != "formula" && fieldType != "rollup" && fieldType != "lookup" && fieldType != "ai" {
			return fieldID, nil
		}
	}

	// 如果没有普通字段，返回第一个字段（但必须确保 fieldID 不为空）
	for _, field := range fields {
		fieldID := field.ID().String()
		if fieldID != "" {
			return fieldID, nil
		}
	}

	return "", fmt.Errorf("表 %s 中所有字段的ID都为空", tableID)
}

// CreateSymmetricField 创建对称字段
func (s *FieldLinkService) CreateSymmetricField(
	ctx context.Context,
	mainField *entity.Field,
	linkOptions *valueobject.LinkOptions,
	userID string,
) (*entity.Field, error) {
	// 1. 获取关联表信息
	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		return nil, fmt.Errorf("关联表ID不存在")
	}

	foreignTable, err := s.tableRepo.GetByID(ctx, foreignTableID)
	if err != nil {
		return nil, fmt.Errorf("获取关联表失败: %w", err)
	}
	if foreignTable == nil {
		return nil, fmt.Errorf("关联表不存在: %s", foreignTableID)
	}

	// 2. 生成对称字段名称
	mainFieldName := mainField.Name().String()
	symmetricFieldName := s.GenerateSymmetricFieldName(mainFieldName, foreignTable.Name().String())

	// 3. 检查对称字段名称是否已存在
	fieldNameVO, err := valueobject.NewFieldName(symmetricFieldName)
	if err != nil {
		return nil, fmt.Errorf("对称字段名称无效: %w", err)
	}

	exists, err := s.fieldRepo.ExistsByName(ctx, foreignTableID, fieldNameVO, nil)
	if err != nil {
		return nil, fmt.Errorf("检查对称字段名称失败: %w", err)
	}
	if exists {
		logger.Warn("对称字段名称已存在，跳过自动创建",
			logger.String("symmetric_field_name", symmetricFieldName),
			logger.String("foreign_table_id", foreignTableID))
		return nil, nil
	}

	// 4. 构建对称字段的 Link 选项
	mainTableID := mainField.TableID()
	symmetricLinkOptions := &valueobject.LinkOptions{
		LinkedTableID:     mainTableID,
		Relationship:      s.ReverseRelationship(linkOptions.Relationship),
		IsSymmetric:       true,
		AllowMultiple:     linkOptions.AllowMultiple,
		SymmetricFieldID: mainField.ID().String(),
		LookupFieldID:    linkOptions.LookupFieldID,
		BaseID:           linkOptions.BaseID,
		FilterByViewID:   linkOptions.FilterByViewID,
		VisibleFieldIDs:  linkOptions.VisibleFieldIDs,
		Filter:           linkOptions.Filter,
	}

	// 5. 创建对称字段实例
	symmetricField, err := s.fieldFactory.CreateFieldWithType(foreignTableID, symmetricFieldName, "link", userID)
	if err != nil {
		return nil, fmt.Errorf("创建对称字段实例失败: %w", err)
	}

	// 设置对称字段的选项
	symmetricFieldOptions := valueobject.NewFieldOptions()
	symmetricFieldOptions.Link = symmetricLinkOptions
	symmetricField.UpdateOptions(symmetricFieldOptions)

	// 6. 计算对称字段的 order
	maxOrder, err := s.fieldRepo.GetMaxOrder(ctx, foreignTableID)
	if err != nil {
		maxOrder = -1
	}
	symmetricField.SetOrder(maxOrder + 1)

	// 7. 保存对称字段
	if err := s.fieldRepo.Save(ctx, symmetricField); err != nil {
		return nil, fmt.Errorf("保存对称字段失败: %w", err)
	}

	// 8. 更新主字段的 SymmetricFieldID
	mainFieldOptions := mainField.Options()
	if mainFieldOptions == nil {
		mainFieldOptions = valueobject.NewFieldOptions()
	}
	if mainFieldOptions.Link == nil {
		mainFieldOptions.Link = linkOptions
	}
	mainFieldOptions.Link.SymmetricFieldID = symmetricField.ID().String()
	mainField.UpdateOptions(mainFieldOptions)

	// 9. 保存主字段（更新 SymmetricFieldID）
	if err := s.fieldRepo.Save(ctx, mainField); err != nil {
		logger.Warn("更新主字段的 SymmetricFieldID 失败",
			logger.String("main_field_id", mainField.ID().String()),
			logger.String("symmetric_field_id", symmetricField.ID().String()),
			logger.ErrorField(err))
	}

	logger.Info("对称字段自动创建成功",
		logger.String("main_field_id", mainField.ID().String()),
		logger.String("symmetric_field_id", symmetricField.ID().String()),
		logger.String("main_table_id", mainTableID),
		logger.String("foreign_table_id", foreignTableID))

	return symmetricField, nil
}

// GenerateSymmetricFieldName 生成对称字段名称
func (s *FieldLinkService) GenerateSymmetricFieldName(mainFieldName string, foreignTableName string) string {
	// 如果主字段名称包含表名，使用更智能的命名
	if strings.Contains(mainFieldName, foreignTableName) {
		return fmt.Sprintf("%s列表", foreignTableName)
	}

	// 默认策略：表名 + "列表"
	return fmt.Sprintf("%s列表", foreignTableName)
}

// ReverseRelationship 反转关系类型
func (s *FieldLinkService) ReverseRelationship(relationship string) string {
	switch relationship {
	case "manyOne":
		return "oneMany"
	case "oneMany":
		return "manyOne"
	case "manyMany", "oneOne":
		return relationship
	default:
		return relationship
	}
}

// ChangeLinkRelationshipType 改变关系类型
func (s *FieldLinkService) ChangeLinkRelationshipType(
	ctx context.Context,
	field *entity.Field,
	oldRelationship, newRelationship string,
) error {
	// 验证关系类型变更是否支持
	if !s.IsRelationshipChangeSupported(oldRelationship, newRelationship) {
		return fmt.Errorf("不支持的关系类型变更: %s -> %s", oldRelationship, newRelationship)
	}

	// 获取表信息
	tableID := field.TableID()
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return fmt.Errorf("获取表信息失败: %w", err)
	}
	if table == nil {
		return fmt.Errorf("表不存在: %s", tableID)
	}

	baseID := table.BaseID()

	// 获取 Link 字段选项
	linkOptions := field.Options().Link
	if linkOptions == nil {
		return fmt.Errorf("Link 字段选项不存在")
	}

	foreignTableID := linkOptions.LinkedTableID
	if foreignTableID == "" {
		return fmt.Errorf("关联表ID不存在")
	}

	// 根据变更类型执行数据迁移
	switch {
	case oldRelationship == "manyMany" && newRelationship == "manyOne":
		return s.MigrateFromManyManyToManyOne(ctx, baseID, tableID, foreignTableID, field, linkOptions)
	case oldRelationship == "manyOne" && newRelationship == "manyMany":
		return s.MigrateFromManyOneToManyMany(ctx, baseID, tableID, foreignTableID, field, linkOptions)
	default:
		return fmt.Errorf("不支持的关系类型变更: %s -> %s", oldRelationship, newRelationship)
	}
}

// IsRelationshipChangeSupported 检查关系类型变更是否支持
func (s *FieldLinkService) IsRelationshipChangeSupported(oldRelationship, newRelationship string) bool {
	supportedChanges := map[string][]string{
		"manyMany": {"manyOne", "oneMany"},
		"manyOne":  {"manyMany"},
		"oneMany":  {"manyMany"},
		"oneOne":   {},
	}

	allowed, exists := supportedChanges[oldRelationship]
	if !exists {
		return false
	}

	for _, allowedType := range allowed {
		if allowedType == newRelationship {
			return true
		}
	}

	return false
}

// MigrateFromManyManyToManyOne 从 manyMany 迁移到 manyOne
func (s *FieldLinkService) MigrateFromManyManyToManyOne(
	ctx context.Context,
	baseID, tableID, foreignTableID string,
	field *entity.Field,
	linkOptions *valueobject.LinkOptions,
) error {
	// 1. 获取 junction table 名称
	junctionTableName := linkOptions.FkHostTableName
	if junctionTableName == "" {
		return fmt.Errorf("junction table 名称不存在")
	}

	fullJunctionTableName := s.dbProvider.GenerateTableName(baseID, junctionTableName)
	fullTableName := s.dbProvider.GenerateTableName(baseID, tableID)

	// 2. 从 junction table 读取数据并迁移
	migrationSQL := fmt.Sprintf(`
		UPDATE %s AS t
		SET %s = (
			SELECT j.%s
			FROM %s AS j
			WHERE j.%s = t.__id
			LIMIT 1
		),
		__last_modified_time = CURRENT_TIMESTAMP,
		__version = __version + 1
		WHERE EXISTS (
			SELECT 1 FROM %s AS j
			WHERE j.%s = t.__id
		)
	`,
		fullTableName,
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
	)

	// 执行迁移
	if err := s.db.WithContext(ctx).Exec(migrationSQL).Error; err != nil {
		return fmt.Errorf("数据迁移失败: %w", err)
	}

	// 3. 删除旧的 junction table
	if err := s.dbProvider.DropPhysicalTable(ctx, baseID, junctionTableName); err != nil {
		logger.Warn("删除旧的 junction table 失败",
			logger.String("junction_table", junctionTableName),
			logger.ErrorField(err))
	}

	// 4. 创建新的外键列（如果不存在）
	columnDef := database.ColumnDefinition{
		Name:    linkOptions.ForeignKeyName,
		Type:    "VARCHAR(50)",
		NotNull: false,
		Unique:  false,
	}

	if err := s.dbProvider.AddColumn(ctx, baseID, tableID, columnDef); err != nil {
		logger.Warn("创建外键列失败（可能已存在）",
			logger.String("field_name", linkOptions.ForeignKeyName),
			logger.ErrorField(err))
	}

	logger.Info("关系类型变更完成: manyMany -> manyOne",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", tableID))

	return nil
}

// MigrateFromManyOneToManyMany 从 manyOne 迁移到 manyMany
func (s *FieldLinkService) MigrateFromManyOneToManyMany(
	ctx context.Context,
	baseID, tableID, foreignTableID string,
	field *entity.Field,
	linkOptions *valueobject.LinkOptions,
) error {
	// 1. 创建新的 junction table
	junctionTableName := linkOptions.FkHostTableName
	if junctionTableName == "" {
		junctionTableName = fmt.Sprintf("link_%s_%s", tableID, foreignTableID)
	}

	fullJunctionTableName := s.dbProvider.GenerateTableName(baseID, junctionTableName)
	createTableSQL := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			__id SERIAL PRIMARY KEY,
			%s VARCHAR(50) NOT NULL,
			%s VARCHAR(50) NOT NULL
		)
	`,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
	)

	if err := s.db.WithContext(ctx).Exec(createTableSQL).Error; err != nil {
		return fmt.Errorf("创建 junction table 失败: %w", err)
	}

	// 2. 从外键列迁移数据到 junction table
	fullTableName := s.dbProvider.GenerateTableName(baseID, tableID)
	migrationSQL := fmt.Sprintf(`
		INSERT INTO %s (%s, %s)
		SELECT __id, %s
		FROM %s
		WHERE %s IS NOT NULL
	`,
		fullJunctionTableName,
		fmt.Sprintf(`"%s"`, linkOptions.SelfKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
		fullTableName,
		fmt.Sprintf(`"%s"`, linkOptions.ForeignKeyName),
	)

	if err := s.db.WithContext(ctx).Exec(migrationSQL).Error; err != nil {
		return fmt.Errorf("数据迁移失败: %w", err)
	}

	// 3. 删除旧的外键列
	if err := s.dbProvider.DropColumn(ctx, baseID, tableID, linkOptions.ForeignKeyName); err != nil {
		logger.Warn("删除旧的外键列失败",
			logger.String("field_name", linkOptions.ForeignKeyName),
			logger.ErrorField(err))
	}

	logger.Info("关系类型变更完成: manyOne -> manyMany",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", tableID))

	return nil
}

