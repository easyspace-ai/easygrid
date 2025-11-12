package field

import (
	"context"
	"testing"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
	tableValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
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

// MockFieldRepositoryForLink 模拟字段仓储（用于Link服务）
type MockFieldRepositoryForLink struct {
	mock.Mock
}

func (m *MockFieldRepositoryForLink) Save(ctx context.Context, field *entity.Field) error {
	args := m.Called(ctx, field)
	return args.Error(0)
}

func (m *MockFieldRepositoryForLink) FindByID(ctx context.Context, id valueobject.FieldID) (*entity.Field, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForLink) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForLink) ExistsByName(ctx context.Context, tableID string, name valueobject.FieldName, excludeID *valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, tableID, name, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepositoryForLink) GetMaxOrder(ctx context.Context, tableID string) (float64, error) {
	args := m.Called(ctx, tableID)
	return args.Get(0).(float64), args.Error(1)
}

// 实现其他必需的方法（简化版）
func (m *MockFieldRepositoryForLink) FindByName(ctx context.Context, tableID string, name valueobject.FieldName) (*entity.Field, error) {
	args := m.Called(ctx, tableID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForLink) Delete(ctx context.Context, id valueobject.FieldID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockFieldRepositoryForLink) Exists(ctx context.Context, id valueobject.FieldID) (bool, error) {
	return m.Called(ctx, id).Bool(0), m.Called(ctx, id).Error(1)
}

func (m *MockFieldRepositoryForLink) List(ctx context.Context, filter repository.FieldFilter) ([]*entity.Field, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*entity.Field), args.Get(1).(int64), args.Error(2)
}

func (m *MockFieldRepositoryForLink) BatchSave(ctx context.Context, fields []*entity.Field) error {
	return m.Called(ctx, fields).Error(0)
}

func (m *MockFieldRepositoryForLink) BatchDelete(ctx context.Context, ids []valueobject.FieldID) error {
	return m.Called(ctx, ids).Error(0)
}

func (m *MockFieldRepositoryForLink) GetVirtualFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForLink) GetComputedFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForLink) GetFieldsByType(ctx context.Context, tableID string, fieldType valueobject.FieldType) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID, fieldType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForLink) UpdateOrder(ctx context.Context, fieldID valueobject.FieldID, order float64) error {
	return m.Called(ctx, fieldID, order).Error(0)
}

func (m *MockFieldRepositoryForLink) NextID() valueobject.FieldID {
	return m.Called().Get(0).(valueobject.FieldID)
}

func (m *MockFieldRepositoryForLink) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

// MockTableRepositoryForLink 模拟表仓储（用于Link服务）
type MockTableRepositoryForLink struct {
	mock.Mock
}

func (m *MockTableRepositoryForLink) GetByID(ctx context.Context, tableID string) (*tableEntity.Table, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tableEntity.Table), args.Error(1)
}

// 实现其他必需的方法（简化版，返回nil或默认值）
func (m *MockTableRepositoryForLink) Save(ctx context.Context, table *tableEntity.Table) error {
	return m.Called(ctx, table).Error(0)
}

func (m *MockTableRepositoryForLink) FindByBaseID(ctx context.Context, baseID string) ([]*tableEntity.Table, error) {
	args := m.Called(ctx, baseID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*tableEntity.Table), args.Error(1)
}

func (m *MockTableRepositoryForLink) GetByBaseID(ctx context.Context, baseID string) ([]*tableEntity.Table, error) {
	return m.FindByBaseID(ctx, baseID)
}

func (m *MockTableRepositoryForLink) Delete(ctx context.Context, tableID string) error {
	return m.Called(ctx, tableID).Error(0)
}

func (m *MockTableRepositoryForLink) Exists(ctx context.Context, tableID string) (bool, error) {
	return m.Called(ctx, tableID).Bool(0), m.Called(ctx, tableID).Error(1)
}

func (m *MockTableRepositoryForLink) ExistsByNameInBase(ctx context.Context, baseID string, name tableValueObject.TableName, excludeID *string) (bool, error) {
	return m.Called(ctx, baseID, name, excludeID).Bool(0), m.Called(ctx, baseID, name, excludeID).Error(1)
}

func (m *MockTableRepositoryForLink) Count(ctx context.Context, baseID string) (int64, error) {
	args := m.Called(ctx, baseID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockTableRepositoryForLink) Update(ctx context.Context, table *tableEntity.Table) error {
	return m.Called(ctx, table).Error(0)
}

func TestFieldLinkService_GetPrimaryFieldID(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		fields    []*entity.Field
		setupMock func(*MockFieldRepositoryForLink, []*entity.Field)
		wantError bool
		wantID    string
	}{
		{
			name:    "成功获取第一个非虚拟字段",
			tableID: "tbl_123",
			fields: func() []*entity.Field {
				fieldName1, _ := valueobject.NewFieldName("field1")
				fieldType1, _ := valueobject.NewFieldType("singleLineText")
				dbFieldName1, _ := valueobject.NewDBFieldName(fieldName1)
				field1 := entity.ReconstructField(
					valueobject.NewFieldID("fld_001"),
					"tbl_123",
					fieldName1,
					fieldType1,
					dbFieldName1,
					"VARCHAR(255)",
					valueobject.NewFieldOptions(),
					0.0,
					1,
					"user_123",
					time.Now(),
					time.Now(),
				)

				fieldName2, _ := valueobject.NewFieldName("field2")
				fieldType2, _ := valueobject.NewFieldType("formula")
				dbFieldName2, _ := valueobject.NewDBFieldName(fieldName2)
				field2 := entity.ReconstructField(
					valueobject.NewFieldID("fld_002"),
					"tbl_123",
					fieldName2,
					fieldType2,
					dbFieldName2,
					"VARCHAR(255)",
					valueobject.NewFieldOptions(),
					1.0,
					1,
					"user_123",
					time.Now(),
					time.Now(),
				)

				return []*entity.Field{field1, field2}
			}(),
			setupMock: func(mr *MockFieldRepositoryForLink, fields []*entity.Field) {
				mr.On("FindByTableID", mock.Anything, "tbl_123").Return(fields, nil)
			},
			wantError: false,
			wantID:    "fld_001",
		},
		{
			name:    "没有字段",
			tableID: "tbl_123",
			fields:  []*entity.Field{},
			setupMock: func(mr *MockFieldRepositoryForLink, fields []*entity.Field) {
				mr.On("FindByTableID", mock.Anything, "tbl_123").Return(fields, nil)
			},
			wantError: true,
		},
		{
			name:    "只有虚拟字段，返回第一个",
			tableID: "tbl_123",
			fields: func() []*entity.Field {
				fieldName, _ := valueobject.NewFieldName("formula_field")
				fieldType, _ := valueobject.NewFieldType("formula")
				dbFieldName, _ := valueobject.NewDBFieldName(fieldName)
				field := entity.ReconstructField(
					valueobject.NewFieldID("fld_001"),
					"tbl_123",
					fieldName,
					fieldType,
					dbFieldName,
					"VARCHAR(255)",
					valueobject.NewFieldOptions(),
					0.0,
					1,
					"user_123",
					time.Now(),
					time.Now(),
				)
				return []*entity.Field{field}
			}(),
			setupMock: func(mr *MockFieldRepositoryForLink, fields []*entity.Field) {
				mr.On("FindByTableID", mock.Anything, "tbl_123").Return(fields, nil)
			},
			wantError: false,
			wantID:    "fld_001",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockFieldRepo := new(MockFieldRepositoryForLink)
			mockTableRepo := new(MockTableRepositoryForLink)
			fieldFactory := factory.NewFieldFactory()
			tt.setupMock(mockFieldRepo, tt.fields)

			service := NewFieldLinkService(mockFieldRepo, mockTableRepo, fieldFactory, nil, nil)
			ctx := context.Background()

			result, err := service.GetPrimaryFieldID(ctx, tt.tableID)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantID, result)
			}

			mockFieldRepo.AssertExpectations(t)
		})
	}
}

func TestFieldLinkService_ConvertToLinkFieldOptions(t *testing.T) {
	tests := []struct {
		name         string
		currentTableID string
		linkOptions  *valueobject.LinkOptions
		field        *entity.Field
		setupMock    func(*MockFieldRepositoryForLink, *MockTableRepositoryForLink)
		wantError    bool
	}{
		{
			name:         "成功转换manyMany关系",
			currentTableID: "tbl_123",
			linkOptions: &valueobject.LinkOptions{
				LinkedTableID: "tbl_456",
				Relationship:  "manyMany",
			},
			field: nil,
			setupMock: func(mfr *MockFieldRepositoryForLink, mtr *MockTableRepositoryForLink) {
				// 模拟获取主字段ID
				fieldName, _ := valueobject.NewFieldName("primary_field")
				fieldType, _ := valueobject.NewFieldType("singleLineText")
				dbFieldName, _ := valueobject.NewDBFieldName(fieldName)
				field := entity.ReconstructField(
					valueobject.NewFieldID("fld_primary"),
					"tbl_456",
					fieldName,
					fieldType,
					dbFieldName,
					"VARCHAR(255)",
					valueobject.NewFieldOptions(),
					0.0,
					1,
					"user_123",
					time.Now(),
					time.Now(),
				)
				mfr.On("FindByTableID", mock.Anything, "tbl_456").Return([]*entity.Field{field}, nil)
			},
			wantError: false,
		},
		{
			name:         "关联表ID不存在",
			currentTableID: "tbl_123",
			linkOptions: &valueobject.LinkOptions{
				LinkedTableID: "",
				Relationship:  "manyMany",
			},
			field: nil,
			setupMock: func(mfr *MockFieldRepositoryForLink, mtr *MockTableRepositoryForLink) {
				// 不需要设置mock
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockFieldRepo := new(MockFieldRepositoryForLink)
			mockTableRepo := new(MockTableRepositoryForLink)
			fieldFactory := factory.NewFieldFactory()
			tt.setupMock(mockFieldRepo, mockTableRepo)

			service := NewFieldLinkService(mockFieldRepo, mockTableRepo, fieldFactory, nil, nil)
			ctx := context.Background()

			result, err := service.ConvertToLinkFieldOptions(ctx, tt.currentTableID, tt.linkOptions, tt.field)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
			}

			mockFieldRepo.AssertExpectations(t)
		})
	}
}

func TestFieldLinkService_ReverseRelationship(t *testing.T) {
	service := NewFieldLinkService(nil, nil, nil, nil, nil)

	tests := []struct {
		name         string
		relationship string
		want         string
	}{
		{
			name:         "manyMany -> manyMany",
			relationship: "manyMany",
			want:         "manyMany",
		},
		{
			name:         "manyOne -> oneMany",
			relationship: "manyOne",
			want:         "oneMany",
		},
		{
			name:         "oneMany -> manyOne",
			relationship: "oneMany",
			want:         "manyOne",
		},
		{
			name:         "oneOne -> oneOne",
			relationship: "oneOne",
			want:         "oneOne",
		},
		{
			name:         "未知关系 -> 返回原值",
			relationship: "unknown",
			want:         "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.ReverseRelationship(tt.relationship)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestFieldLinkService_GenerateSymmetricFieldName(t *testing.T) {
	service := NewFieldLinkService(nil, nil, nil, nil, nil)

	tests := []struct {
		name           string
		mainFieldName  string
		foreignTableName string
		want           string
	}{
		{
			name:           "基本生成",
			mainFieldName:  "Projects",
			foreignTableName: "Tasks",
			want:           "Tasks列表",
		},
		{
			name:           "空名称",
			mainFieldName:  "",
			foreignTableName: "Tasks",
			want:           "Tasks列表",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.GenerateSymmetricFieldName(tt.mainFieldName, tt.foreignTableName)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestFieldLinkService_IsRelationshipChangeSupported(t *testing.T) {
	service := NewFieldLinkService(nil, nil, nil, nil, nil)

	tests := []struct {
		name         string
		fromRel      string
		toRel        string
		want         bool
	}{
		{
			name:    "manyMany -> manyOne 支持",
			fromRel: "manyMany",
			toRel:   "manyOne",
			want:    true,
		},
		{
			name:    "manyOne -> manyMany 支持",
			fromRel: "manyOne",
			toRel:   "manyMany",
			want:    true,
		},
		{
			name:    "manyMany -> oneOne 不支持",
			fromRel: "manyMany",
			toRel:   "oneOne",
			want:    false,
		},
		{
			name:    "manyOne -> oneOne 不支持",
			fromRel: "manyOne",
			toRel:   "oneOne",
			want:    false,
		},
		{
			name:    "相同关系",
			fromRel: "manyMany",
			toRel:   "manyMany",
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.IsRelationshipChangeSupported(tt.fromRel, tt.toRel)
			assert.Equal(t, tt.want, result)
		})
	}
}

