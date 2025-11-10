package service

import (
	"context"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// MockFieldRepository 模拟字段仓储
type MockFieldRepository struct {
	mock.Mock
}

func (m *MockFieldRepository) FindByID(ctx context.Context, fieldID string) (*entity.Field, error) {
	args := m.Called(ctx, fieldID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepository) FindByIDs(ctx context.Context, fieldIDs []string) ([]*entity.Field, error) {
	args := m.Called(ctx, fieldIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepository) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

// MockRecordRepository 模拟记录仓储
type MockRecordRepository struct {
	mock.Mock
}

func (m *MockRecordRepository) FindByIDs(ctx context.Context, tableID string, recordIDs []string) (map[string]map[string]interface{}, error) {
	args := m.Called(ctx, tableID, recordIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]map[string]interface{}), args.Error(1)
}

func (m *MockRecordRepository) UpdateField(ctx context.Context, tableID, recordID, fieldID string, value interface{}) error {
	args := m.Called(ctx, tableID, recordID, fieldID, value)
	return args.Error(0)
}

func (m *MockRecordRepository) BatchUpdateFields(ctx context.Context, tableID string, updates []FieldUpdate) error {
	args := m.Called(ctx, tableID, updates)
	return args.Error(0)
}

// TestLinkService_GetDerivateByLink 测试 GetDerivateByLink 方法
func TestLinkService_GetDerivateByLink(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockFieldRepository)
	mockRecordRepo := new(MockRecordRepository)

	// 创建 LinkService
	linkService := NewLinkService(db, mockFieldRepo, mockRecordRepo)

	// 测试用例：空变更上下文
	ctx := context.Background()
	tableID := "test_table"
	cellContexts := []LinkCellContext{}

	derivation, err := linkService.GetDerivateByLink(ctx, tableID, cellContexts)
	assert.NoError(t, err)
	assert.Nil(t, derivation)

	// 测试用例：Link 字段变更
	cellContexts = []LinkCellContext{
		{
			RecordID: "rec_001",
			FieldID:  "fld_001",
			OldValue: nil,
			NewValue: map[string]interface{}{
				"id": "rec_002",
			},
		},
	}

	// 设置模拟返回值
	mockField := &entity.Field{} // TODO: 创建完整的 Field 实体
	mockFieldRepo.On("FindByIDs", ctx, []string{"fld_001"}).Return([]*entity.Field{mockField}, nil)

	derivation, err = linkService.GetDerivateByLink(ctx, tableID, cellContexts)
	// 由于需要完整的 Field 实体和选项，这里只测试基本流程
	assert.NoError(t, err)
	// TODO: 添加更详细的断言
}

// TestLinkService_saveForeignKeyForManyMany 测试多对多关系的外键保存
func TestLinkService_saveForeignKeyForManyMany(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建 junction table
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS link_junction (
			__id INTEGER PRIMARY KEY AUTOINCREMENT,
			self_key TEXT NOT NULL,
			foreign_key TEXT NOT NULL
		)
	`).Error
	assert.NoError(t, err)

	// 创建 LinkService
	mockFieldRepo := new(MockFieldRepository)
	mockRecordRepo := new(MockRecordRepository)
	linkService := NewLinkService(db, mockFieldRepo, mockRecordRepo)

	// 创建 LinkFieldOptions
	linkOptions, err := valueobject.NewLinkFieldOptions(
		"foreign_table_id",
		"manyMany",
		"lookup_field_id",
		"link_junction",
		"self_key",
		"foreign_key",
	)
	assert.NoError(t, err)

	// 测试用例：添加外键
	fkMap := map[string]*FkRecordItem{
		"rec_001": {
			OldKey: nil,
			NewKey: []string{"rec_002", "rec_003"},
		},
	}

	ctx := context.Background()
	err = linkService.saveForeignKeyForManyMany(ctx, linkOptions, fkMap)
	assert.NoError(t, err)

	// 验证外键已保存
	var count int64
	db.Table("link_junction").Count(&count)
	assert.Equal(t, int64(2), count)
}

// TestLinkService_saveForeignKeyForManyOne 测试多对一关系的外键保存
func TestLinkService_saveForeignKeyForManyOne(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建表
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS test_table (
			__id TEXT PRIMARY KEY,
			foreign_key TEXT
		)
	`).Error
	assert.NoError(t, err)

	// 插入测试记录
	err = db.Exec(`INSERT INTO test_table (__id) VALUES ('rec_001')`).Error
	assert.NoError(t, err)

	// 创建 LinkService
	mockFieldRepo := new(MockFieldRepository)
	mockRecordRepo := new(MockRecordRepository)
	linkService := NewLinkService(db, mockFieldRepo, mockRecordRepo)

	// 创建 LinkFieldOptions
	linkOptions, err := valueobject.NewLinkFieldOptions(
		"foreign_table_id",
		"manyOne",
		"lookup_field_id",
		"test_table",
		"__id",
		"foreign_key",
	)
	assert.NoError(t, err)

	// 测试用例：更新外键
	fkMap := map[string]*FkRecordItem{
		"rec_001": {
			OldKey: nil,
			NewKey: "rec_002",
		},
	}

	ctx := context.Background()
	err = linkService.saveForeignKeyForManyOne(ctx, linkOptions, fkMap)
	assert.NoError(t, err)

	// 验证外键已更新
	var foreignKey string
	db.Table("test_table").Where("__id = ?", "rec_001").Select("foreign_key").Scan(&foreignKey)
	assert.Equal(t, "rec_002", foreignKey)
}

// TestLinkService_extractRecordIDs 测试提取记录ID
func TestLinkService_extractRecordIDs(t *testing.T) {
	mockFieldRepo := new(MockFieldRepository)
	mockRecordRepo := new(MockRecordRepository)
	linkService := NewLinkService(nil, mockFieldRepo, mockRecordRepo)

	// 测试用例：单个值（LinkCellValue）
	value := map[string]interface{}{
		"id": "rec_001",
	}
	ids := linkService.extractRecordIDs(value)
	assert.Equal(t, []string{"rec_001"}, ids)

	// 测试用例：数组值（LinkCellValue 数组）
	valueArray := []interface{}{
		map[string]interface{}{"id": "rec_001"},
		map[string]interface{}{"id": "rec_002"},
	}
	ids = linkService.extractRecordIDs(valueArray)
	assert.Equal(t, []string{"rec_001", "rec_002"}, ids)

	// 测试用例：nil 值
	ids = linkService.extractRecordIDs(nil)
	assert.Nil(t, ids)

	// 测试用例：字符串值（直接是 ID）
	ids = linkService.extractRecordIDs("rec_001")
	assert.Equal(t, []string{"rec_001"}, ids)
}

