package service

import (
	"context"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// MockLinkIntegrityFieldRepository 模拟字段仓储
type MockLinkIntegrityFieldRepository struct {
	mock.Mock
}

func (m *MockLinkIntegrityFieldRepository) FindByID(ctx context.Context, fieldID string) (*entity.Field, error) {
	args := m.Called(ctx, fieldID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

// MockLinkIntegrityTableRepository 模拟表仓储
type MockLinkIntegrityTableRepository struct {
	mock.Mock
}

type MockTable struct {
	baseID string
}

func (m *MockTable) GetBaseID() string {
	return m.baseID
}

func (m *MockLinkIntegrityTableRepository) GetByID(ctx context.Context, tableID string) (interface{ GetBaseID() string }, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(interface{ GetBaseID() string }), args.Error(1)
}

// TestLinkIntegrityService_Fix_ManyOne 测试修复多对一关系的完整性问题
func TestLinkIntegrityService_Fix_ManyOne(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建表
	baseID := "base_001"
	tableID := "table_001"
	fullTableName := `"base_001"."table_001"`

	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS ` + fullTableName + ` (
			__id TEXT PRIMARY KEY,
			field_fld_001 JSONB,
			foreign_key TEXT
		)
	`).Error
	assert.NoError(t, err)

	// 插入测试记录（外键列有值，但 JSONB 字段为空或不一致）
	err = db.Exec(`
		INSERT INTO ` + fullTableName + ` (__id, foreign_key, field_fld_001)
		VALUES ('rec_001', 'rec_002', NULL)
	`).Error
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockLinkIntegrityFieldRepository)
	mockTableRepo := new(MockLinkIntegrityTableRepository)

	// 创建字段
	fieldFactory := factory.NewFieldFactory()
	field, err := fieldFactory.CreateFieldWithType(
		tableID,
		"关联字段",
		fieldValueObject.TypeLink,
		"user_001",
	)
	assert.NoError(t, err)

	// 设置 Link 选项
	options := fieldValueObject.NewFieldOptions()
	options.Link = &fieldValueObject.LinkOptions{
		LinkedTableID:    "table_002",
		Relationship:     "manyOne",
		ForeignKeyName:   "foreign_key",
		FkHostTableName:  tableID,
		SelfKeyName:      "__id",
	}
	field.UpdateOptions(options)

	// 设置模拟期望
	mockFieldRepo.On("FindByID", context.Background(), "fld_001").Return(field, nil)
	mockTable := &MockTable{baseID: baseID}
	mockTableRepo.On("GetByID", context.Background(), tableID).Return(mockTable, nil).Times(2) // GetIssues 和 Fix

	// 创建完整性服务
	integrityService := NewLinkIntegrityService(db, mockFieldRepo, mockTableRepo)

	ctx := context.Background()

	// 检查问题
	issues, err := integrityService.GetIssues(ctx, tableID, field)
	assert.NoError(t, err)
	assert.NotNil(t, issues)

	// 修复问题
	issue, err := integrityService.Fix(ctx, "fld_001")
	assert.NoError(t, err)
	assert.NotNil(t, issue)

	// 验证修复后的值
	var linkValue string
	err = db.Raw(`
		SELECT field_fld_001::text
		FROM ` + fullTableName + `
		WHERE __id = 'rec_001'
	`).Scan(&linkValue).Error
	assert.NoError(t, err)
	assert.Contains(t, linkValue, "rec_002", "Link 字段值应该包含外键值")

	// 验证所有模拟调用
	mockFieldRepo.AssertExpectations(t)
	mockTableRepo.AssertExpectations(t)
}

// TestLinkIntegrityService_Fix_ManyMany 测试修复多对多关系的完整性问题
func TestLinkIntegrityService_Fix_ManyMany(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建表
	baseID := "base_001"
	tableID := "table_001"
	fullTableName := `"base_001"."table_001"`
	junctionTableName := `"base_001"."link_junction"`

	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS ` + fullTableName + ` (
			__id TEXT PRIMARY KEY,
			field_fld_001 JSONB
		)
	`).Error
	assert.NoError(t, err)

	// 创建 junction table
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS ` + junctionTableName + ` (
			self_key TEXT NOT NULL,
			foreign_key TEXT NOT NULL,
			PRIMARY KEY (self_key, foreign_key)
		)
	`).Error
	assert.NoError(t, err)

	// 插入测试记录（JSONB 字段为空，但 junction table 有数据）
	err = db.Exec(`
		INSERT INTO ` + fullTableName + ` (__id, field_fld_001)
		VALUES ('rec_001', NULL)
	`).Error
	assert.NoError(t, err)

	// 插入 junction table 数据
	err = db.Exec(`
		INSERT INTO ` + junctionTableName + ` (self_key, foreign_key)
		VALUES ('rec_001', 'rec_002'), ('rec_001', 'rec_003')
	`).Error
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockLinkIntegrityFieldRepository)
	mockTableRepo := new(MockLinkIntegrityTableRepository)

	// 创建字段
	fieldFactory := factory.NewFieldFactory()
	field, err := fieldFactory.CreateFieldWithType(
		tableID,
		"关联字段",
		fieldValueObject.TypeLink,
		"user_001",
	)
	assert.NoError(t, err)

	// 设置 Link 选项
	options := fieldValueObject.NewFieldOptions()
	options.Link = &fieldValueObject.LinkOptions{
		LinkedTableID:    "table_002",
		Relationship:     "manyMany",
		FkHostTableName:  "link_junction",
		SelfKeyName:      "self_key",
		ForeignKeyName:   "foreign_key",
		AllowMultiple:    true,
	}
	field.UpdateOptions(options)

	// 设置模拟期望
	mockFieldRepo.On("FindByID", context.Background(), "fld_001").Return(field, nil)
	mockTable := &MockTable{baseID: baseID}
	mockTableRepo.On("GetByID", context.Background(), tableID).Return(mockTable, nil).Times(2) // GetIssues 和 Fix

	// 创建完整性服务
	integrityService := NewLinkIntegrityService(db, mockFieldRepo, mockTableRepo)

	ctx := context.Background()

	// 检查问题
	issues, err := integrityService.GetIssues(ctx, tableID, field)
	assert.NoError(t, err)
	assert.NotNil(t, issues)

	// 修复问题
	issue, err := integrityService.Fix(ctx, "fld_001")
	assert.NoError(t, err)
	assert.NotNil(t, issue)

	// 验证修复后的值
	var linkValue string
	err = db.Raw(`
		SELECT field_fld_001::text
		FROM ` + fullTableName + `
		WHERE __id = 'rec_001'
	`).Scan(&linkValue).Error
	assert.NoError(t, err)
	assert.Contains(t, linkValue, "rec_002", "Link 字段值应该包含第一个外键值")
	assert.Contains(t, linkValue, "rec_003", "Link 字段值应该包含第二个外键值")

	// 验证所有模拟调用
	mockFieldRepo.AssertExpectations(t)
	mockTableRepo.AssertExpectations(t)
}

