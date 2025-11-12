package dependency

import (
	"context"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
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

// MockFieldRepositoryForBuilder 模拟字段仓储
type MockFieldRepositoryForBuilder struct {
	mock.Mock
}

func (m *MockFieldRepositoryForBuilder) FindByTableID(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForBuilder) FindByID(ctx context.Context, fieldID string) (*entity.Field, error) {
	args := m.Called(ctx, fieldID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Field), args.Error(1)
}

func (m *MockFieldRepositoryForBuilder) FindLinkFieldsToTable(ctx context.Context, tableID string) ([]*entity.Field, error) {
	args := m.Called(ctx, tableID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Field), args.Error(1)
}

// TestDependencyGraphBuilder_extractCountDependencies 测试 Count 字段依赖提取
func TestDependencyGraphBuilder_extractCountDependencies(t *testing.T) {
	mockFieldRepo := new(MockFieldRepositoryForBuilder)
	builder := NewDependencyGraphBuilder(mockFieldRepo)

	// 创建 Count 字段
	fieldFactory := factory.NewFieldFactory()
	countField, err := fieldFactory.CreateFieldWithType(
		"table_001",
		"计数字段",
		valueobject.TypeCount,
		"user_001",
	)
	assert.NoError(t, err)

	// 设置 Count 选项
	options := valueobject.NewFieldOptions()
	options.Count = &valueobject.CountOptions{
		LinkFieldID: "link_field_001",
	}
	countField.UpdateOptions(options)

	// 测试提取 Count 字段依赖
	edges := builder.extractCountDependencies(countField, options)

	// 验证依赖关系
	assert.Len(t, edges, 1, "应该有一个依赖关系")
	assert.Equal(t, countField.ID().String(), edges[0].FromFieldID, "FromFieldID 应该是 Count 字段ID")
	assert.Equal(t, "link_field_001", edges[0].ToFieldID, "ToFieldID 应该是 Link 字段ID")
}

// TestDependencyGraphBuilder_extractCountDependencies_NoLinkField 测试 Count 字段没有 LinkFieldID 的情况
func TestDependencyGraphBuilder_extractCountDependencies_NoLinkField(t *testing.T) {
	mockFieldRepo := new(MockFieldRepositoryForBuilder)
	builder := NewDependencyGraphBuilder(mockFieldRepo)

	// 创建 Count 字段（没有 LinkFieldID）
	fieldFactory := factory.NewFieldFactory()
	countField, err := fieldFactory.CreateFieldWithType(
		"table_001",
		"计数字段",
		valueobject.TypeCount,
		"user_001",
	)
	assert.NoError(t, err)

	// 设置 Count 选项（但没有 LinkFieldID）
	options := valueobject.NewFieldOptions()
	options.Count = &valueobject.CountOptions{
		LinkFieldID: "", // 空的 LinkFieldID
	}
	countField.UpdateOptions(options)

	// 测试提取 Count 字段依赖
	edges := builder.extractCountDependencies(countField, options)

	// 验证没有依赖关系
	assert.Len(t, edges, 0, "应该没有依赖关系")
}

// TestDependencyGraphBuilder_extractCountDependencies_NilOptions 测试 Count 字段选项为 nil 的情况
func TestDependencyGraphBuilder_extractCountDependencies_NilOptions(t *testing.T) {
	mockFieldRepo := new(MockFieldRepositoryForBuilder)
	builder := NewDependencyGraphBuilder(mockFieldRepo)

	// 创建 Count 字段
	fieldFactory := factory.NewFieldFactory()
	countField, err := fieldFactory.CreateFieldWithType(
		"table_001",
		"计数字段",
		valueobject.TypeCount,
		"user_001",
	)
	assert.NoError(t, err)

	// 测试提取 Count 字段依赖（options 为 nil）
	edges := builder.extractCountDependencies(countField, nil)

	// 验证没有依赖关系
	assert.Len(t, edges, 0, "应该没有依赖关系")
}

// TestDependencyGraphBuilder_BuildDependencyGraph_WithCountField 测试构建包含 Count 字段的依赖图
func TestDependencyGraphBuilder_BuildDependencyGraph_WithCountField(t *testing.T) {
	mockFieldRepo := new(MockFieldRepositoryForBuilder)
	builder := NewDependencyGraphBuilder(mockFieldRepo)

	ctx := context.Background()
	tableID := "table_001"

	// 创建 Link 字段
	fieldFactory := factory.NewFieldFactory()
	linkField, err := fieldFactory.CreateFieldWithType(
		tableID,
		"关联字段",
		valueobject.TypeLink,
		"user_001",
	)
	assert.NoError(t, err)
	linkFieldID := linkField.ID().String()

	// 创建 Count 字段
	countField, err := fieldFactory.CreateFieldWithType(
		tableID,
		"计数字段",
		valueobject.TypeCount,
		"user_001",
	)
	assert.NoError(t, err)

	// 设置 Count 选项
	options := valueobject.NewFieldOptions()
	options.Count = &valueobject.CountOptions{
		LinkFieldID: linkFieldID,
	}
	countField.UpdateOptions(options)

	// 设置模拟返回值
	mockFieldRepo.On("FindByTableID", ctx, tableID).Return([]*entity.Field{
		linkField,
		countField,
	}, nil)

	// 构建依赖图
	edges, err := builder.BuildDependencyGraph(ctx, tableID)

	// 验证结果
	assert.NoError(t, err)
	assert.NotNil(t, edges)

	// 验证 Count 字段的依赖关系存在
	countDependencyFound := false
	for _, edge := range edges {
		if edge.FromFieldID == countField.ID().String() && edge.ToFieldID == linkFieldID {
			countDependencyFound = true
			break
		}
	}
	assert.True(t, countDependencyFound, "应该找到 Count 字段对 Link 字段的依赖关系")

	mockFieldRepo.AssertExpectations(t)
}

