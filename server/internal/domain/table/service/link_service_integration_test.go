package service

import (
	"context"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func init() {
	// 初始化 logger 用于测试
	if logger.Logger == nil {
		logger.Init(logger.LoggerConfig{
			Level:      "debug",
			Format:     "console",
			OutputPath: "stdout",
		})
	}
}

// MockFieldRepositoryForIntegration 集成测试用的模拟字段仓储
type MockFieldRepositoryForIntegration struct {
	mock.Mock
}

func (m *MockFieldRepositoryForIntegration) FindByID(ctx context.Context, fieldID string) (*entity.Field, error) {
	return nil, nil
}

func (m *MockFieldRepositoryForIntegration) FindByIDs(ctx context.Context, fieldIDs []string) ([]*entity.Field, error) {
	return nil, nil
}

func (m *MockFieldRepositoryForIntegration) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	return nil, nil
}

// MockRecordRepositoryForIntegration 集成测试用的模拟记录仓储
type MockRecordRepositoryForIntegration struct {
	mock.Mock
}

func (m *MockRecordRepositoryForIntegration) FindByIDs(ctx context.Context, tableID string, recordIDs []string) (map[string]map[string]interface{}, error) {
	return nil, nil
}

func (m *MockRecordRepositoryForIntegration) UpdateField(ctx context.Context, tableID, recordID, fieldID string, value interface{}) error {
	return nil
}

func (m *MockRecordRepositoryForIntegration) BatchUpdateFields(ctx context.Context, tableID string, updates []FieldUpdate) error {
	return nil
}

// TestLinkService_saveForeignKeyForManyMany_Integration 集成测试：多对多关系的外键保存
func TestLinkService_saveForeignKeyForManyMany_Integration(t *testing.T) {
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

	// 创建 LinkService（使用 nil 的 mock 仓储，因为我们只测试数据库操作）
	mockFieldRepo := &MockFieldRepositoryForIntegration{}
	mockRecordRepo := &MockRecordRepositoryForIntegration{}
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

	// 验证具体的外键值
	var records []struct {
		SelfKey    string
		ForeignKey string
	}
	db.Table("link_junction").Scan(&records)
	assert.Len(t, records, 2)
	
	// 验证记录内容
	recordMap := make(map[string]string)
	for _, r := range records {
		assert.Equal(t, "rec_001", r.SelfKey)
		recordMap[r.ForeignKey] = r.SelfKey
	}
	assert.Contains(t, recordMap, "rec_002")
	assert.Contains(t, recordMap, "rec_003")
}

// TestLinkService_saveForeignKeyForManyOne_Integration 集成测试：多对一关系的外键保存
func TestLinkService_saveForeignKeyForManyOne_Integration(t *testing.T) {
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
	mockFieldRepo := &MockFieldRepositoryForIntegration{}
	mockRecordRepo := &MockRecordRepositoryForIntegration{}
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

	// 测试用例：清空外键
	fkMap = map[string]*FkRecordItem{
		"rec_001": {
			OldKey: "rec_002",
			NewKey: "",
		},
	}

	err = linkService.saveForeignKeyForManyOne(ctx, linkOptions, fkMap)
	assert.NoError(t, err)

	// 验证外键已清空
	var foreignKeyPtr *string
	db.Table("test_table").Where("__id = ?", "rec_001").Select("foreign_key").Scan(&foreignKeyPtr)
	assert.Nil(t, foreignKeyPtr, "外键应该为 NULL")
}

// TestLinkService_extractRecordIDs_Unit 单元测试：提取记录ID
func TestLinkService_extractRecordIDs_Unit(t *testing.T) {
	mockFieldRepo := &MockFieldRepositoryForIntegration{}
	mockRecordRepo := &MockRecordRepositoryForIntegration{}
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

