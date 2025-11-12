package field

import (
	"context"
	"errors"
	"testing"
	"time"

	tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
	tableValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func init() {
	if logger.Logger == nil {
		logger.Init(logger.LoggerConfig{
			Level:      "debug",
			Format:     "console",
			OutputPath: "stdout",
		})
	}
}

// MockTableRepositoryForSchema 模拟表仓储（用于Schema服务）
type MockTableRepositoryForSchema struct {
	mock.Mock
}

func (m *MockTableRepositoryForSchema) GetByID(ctx context.Context, tableID string) (*tableEntity.Table, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tableEntity.Table), args.Error(1)
}

func (m *MockTableRepositoryForSchema) Save(ctx context.Context, table *tableEntity.Table) error {
	return m.Called(ctx, table).Error(0)
}

func (m *MockTableRepositoryForSchema) GetByBaseID(ctx context.Context, baseID string) ([]*tableEntity.Table, error) {
	args := m.Called(ctx, baseID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*tableEntity.Table), args.Error(1)
}

func (m *MockTableRepositoryForSchema) Delete(ctx context.Context, tableID string) error {
	return m.Called(ctx, tableID).Error(0)
}

func (m *MockTableRepositoryForSchema) Update(ctx context.Context, table *tableEntity.Table) error {
	return m.Called(ctx, table).Error(0)
}

func (m *MockTableRepositoryForSchema) Exists(ctx context.Context, tableID string) (bool, error) {
	return m.Called(ctx, tableID).Bool(0), m.Called(ctx, tableID).Error(1)
}

func (m *MockTableRepositoryForSchema) ExistsByNameInBase(ctx context.Context, baseID string, name tableValueObject.TableName, excludeID *string) (bool, error) {
	return m.Called(ctx, baseID, name, excludeID).Bool(0), m.Called(ctx, baseID, name, excludeID).Error(1)
}

func (m *MockTableRepositoryForSchema) Count(ctx context.Context, baseID string) (int64, error) {
	args := m.Called(ctx, baseID)
	return args.Get(0).(int64), args.Error(1)
}

// MockDBProvider 模拟数据库提供者
type MockDBProvider struct {
	mock.Mock
}

func (m *MockDBProvider) CreateSchema(ctx context.Context, schemaName string) error {
	return m.Called(ctx, schemaName).Error(0)
}

func (m *MockDBProvider) DropSchema(ctx context.Context, schemaName string) error {
	return m.Called(ctx, schemaName).Error(0)
}

func (m *MockDBProvider) CreatePhysicalTable(ctx context.Context, schemaName, tableName string) error {
	return m.Called(ctx, schemaName, tableName).Error(0)
}

func (m *MockDBProvider) DropPhysicalTable(ctx context.Context, schemaName, tableName string) error {
	return m.Called(ctx, schemaName, tableName).Error(0)
}

func (m *MockDBProvider) AddColumn(ctx context.Context, baseID, tableID string, columnDef database.ColumnDefinition) error {
	args := m.Called(ctx, baseID, tableID, columnDef)
	return args.Error(0)
}

func (m *MockDBProvider) AlterColumn(ctx context.Context, schemaName, tableName, columnName string, newDef database.ColumnDefinition) error {
	return m.Called(ctx, schemaName, tableName, columnName, newDef).Error(0)
}

func (m *MockDBProvider) DropColumn(ctx context.Context, baseID, tableID, columnName string) error {
	args := m.Called(ctx, baseID, tableID, columnName)
	return args.Error(0)
}

func (m *MockDBProvider) AddUniqueConstraint(ctx context.Context, schemaName, tableName, columnName, constraintName string) error {
	return m.Called(ctx, schemaName, tableName, columnName, constraintName).Error(0)
}

func (m *MockDBProvider) DropConstraint(ctx context.Context, schemaName, tableName, constraintName string) error {
	return m.Called(ctx, schemaName, tableName, constraintName).Error(0)
}

func (m *MockDBProvider) SetNotNull(ctx context.Context, schemaName, tableName, columnName string) error {
	return m.Called(ctx, schemaName, tableName, columnName).Error(0)
}

func (m *MockDBProvider) DropNotNull(ctx context.Context, schemaName, tableName, columnName string) error {
	return m.Called(ctx, schemaName, tableName, columnName).Error(0)
}

func (m *MockDBProvider) AddCheckConstraint(ctx context.Context, schemaName, tableName, constraintName, checkExpression string) error {
	return m.Called(ctx, schemaName, tableName, constraintName, checkExpression).Error(0)
}

func (m *MockDBProvider) GenerateTableName(baseID, tableID string) string {
	return m.Called(baseID, tableID).String(0)
}

func (m *MockDBProvider) MapFieldTypeToDBType(fieldType string) string {
	return m.Called(fieldType).String(0)
}

func (m *MockDBProvider) DriverName() string {
	return m.Called().String(0)
}

func (m *MockDBProvider) SupportsSchema() bool {
	return m.Called().Bool(0)
}

// createMockTable 创建模拟表
func createMockTable(tableID, baseID, tableName string) *tableEntity.Table {
	tableNameVO, _ := tableValueObject.NewTableName(tableName)
	tableIDVO := tableValueObject.NewTableID(tableID)
	return tableEntity.ReconstructTable(
		tableIDVO,
		baseID,
		tableNameVO,
		nil, // description
		nil, // icon
		nil, // dbTableName
		"user_123",
		time.Now(),
		time.Now(),
		nil, // deletedAt
		1,   // version
	)
}

func TestFieldSchemaService_NewFieldSchemaService(t *testing.T) {
	mockTableRepo := new(MockTableRepositoryForSchema)
	mockDBProvider := new(MockDBProvider)
	var db *gorm.DB

	service := NewFieldSchemaService(mockTableRepo, mockDBProvider, db)

	assert.NotNil(t, service)
	assert.Equal(t, mockTableRepo, service.tableRepo)
	assert.Equal(t, mockDBProvider, service.dbProvider)
	assert.Equal(t, db, service.db)
}

func TestFieldSchemaService_CreatePhysicalColumn(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		setupMock func(*MockTableRepositoryForSchema, *MockDBProvider)
		wantError bool
	}{
		{
			name:    "成功创建物理列",
			tableID: "tbl_123",
			setupMock: func(mtr *MockTableRepositoryForSchema, mdb *MockDBProvider) {
				table := createMockTable("tbl_123", "base_123", "test_table")
				mtr.On("GetByID", mock.Anything, "tbl_123").Return(table, nil)
				mdb.On("AddColumn", mock.Anything, "base_123", "tbl_123", mock.AnythingOfType("database.ColumnDefinition")).Return(nil)
			},
			wantError: false,
		},
		{
			name:    "表不存在",
			tableID: "tbl_123",
			setupMock: func(mtr *MockTableRepositoryForSchema, mdb *MockDBProvider) {
				mtr.On("GetByID", mock.Anything, "tbl_123").Return(nil, nil)
			},
			wantError: true,
		},
		{
			name:    "获取表信息失败",
			tableID: "tbl_123",
			setupMock: func(mtr *MockTableRepositoryForSchema, mdb *MockDBProvider) {
				mtr.On("GetByID", mock.Anything, "tbl_123").Return(nil, errors.New("database error"))
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockTableRepo := new(MockTableRepositoryForSchema)
			mockDBProvider := new(MockDBProvider)
			tt.setupMock(mockTableRepo, mockDBProvider)

			service := NewFieldSchemaService(mockTableRepo, mockDBProvider, nil)
			ctx := context.Background()

			err := service.CreatePhysicalColumn(ctx, tt.tableID, "test_column", "VARCHAR(255)")

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			mockTableRepo.AssertExpectations(t)
			if !tt.wantError {
				mockDBProvider.AssertExpectations(t)
			}
		})
	}
}

func TestFieldSchemaService_DropPhysicalColumn(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		setupMock func(*MockTableRepositoryForSchema, *MockDBProvider)
		wantError bool
	}{
		{
			name:    "成功删除物理列",
			tableID: "tbl_123",
			setupMock: func(mtr *MockTableRepositoryForSchema, mdb *MockDBProvider) {
				table := createMockTable("tbl_123", "base_123", "test_table")
				mtr.On("GetByID", mock.Anything, "tbl_123").Return(table, nil)
				mdb.On("DropColumn", mock.Anything, "base_123", "tbl_123", "test_column").Return(nil)
			},
			wantError: false,
		},
		{
			name:    "表不存在",
			tableID: "tbl_123",
			setupMock: func(mtr *MockTableRepositoryForSchema, mdb *MockDBProvider) {
				mtr.On("GetByID", mock.Anything, "tbl_123").Return(nil, nil)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockTableRepo := new(MockTableRepositoryForSchema)
			mockDBProvider := new(MockDBProvider)
			tt.setupMock(mockTableRepo, mockDBProvider)

			service := NewFieldSchemaService(mockTableRepo, mockDBProvider, nil)
			ctx := context.Background()

			err := service.DropPhysicalColumn(ctx, tt.tableID, "test_column")

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			mockTableRepo.AssertExpectations(t)
		})
	}
}

func TestFieldSchemaService_EnsureOrderColumn(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		setupMock func(*MockTableRepositoryForSchema, *MockDBProvider)
		wantError bool
	}{
		{
			name:    "表不存在",
			tableID: "tbl_123",
			setupMock: func(mtr *MockTableRepositoryForSchema, mdb *MockDBProvider) {
				mtr.On("GetByID", mock.Anything, "tbl_123").Return(nil, nil)
			},
			wantError: true,
		},
		{
			name:    "获取表信息失败",
			tableID: "tbl_123",
			setupMock: func(mtr *MockTableRepositoryForSchema, mdb *MockDBProvider) {
				mtr.On("GetByID", mock.Anything, "tbl_123").Return(nil, errors.New("database error"))
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockTableRepo := new(MockTableRepositoryForSchema)
			mockDBProvider := new(MockDBProvider)
			// 创建一个内存数据库用于测试（虽然checkColumnExists会失败，但我们可以测试错误处理）
			db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
			assert.NoError(t, err)
			
			tt.setupMock(mockTableRepo, mockDBProvider)

			service := NewFieldSchemaService(mockTableRepo, mockDBProvider, db)
			ctx := context.Background()

			err = service.EnsureOrderColumn(ctx, tt.tableID)

			if tt.wantError {
				assert.Error(t, err)
			}

			mockTableRepo.AssertExpectations(t)
		})
	}
}

