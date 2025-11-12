package field

import (
	"context"
	"fmt"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
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

// MockFieldRepositoryForCRUD 模拟字段仓储（用于CRUD服务）
type MockFieldRepositoryForCRUD struct {
	mock.Mock
}

func (m *MockFieldRepositoryForCRUD) Save(ctx context.Context, field *entity.Field) error {
	args := m.Called(ctx, field)
	return args.Error(0)
}

func (m *MockFieldRepositoryForCRUD) FindByID(ctx context.Context, id valueobject.FieldID) (*entity.Field, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) FindByName(ctx context.Context, tableID string, name valueobject.FieldName) (*entity.Field, error) {
	args := m.Called(ctx, tableID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) Delete(ctx context.Context, id valueobject.FieldID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockFieldRepositoryForCRUD) Exists(ctx context.Context, id valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) ExistsByName(ctx context.Context, tableID string, name valueobject.FieldName, excludeID *valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, tableID, name, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) List(ctx context.Context, filter repository.FieldFilter) ([]*entity.Field, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*entity.Field), args.Get(1).(int64), args.Error(2)
}

func (m *MockFieldRepositoryForCRUD) BatchSave(ctx context.Context, fields []*entity.Field) error {
	args := m.Called(ctx, fields)
	return args.Error(0)
}

func (m *MockFieldRepositoryForCRUD) BatchDelete(ctx context.Context, ids []valueobject.FieldID) error {
	args := m.Called(ctx, ids)
	return args.Error(0)
}

func (m *MockFieldRepositoryForCRUD) GetVirtualFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) GetComputedFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) GetFieldsByType(ctx context.Context, tableID string, fieldType valueobject.FieldType) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID, fieldType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) UpdateOrder(ctx context.Context, fieldID valueobject.FieldID, order float64) error {
	args := m.Called(ctx, fieldID, order)
	return args.Error(0)
}

func (m *MockFieldRepositoryForCRUD) GetMaxOrder(ctx context.Context, tableID string) (float64, error) {
	args := m.Called(ctx, tableID)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockFieldRepositoryForCRUD) NextID() valueobject.FieldID {
	args := m.Called()
	return args.Get(0).(valueobject.FieldID)
}

func (m *MockFieldRepositoryForCRUD) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

// FieldFactoryInterface 字段工厂接口（用于测试）
type FieldFactoryInterface interface {
	CreateFieldWithType(tableID, name, fieldType, userID string) (*entity.Field, error)
}

func TestFieldCRUDService_CreateField(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		fieldName string
		fieldType string
		userID    string
		setupMock func(*MockFieldRepositoryForCRUD, interface{})
		wantError bool
	}{
		{
			name:      "成功创建字段",
			tableID:   "tbl_123",
			fieldName: "test_field",
			fieldType: "singleLineText",
			userID:    "user_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD, mf interface{}) {
				fieldName, _ := valueobject.NewFieldName("test_field")
				mr.On("ExistsByName", mock.Anything, "tbl_123", fieldName, (*valueobject.FieldID)(nil)).Return(false, nil)
				mr.On("GetMaxOrder", mock.Anything, "tbl_123").Return(float64(0), nil)
				mr.On("Save", mock.Anything, mock.AnythingOfType("*entity.Field")).Return(nil)
			},
			wantError: false,
		},
		{
			name:      "字段名已存在",
			tableID:   "tbl_123",
			fieldName: "test_field",
			fieldType: "singleLineText",
			userID:    "user_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD, mf interface{}) {
				fieldName, _ := valueobject.NewFieldName("test_field")
				mr.On("ExistsByName", mock.Anything, "tbl_123", fieldName, (*valueobject.FieldID)(nil)).Return(true, nil)
			},
			wantError: true,
		},
		{
			name:      "无效的字段名称",
			tableID:   "tbl_123",
			fieldName: "", // 空名称
			fieldType: "singleLineText",
			userID:    "user_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD, mf interface{}) {
				// 不需要设置mock，因为会在验证阶段失败
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockFieldRepositoryForCRUD)
			// 使用真实的FieldFactory，但通过mock控制行为
			fieldFactory := factory.NewFieldFactory()
			tt.setupMock(mockRepo, nil) // 不再需要mockFactory

			service := NewFieldCRUDService(mockRepo, fieldFactory)
			ctx := context.Background()

			field, err := service.CreateField(ctx, tt.tableID, tt.fieldName, tt.fieldType, tt.userID)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, field)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, field)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestFieldCRUDService_GetField(t *testing.T) {
	tests := []struct {
		name      string
		fieldID   string
		setupMock func(*MockFieldRepositoryForCRUD)
		wantError bool
	}{
		{
			name:    "成功获取字段",
			fieldID: "fld_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD) {
				fieldName, _ := valueobject.NewFieldName("test_field")
				field, _ := entity.NewField("tbl_123", fieldName, valueobject.FieldType{}, "user_123")
				mr.On("FindByID", mock.Anything, mock.AnythingOfType("valueobject.FieldID")).Return(field, nil)
			},
			wantError: false,
		},
		{
			name:    "字段不存在",
			fieldID: "fld_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD) {
				mr.On("FindByID", mock.Anything, mock.AnythingOfType("valueobject.FieldID")).Return(nil, nil)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockFieldRepositoryForCRUD)
			mockFactory := factory.NewFieldFactory()
			tt.setupMock(mockRepo)

			service := NewFieldCRUDService(mockRepo, mockFactory)
			ctx := context.Background()

			field, err := service.GetField(ctx, tt.fieldID)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, field)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, field)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestFieldCRUDService_DeleteField(t *testing.T) {
	tests := []struct {
		name      string
		fieldID   string
		setupMock func(*MockFieldRepositoryForCRUD)
		wantError bool
	}{
		{
			name:    "成功删除字段",
			fieldID: "fld_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD) {
				fieldName, _ := valueobject.NewFieldName("test_field")
				field, _ := entity.NewField("tbl_123", fieldName, valueobject.FieldType{}, "user_123")
				mr.On("FindByID", mock.Anything, mock.AnythingOfType("valueobject.FieldID")).Return(field, nil)
				mr.On("Delete", mock.Anything, mock.AnythingOfType("valueobject.FieldID")).Return(nil)
			},
			wantError: false,
		},
		{
			name:    "字段不存在",
			fieldID: "fld_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD) {
				mr.On("FindByID", mock.Anything, mock.AnythingOfType("valueobject.FieldID")).Return(nil, nil)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockFieldRepositoryForCRUD)
			mockFactory := factory.NewFieldFactory()
			tt.setupMock(mockRepo)

			service := NewFieldCRUDService(mockRepo, mockFactory)
			ctx := context.Background()

			err := service.DeleteField(ctx, tt.fieldID)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestFieldCRUDService_UpdateField(t *testing.T) {
	tests := []struct {
		name      string
		fieldID   string
		setupMock func(*MockFieldRepositoryForCRUD)
		updateFn  func(*entity.Field) error
		wantError bool
	}{
		{
			name:    "成功更新字段",
			fieldID: "fld_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD) {
				fieldName, _ := valueobject.NewFieldName("test_field")
				field, _ := entity.NewField("tbl_123", fieldName, valueobject.FieldType{}, "user_123")
				mr.On("FindByID", mock.Anything, mock.AnythingOfType("valueobject.FieldID")).Return(field, nil)
				mr.On("Save", mock.Anything, mock.AnythingOfType("*entity.Field")).Return(nil)
			},
			updateFn: func(f *entity.Field) error {
				// 更新字段的order作为示例
				f.SetOrder(100.0)
				return nil
			},
			wantError: false,
		},
		{
			name:    "字段不存在",
			fieldID: "fld_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD) {
				mr.On("FindByID", mock.Anything, mock.AnythingOfType("valueobject.FieldID")).Return(nil, nil)
			},
			updateFn: func(f *entity.Field) error {
				return nil
			},
			wantError: true,
		},
		{
			name:    "更新函数返回错误",
			fieldID: "fld_123",
			setupMock: func(mr *MockFieldRepositoryForCRUD) {
				fieldName, _ := valueobject.NewFieldName("test_field")
				field, _ := entity.NewField("tbl_123", fieldName, valueobject.FieldType{}, "user_123")
				mr.On("FindByID", mock.Anything, mock.AnythingOfType("valueobject.FieldID")).Return(field, nil)
			},
			updateFn: func(f *entity.Field) error {
				return fmt.Errorf("更新失败")
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockFieldRepositoryForCRUD)
			mockFactory := factory.NewFieldFactory()
			tt.setupMock(mockRepo)

			service := NewFieldCRUDService(mockRepo, mockFactory)
			ctx := context.Background()

			field, err := service.UpdateField(ctx, tt.fieldID, tt.updateFn)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, field)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestFieldCRUDService_ListFields(t *testing.T) {
	mockRepo := new(MockFieldRepositoryForCRUD)
	mockFactory := factory.NewFieldFactory()

	fieldName, _ := valueobject.NewFieldName("test_field")
	field, _ := entity.NewField("tbl_123", fieldName, valueobject.FieldType{}, "user_123")
	mockRepo.On("FindByTableID", mock.Anything, "tbl_123").Return([]*entity.Field{field}, nil)

	service := NewFieldCRUDService(mockRepo, mockFactory)
	ctx := context.Background()

	fields, err := service.ListFields(ctx, "tbl_123")

	assert.NoError(t, err)
	assert.NotNil(t, fields)
	assert.Len(t, fields, 1)
	mockRepo.AssertExpectations(t)
}

