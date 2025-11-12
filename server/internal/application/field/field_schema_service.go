package field

import (
	"context"
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	tableValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database/schema"
	pkgerrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"gorm.io/gorm"
)

// FieldSchemaService 字段数据库Schema管理服务
// 职责：字段数据库Schema管理
type FieldSchemaService struct {
	tableRepo  tableRepo.TableRepository
	dbProvider database.DBProvider
	db         *gorm.DB
}

// NewFieldSchemaService 创建字段Schema服务
func NewFieldSchemaService(
	tableRepo tableRepo.TableRepository,
	dbProvider database.DBProvider,
	db *gorm.DB,
) *FieldSchemaService {
	return &FieldSchemaService{
		tableRepo:  tableRepo,
		dbProvider: dbProvider,
		db:         db,
	}
}

// CreatePhysicalColumn 创建物理列
func (s *FieldSchemaService) CreatePhysicalColumn(ctx context.Context, tableID, dbFieldName, dbType string) error {
	// 获取Table信息（需要Base ID）
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(
			fmt.Sprintf("获取Table信息失败: %v", err))
	}
	if table == nil {
		return pkgerrors.ErrNotFound.WithDetails("Table不存在")
	}

	baseID := table.BaseID()

	columnDef := database.ColumnDefinition{
		Name:    dbFieldName,
		Type:    dbType,
		NotNull: false,
		Unique:  false,
	}

	if err := s.dbProvider.AddColumn(ctx, baseID, tableID, columnDef); err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(
			fmt.Sprintf("创建物理表列失败: %v", err))
	}

	logger.Info("物理表列创建成功",
		logger.String("table_id", tableID),
		logger.String("db_field_name", dbFieldName),
		logger.String("db_type", dbType))

	return nil
}

// DropPhysicalColumn 删除物理列
func (s *FieldSchemaService) DropPhysicalColumn(ctx context.Context, tableID, dbFieldName string) error {
	// 获取Table信息（需要Base ID）
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(
			fmt.Sprintf("获取Table信息失败: %v", err))
	}
	if table == nil {
		return pkgerrors.ErrNotFound.WithDetails("Table不存在")
	}

	baseID := table.BaseID()

	if err := s.dbProvider.DropColumn(ctx, baseID, tableID, dbFieldName); err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(
			fmt.Sprintf("删除物理表列失败: %v", err))
	}

	logger.Info("物理表列删除成功",
		logger.String("table_id", tableID),
		logger.String("db_field_name", dbFieldName))

	return nil
}

// CreateLinkFieldSchema 创建Link字段Schema
func (s *FieldSchemaService) CreateLinkFieldSchema(
	ctx context.Context,
	table *tableEntity.Table,
	field *entity.Field,
	linkFieldOptions *tableValueObject.LinkFieldOptions,
	hasOrderColumn bool,
) error {
	if s.dbProvider == nil || s.db == nil {
		return fmt.Errorf("数据库提供者或连接未初始化")
	}

	// 获取关联表信息
	foreignTableID := linkFieldOptions.GetForeignTableID()
	if foreignTableID == "" {
		return fmt.Errorf("关联表ID不存在")
	}

	foreignTable, err := s.tableRepo.GetByID(ctx, foreignTableID)
	if err != nil {
		return fmt.Errorf("获取关联表失败: %w", err)
	}
	if foreignTable == nil {
		return fmt.Errorf("关联表不存在: %s", foreignTableID)
	}

	// 创建 Link 字段 Schema 创建器
	schemaCreator := schema.NewLinkFieldSchemaCreator(s.dbProvider, s.db)

	// 创建 Link 字段 Schema
	baseID := table.BaseID()
	tableID := table.ID().String()

	if err := schemaCreator.CreateLinkFieldSchema(
		ctx,
		baseID,
		tableID,
		foreignTableID,
		linkFieldOptions,
		hasOrderColumn,
	); err != nil {
		return fmt.Errorf("创建 Link 字段 Schema 失败: %w", err)
	}

	return nil
}

// EnsureOrderColumn 确保order列存在
func (s *FieldSchemaService) EnsureOrderColumn(ctx context.Context, tableID string) error {
	// 获取Table信息
	table, err := s.tableRepo.GetByID(ctx, tableID)
	if err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(
			fmt.Sprintf("获取Table信息失败: %v", err))
	}
	if table == nil {
		return pkgerrors.ErrNotFound.WithDetails("Table不存在")
	}

	baseID := table.BaseID()

	// 检查order列是否存在
	orderColumnName := "__order"
	columnExists, err := s.checkColumnExists(ctx, baseID, tableID, orderColumnName)
	if err != nil {
		return fmt.Errorf("检查order列是否存在失败: %w", err)
	}

	if !columnExists {
		// 创建order列
		columnDef := database.ColumnDefinition{
			Name:    orderColumnName,
			Type:    "DOUBLE PRECISION",
			NotNull: false,
			Unique:  false,
		}

		if err := s.dbProvider.AddColumn(ctx, baseID, tableID, columnDef); err != nil {
			return fmt.Errorf("创建order列失败: %w", err)
		}

		logger.Info("order列创建成功",
			logger.String("table_id", tableID))
	}

	return nil
}

// checkColumnExists 检查列是否存在
func (s *FieldSchemaService) checkColumnExists(ctx context.Context, baseID, tableName, columnName string) (bool, error) {
	query := `
		SELECT COUNT(*) as count
		FROM information_schema.columns
		WHERE table_schema = $1
		AND table_name = $2
		AND column_name = $3
	`

	type Result struct {
		Count int `gorm:"column:count"`
	}
	var result Result

	if err := s.db.WithContext(ctx).Raw(query, baseID, tableName, columnName).Scan(&result).Error; err != nil {
		return false, fmt.Errorf("查询列信息失败: %w", err)
	}

	return result.Count > 0, nil
}

