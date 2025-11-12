package record

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockFieldRepository 模拟字段仓储
type MockFieldRepository struct {
	mock.Mock
}

func (m *MockFieldRepository) Save(ctx context.Context, field *entity.Field) error {
	args := m.Called(ctx, field)
	return args.Error(0)
}

func (m *MockFieldRepository) FindByID(ctx context.Context, id valueobject.FieldID) (*entity.Field, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepository) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepository) FindByName(ctx context.Context, tableID string, name valueobject.FieldName) (*entity.Field, error) {
	args := m.Called(ctx, tableID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepository) Delete(ctx context.Context, id valueobject.FieldID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockFieldRepository) Exists(ctx context.Context, id valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepository) ExistsByName(ctx context.Context, tableID string, name valueobject.FieldName, excludeID *valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, tableID, name, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepository) List(ctx context.Context, filter repository.FieldFilter) ([]*entity.Field, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*entity.Field), args.Get(1).(int64), args.Error(2)
}

func (m *MockFieldRepository) BatchSave(ctx context.Context, fields []*entity.Field) error {
	args := m.Called(ctx, fields)
	return args.Error(0)
}

func (m *MockFieldRepository) BatchDelete(ctx context.Context, ids []valueobject.FieldID) error {
	args := m.Called(ctx, ids)
	return args.Error(0)
}

func (m *MockFieldRepository) GetVirtualFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepository) GetComputedFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepository) GetFieldsByType(ctx context.Context, tableID string, fieldType valueobject.FieldType) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID, fieldType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepository) UpdateOrder(ctx context.Context, fieldID valueobject.FieldID, order float64) error {
	args := m.Called(ctx, fieldID, order)
	return args.Error(0)
}

func (m *MockFieldRepository) GetMaxOrder(ctx context.Context, tableID string) (float64, error) {
	args := m.Called(ctx, tableID)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockFieldRepository) NextID() valueobject.FieldID {
	args := m.Called()
	return args.Get(0).(valueobject.FieldID)
}

func (m *MockFieldRepository) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

// MockTypecastService 模拟类型转换服务
type MockTypecastService struct {
	mock.Mock
}

func (m *MockTypecastService) ValidateAndTypecastRecord(ctx context.Context, tableID string, data map[string]interface{}, allowTypecast bool) (map[string]interface{}, error) {
	args := m.Called(ctx, tableID, data, allowTypecast)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]interface{}), args.Error(1)
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

func TestRecordValidationService_ValidateRequiredFields(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		data      map[string]interface{}
		fields    []*entity.Field
		wantError bool
	}{
		{
			name:    "所有必填字段都存在",
			tableID: "tbl_123",
			data: map[string]interface{}{
				"fld_001": "value1",
				"fld_002": "value2",
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", true, false),
				createMockField("fld_002", "field2", true, false),
			},
			wantError: false,
		},
		{
			name:    "缺少必填字段",
			tableID: "tbl_123",
			data: map[string]interface{}{
				"fld_001": "value1",
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", true, false),
				createMockField("fld_002", "field2", true, false), // 必填但缺失
			},
			wantError: true,
		},
		{
			name:    "必填字段值为空",
			tableID: "tbl_123",
			data: map[string]interface{}{
				"fld_001": "",
				"fld_002": "value2",
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", true, false),
				createMockField("fld_002", "field2", true, false),
			},
			wantError: true,
		},
		{
			name:    "跳过计算字段",
			tableID: "tbl_123",
			data: map[string]interface{}{
				"fld_001": "value1",
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", true, false),
				createMockComputedField("fld_002", "field2", true), // 计算字段，跳过
			},
			wantError: false,
		},
		{
			name:    "使用字段名而不是字段ID",
			tableID: "tbl_123",
			data: map[string]interface{}{
				"field1": "value1", // 使用字段名
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", true, false),
			},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockFieldRepo := new(MockFieldRepository)
			mockTypecastService := new(MockTypecastService)

			mockFieldRepo.On("FindByTableID", mock.Anything, tt.tableID).Return(tt.fields, nil)

			service := NewRecordValidationService(mockFieldRepo, mockTypecastService)
			ctx := context.Background()

			err := service.ValidateRequiredFields(ctx, tt.tableID, tt.data)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			mockFieldRepo.AssertExpectations(t)
		})
	}
}

func TestRecordValidationService_ConvertFieldNamesToIDs(t *testing.T) {
	tests := []struct {
		name         string
		tableID      string
		updateData   map[string]interface{}
		fields       []*entity.Field
		wantKeys     []string
		wantError    bool
	}{
		{
			name:    "所有键都是字段ID格式",
			tableID: "tbl_123",
			updateData: map[string]interface{}{
				"fld_001": "value1",
				"fld_002": "value2",
			},
			fields: []*entity.Field{}, // 所有键都是字段ID格式时，不会调用FindByTableID
			wantKeys:  []string{"fld_001", "fld_002"},
			wantError: false,
		},
		{
			name:    "字段名转换为字段ID",
			tableID: "tbl_123",
			updateData: map[string]interface{}{
				"field1": "value1",
				"field2": "value2",
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", false, false),
				createMockField("fld_002", "field2", false, false),
			},
			wantKeys:  []string{"fld_001", "fld_002"},
			wantError: false,
		},
		{
			name:    "混合字段名和字段ID",
			tableID: "tbl_123",
			updateData: map[string]interface{}{
				"fld_001": "value1",
				"field2": "value2",
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", false, false),
				createMockField("fld_002", "field2", false, false),
			},
			wantKeys:  []string{"fld_001", "fld_002"},
			wantError: false,
		},
		{
			name:    "空数据",
			tableID: "tbl_123",
			updateData: map[string]interface{}{},
			fields: []*entity.Field{},
			wantKeys:  []string{},
			wantError: false,
		},
		{
			name:    "nil数据",
			tableID: "tbl_123",
			updateData: nil,
			fields: []*entity.Field{},
			wantKeys:  nil,
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockFieldRepo := new(MockFieldRepository)
			mockTypecastService := new(MockTypecastService)

			// 只有在需要转换字段名时才调用FindByTableID
			needsConversion := false
			if tt.updateData != nil {
				for key := range tt.updateData {
					if !strings.HasPrefix(key, "fld_") {
						needsConversion = true
						break
					}
				}
			}
			if needsConversion && len(tt.fields) > 0 {
				mockFieldRepo.On("FindByTableID", mock.Anything, tt.tableID).Return(tt.fields, nil)
			}

			service := NewRecordValidationService(mockFieldRepo, mockTypecastService)
			ctx := context.Background()

			result, err := service.ConvertFieldNamesToIDs(ctx, tt.tableID, tt.updateData)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.wantKeys != nil {
					for _, key := range tt.wantKeys {
						assert.Contains(t, result, key)
					}
				}
			}

			if len(tt.fields) > 0 {
				mockFieldRepo.AssertExpectations(t)
			}
		})
	}
}

func TestRecordValidationService_ValidateAndTypecast(t *testing.T) {
	mockFieldRepo := new(MockFieldRepository)
	mockTypecastService := new(MockTypecastService)

	inputData := map[string]interface{}{
		"fld_001": "value1",
	}
	outputData := map[string]interface{}{
		"fld_001": "converted_value1",
	}

	mockTypecastService.On("ValidateAndTypecastRecord", mock.Anything, "tbl_123", inputData, false).Return(outputData, nil)

	service := NewRecordValidationService(mockFieldRepo, mockTypecastService)
	ctx := context.Background()

	result, err := service.ValidateAndTypecast(ctx, "tbl_123", inputData, false)

	assert.NoError(t, err)
	assert.Equal(t, outputData, result)
	mockTypecastService.AssertExpectations(t)
}

func TestRecordValidationService_CleanRedundantKeys(t *testing.T) {
	tests := []struct {
		name       string
		tableID    string
		oldData    map[string]interface{}
		newData    map[string]interface{}
		fields     []*entity.Field
		wantKeys   []string
		notWantKeys []string
		wantError  bool
	}{
		{
			name:    "新数据使用字段ID，删除旧数据中的字段名",
			tableID: "tbl_123",
			oldData: map[string]interface{}{
				"fld_001": "old_value1",
				"field1":  "old_value1_dup", // 冗余的字段名，应该被删除
			},
			newData: map[string]interface{}{
				"fld_001": "new_value1",
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", false, false),
			},
			wantKeys:   []string{"fld_001"}, // 保留字段ID，删除字段名
			notWantKeys: []string{"field1"},
			wantError:  false,
		},
		{
			name:    "新数据使用字段名，删除旧数据中的字段ID",
			tableID: "tbl_123",
			oldData: map[string]interface{}{
				"fld_001": "old_value1_dup", // 冗余的字段ID，应该被删除
				"field1":  "old_value1",
			},
			newData: map[string]interface{}{
				"field1": "new_value1",
			},
			fields: []*entity.Field{
				createMockField("fld_001", "field1", false, false),
			},
			wantKeys:   []string{"field1"}, // 保留字段名，删除字段ID
			notWantKeys: []string{"fld_001"},
			wantError:  false,
		},
		{
			name:    "空旧数据",
			tableID: "tbl_123",
			oldData: map[string]interface{}{},
			newData: map[string]interface{}{
				"fld_001": "new_value1",
			},
			fields: []*entity.Field{}, // 空旧数据时不会调用FindByTableID
			wantKeys:   []string{},
			notWantKeys: []string{},
			wantError:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockFieldRepo := new(MockFieldRepository)
			mockTypecastService := new(MockTypecastService)

			// 只有在oldData不为空时才需要调用FindByTableID
			if len(tt.oldData) > 0 && len(tt.fields) > 0 {
				mockFieldRepo.On("FindByTableID", mock.Anything, tt.tableID).Return(tt.fields, nil)
			}

			service := NewRecordValidationService(mockFieldRepo, mockTypecastService)
			ctx := context.Background()

			result, err := service.CleanRedundantKeys(ctx, tt.tableID, tt.oldData, tt.newData)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				// 验证期望的键存在
				for _, key := range tt.wantKeys {
					if len(tt.oldData) > 0 {
						assert.Contains(t, result, key, "期望的键 %s 应该存在于结果中", key)
					}
				}
				// 验证不期望的键不存在
				for _, key := range tt.notWantKeys {
					assert.NotContains(t, result, key, "不期望的键 %s 不应该存在于结果中", key)
				}
			}

			mockFieldRepo.AssertExpectations(t)
		})
	}
}

// createMockField 创建模拟字段
func createMockField(fieldID, fieldName string, required, computed bool) *entity.Field {
	name, _ := valueobject.NewFieldName(fieldName)
	fieldType, _ := valueobject.NewFieldType("singleLineText")
	
	// 使用ReconstructField来创建带有指定ID的字段
	id := valueobject.NewFieldID(fieldID)
	dbFieldName, _ := valueobject.NewDBFieldName(name)
	dbFieldType := "VARCHAR(255)" // 默认类型
	
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

// createMockComputedField 创建计算字段（用于测试）
func createMockComputedField(fieldID, fieldName string, required bool) *entity.Field {
	name, _ := valueobject.NewFieldName(fieldName)
	fieldType, _ := valueobject.NewFieldType("formula") // 使用formula类型作为计算字段
	
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

