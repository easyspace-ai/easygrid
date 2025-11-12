package application

import (
	"context"
	"testing"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/application/dto"
	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/dependency"
	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
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
	// 初始化 logger 用于测试
	if logger.Logger == nil {
		logger.Init(logger.LoggerConfig{
			Level:      "debug",
			Format:     "console",
			OutputPath: "stdout",
		})
	}
}

// MockFieldRepository 模拟字段仓储
type MockFieldRepository struct {
	mock.Mock
}

func (m *MockFieldRepository) FindByID(ctx context.Context, id valueobject.FieldID) (*fieldEntity.Field, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepository) FindByTableID(ctx context.Context, tableID string) ([]*fieldEntity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepository) FindByName(ctx context.Context, tableID string, name valueobject.FieldName) (*fieldEntity.Field, error) {
	args := m.Called(ctx, tableID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepository) ExistsByName(ctx context.Context, tableID string, name valueobject.FieldName, excludeID *valueobject.FieldID) (bool, error) {
	// 处理 nil 指针，确保 mock 匹配
	var excludeIDValue interface{} = excludeID
	if excludeID == nil {
		excludeIDValue = nil
	}
	args := m.Called(ctx, tableID, name, excludeIDValue)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepository) Exists(ctx context.Context, id valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepository) GetMaxOrder(ctx context.Context, tableID string) (float64, error) {
	args := m.Called(ctx, tableID)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockFieldRepository) Save(ctx context.Context, field *fieldEntity.Field) error {
	args := m.Called(ctx, field)
	return args.Error(0)
}

func (m *MockFieldRepository) Delete(ctx context.Context, id valueobject.FieldID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockFieldRepository) FindByIDs(ctx context.Context, ids []valueobject.FieldID) ([]*fieldEntity.Field, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepository) BatchDelete(ctx context.Context, ids []valueobject.FieldID) error {
	args := m.Called(ctx, ids)
	return args.Error(0)
}

func (m *MockFieldRepository) BatchSave(ctx context.Context, fields []*fieldEntity.Field) error {
	args := m.Called(ctx, fields)
	return args.Error(0)
}

func (m *MockFieldRepository) List(ctx context.Context, filter repository.FieldFilter) ([]*fieldEntity.Field, int64, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Get(1).(int64), args.Error(2)
}

func (m *MockFieldRepository) GetVirtualFields(ctx context.Context, tableID string) ([]*fieldEntity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepository) GetComputedFields(ctx context.Context, tableID string) ([]*fieldEntity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepository) GetFieldsByType(ctx context.Context, tableID string, fieldType valueobject.FieldType) ([]*fieldEntity.Field, error) {
	args := m.Called(ctx, tableID, fieldType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepository) UpdateOrder(ctx context.Context, fieldID valueobject.FieldID, order float64) error {
	args := m.Called(ctx, fieldID, order)
	return args.Error(0)
}

func (m *MockFieldRepository) NextID() valueobject.FieldID {
	args := m.Called()
	return args.Get(0).(valueobject.FieldID)
}

func (m *MockFieldRepository) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*fieldEntity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Error(1)
}

// MockTableRepository 模拟表仓储
type MockTableRepository struct {
	mock.Mock
}

func (m *MockTableRepository) GetByID(ctx context.Context, id string) (*tableEntity.Table, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tableEntity.Table), args.Error(1)
}

func (m *MockTableRepository) Save(ctx context.Context, table *tableEntity.Table) error {
	args := m.Called(ctx, table)
	return args.Error(0)
}

func (m *MockTableRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockTableRepository) GetByBaseID(ctx context.Context, baseID string) ([]*tableEntity.Table, error) {
	args := m.Called(ctx, baseID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*tableEntity.Table), args.Error(1)
}

func (m *MockTableRepository) Exists(ctx context.Context, id string) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockTableRepository) ExistsByNameInBase(ctx context.Context, baseID string, name tableValueObject.TableName, excludeID *string) (bool, error) {
	args := m.Called(ctx, baseID, name, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockTableRepository) Count(ctx context.Context, baseID string) (int64, error) {
	args := m.Called(ctx, baseID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockTableRepository) Update(ctx context.Context, table *tableEntity.Table) error {
	args := m.Called(ctx, table)
	return args.Error(0)
}

// MockFieldBroadcaster 模拟字段广播器
type MockFieldBroadcaster struct {
	mock.Mock
}

func (m *MockFieldBroadcaster) BroadcastFieldCreate(tableID string, field *fieldEntity.Field) {
	m.Called(tableID, field)
}

func (m *MockFieldBroadcaster) BroadcastFieldUpdate(tableID string, field *fieldEntity.Field) {
	m.Called(tableID, field)
}

func (m *MockFieldBroadcaster) BroadcastFieldDelete(tableID, fieldID string) {
	m.Called(tableID, fieldID)
}

// MockDBProvider 模拟数据库提供者
type MockDBProvider struct {
	mock.Mock
}

func (m *MockDBProvider) GenerateTableName(baseID, tableID string) string {
	args := m.Called(baseID, tableID)
	return args.String(0)
}

func (m *MockDBProvider) AddColumn(ctx context.Context, baseID, tableName string, columnDef database.ColumnDefinition) error {
	args := m.Called(ctx, baseID, tableName, columnDef)
	return args.Error(0)
}

func (m *MockDBProvider) DropColumn(ctx context.Context, baseID, tableName, columnName string) error {
	args := m.Called(ctx, baseID, tableName, columnName)
	return args.Error(0)
}

func (m *MockDBProvider) DriverName() string {
	args := m.Called()
	return args.String(0)
}

func (m *MockDBProvider) DropPhysicalTable(ctx context.Context, baseID, tableID string) error {
	args := m.Called(ctx, baseID, tableID)
	return args.Error(0)
}

func (m *MockDBProvider) AddCheckConstraint(ctx context.Context, schemaName, tableName, constraintName, checkExpression string) error {
	args := m.Called(ctx, schemaName, tableName, constraintName, checkExpression)
	return args.Error(0)
}

func (m *MockDBProvider) AddUniqueConstraint(ctx context.Context, schemaName, tableName, columnName, constraintName string) error {
	args := m.Called(ctx, schemaName, tableName, columnName, constraintName)
	return args.Error(0)
}

func (m *MockDBProvider) AlterColumn(ctx context.Context, schemaName, tableName, columnName string, newDef database.ColumnDefinition) error {
	args := m.Called(ctx, schemaName, tableName, columnName, newDef)
	return args.Error(0)
}

func (m *MockDBProvider) CreatePhysicalTable(ctx context.Context, schemaName, tableName string) error {
	args := m.Called(ctx, schemaName, tableName)
	return args.Error(0)
}

func (m *MockDBProvider) CreateSchema(ctx context.Context, schemaName string) error {
	args := m.Called(ctx, schemaName)
	return args.Error(0)
}

func (m *MockDBProvider) DropSchema(ctx context.Context, schemaName string) error {
	args := m.Called(ctx, schemaName)
	return args.Error(0)
}

func (m *MockDBProvider) DropConstraint(ctx context.Context, schemaName, tableName, constraintName string) error {
	args := m.Called(ctx, schemaName, tableName, constraintName)
	return args.Error(0)
}

func (m *MockDBProvider) SetNotNull(ctx context.Context, schemaName, tableName, columnName string) error {
	args := m.Called(ctx, schemaName, tableName, columnName)
	return args.Error(0)
}

func (m *MockDBProvider) DropNotNull(ctx context.Context, schemaName, tableName, columnName string) error {
	args := m.Called(ctx, schemaName, tableName, columnName)
	return args.Error(0)
}

func (m *MockDBProvider) MapFieldTypeToDBType(fieldType string) string {
	args := m.Called(fieldType)
	return args.String(0)
}

func (m *MockDBProvider) SupportsSchema() bool {
	args := m.Called()
	return args.Bool(0)
}

// MockCacheRepository 模拟缓存仓储
type MockCacheRepository struct {
	mock.Mock
}

func (m *MockCacheRepository) Get(ctx context.Context, key string) (string, error) {
	args := m.Called(ctx, key)
	return args.String(0), args.Error(1)
}

func (m *MockCacheRepository) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	args := m.Called(ctx, key, value, ttl)
	return args.Error(0)
}

func (m *MockCacheRepository) Delete(ctx context.Context, key string) error {
	args := m.Called(ctx, key)
	return args.Error(0)
}

func (m *MockCacheRepository) Exists(ctx context.Context, key string) (bool, error) {
	args := m.Called(ctx, key)
	return args.Bool(0), args.Error(1)
}

// MockFieldRepositoryForBuilder 模拟字段仓储（用于依赖图构建器）
type MockFieldRepositoryForBuilder struct {
	mock.Mock
}

func (m *MockFieldRepositoryForBuilder) FindByTableID(ctx context.Context, tableID string) ([]*fieldEntity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForBuilder) FindByID(ctx context.Context, fieldID string) (*fieldEntity.Field, error) {
	args := m.Called(ctx, fieldID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*fieldEntity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForBuilder) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*fieldEntity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*fieldEntity.Field), args.Error(1)
}

// createDependencyGraphRepository 创建依赖图仓储（测试辅助函数）
func createDependencyGraphRepository() *dependency.DependencyGraphRepository {
	mockCache := new(MockCacheRepository)
	mockFieldRepoForBuilder := new(MockFieldRepositoryForBuilder)
	builder := dependency.NewDependencyGraphBuilder(mockFieldRepoForBuilder)
	return dependency.NewDependencyGraphRepository(mockCache, builder, time.Hour)
}

// createTableWithID 创建带ID的表实体（测试辅助函数）
func createTableWithID(baseID, tableID, name, userID string) (*tableEntity.Table, error) {
	tableName, err := tableValueObject.NewTableName(name)
	if err != nil {
		return nil, err
	}
	return tableEntity.ReconstructTable(
		tableValueObject.NewTableID(tableID),
		baseID,
		tableName,
		nil,
		nil,
		nil,
		userID,
		time.Now(),
		time.Now(),
		nil,
		1,
	), nil
}

// createFieldWithID 创建带ID的字段实体（测试辅助函数）
func createFieldWithID(tableID, fieldID, name, fieldType, userID string) (*fieldEntity.Field, error) {
	fieldName, err := valueobject.NewFieldName(name)
	if err != nil {
		return nil, err
	}
	ft, err := valueobject.NewFieldType(fieldType)
	if err != nil {
		return nil, err
	}
	dbFieldName, err := valueobject.NewDBFieldName(fieldName)
	if err != nil {
		return nil, err
	}
	dbFieldType := "TEXT" // 默认类型，实际会根据字段类型确定
	now := time.Now()
	return fieldEntity.ReconstructField(
		valueobject.NewFieldID(fieldID),
		tableID,
		fieldName,
		ft,
		dbFieldName,
		dbFieldType,
		valueobject.NewFieldOptions(),
		0.0,
		1,
		userID,
		now,
		now,
	), nil
}

// TestFieldService_CreateLinkField_WithAutoLookupFieldID 测试创建关联字段时自动获取 lookupFieldID
func TestFieldService_CreateLinkField_WithAutoLookupFieldID(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockFieldRepository)
	mockTableRepo := new(MockTableRepository)
	mockBroadcaster := new(MockFieldBroadcaster)
	mockDBProvider := new(MockDBProvider)

	// 创建依赖图仓储
	depGraphRepo := createDependencyGraphRepository()

	// 创建字段服务
	fieldService := NewFieldService(
		mockFieldRepo,
		depGraphRepo,
		mockBroadcaster,
		mockTableRepo,
		mockDBProvider,
		db,
	)

	ctx := context.Background()
	userID := "test_user"
	currentTableID := "table_001"
	foreignTableID := "table_002"
	baseID := "base_001"

	// 创建当前表实体
	currentTable, err := createTableWithID(baseID, currentTableID, "当前表", userID)
	assert.NoError(t, err)

	// 创建关联表实体
	foreignTable, err := createTableWithID(baseID, foreignTableID, "关联表", userID)
	assert.NoError(t, err)

	// 创建关联表的第一个字段（文本字段，作为 lookup field）
	lookupField, err := factory.NewFieldFactory().CreateTextField(foreignTableID, "文本字段", userID)
	assert.NoError(t, err)
	lookupFieldID := lookupField.ID().String()

	// 创建关联表的第二个字段（数字字段）
	numberField, err := factory.NewFieldFactory().CreateNumberField(foreignTableID, "数字字段", userID, nil)
	assert.NoError(t, err)

	// 设置模拟期望
	mockFieldRepo.On("ExistsByName", ctx, currentTableID, mock.Anything, nil).Return(false, nil)
	mockFieldRepo.On("GetMaxOrder", ctx, currentTableID).Return(-1.0, nil)
	mockTableRepo.On("GetByID", ctx, currentTableID).Return(currentTable, nil)
	mockTableRepo.On("GetByID", ctx, foreignTableID).Return(foreignTable, nil)
	
	// 关键：模拟获取关联表的字段列表（用于自动获取 lookupFieldID）
	mockFieldRepo.On("FindByTableID", ctx, foreignTableID).Return([]*fieldEntity.Field{
		lookupField,  // 第一个字段（文本字段）
		numberField,  // 第二个字段（数字字段）
	}, nil)

	// 模拟保存字段
	mockFieldRepo.On("Save", ctx, mock.AnythingOfType("*entity.Field")).Return(nil)

	// 模拟数据库操作
	mockDBProvider.On("GenerateTableName", baseID, currentTableID).Return("base_001_table_001")
	mockDBProvider.On("GenerateTableName", baseID, foreignTableID).Return("base_001_table_002")
	mockDBProvider.On("DriverName").Return("sqlite")
	mockDBProvider.On("AddColumn", ctx, baseID, mock.Anything, mock.Anything).Return(nil)

	// 创建关联字段请求（不提供 lookupFieldID，应该自动获取）
	req := dto.CreateFieldRequest{
		TableID: currentTableID,
		Name:    "关联字段",
		Type:    "link",
		Options: map[string]interface{}{
			"link": map[string]interface{}{
				"foreignTableId": foreignTableID,
				"relationship":   "manyOne",
				// 不提供 lookupFieldId，应该自动获取
			},
		},
	}

	// 执行创建字段
	response, err := fieldService.CreateField(ctx, req, userID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, "关联字段", response.Name)
	assert.Equal(t, "link", response.Type)

	// 验证字段选项中包含 lookupFieldID
	assert.NotNil(t, response.Options)
	linkOptions, ok := response.Options["link"].(map[string]interface{})
	assert.True(t, ok, "link options should exist")
	
	// 验证 lookupFieldID 被自动设置
	lookupFieldIDInResponse, ok := linkOptions["lookupFieldId"].(string)
	assert.True(t, ok, "lookupFieldId should be set")
	assert.Equal(t, lookupFieldID, lookupFieldIDInResponse, "lookupFieldId should be automatically set to the first non-virtual field")

	// 验证所有模拟调用
	mockFieldRepo.AssertExpectations(t)
	mockTableRepo.AssertExpectations(t)
	mockDBProvider.AssertExpectations(t)
}

// TestFieldService_CreateLinkField_WithProvidedLookupFieldID 测试创建关联字段时提供 lookupFieldID
func TestFieldService_CreateLinkField_WithProvidedLookupFieldID(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockFieldRepository)
	mockTableRepo := new(MockTableRepository)
	mockBroadcaster := new(MockFieldBroadcaster)
	mockDBProvider := new(MockDBProvider)

	// 创建依赖图仓储
	depGraphRepo := createDependencyGraphRepository()

	// 创建字段服务
	fieldService := NewFieldService(
		mockFieldRepo,
		depGraphRepo,
		mockBroadcaster,
		mockTableRepo,
		mockDBProvider,
		db,
	)

	ctx := context.Background()
	userID := "test_user"
	currentTableID := "table_001"
	foreignTableID := "table_002"
	baseID := "base_001"
	providedLookupFieldID := "field_custom"

	// 创建当前表实体
	currentTable, err := createTableWithID(baseID, currentTableID, "当前表", userID)
	assert.NoError(t, err)

	// 创建关联表实体
	foreignTable, err := createTableWithID(baseID, foreignTableID, "关联表", userID)
	assert.NoError(t, err)

	// 设置模拟期望
	mockFieldRepo.On("ExistsByName", ctx, currentTableID, mock.Anything, nil).Return(false, nil)
	mockFieldRepo.On("GetMaxOrder", ctx, currentTableID).Return(-1.0, nil)
	mockTableRepo.On("GetByID", ctx, currentTableID).Return(currentTable, nil)
	mockTableRepo.On("GetByID", ctx, foreignTableID).Return(foreignTable, nil)

	// 模拟保存字段
	mockFieldRepo.On("Save", ctx, mock.AnythingOfType("*entity.Field")).Return(nil)

	// 模拟数据库操作
	mockDBProvider.On("GenerateTableName", baseID, currentTableID).Return("base_001_table_001")
	mockDBProvider.On("GenerateTableName", baseID, foreignTableID).Return("base_001_table_002")
	mockDBProvider.On("DriverName").Return("sqlite")
	mockDBProvider.On("AddColumn", ctx, baseID, mock.Anything, mock.Anything).Return(nil)

	// 创建关联字段请求（提供 lookupFieldID）
	req := dto.CreateFieldRequest{
		TableID: currentTableID,
		Name:    "关联字段",
		Type:    "link",
		Options: map[string]interface{}{
			"link": map[string]interface{}{
				"foreignTableId": foreignTableID,
				"relationship":   "manyOne",
				"lookupFieldId":  providedLookupFieldID, // 提供 lookupFieldID
			},
		},
	}

	// 执行创建字段
	response, err := fieldService.CreateField(ctx, req, userID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, "关联字段", response.Name)
	assert.Equal(t, "link", response.Type)

	// 验证字段选项中包含提供的 lookupFieldID
	assert.NotNil(t, response.Options)
	linkOptions, ok := response.Options["link"].(map[string]interface{})
	assert.True(t, ok, "link options should exist")
	
	// 验证 lookupFieldID 使用提供的值
	lookupFieldIDInResponse, ok := linkOptions["lookupFieldId"].(string)
	assert.True(t, ok, "lookupFieldId should be set")
	assert.Equal(t, providedLookupFieldID, lookupFieldIDInResponse, "lookupFieldId should use the provided value")

	// 验证所有模拟调用
	mockFieldRepo.AssertExpectations(t)
	mockTableRepo.AssertExpectations(t)
	mockDBProvider.AssertExpectations(t)
}

// TestFieldService_GetPrimaryFieldID 测试获取主字段ID的逻辑
func TestFieldService_GetPrimaryFieldID(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockFieldRepository)
	mockTableRepo := new(MockTableRepository)
	mockBroadcaster := new(MockFieldBroadcaster)
	mockDBProvider := new(MockDBProvider)

	// 创建依赖图仓储
	depGraphRepo := createDependencyGraphRepository()

	// 创建字段服务
	fieldService := NewFieldService(
		mockFieldRepo,
		depGraphRepo,
		mockBroadcaster,
		mockTableRepo,
		mockDBProvider,
		db,
	)

	ctx := context.Background()
	tableID := "table_001"

	// 创建字段列表：第一个是虚拟字段（formula），第二个是文本字段（非虚拟）
	formulaField, err := factory.NewFieldFactory().CreateFieldWithType(tableID, "公式字段", "formula", "test_user")
	assert.NoError(t, err)
	
	textField, err := factory.NewFieldFactory().CreateTextField(tableID, "文本字段", "test_user")
	assert.NoError(t, err)
	textFieldID := textField.ID().String()

	// 设置模拟期望：返回字段列表，第一个是虚拟字段，第二个是文本字段
	mockFieldRepo.On("FindByTableID", ctx, tableID).Return([]*fieldEntity.Field{
		formulaField, // 第一个字段（虚拟字段，应该被跳过）
		textField,    // 第二个字段（非虚拟字段，应该被选中）
	}, nil)

	// 执行获取主字段ID
	primaryFieldID, err := fieldService.getPrimaryFieldID(ctx, tableID)

	// 验证结果
	assert.NoError(t, err)
	assert.Equal(t, textFieldID, primaryFieldID, "should return the first non-virtual field")

	// 验证模拟调用
	mockFieldRepo.AssertExpectations(t)
}

// TestFieldService_GetPrimaryFieldID_NoFields 测试没有字段时的情况
func TestFieldService_GetPrimaryFieldID_NoFields(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockFieldRepository)
	mockTableRepo := new(MockTableRepository)
	mockBroadcaster := new(MockFieldBroadcaster)
	mockDBProvider := new(MockDBProvider)

	// 创建依赖图仓储
	depGraphRepo := createDependencyGraphRepository()

	// 创建字段服务
	fieldService := NewFieldService(
		mockFieldRepo,
		depGraphRepo,
		mockBroadcaster,
		mockTableRepo,
		mockDBProvider,
		db,
	)

	ctx := context.Background()
	tableID := "table_001"

	// 设置模拟期望：返回空字段列表
	mockFieldRepo.On("FindByTableID", ctx, tableID).Return([]*fieldEntity.Field{}, nil)

	// 执行获取主字段ID
	primaryFieldID, err := fieldService.getPrimaryFieldID(ctx, tableID)

	// 验证结果：应该返回错误
	assert.Error(t, err)
	assert.Empty(t, primaryFieldID)
	assert.Contains(t, err.Error(), "中没有找到字段")

	// 验证模拟调用
	mockFieldRepo.AssertExpectations(t)
}


// TestFieldService_CreateLinkField_WithSymmetricField 测试创建 Link 字段时自动创建对称字段
func TestFieldService_CreateLinkField_WithSymmetricField(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockFieldRepository)
	mockTableRepo := new(MockTableRepository)
	mockBroadcaster := new(MockFieldBroadcaster)
	mockDBProvider := new(MockDBProvider)

	// 创建依赖图仓储
	depGraphRepo := createDependencyGraphRepository()

	// 创建字段服务
	fieldService := NewFieldService(
		mockFieldRepo,
		depGraphRepo,
		mockBroadcaster,
		mockTableRepo,
		mockDBProvider,
		db,
	)

	ctx := context.Background()
	userID := "test_user"
	currentTableID := "table_001"
	foreignTableID := "table_002"
	baseID := "base_001"

	// 创建当前表实体
	currentTable, err := createTableWithID(baseID, currentTableID, "当前表", userID)
	assert.NoError(t, err)

	// 创建关联表实体
	foreignTable, err := createTableWithID(baseID, foreignTableID, "关联表", userID)
	assert.NoError(t, err)

	// 创建关联表的第一个字段（文本字段，作为 lookup field）
	lookupField, err := factory.NewFieldFactory().CreateTextField(foreignTableID, "文本字段", userID)
	assert.NoError(t, err)
	lookupFieldID := lookupField.ID().String()

	// 设置模拟期望
	mockFieldRepo.On("ExistsByName", ctx, currentTableID, mock.Anything, nil).Return(false, nil)
	mockFieldRepo.On("GetMaxOrder", ctx, currentTableID).Return(-1.0, nil)
	mockFieldRepo.On("GetMaxOrder", ctx, foreignTableID).Return(-1.0, nil).Once() // 对称字段的 order
	mockTableRepo.On("GetByID", ctx, currentTableID).Return(currentTable, nil).Times(2) // 创建字段和创建对称字段
	mockTableRepo.On("GetByID", ctx, foreignTableID).Return(foreignTable, nil).Times(2) // 创建字段和创建对称字段

	// 模拟获取关联表的字段列表（用于自动获取 lookupFieldID）
	mockFieldRepo.On("FindByTableID", ctx, foreignTableID).Return([]*fieldEntity.Field{
		lookupField,
	}, nil)

	// 模拟检查对称字段名称是否存在
	mockFieldRepo.On("ExistsByName", ctx, foreignTableID, mock.Anything, nil).Return(false, nil).Once()

	// 模拟保存主字段和对称字段
	// 1. 保存主字段（第一次）
	// 2. 保存对称字段
	// 3. 更新主字段的 SymmetricFieldID（第二次保存主字段）
	mockFieldRepo.On("Save", ctx, mock.AnythingOfType("*entity.Field")).Return(nil).Times(3)

	// 模拟数据库操作
	mockDBProvider.On("GenerateTableName", baseID, currentTableID).Return("base_001_table_001")
	mockDBProvider.On("GenerateTableName", baseID, foreignTableID).Return("base_001_table_002")
	// manyMany 关系会创建 junction table
	mockDBProvider.On("GenerateTableName", baseID, mock.MatchedBy(func(tableID string) bool {
		return tableID == "link_table_001_table_002" || tableID == "link_table_002_table_001"
	})).Return("base_001_link_table").Maybe()
	mockDBProvider.On("CreatePhysicalTable", ctx, baseID, mock.MatchedBy(func(tableID string) bool {
		return tableID == "link_table_001_table_002" || tableID == "link_table_002_table_001"
	})).Return(nil).Maybe()
	mockDBProvider.On("DriverName").Return("sqlite")
	mockDBProvider.On("AddColumn", ctx, baseID, mock.Anything, mock.Anything).Return(nil).Times(2) // 主字段和对称字段
	// 如果创建失败，可能需要回滚（DropColumn）
	mockDBProvider.On("DropColumn", ctx, baseID, mock.Anything, mock.Anything).Return(nil).Maybe()

	// 模拟广播
	mockBroadcaster.On("BroadcastFieldCreate", currentTableID, mock.Anything).Return()
	mockBroadcaster.On("BroadcastFieldCreate", foreignTableID, mock.Anything).Return()

	// 创建关联字段请求（IsSymmetric=true）
	req := dto.CreateFieldRequest{
		TableID: currentTableID,
		Name:    "关联字段",
		Type:    "link",
		Options: map[string]interface{}{
			"link": map[string]interface{}{
				"foreignTableId": foreignTableID,
				"relationship":   "manyMany",
				"isSymmetric":    true,
				"lookupFieldId":  lookupFieldID,
			},
		},
	}

	// 执行创建字段
	response, err := fieldService.CreateField(ctx, req, userID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, "关联字段", response.Name)
	assert.Equal(t, "link", response.Type)

	// 验证所有模拟调用
	mockFieldRepo.AssertExpectations(t)
	mockTableRepo.AssertExpectations(t)
	mockDBProvider.AssertExpectations(t)
	mockBroadcaster.AssertExpectations(t)
}

// TestFieldService_DeleteLinkField_WithSymmetricField 测试删除 Link 字段时自动删除对称字段
func TestFieldService_DeleteLinkField_WithSymmetricField(t *testing.T) {
	// 创建内存数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建模拟仓储
	mockFieldRepo := new(MockFieldRepository)
	mockTableRepo := new(MockTableRepository)
	mockBroadcaster := new(MockFieldBroadcaster)
	mockDBProvider := new(MockDBProvider)

	// 创建依赖图仓储
	depGraphRepo := createDependencyGraphRepository()

	// 创建字段服务
	fieldService := NewFieldService(
		mockFieldRepo,
		depGraphRepo,
		mockBroadcaster,
		mockTableRepo,
		mockDBProvider,
		db,
	)

	ctx := context.Background()
	tableID := "table_001"
	foreignTableID := "table_002"
	baseID := "base_001"
	fieldID := "field_001"
	symmetricFieldID := "field_002"

	// 创建主字段
	mainField, err := createFieldWithID(tableID, fieldID, "关联字段", "link", "user_001")
	assert.NoError(t, err)

	// 设置 Link 选项（包含 SymmetricFieldID）
	options := valueobject.NewFieldOptions()
	options.Link = &valueobject.LinkOptions{
		LinkedTableID:    foreignTableID,
		Relationship:     "manyMany",
		SymmetricFieldID: symmetricFieldID,
	}
	mainField.UpdateOptions(options)

	// 创建对称字段
	symmetricField, err := createFieldWithID(foreignTableID, symmetricFieldID, "对称字段", "link", "user_001")
	assert.NoError(t, err)

	// 创建表实体
	table, err := createTableWithID(baseID, tableID, "表", "user_001")
	assert.NoError(t, err)

	foreignTable, err := createTableWithID(baseID, foreignTableID, "关联表", "user_001")
	assert.NoError(t, err)

	// 设置模拟期望
	mockFieldRepo.On("FindByID", ctx, valueobject.NewFieldID(fieldID)).Return(mainField, nil)
	mockTableRepo.On("GetByID", ctx, tableID).Return(table, nil).Once() // 删除主字段
	mockDBProvider.On("DropColumn", ctx, baseID, tableID, mock.Anything).Return(nil).Once() // 删除主字段的列
	mockFieldRepo.On("Delete", ctx, valueobject.NewFieldID(fieldID)).Return(nil)

	// 模拟查找对称字段
	mockFieldRepo.On("FindByID", ctx, valueobject.NewFieldID(symmetricFieldID)).Return(symmetricField, nil)
	mockTableRepo.On("GetByID", ctx, foreignTableID).Return(foreignTable, nil).Once() // 删除对称字段
	mockDBProvider.On("DropColumn", ctx, baseID, foreignTableID, mock.Anything).Return(nil).Once() // 删除对称字段的列
	mockFieldRepo.On("Delete", ctx, valueobject.NewFieldID(symmetricFieldID)).Return(nil)

	// 模拟广播
	mockBroadcaster.On("BroadcastFieldDelete", tableID, fieldID).Return()
	mockBroadcaster.On("BroadcastFieldDelete", foreignTableID, symmetricFieldID).Return()

	// 执行删除字段
	err = fieldService.DeleteField(ctx, fieldID)

	// 验证结果
	assert.NoError(t, err)

	// 验证所有模拟调用
	mockFieldRepo.AssertExpectations(t)
	mockTableRepo.AssertExpectations(t)
	mockDBProvider.AssertExpectations(t)
	mockBroadcaster.AssertExpectations(t)
}
