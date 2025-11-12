package field

import (
	"context"
	"testing"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/dependency"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockFieldRepositoryForDependency 模拟字段仓储（用于依赖服务）
type MockFieldRepositoryForDependency struct {
	mock.Mock
}

func (m *MockFieldRepositoryForDependency) Save(ctx context.Context, field *entity.Field) error {
	args := m.Called(ctx, field)
	return args.Error(0)
}

func (m *MockFieldRepositoryForDependency) FindByID(ctx context.Context, id valueobject.FieldID) (*entity.Field, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) FindByName(ctx context.Context, tableID string, name valueobject.FieldName) (*entity.Field, error) {
	args := m.Called(ctx, tableID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) Delete(ctx context.Context, id valueobject.FieldID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockFieldRepositoryForDependency) Exists(ctx context.Context, id valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) ExistsByName(ctx context.Context, tableID string, name valueobject.FieldName, excludeID *valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, tableID, name, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) List(ctx context.Context, filter repository.FieldFilter) ([]*entity.Field, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*entity.Field), args.Get(1).(int64), args.Error(2)
}

func (m *MockFieldRepositoryForDependency) BatchSave(ctx context.Context, fields []*entity.Field) error {
	args := m.Called(ctx, fields)
	return args.Error(0)
}

func (m *MockFieldRepositoryForDependency) BatchDelete(ctx context.Context, ids []valueobject.FieldID) error {
	args := m.Called(ctx, ids)
	return args.Error(0)
}

func (m *MockFieldRepositoryForDependency) GetVirtualFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) GetComputedFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) GetFieldsByType(ctx context.Context, tableID string, fieldType valueobject.FieldType) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID, fieldType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) UpdateOrder(ctx context.Context, fieldID valueobject.FieldID, order float64) error {
	args := m.Called(ctx, fieldID, order)
	return args.Error(0)
}

func (m *MockFieldRepositoryForDependency) GetMaxOrder(ctx context.Context, tableID string) (float64, error) {
	args := m.Called(ctx, tableID)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockFieldRepositoryForDependency) NextID() valueobject.FieldID {
	args := m.Called()
	return args.Get(0).(valueobject.FieldID)
}

func (m *MockFieldRepositoryForDependency) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func init() {
	if logger.Logger == nil {
		logger.Init(logger.LoggerConfig{
			Level:      "debug",
			Format:     "console",
			OutputPath: "stdout",
		})
	}
}

func TestFieldDependencyService_CheckCircularDependency(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		newField  *entity.Field
		existingFields []*entity.Field
		setupMock func(*MockFieldRepositoryForDependency)
		wantError bool
	}{
		{
			name:    "无循环依赖",
			tableID: "tbl_123",
			newField: createMockFormulaField("fld_003", "field3", "{fld_001} + {fld_002}"),
			existingFields: []*entity.Field{
				createMockField("fld_001", "field1", false, false),
				createMockField("fld_002", "field2", false, false),
			},
			setupMock: func(mr *MockFieldRepositoryForDependency) {
				mr.On("FindByTableID", mock.Anything, "tbl_123").Return([]*entity.Field{
					createMockField("fld_001", "field1", false, false),
					createMockField("fld_002", "field2", false, false),
				}, nil)
			},
			wantError: false,
		},
		{
			name:    "检测到循环依赖",
			tableID: "tbl_123",
			newField: createMockFormulaField("fld_003", "field3", "{fld_003}"), // 自己依赖自己
			existingFields: []*entity.Field{},
			setupMock: func(mr *MockFieldRepositoryForDependency) {
				mr.On("FindByTableID", mock.Anything, "tbl_123").Return([]*entity.Field{}, nil)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
		mockRepo := new(MockFieldRepositoryForDependency)
		// 创建依赖图仓储（使用no-op缓存）
		cacheRepo := &NoOpDependencyCacheRepository{}
		// 创建适配器将MockFieldRepository适配为dependency.FieldRepository
		fieldRepoAdapter := &DependencyFieldRepositoryAdapter{fieldRepo: mockRepo}
		builder := dependency.NewDependencyGraphBuilder(fieldRepoAdapter)
		depGraphRepo := dependency.NewDependencyGraphRepository(cacheRepo, builder, 1*time.Hour)
			
			tt.setupMock(mockRepo)

			service := NewFieldDependencyService(mockRepo, depGraphRepo)
			ctx := context.Background()

			err := service.CheckCircularDependency(ctx, tt.tableID, tt.newField)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestFieldDependencyService_ExtractFormulaDependencies(t *testing.T) {
	service := &FieldDependencyService{}

	tests := []struct {
		name       string
		field      *entity.Field
		allFields  []*entity.Field
		wantDeps   []string
	}{
		{
			name:      "提取字段引用",
			field:     createMockFormulaField("fld_003", "field3", "{field1} + {field2}"),
			allFields: []*entity.Field{
				createMockField("fld_001", "field1", false, false),
				createMockField("fld_002", "field2", false, false),
			},
			wantDeps: []string{"fld_001", "fld_002"},
		},
		{
			name:      "使用字段ID引用",
			field:     createMockFormulaField("fld_003", "field3", "{fld_001} + {fld_002}"),
			allFields: []*entity.Field{
				createMockField("fld_001", "field1", false, false),
				createMockField("fld_002", "field2", false, false),
			},
			wantDeps: []string{"fld_001", "fld_002"},
		},
		{
			name:      "无依赖",
			field:     createMockFormulaField("fld_003", "field3", "1 + 2"),
			allFields: []*entity.Field{},
			wantDeps:  []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			deps := service.ExtractFormulaDependencies(tt.field, tt.allFields)
			assert.Len(t, deps, len(tt.wantDeps))
			for _, wantDep := range tt.wantDeps {
				assert.Contains(t, deps, wantDep)
			}
		})
	}
}

func TestFieldDependencyService_BuildDependencyGraph(t *testing.T) {
	service := &FieldDependencyService{}

	tests := []struct {
		name   string
		fields []*entity.Field
		want   int // 期望的依赖项数量
	}{
		{
			name: "Formula字段依赖",
			fields: func() []*entity.Field {
				// 创建基础字段
				field1 := createMockField("fld_001", "field1", false, false)
				
				// 创建Formula字段，依赖field1
				field2 := createMockFormulaField("fld_002", "formula_field", "{field1} + 1")
				
				return []*entity.Field{field1, field2}
			}(),
			want: 1, // formula_field 依赖 field1
		},
		{
			name: "Rollup字段依赖",
			fields: func() []*entity.Field {
				// 创建Link字段
				linkField := createMockField("fld_link", "link_field", false, false)
				linkOptions := valueobject.NewFieldOptions()
				linkOptions.Link = &valueobject.LinkOptions{
					LinkedTableID: "tbl_456",
				}
				linkField.UpdateOptions(linkOptions)
				
				// 创建Rollup字段，依赖Link字段
				rollupField := createMockField("fld_rollup", "rollup_field", false, false)
				rollupOptions := valueobject.NewFieldOptions()
				rollupOptions.Rollup = &valueobject.RollupOptions{
					LinkFieldID: "fld_link",
				}
				rollupField.UpdateOptions(rollupOptions)
				
				// 设置字段类型为rollup
				rollupType, _ := valueobject.NewFieldType("rollup")
				rollupFieldName, _ := valueobject.NewFieldName("rollup_field")
				rollupDBFieldName, _ := valueobject.NewDBFieldName(rollupFieldName)
				rollupField = entity.ReconstructField(
					valueobject.NewFieldID("fld_rollup"),
					"tbl_123",
					rollupFieldName,
					rollupType,
					rollupDBFieldName,
					"VARCHAR(255)",
					rollupOptions,
					1.0,
					1,
					"user_123",
					time.Now(),
					time.Now(),
				)
				
				return []*entity.Field{linkField, rollupField}
			}(),
			want: 1, // rollup_field 依赖 link_field
		},
		{
			name: "Lookup字段依赖",
			fields: func() []*entity.Field {
				// 创建Link字段
				linkField := createMockField("fld_link", "link_field", false, false)
				
				// 创建Lookup字段，依赖Link字段
				lookupField := createMockField("fld_lookup", "lookup_field", false, false)
				lookupOptions := valueobject.NewFieldOptions()
				lookupOptions.Lookup = &valueobject.LookupOptions{
					LinkFieldID: "fld_link",
				}
				lookupField.UpdateOptions(lookupOptions)
				
				// 设置字段类型为lookup
				lookupType, _ := valueobject.NewFieldType("lookup")
				lookupFieldName, _ := valueobject.NewFieldName("lookup_field")
				lookupDBFieldName, _ := valueobject.NewDBFieldName(lookupFieldName)
				lookupField = entity.ReconstructField(
					valueobject.NewFieldID("fld_lookup"),
					"tbl_123",
					lookupFieldName,
					lookupType,
					lookupDBFieldName,
					"VARCHAR(255)",
					lookupOptions,
					2.0,
					1,
					"user_123",
					time.Now(),
					time.Now(),
				)
				
				return []*entity.Field{linkField, lookupField}
			}(),
			want: 1, // lookup_field 依赖 link_field
		},
		{
			name: "无依赖字段",
			fields: []*entity.Field{
				createMockField("fld_001", "field1", false, false),
				createMockField("fld_002", "field2", false, false),
			},
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.BuildDependencyGraph(tt.fields)
			assert.Len(t, result, tt.want)
		})
	}
}

func TestFieldDependencyService_FindFieldByNameOrID(t *testing.T) {
	service := &FieldDependencyService{}

	fields := []*entity.Field{
		createMockField("fld_001", "field1", false, false),
		createMockField("fld_002", "field2", false, false),
	}

	tests := []struct {
		name     string
		nameOrID string
		want     *entity.Field
	}{
		{
			name:     "通过ID查找",
			nameOrID: "fld_001",
			want:     fields[0],
		},
		{
			name:     "通过名称查找",
			nameOrID: "field2",
			want:     fields[1],
		},
		{
			name:     "未找到",
			nameOrID: "not_found",
			want:     nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.FindFieldByNameOrID(fields, tt.nameOrID)
			assert.Equal(t, tt.want, result)
		})
	}
}

// NoOpDependencyCacheRepository 无操作缓存仓储（用于测试）
type NoOpDependencyCacheRepository struct{}

func (n *NoOpDependencyCacheRepository) Get(ctx context.Context, key string) (string, error) {
	return "", nil
}

func (n *NoOpDependencyCacheRepository) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	return nil
}

func (n *NoOpDependencyCacheRepository) Delete(ctx context.Context, key string) error {
	return nil
}

func (n *NoOpDependencyCacheRepository) Exists(ctx context.Context, key string) (bool, error) {
	return false, nil
}

// createMockField 创建模拟字段
func createMockField(fieldID, fieldName string, required, computed bool) *entity.Field {
	name, _ := valueobject.NewFieldName(fieldName)
	fieldType, _ := valueobject.NewFieldType("singleLineText")
	
	id := valueobject.NewFieldID(fieldID)
	dbFieldName, _ := valueobject.NewDBFieldName(name)
	dbFieldType := "VARCHAR(255)"
	
	field := entity.ReconstructField(
		id,
		"tbl_123",
		name,
		fieldType,
		dbFieldName,
		dbFieldType,
		valueobject.NewFieldOptions(),
		0.0,
		1,
		"user_123",
		time.Now(),
		time.Now(),
	)
	
	if required {
		field.SetRequired(true)
	}
	
	return field
}

// DependencyFieldRepositoryAdapter 适配器，将FieldRepository适配为dependency.FieldRepository
type DependencyFieldRepositoryAdapter struct {
	fieldRepo repository.FieldRepository
}

func (a *DependencyFieldRepositoryAdapter) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	return a.fieldRepo.FindByTableID(ctx, tableID)
}

func (a *DependencyFieldRepositoryAdapter) FindByID(ctx context.Context, fieldID string) (*entity.Field, error) {
	id := valueobject.NewFieldID(fieldID)
	return a.fieldRepo.FindByID(ctx, id)
}

func (a *DependencyFieldRepositoryAdapter) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error) {
	return a.fieldRepo.FindLinkFieldsToTable(ctx, tableID)
}

// createMockFormulaField 创建公式字段
func createMockFormulaField(fieldID, fieldName, expression string) *entity.Field {
	name, _ := valueobject.NewFieldName(fieldName)
	fieldType, _ := valueobject.NewFieldType("formula")
	
	id := valueobject.NewFieldID(fieldID)
	dbFieldName, _ := valueobject.NewDBFieldName(name)
	dbFieldType := "VARCHAR(255)"
	
	options := valueobject.NewFieldOptions()
	options.Formula = &valueobject.FormulaOptions{
		Expression: expression,
	}
	
	field := entity.ReconstructField(
		id,
		"tbl_123",
		name,
		fieldType,
		dbFieldName,
		dbFieldType,
		options,
		0.0,
		1,
		"user_123",
		time.Now(),
		time.Now(),
	)
	
	return field
}

