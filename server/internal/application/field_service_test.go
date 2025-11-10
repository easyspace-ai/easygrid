package application

import (
	"context"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/application/dto"
	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/dependency"
	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
	tableRepo "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

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

func (m *MockFieldRepository) ExistsByName(ctx context.Context, tableID string, name valueobject.FieldName, excludeID *valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, tableID, name, excludeID)
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

func (m *MockTableRepository) ExistsByNameInBase(ctx context.Context, baseID string, name tableEntity.TableName, excludeID *string) (bool, error) {
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
	depGraphRepo := dependency.NewDependencyGraphRepository(db)

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
	currentTable, err := tableEntity.NewTable(baseID, "当前表", userID)
	assert.NoError(t, err)
	currentTable.SetID(tableEntity.TableID(currentTableID))

	// 创建关联表实体
	foreignTable, err := tableEntity.NewTable(baseID, "关联表", userID)
	assert.NoError(t, err)
	foreignTable.SetID(tableEntity.TableID(foreignTableID))

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
	depGraphRepo := dependency.NewDependencyGraphRepository(db)

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
	currentTable, err := tableEntity.NewTable(baseID, "当前表", userID)
	assert.NoError(t, err)
	currentTable.SetID(tableEntity.TableID(currentTableID))

	// 创建关联表实体
	foreignTable, err := tableEntity.NewTable(baseID, "关联表", userID)
	assert.NoError(t, err)
	foreignTable.SetID(tableEntity.TableID(foreignTableID))

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
	depGraphRepo := dependency.NewDependencyGraphRepository(db)

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
	depGraphRepo := dependency.NewDependencyGraphRepository(db)

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

