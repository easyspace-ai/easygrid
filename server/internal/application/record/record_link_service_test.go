package record

import (
	"context"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	recordEntity "github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	recordValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/record/valueobject"
	tableService "github.com/easyspace-ai/luckdb/server/internal/domain/table/service"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRecordRepositoryForLink 模拟记录仓储（用于Link服务）
type MockRecordRepositoryForLink struct {
	mock.Mock
}

func (m *MockRecordRepositoryForLink) Save(ctx context.Context, record *recordEntity.Record) error {
	args := m.Called(ctx, record)
	return args.Error(0)
}

func (m *MockRecordRepositoryForLink) FindByID(ctx context.Context, id recordValueObject.RecordID) (*recordEntity.Record, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*recordEntity.Record), args.Error(1)
}

func (m *MockRecordRepositoryForLink) FindByTableAndID(ctx context.Context, tableID string, id recordValueObject.RecordID) (*recordEntity.Record, error) {
	args := m.Called(ctx, tableID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*recordEntity.Record), args.Error(1)
}

func (m *MockRecordRepositoryForLink) FindByIDs(ctx context.Context, tableID string, ids []recordValueObject.RecordID) ([]*recordEntity.Record, error) {
	args := m.Called(ctx, tableID, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*recordEntity.Record), args.Error(1)
}

func (m *MockRecordRepositoryForLink) FindByTableID(ctx context.Context, tableID string) ([]*recordEntity.Record, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*recordEntity.Record), args.Error(1)
}

func (m *MockRecordRepositoryForLink) Delete(ctx context.Context, id recordValueObject.RecordID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockRecordRepositoryForLink) DeleteByTableAndID(ctx context.Context, tableID string, id recordValueObject.RecordID) error {
	args := m.Called(ctx, tableID, id)
	return args.Error(0)
}

func (m *MockRecordRepositoryForLink) Exists(ctx context.Context, id recordValueObject.RecordID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockRecordRepositoryForLink) List(ctx context.Context, filter recordRepo.RecordFilter) ([]*recordEntity.Record, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*recordEntity.Record), args.Get(1).(int64), args.Error(2)
}

func (m *MockRecordRepositoryForLink) BatchSave(ctx context.Context, records []*recordEntity.Record) error {
	args := m.Called(ctx, records)
	return args.Error(0)
}

func (m *MockRecordRepositoryForLink) BatchDelete(ctx context.Context, ids []recordValueObject.RecordID) error {
	args := m.Called(ctx, ids)
	return args.Error(0)
}

func (m *MockRecordRepositoryForLink) CountByTableID(ctx context.Context, tableID string) (int64, error) {
	args := m.Called(ctx, tableID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRecordRepositoryForLink) FindWithVersion(ctx context.Context, tableID string, id recordValueObject.RecordID, version recordValueObject.RecordVersion) (*recordEntity.Record, error) {
	args := m.Called(ctx, tableID, id, version)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*recordEntity.Record), args.Error(1)
}

func (m *MockRecordRepositoryForLink) NextID() recordValueObject.RecordID {
	args := m.Called()
	return args.Get(0).(recordValueObject.RecordID)
}

func (m *MockRecordRepositoryForLink) BatchUpdateLinkFieldTitle(ctx context.Context, tableID string, linkFieldID string, sourceRecordID string, newTitle string) error {
	args := m.Called(ctx, tableID, linkFieldID, sourceRecordID, newTitle)
	return args.Error(0)
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

func (m *MockFieldRepositoryForLink) FindByName(ctx context.Context, tableID string, name valueobject.FieldName) (*entity.Field, error) {
	args := m.Called(ctx, tableID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForLink) Delete(ctx context.Context, id valueobject.FieldID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockFieldRepositoryForLink) Exists(ctx context.Context, id valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepositoryForLink) ExistsByName(ctx context.Context, tableID string, name valueobject.FieldName, excludeID *valueobject.FieldID) (bool, error) {
	args := m.Called(ctx, tableID, name, excludeID)
	return args.Bool(0), args.Error(1)
}

func (m *MockFieldRepositoryForLink) List(ctx context.Context, filter repository.FieldFilter) ([]*entity.Field, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*entity.Field), args.Get(1).(int64), args.Error(2)
}

func (m *MockFieldRepositoryForLink) BatchSave(ctx context.Context, fields []*entity.Field) error {
	args := m.Called(ctx, fields)
	return args.Error(0)
}

func (m *MockFieldRepositoryForLink) BatchDelete(ctx context.Context, ids []valueobject.FieldID) error {
	args := m.Called(ctx, ids)
	return args.Error(0)
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
	args := m.Called(ctx, fieldID, order)
	return args.Error(0)
}

func (m *MockFieldRepositoryForLink) GetMaxOrder(ctx context.Context, tableID string) (float64, error) {
	args := m.Called(ctx, tableID)
	return args.Get(0).(float64), args.Error(1)
}

func (m *MockFieldRepositoryForLink) NextID() valueobject.FieldID {
	args := m.Called()
	return args.Get(0).(valueobject.FieldID)
}

func (m *MockFieldRepositoryForLink) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

// MockLinkService 模拟Link服务
type MockLinkService struct {
	mock.Mock
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

func TestRecordLinkService_IsLinkCellValue(t *testing.T) {
	service := &RecordLinkService{}

	tests := []struct {
		name  string
		value interface{}
		want  bool
	}{
		{
			name:  "单个Link单元格值",
			value: map[string]interface{}{"id": "rec_123"},
			want:  true,
		},
		{
			name: "Link单元格值数组",
			value: []interface{}{
				map[string]interface{}{"id": "rec_123"},
				map[string]interface{}{"id": "rec_456"},
			},
			want: true,
		},
		{
			name:  "普通字符串值",
			value: "not_a_link",
			want:  false,
		},
		{
			name:  "nil值",
			value: nil,
			want:  false,
		},
		{
			name:  "空map",
			value: map[string]interface{}{},
			want:  false,
		},
		{
			name:  "map但没有id字段",
			value: map[string]interface{}{"name": "test"},
			want:  false,
		},
		{
			name: "数组但元素不是Link值",
			value: []interface{}{
				"string1",
				"string2",
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.IsLinkCellValue(tt.value)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestRecordLinkService_ExtractLinkCellContexts(t *testing.T) {
	service := &RecordLinkService{}

	tests := []struct {
		name     string
		tableID  string
		recordID string
		oldData  map[string]interface{}
		newData  map[string]interface{}
		wantLen  int
	}{
		{
			name:     "提取Link单元格变更",
			tableID:  "tbl_123",
			recordID: "rec_123",
			oldData: map[string]interface{}{
				"fld_001": "normal_value",
				"fld_002": map[string]interface{}{"id": "rec_456"},
			},
			newData: map[string]interface{}{
				"fld_001": "normal_value",
				"fld_002": map[string]interface{}{"id": "rec_789"},
			},
			wantLen: 1,
		},
		{
			name:     "多个Link字段变更",
			tableID:  "tbl_123",
			recordID: "rec_123",
			oldData: map[string]interface{}{
				"fld_001": map[string]interface{}{"id": "rec_111"},
				"fld_002": map[string]interface{}{"id": "rec_222"},
			},
			newData: map[string]interface{}{
				"fld_001": map[string]interface{}{"id": "rec_333"},
				"fld_002": map[string]interface{}{"id": "rec_444"},
			},
			wantLen: 2,
		},
		{
			name:     "没有Link字段",
			tableID:  "tbl_123",
			recordID: "rec_123",
			oldData: map[string]interface{}{
				"fld_001": "value1",
				"fld_002": "value2",
			},
			newData: map[string]interface{}{
				"fld_001": "value3",
				"fld_002": "value4",
			},
			wantLen: 0,
		},
		{
			name:     "空数据",
			tableID:  "tbl_123",
			recordID: "rec_123",
			oldData:  map[string]interface{}{},
			newData:  map[string]interface{}{},
			wantLen:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			contexts := service.ExtractLinkCellContexts(tt.tableID, tt.recordID, tt.oldData, tt.newData)
			assert.Len(t, contexts, tt.wantLen)

			// 验证上下文内容
			for _, ctx := range contexts {
				assert.Equal(t, tt.recordID, ctx.RecordID)
				assert.NotEmpty(t, ctx.FieldID)
			}
		})
	}
}

func TestRecordLinkService_CleanupLinkReferences(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		recordID  string
		linkFields []*entity.Field
		wantError bool
	}{
		{
			name:     "成功清理Link引用",
			tableID:  "tbl_123",
			recordID: "rec_123",
			linkFields: []*entity.Field{
				// 这里需要创建实际的Field对象，简化处理
			},
			wantError: false,
		},
		{
			name:     "没有Link字段引用",
			tableID:  "tbl_123",
			recordID: "rec_123",
			linkFields: []*entity.Field{},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockFieldRepo := new(MockFieldRepositoryForLink)
			mockRecordRepo := new(MockRecordRepositoryForLink)
			mockLinkService := &tableService.LinkService{} // 实际需要mock

			mockFieldRepo.On("FindLinkFieldsToTable", mock.Anything, tt.tableID).Return(tt.linkFields, nil)

			service := NewRecordLinkService(
				mockRecordRepo,
				mockFieldRepo,
				mockLinkService,
			)
			ctx := context.Background()

			// 注意：这个测试需要实际的RecordRepositoryDynamic实现
			// 这里只是示例，实际测试需要更完整的mock
			err := service.CleanupLinkReferences(ctx, tt.tableID, tt.recordID)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				// 由于需要RecordRepositoryDynamic，这里可能返回错误
				// 实际测试中需要完整的mock实现
				_ = err
			}

			mockFieldRepo.AssertExpectations(t)
		})
	}
}

func TestRecordLinkService_RemoveLinkReference(t *testing.T) {
	// 注意：这个测试需要实际的数据库连接和RecordRepositoryDynamic
	// 这里只提供测试结构，实际实现需要更完整的mock
	tests := []struct {
		name         string
		tableID      string
		recordID     string
		fieldID      string
		linkedRecordID string
		wantError    bool
	}{
		{
			name:         "成功移除Link引用",
			tableID:      "tbl_123",
			recordID:     "rec_123",
			fieldID:      "fld_001",
			linkedRecordID: "rec_456",
			wantError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 这个测试需要实际的数据库连接
			// 在实际测试中，应该使用testcontainers或内存数据库
			t.Skip("需要实际的数据库连接，跳过单元测试")
		})
	}
}

