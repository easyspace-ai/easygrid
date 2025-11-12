package record

import (
	"context"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/valueobject"
	tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
	tableValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
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

// MockRecordRepository 模拟记录仓储
type MockRecordRepository struct {
	mock.Mock
}

func (m *MockRecordRepository) Save(ctx context.Context, record *entity.Record) error {
	args := m.Called(ctx, record)
	return args.Error(0)
}

func (m *MockRecordRepository) FindByID(ctx context.Context, id valueobject.RecordID) (*entity.Record, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Record), args.Error(1)
}

func (m *MockRecordRepository) FindByTableAndID(ctx context.Context, tableID string, id valueobject.RecordID) (*entity.Record, error) {
	args := m.Called(ctx, tableID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Record), args.Error(1)
}

func (m *MockRecordRepository) FindByIDs(ctx context.Context, tableID string, ids []valueobject.RecordID) ([]*entity.Record, error) {
	args := m.Called(ctx, tableID, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Record), args.Error(1)
}

func (m *MockRecordRepository) FindByTableID(ctx context.Context, tableID string) ([]*entity.Record, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Record), args.Error(1)
}

func (m *MockRecordRepository) Delete(ctx context.Context, id valueobject.RecordID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockRecordRepository) DeleteByTableAndID(ctx context.Context, tableID string, id valueobject.RecordID) error {
	args := m.Called(ctx, tableID, id)
	return args.Error(0)
}

func (m *MockRecordRepository) Exists(ctx context.Context, id valueobject.RecordID) (bool, error) {
	args := m.Called(ctx, id)
	return args.Bool(0), args.Error(1)
}

func (m *MockRecordRepository) List(ctx context.Context, filter recordRepo.RecordFilter) ([]*entity.Record, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*entity.Record), args.Get(1).(int64), args.Error(2)
}

func (m *MockRecordRepository) BatchSave(ctx context.Context, records []*entity.Record) error {
	args := m.Called(ctx, records)
	return args.Error(0)
}

func (m *MockRecordRepository) BatchDelete(ctx context.Context, ids []valueobject.RecordID) error {
	args := m.Called(ctx, ids)
	return args.Error(0)
}

func (m *MockRecordRepository) CountByTableID(ctx context.Context, tableID string) (int64, error) {
	args := m.Called(ctx, tableID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRecordRepository) FindWithVersion(ctx context.Context, tableID string, id valueobject.RecordID, version valueobject.RecordVersion) (*entity.Record, error) {
	args := m.Called(ctx, tableID, id, version)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Record), args.Error(1)
}

func (m *MockRecordRepository) NextID() valueobject.RecordID {
	args := m.Called()
	return args.Get(0).(valueobject.RecordID)
}

func (m *MockRecordRepository) BatchUpdateLinkFieldTitle(ctx context.Context, tableID string, linkFieldID string, sourceRecordID string, newTitle string) error {
	args := m.Called(ctx, tableID, linkFieldID, sourceRecordID, newTitle)
	return args.Error(0)
}

// MockTableRepository 模拟表仓储
type MockTableRepository struct {
	mock.Mock
}

func (m *MockTableRepository) Save(ctx context.Context, table *tableEntity.Table) error {
	args := m.Called(ctx, table)
	return args.Error(0)
}

func (m *MockTableRepository) GetByID(ctx context.Context, tableID string) (*tableEntity.Table, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tableEntity.Table), args.Error(1)
}

func (m *MockTableRepository) GetByBaseID(ctx context.Context, baseID string) ([]*tableEntity.Table, error) {
	args := m.Called(ctx, baseID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*tableEntity.Table), args.Error(1)
}

func (m *MockTableRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockTableRepository) Update(ctx context.Context, table *tableEntity.Table) error {
	args := m.Called(ctx, table)
	return args.Error(0)
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

func TestRecordCRUDService_CreateRecord(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		recordData map[string]interface{}
		userID    string
		setupMock func(*MockRecordRepository, *MockTableRepository)
		wantError bool
	}{
		{
			name:    "成功创建记录",
			tableID: "tbl_123",
			recordData: map[string]interface{}{
				"fld_001": "value1",
			},
			userID: "user_123",
			setupMock: func(mr *MockRecordRepository, mt *MockTableRepository) {
				table := &tableEntity.Table{}
				mt.On("GetByID", mock.Anything, "tbl_123").Return(table, nil)
				mr.On("Save", mock.Anything, mock.AnythingOfType("*entity.Record")).Return(nil)
			},
			wantError: false,
		},
		{
			name:    "表不存在",
			tableID: "tbl_123",
			recordData: map[string]interface{}{
				"fld_001": "value1",
			},
			userID: "user_123",
			setupMock: func(mr *MockRecordRepository, mt *MockTableRepository) {
				mt.On("GetByID", mock.Anything, "tbl_123").Return(nil, nil)
			},
			wantError: true,
		},
		{
			name:    "无效的记录数据",
			tableID: "tbl_123",
			recordData: map[string]interface{}{
				"invalid": make(chan int), // 无效的数据类型
			},
			userID: "user_123",
			setupMock: func(mr *MockRecordRepository, mt *MockTableRepository) {
				table := &tableEntity.Table{}
				mt.On("GetByID", mock.Anything, "tbl_123").Return(table, nil)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRecordRepo := new(MockRecordRepository)
			mockTableRepo := new(MockTableRepository)
			tt.setupMock(mockRecordRepo, mockTableRepo)

			service := NewRecordCRUDService(mockRecordRepo, mockTableRepo)
			ctx := context.Background()

			record, err := service.CreateRecord(ctx, tt.tableID, tt.recordData, tt.userID)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, record)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, record)
				assert.Equal(t, tt.tableID, record.TableID())
			}

			mockRecordRepo.AssertExpectations(t)
			mockTableRepo.AssertExpectations(t)
		})
	}
}

func TestRecordCRUDService_GetRecord(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		recordID  string
		setupMock func(*MockRecordRepository)
		wantError bool
	}{
		{
			name:     "成功获取记录",
			tableID:  "tbl_123",
			recordID: "rec_123",
			setupMock: func(mr *MockRecordRepository) {
				record := &entity.Record{}
				mr.On("FindByTableAndID", mock.Anything, "tbl_123", mock.AnythingOfType("valueobject.RecordID")).Return(record, nil)
			},
			wantError: false,
		},
		{
			name:     "记录不存在",
			tableID:  "tbl_123",
			recordID: "rec_123",
			setupMock: func(mr *MockRecordRepository) {
				mr.On("FindByTableAndID", mock.Anything, "tbl_123", mock.AnythingOfType("valueobject.RecordID")).Return(nil, nil)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRecordRepo := new(MockRecordRepository)
			mockTableRepo := new(MockTableRepository)
			tt.setupMock(mockRecordRepo)

			service := NewRecordCRUDService(mockRecordRepo, mockTableRepo)
			ctx := context.Background()

			record, err := service.GetRecord(ctx, tt.tableID, tt.recordID)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, record)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, record)
			}

			mockRecordRepo.AssertExpectations(t)
		})
	}
}

func TestRecordCRUDService_UpdateRecord(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		recordID  string
		newData   map[string]interface{}
		userID    string
		setupMock func(*MockRecordRepository)
		wantError bool
	}{
		{
			name:     "成功更新记录",
			tableID:  "tbl_123",
			recordID: "rec_123",
			newData: map[string]interface{}{
				"fld_001": "new_value",
			},
			userID: "user_123",
			setupMock: func(mr *MockRecordRepository) {
				record := &entity.Record{}
				mr.On("FindByIDs", mock.Anything, "tbl_123", mock.Anything).Return([]*entity.Record{record}, nil)
				mr.On("Save", mock.Anything, mock.AnythingOfType("*entity.Record")).Return(nil)
			},
			wantError: false,
		},
		{
			name:     "记录不存在",
			tableID:  "tbl_123",
			recordID: "rec_123",
			newData: map[string]interface{}{
				"fld_001": "new_value",
			},
			userID: "user_123",
			setupMock: func(mr *MockRecordRepository) {
				mr.On("FindByIDs", mock.Anything, "tbl_123", mock.Anything).Return([]*entity.Record{}, nil)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRecordRepo := new(MockRecordRepository)
			mockTableRepo := new(MockTableRepository)
			tt.setupMock(mockRecordRepo)

			service := NewRecordCRUDService(mockRecordRepo, mockTableRepo)
			ctx := context.Background()

			record, err := service.UpdateRecord(ctx, tt.tableID, tt.recordID, tt.newData, tt.userID)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, record)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, record)
			}

			mockRecordRepo.AssertExpectations(t)
		})
	}
}

func TestRecordCRUDService_DeleteRecord(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		recordID  string
		setupMock func(*MockRecordRepository)
		wantError bool
	}{
		{
			name:     "成功删除记录",
			tableID:  "tbl_123",
			recordID: "rec_123",
			setupMock: func(mr *MockRecordRepository) {
				record := &entity.Record{}
				mr.On("FindByTableAndID", mock.Anything, "tbl_123", mock.AnythingOfType("valueobject.RecordID")).Return(record, nil)
				mr.On("DeleteByTableAndID", mock.Anything, "tbl_123", mock.AnythingOfType("valueobject.RecordID")).Return(nil)
			},
			wantError: false,
		},
		{
			name:     "记录不存在",
			tableID:  "tbl_123",
			recordID: "rec_123",
			setupMock: func(mr *MockRecordRepository) {
				mr.On("FindByTableAndID", mock.Anything, "tbl_123", mock.AnythingOfType("valueobject.RecordID")).Return(nil, nil)
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRecordRepo := new(MockRecordRepository)
			mockTableRepo := new(MockTableRepository)
			tt.setupMock(mockRecordRepo)

			service := NewRecordCRUDService(mockRecordRepo, mockTableRepo)
			ctx := context.Background()

			err := service.DeleteRecord(ctx, tt.tableID, tt.recordID)

			if tt.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			mockRecordRepo.AssertExpectations(t)
		})
	}
}

func TestRecordCRUDService_ListRecords(t *testing.T) {
	tests := []struct {
		name      string
		tableID   string
		limit     int
		offset    int
		setupMock func(*MockRecordRepository)
		wantCount int
		wantError bool
	}{
		{
			name:    "成功列出记录",
			tableID: "tbl_123",
			limit:   10,
			offset:  0,
			setupMock: func(mr *MockRecordRepository) {
				records := []*entity.Record{&entity.Record{}, &entity.Record{}}
				mr.On("List", mock.Anything, mock.AnythingOfType("repository.RecordFilter")).Return(records, int64(2), nil)
			},
			wantCount: 2,
			wantError: false,
		},
		{
			name:    "使用默认限制",
			tableID: "tbl_123",
			limit:   0,
			offset:  0,
			setupMock: func(mr *MockRecordRepository) {
				records := []*entity.Record{}
				mr.On("List", mock.Anything, mock.MatchedBy(func(f recordRepo.RecordFilter) bool {
					return f.Limit == 100
				})).Return(records, int64(0), nil)
			},
			wantCount: 0,
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRecordRepo := new(MockRecordRepository)
			mockTableRepo := new(MockTableRepository)
			tt.setupMock(mockRecordRepo)

			service := NewRecordCRUDService(mockRecordRepo, mockTableRepo)
			ctx := context.Background()

			records, total, err := service.ListRecords(ctx, tt.tableID, tt.limit, tt.offset)

			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, records)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, records)
				assert.Len(t, records, tt.wantCount)
				assert.Equal(t, int64(tt.wantCount), total)
			}

			mockRecordRepo.AssertExpectations(t)
		})
	}
}

func TestRecordCRUDService_BatchCreateRecords(t *testing.T) {
	mockRecordRepo := new(MockRecordRepository)
	mockTableRepo := new(MockTableRepository)

	table := &tableEntity.Table{}
	mockTableRepo.On("GetByID", mock.Anything, "tbl_123").Return(table, nil)
	mockRecordRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Record")).Return(nil).Times(2)

	service := NewRecordCRUDService(mockRecordRepo, mockTableRepo)
	ctx := context.Background()

	recordsData := []map[string]interface{}{
		{"fld_001": "value1"},
		{"fld_001": "value2"},
	}

	records, errors := service.BatchCreateRecords(ctx, "tbl_123", recordsData, "user_123")

	assert.Len(t, records, 2)
	assert.Len(t, errors, 0)
	mockRecordRepo.AssertExpectations(t)
	mockTableRepo.AssertExpectations(t)
}

func TestRecordCRUDService_BatchDeleteRecords(t *testing.T) {
	mockRecordRepo := new(MockRecordRepository)
	mockTableRepo := new(MockTableRepository)

	record := &entity.Record{}
	mockRecordRepo.On("FindByTableAndID", mock.Anything, "tbl_123", mock.AnythingOfType("valueobject.RecordID")).Return(record, nil).Times(2)
	mockRecordRepo.On("DeleteByTableAndID", mock.Anything, "tbl_123", mock.AnythingOfType("valueobject.RecordID")).Return(nil).Times(2)

	service := NewRecordCRUDService(mockRecordRepo, mockTableRepo)
	ctx := context.Background()

	recordIDs := []string{"rec_123", "rec_456"}

	successCount, errors := service.BatchDeleteRecords(ctx, "tbl_123", recordIDs)

	assert.Equal(t, 2, successCount)
	assert.Len(t, errors, 0)
	mockRecordRepo.AssertExpectations(t)
}

