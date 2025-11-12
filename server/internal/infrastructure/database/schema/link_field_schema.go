package schema

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"

	"github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// LinkFieldSchemaCreator Link 字段数据库 Schema 创建器
// 参考 teable 的实现：apps/nestjs-backend/src/db-provider/create-database-column-query/create-database-column-field-visitor.postgres.ts
type LinkFieldSchemaCreator struct {
	dbProvider database.DBProvider
	db         *gorm.DB // 底层数据库连接
}

// NewLinkFieldSchemaCreator 创建 Link 字段 Schema 创建器
func NewLinkFieldSchemaCreator(dbProvider database.DBProvider, db *gorm.DB) *LinkFieldSchemaCreator {
	return &LinkFieldSchemaCreator{
		dbProvider: dbProvider,
		db:         db,
	}
}

// CreateLinkFieldSchema 创建 Link 字段的数据库 Schema
// 根据关系类型创建不同的数据库结构：
// - ManyMany: 创建 junction table
// - ManyOne: 在当前表添加外键列
// - OneMany: 在关联表添加外键列
// - OneOne: 在其中一个表添加外键列
func (c *LinkFieldSchemaCreator) CreateLinkFieldSchema(
	ctx context.Context,
	baseID string,
	tableID string,
	foreignTableID string,
	options *valueobject.LinkFieldOptions,
	hasOrderColumn bool,
) error {
	relationship := options.GetRelationship()
	tableName := c.dbProvider.GenerateTableName(baseID, tableID)
	foreignTableName := c.dbProvider.GenerateTableName(baseID, foreignTableID)

	logger.Info("创建 Link 字段 Schema",
		logger.String("table_id", tableID),
		logger.String("foreign_table_id", foreignTableID),
		logger.String("relationship", relationship),
		logger.String("fk_host_table_name", options.FkHostTableName))

	switch relationship {
	case "manyMany":
		return c.createManyManySchema(ctx, baseID, tableName, foreignTableName, options, hasOrderColumn)
	case "manyOne":
		// 对于 manyOne，需要传入 tableID 而不是 tableName，因为 AddColumn 会重新生成表名
		return c.createManyOneSchema(ctx, baseID, tableID, foreignTableID, tableName, foreignTableName, options, hasOrderColumn)
	case "oneMany":
		// 对于 oneMany，需要传入 foreignTableID 而不是 foreignTableName
		return c.createOneManySchema(ctx, baseID, tableID, foreignTableID, tableName, foreignTableName, options, hasOrderColumn)
	case "oneOne":
		// 对于 oneOne，需要传入 tableID 而不是 tableName
		return c.createOneOneSchema(ctx, baseID, tableID, foreignTableID, tableName, foreignTableName, options, hasOrderColumn)
	default:
		return fmt.Errorf("不支持的关系类型: %s", relationship)
	}
}

// createManyManySchema 创建多对多关系的 Schema
// 创建 junction table，包含 selfKeyName, foreignKeyName, __order 列
func (c *LinkFieldSchemaCreator) createManyManySchema(
	ctx context.Context,
	baseID string,
	tableName string,
	foreignTableName string,
	options *valueobject.LinkFieldOptions,
	hasOrderColumn bool,
) error {
	// 创建 junction table
	junctionTableName := options.FkHostTableName

	// 根据数据库类型创建表
	if c.dbProvider.DriverName() == "postgres" {
		return c.createManyManyJunctionTablePostgres(ctx, baseID, junctionTableName, tableName, foreignTableName, options, hasOrderColumn)
	} else {
		return c.createManyManyJunctionTableSQLite(ctx, baseID, junctionTableName, tableName, foreignTableName, options, hasOrderColumn)
	}
}

// createManyManyJunctionTablePostgres 在 PostgreSQL 中创建多对多 junction table
func (c *LinkFieldSchemaCreator) createManyManyJunctionTablePostgres(
	ctx context.Context,
	baseID string,
	junctionTableName string,
	tableName string,
	foreignTableName string,
	options *valueobject.LinkFieldOptions,
	hasOrderColumn bool,
) error {
	fullJunctionTableName := c.dbProvider.GenerateTableName(baseID, junctionTableName)
	quotedJunctionTable := c.quoteIdentifier(fullJunctionTableName)
	quotedTableName := c.quoteIdentifier(tableName)
	quotedForeignTableName := c.quoteIdentifier(foreignTableName)
	quotedSelfKeyName := c.quoteIdentifier(options.SelfKeyName)
	quotedForeignKeyName := c.quoteIdentifier(options.ForeignKeyName)

	// 创建 junction table
	createTableSQL := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			__id SERIAL PRIMARY KEY,
			%s VARCHAR(50) NOT NULL,
			%s VARCHAR(50) NOT NULL
		)
	`, quotedJunctionTable, quotedSelfKeyName, quotedForeignKeyName)

	// 执行创建表
	if err := c.executeSQL(ctx, createTableSQL); err != nil {
		return fmt.Errorf("创建 junction table 失败: %w", err)
	}

	// 添加排序列（如果启用且列不存在）
	if hasOrderColumn {
		// 检查 __order 列是否存在
		checkColumnSQL := fmt.Sprintf(`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_schema = current_schema() 
			AND table_name = %s 
			AND column_name = '__order'
		`, c.quoteIdentifier(strings.Trim(quotedJunctionTable, `"`)))
		
		var columnExists bool
		if err := c.db.WithContext(ctx).Raw(checkColumnSQL).Scan(&columnExists).Error; err != nil {
			// 如果查询失败，尝试直接添加列（可能列已存在）
			logger.Debug("检查 __order 列是否存在失败，尝试直接添加", logger.ErrorField(err))
		}
		
		if !columnExists {
			addOrderColumnSQL := fmt.Sprintf(`
				ALTER TABLE %s 
				ADD COLUMN IF NOT EXISTS __order INTEGER
			`, quotedJunctionTable)
			
			if err := c.executeSQL(ctx, addOrderColumnSQL); err != nil {
				logger.Warn("添加 __order 列失败（可能已存在）", logger.ErrorField(err))
			}
		}
	}

	// 创建外键约束
	fkSelfName := fmt.Sprintf("fk_%s", options.SelfKeyName)
	fkForeignName := fmt.Sprintf("fk_%s", options.ForeignKeyName)

	// 外键约束：selfKeyName -> tableName.__id
	fkSelfSQL := fmt.Sprintf(`
		ALTER TABLE %s
		ADD CONSTRAINT %s
		FOREIGN KEY (%s) REFERENCES %s(__id)
		ON DELETE CASCADE
	`, quotedJunctionTable, c.quoteIdentifier(fkSelfName), quotedSelfKeyName, quotedTableName)

	if err := c.executeSQL(ctx, fkSelfSQL); err != nil {
		logger.Warn("创建外键约束失败（可能已存在）",
			logger.String("constraint", fkSelfName),
			logger.ErrorField(err))
	}

	// 外键约束：foreignKeyName -> foreignTableName.__id
	fkForeignSQL := fmt.Sprintf(`
		ALTER TABLE %s
		ADD CONSTRAINT %s
		FOREIGN KEY (%s) REFERENCES %s(__id)
		ON DELETE CASCADE
	`, quotedJunctionTable, c.quoteIdentifier(fkForeignName), quotedForeignKeyName, quotedForeignTableName)

	if err := c.executeSQL(ctx, fkForeignSQL); err != nil {
		logger.Warn("创建外键约束失败（可能已存在）",
			logger.String("constraint", fkForeignName),
			logger.ErrorField(err))
	}

	// 创建索引
	idxSelfName := fmt.Sprintf("idx_%s_%s", junctionTableName, options.SelfKeyName)
	idxForeignName := fmt.Sprintf("idx_%s_%s", junctionTableName, options.ForeignKeyName)

	idxSelfSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s)",
		c.quoteIdentifier(idxSelfName), quotedJunctionTable, quotedSelfKeyName)
	if err := c.executeSQL(ctx, idxSelfSQL); err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	idxForeignSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s)",
		c.quoteIdentifier(idxForeignName), quotedJunctionTable, quotedForeignKeyName)
	if err := c.executeSQL(ctx, idxForeignSQL); err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	// ✅ 优化：创建复合索引（用于同时查询 self_key 和 foreign_key）
	idxCompositeName := fmt.Sprintf("idx_%s_composite", junctionTableName)
	idxCompositeSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s, %s)",
		c.quoteIdentifier(idxCompositeName), quotedJunctionTable, quotedSelfKeyName, quotedForeignKeyName)
	if err := c.executeSQL(ctx, idxCompositeSQL); err != nil {
		logger.Warn("创建复合索引失败", logger.ErrorField(err))
	}

	return nil
}

// createManyManyJunctionTableSQLite 在 SQLite 中创建多对多 junction table
func (c *LinkFieldSchemaCreator) createManyManyJunctionTableSQLite(
	ctx context.Context,
	baseID string,
	junctionTableName string,
	tableName string,
	foreignTableName string,
	options *valueobject.LinkFieldOptions,
	hasOrderColumn bool,
) error {
	fullJunctionTableName := c.dbProvider.GenerateTableName(baseID, junctionTableName)
	quotedJunctionTable := c.quoteIdentifier(fullJunctionTableName)
	quotedSelfKeyName := c.quoteIdentifier(options.SelfKeyName)
	quotedForeignKeyName := c.quoteIdentifier(options.ForeignKeyName)

	// 创建 junction table
	createTableSQL := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			__id INTEGER PRIMARY KEY AUTOINCREMENT,
			%s TEXT NOT NULL,
			%s TEXT NOT NULL
		)
	`, quotedJunctionTable, quotedSelfKeyName, quotedForeignKeyName)

	// 添加排序列（如果启用）
	if hasOrderColumn {
		createTableSQL = fmt.Sprintf(`
			CREATE TABLE IF NOT EXISTS %s (
				__id INTEGER PRIMARY KEY AUTOINCREMENT,
				%s TEXT NOT NULL,
				%s TEXT NOT NULL,
				__order INTEGER
			)
		`, quotedJunctionTable, quotedSelfKeyName, quotedForeignKeyName)
	}

	// 执行创建表
	if err := c.executeSQL(ctx, createTableSQL); err != nil {
		return fmt.Errorf("创建 junction table 失败: %w", err)
	}

	// SQLite 不支持外键约束（除非启用 PRAGMA foreign_keys）
	// 创建索引
	idxSelfName := fmt.Sprintf("idx_%s_%s", junctionTableName, options.SelfKeyName)
	idxForeignName := fmt.Sprintf("idx_%s_%s", junctionTableName, options.ForeignKeyName)

	idxSelfSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s)",
		c.quoteIdentifier(idxSelfName), quotedJunctionTable, quotedSelfKeyName)
	if err := c.executeSQL(ctx, idxSelfSQL); err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	idxForeignSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s)",
		c.quoteIdentifier(idxForeignName), quotedJunctionTable, quotedForeignKeyName)
	if err := c.executeSQL(ctx, idxForeignSQL); err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	// ✅ 优化：创建复合索引（用于同时查询 self_key 和 foreign_key）
	idxCompositeName := fmt.Sprintf("idx_%s_composite", junctionTableName)
	idxCompositeSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s, %s)",
		c.quoteIdentifier(idxCompositeName), quotedJunctionTable, quotedSelfKeyName, quotedForeignKeyName)
	if err := c.executeSQL(ctx, idxCompositeSQL); err != nil {
		logger.Warn("创建复合索引失败", logger.ErrorField(err))
	}

	return nil
}

// createManyOneSchema 创建多对一关系的 Schema
// 在当前表添加外键列 foreignKeyName 和可选的 foreignKeyName_order
// 注意：外键列（VARCHAR(50)）用于优化查询，但 JSONB 列（由 field_service 创建）用于存储完整的 link 数据
func (c *LinkFieldSchemaCreator) createManyOneSchema(
	ctx context.Context,
	baseID string,
	tableID string,
	foreignTableID string,
	tableName string,
	foreignTableName string,
	options *valueobject.LinkFieldOptions,
	hasOrderColumn bool,
) error {
	// 在当前表添加外键列（用于优化查询）
	// 注意：AddColumn 需要 baseID 和 tableID，而不是完整的表名
	// 注意：JSONB 列（用于存储完整的 link 数据）由 field_service 创建，这里只创建外键列
	logger.Info("createManyOneSchema 添加外键列（用于优化查询）",
		logger.String("baseID", baseID),
		logger.String("tableID", tableID),
		logger.String("foreignKeyName", options.ForeignKeyName),
		logger.String("note", "JSONB 列由 field_service 创建，这里只创建外键列"))
	
	// 检查外键列是否已存在（可能由 field_service 创建 JSONB 列时已创建）
	// 如果已存在，跳过创建
	columnDef := database.ColumnDefinition{
		Name:    options.ForeignKeyName,
		Type:    "VARCHAR(50)",
		NotNull: false,
	}

	if err := c.dbProvider.AddColumn(ctx, baseID, tableID, columnDef); err != nil {
		// 如果列已存在，忽略错误
		if strings.Contains(err.Error(), "already exists") || strings.Contains(err.Error(), "duplicate column") {
			logger.Info("外键列已存在，跳过创建",
				logger.String("baseID", baseID),
				logger.String("tableID", tableID),
				logger.String("foreignKeyName", options.ForeignKeyName))
		} else {
			return fmt.Errorf("添加外键列失败: %w", err)
		}
	}

	// 添加排序列（如果启用）
	if hasOrderColumn {
		orderColumnName := fmt.Sprintf("%s_order", options.ForeignKeyName)
		orderColumnDef := database.ColumnDefinition{
			Name:    orderColumnName,
			Type:    "INTEGER",
			NotNull: false,
		}

		if err := c.dbProvider.AddColumn(ctx, baseID, tableID, orderColumnDef); err != nil {
			return fmt.Errorf("添加排序列失败: %w", err)
		}
	}

	// 创建外键约束（PostgreSQL）
	if c.dbProvider.DriverName() == "postgres" {
		fullTableName := c.dbProvider.GenerateTableName(baseID, tableID)
		quotedTableName := c.quoteIdentifier(fullTableName)
		quotedForeignTableName := c.quoteIdentifier(foreignTableName)
		quotedForeignKeyName := c.quoteIdentifier(options.ForeignKeyName)

		fkName := fmt.Sprintf("fk_%s", options.ForeignKeyName)
		fkSQL := fmt.Sprintf(`
			ALTER TABLE %s
			ADD CONSTRAINT %s
			FOREIGN KEY (%s) REFERENCES %s(__id)
			ON DELETE SET NULL
		`, quotedTableName, c.quoteIdentifier(fkName), quotedForeignKeyName, quotedForeignTableName)

		if err := c.executeSQL(ctx, fkSQL); err != nil {
			logger.Warn("创建外键约束失败（可能已存在）", logger.ErrorField(err))
		}
	}

	// 创建索引
	idxName := fmt.Sprintf("idx_%s_%s", tableID, options.ForeignKeyName)
	fullTableName := c.dbProvider.GenerateTableName(baseID, tableID)
	quotedTableName := c.quoteIdentifier(fullTableName)
	quotedForeignKeyName := c.quoteIdentifier(options.ForeignKeyName)

	idxSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s)",
		c.quoteIdentifier(idxName), quotedTableName, quotedForeignKeyName)
	if err := c.executeSQL(ctx, idxSQL); err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	return nil
}

// createOneManySchema 创建一对多关系的 Schema
// 在关联表添加外键列 selfKeyName 和可选的 selfKeyName_order
func (c *LinkFieldSchemaCreator) createOneManySchema(
	ctx context.Context,
	baseID string,
	tableID string,
	foreignTableID string,
	tableName string,
	foreignTableName string,
	options *valueobject.LinkFieldOptions,
	hasOrderColumn bool,
) error {
	// 在关联表添加外键列
	// 注意：AddColumn 需要 baseID 和 tableID，而不是完整的表名
	columnDef := database.ColumnDefinition{
		Name:    options.SelfKeyName,
		Type:    "VARCHAR(50)",
		NotNull: false,
	}

	if err := c.dbProvider.AddColumn(ctx, baseID, foreignTableID, columnDef); err != nil {
		return fmt.Errorf("添加外键列失败: %w", err)
	}

	// 添加排序列（如果启用）
	if hasOrderColumn {
		orderColumnName := fmt.Sprintf("%s_order", options.SelfKeyName)
		orderColumnDef := database.ColumnDefinition{
			Name:    orderColumnName,
			Type:    "INTEGER",
			NotNull: false,
		}

		if err := c.dbProvider.AddColumn(ctx, baseID, foreignTableID, orderColumnDef); err != nil {
			return fmt.Errorf("添加排序列失败: %w", err)
		}
	}

	// 创建外键约束（PostgreSQL）
	if c.dbProvider.DriverName() == "postgres" {
		fullForeignTableName := c.dbProvider.GenerateTableName(baseID, foreignTableID)
		quotedForeignTableName := c.quoteIdentifier(fullForeignTableName)
		fullTableName := c.dbProvider.GenerateTableName(baseID, tableID)
		quotedTableName := c.quoteIdentifier(fullTableName)
		quotedSelfKeyName := c.quoteIdentifier(options.SelfKeyName)

		fkName := fmt.Sprintf("fk_%s", options.SelfKeyName)
		fkSQL := fmt.Sprintf(`
			ALTER TABLE %s
			ADD CONSTRAINT %s
			FOREIGN KEY (%s) REFERENCES %s(__id)
			ON DELETE SET NULL
		`, quotedForeignTableName, c.quoteIdentifier(fkName), quotedSelfKeyName, quotedTableName)

		if err := c.executeSQL(ctx, fkSQL); err != nil {
			logger.Warn("创建外键约束失败（可能已存在）", logger.ErrorField(err))
		}
	}

	// 创建索引
	idxName := fmt.Sprintf("idx_%s_%s", foreignTableID, options.SelfKeyName)
	fullForeignTableName := c.dbProvider.GenerateTableName(baseID, foreignTableID)
	quotedForeignTableName := c.quoteIdentifier(fullForeignTableName)
	quotedSelfKeyName := c.quoteIdentifier(options.SelfKeyName)

	idxSQL := fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s (%s)",
		c.quoteIdentifier(idxName), quotedForeignTableName, quotedSelfKeyName)
	if err := c.executeSQL(ctx, idxSQL); err != nil {
		logger.Warn("创建索引失败", logger.ErrorField(err))
	}

	return nil
}

// createOneOneSchema 创建一对一关系的 Schema
// 在其中一个表添加外键列（通常在当前表）
func (c *LinkFieldSchemaCreator) createOneOneSchema(
	ctx context.Context,
	baseID string,
	tableID string,
	foreignTableID string,
	tableName string,
	foreignTableName string,
	options *valueobject.LinkFieldOptions,
	hasOrderColumn bool,
) error {
	// 在当前表添加外键列
	// 注意：AddColumn 需要 baseID 和 tableID，而不是完整的表名
	columnDef := database.ColumnDefinition{
		Name:    options.ForeignKeyName,
		Type:    "VARCHAR(50)",
		NotNull: false,
		Unique:  true, // 一对一关系需要唯一约束
	}

	if err := c.dbProvider.AddColumn(ctx, baseID, tableID, columnDef); err != nil {
		return fmt.Errorf("添加外键列失败: %w", err)
	}

	// 添加排序列（如果启用，一对一关系通常不需要，但为了兼容性支持）
	if hasOrderColumn {
		orderColumnName := fmt.Sprintf("%s_order", options.ForeignKeyName)
		orderColumnDef := database.ColumnDefinition{
			Name:    orderColumnName,
			Type:    "INTEGER",
			NotNull: false,
		}

		if err := c.dbProvider.AddColumn(ctx, baseID, tableID, orderColumnDef); err != nil {
			return fmt.Errorf("添加排序列失败: %w", err)
		}
	}

	// 创建外键约束（PostgreSQL）
	if c.dbProvider.DriverName() == "postgres" {
		fullTableName := c.dbProvider.GenerateTableName(baseID, tableID)
		quotedTableName := c.quoteIdentifier(fullTableName)
		quotedForeignTableName := c.quoteIdentifier(foreignTableName)
		quotedForeignKeyName := c.quoteIdentifier(options.ForeignKeyName)

		fkName := fmt.Sprintf("fk_%s", options.ForeignKeyName)
		fkSQL := fmt.Sprintf(`
			ALTER TABLE %s
			ADD CONSTRAINT %s
			FOREIGN KEY (%s) REFERENCES %s(__id)
			ON DELETE SET NULL
		`, quotedTableName, c.quoteIdentifier(fkName), quotedForeignKeyName, quotedForeignTableName)

		if err := c.executeSQL(ctx, fkSQL); err != nil {
			logger.Warn("创建外键约束失败（可能已存在）", logger.ErrorField(err))
		}
	}

	// 创建索引（唯一索引已通过 Unique 约束创建）
	return nil
}

// DropLinkFieldSchema 删除 Link 字段的数据库 Schema
func (c *LinkFieldSchemaCreator) DropLinkFieldSchema(
	ctx context.Context,
	baseID string,
	tableID string,
	foreignTableID string,
	options *valueobject.LinkFieldOptions,
) error {
	relationship := options.GetRelationship()
	tableName := c.dbProvider.GenerateTableName(baseID, tableID)
	foreignTableName := c.dbProvider.GenerateTableName(baseID, foreignTableID)

	switch relationship {
	case "manyMany":
		// 删除 junction table
		junctionTableName := options.FkHostTableName
		return c.dbProvider.DropPhysicalTable(ctx, baseID, junctionTableName)
	case "manyOne":
		// 删除当前表的外键列
		return c.dbProvider.DropColumn(ctx, baseID, tableName, options.ForeignKeyName)
	case "oneMany":
		// 删除关联表的外键列
		return c.dbProvider.DropColumn(ctx, baseID, foreignTableName, options.SelfKeyName)
	case "oneOne":
		// 删除当前表的外键列
		return c.dbProvider.DropColumn(ctx, baseID, tableName, options.ForeignKeyName)
	default:
		return fmt.Errorf("不支持的关系类型: %s", relationship)
	}
}

// executeSQL 执行 SQL 语句
func (c *LinkFieldSchemaCreator) executeSQL(ctx context.Context, sql string) error {
	if c.db == nil {
		return fmt.Errorf("数据库连接未初始化")
	}
	logger.Debug("执行 SQL", logger.String("sql", sql))
	if err := c.db.WithContext(ctx).Exec(sql).Error; err != nil {
		return fmt.Errorf("执行 SQL 失败: %w", err)
	}
	return nil
}

// quoteIdentifier 引用标识符（根据数据库类型）
func (c *LinkFieldSchemaCreator) quoteIdentifier(name string) string {
	if c.dbProvider.DriverName() == "postgres" {
		return fmt.Sprintf(`"%s"`, name)
	}
	return fmt.Sprintf("`%s`", name)
}
