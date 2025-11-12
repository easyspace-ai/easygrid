package field

import (
	"context"
	"regexp"

	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/dependency"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	pkgerrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// FieldDependencyService 字段依赖关系管理服务
// 职责：字段依赖关系管理
type FieldDependencyService struct {
	fieldRepo    repository.FieldRepository
	depGraphRepo *dependency.DependencyGraphRepository
}

// NewFieldDependencyService 创建字段依赖服务
func NewFieldDependencyService(
	fieldRepo repository.FieldRepository,
	depGraphRepo *dependency.DependencyGraphRepository,
) *FieldDependencyService {
	return &FieldDependencyService{
		fieldRepo:    fieldRepo,
		depGraphRepo: depGraphRepo,
	}
}

// CheckCircularDependency 检查循环依赖
func (s *FieldDependencyService) CheckCircularDependency(ctx context.Context, tableID string, newField *entity.Field) error {
	// 1. 获取表中所有现有字段
	existingFields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		logger.Warn("获取字段列表失败，跳过循环依赖检测", logger.ErrorField(err))
		return nil // 不阻塞字段创建
	}

	// 2. 构建依赖图（包含新字段）
	allFields := append(existingFields, newField)
	graphItems := s.BuildDependencyGraph(allFields)

	logger.Info("循环依赖检测",
		logger.String("new_field_id", newField.ID().String()),
		logger.String("new_field_name", newField.Name().String()),
		logger.String("new_field_type", newField.Type().String()),
		logger.Int("total_fields", len(allFields)),
		logger.Int("graph_edges", len(graphItems)),
	)

	// 3. 检测循环依赖
	hasCycle, cyclePath := dependency.DetectCyclePath(graphItems)
	if hasCycle {
		logger.Error("检测到循环依赖",
			logger.String("new_field", newField.Name().String()),
			logger.Any("cycle_path", cyclePath),
		)
		return pkgerrors.ErrValidationFailed.WithDetails(map[string]interface{}{
			"message": "检测到循环依赖，无法创建该字段",
			"field":   newField.Name().String(),
			"cycle":   cyclePath,
		})
	}

	logger.Info("循环依赖检测通过", logger.String("field", newField.Name().String()))
	return nil
}

// BuildDependencyGraph 构建依赖图
func (s *FieldDependencyService) BuildDependencyGraph(fields []*entity.Field) []dependency.GraphItem {
	items := make([]dependency.GraphItem, 0)

	for _, field := range fields {
		fieldType := field.Type().String()

		switch fieldType {
		case "formula":
			// Formula 依赖于表达式中的字段
			deps := s.ExtractFormulaDependencies(field, fields)
			for _, depFieldID := range deps {
				items = append(items, dependency.GraphItem{
					FromFieldID: depFieldID,
					ToFieldID:   field.ID().String(),
				})
			}

		case "rollup":
			// Rollup 依赖于 Link 字段
			options := field.Options()
			if options != nil && options.Rollup != nil {
				items = append(items, dependency.GraphItem{
					FromFieldID: options.Rollup.LinkFieldID,
					ToFieldID:   field.ID().String(),
				})
			}

		case "lookup":
			// Lookup 依赖于 Link 字段
			options := field.Options()
			if options != nil && options.Lookup != nil {
				items = append(items, dependency.GraphItem{
					FromFieldID: options.Lookup.LinkFieldID,
					ToFieldID:   field.ID().String(),
				})
			}
		}
	}

	return items
}

// ExtractFormulaDependencies 提取公式的依赖字段ID
func (s *FieldDependencyService) ExtractFormulaDependencies(field *entity.Field, allFields []*entity.Field) []string {
	options := field.Options()
	if options == nil || options.Formula == nil {
		return []string{}
	}

	expression := options.Formula.Expression
	if expression == "" {
		return []string{}
	}

	// 使用正则表达式提取 {fieldName} 或 {fieldId} 引用
	re := regexp.MustCompile(`\{([^}]+)\}`)
	matches := re.FindAllStringSubmatch(expression, -1)

	if len(matches) == 0 {
		return []string{}
	}

	dependencies := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) > 1 {
			fieldRef := match[1]
			// 查找对应的字段（先尝试作为ID，再尝试作为名称）
			depField := s.FindFieldByNameOrID(allFields, fieldRef)
			if depField != nil {
				dependencies = append(dependencies, depField.ID().String())
			}
		}
	}

	return dependencies
}

// FindFieldByNameOrID 通过名称或ID查找字段
func (s *FieldDependencyService) FindFieldByNameOrID(fields []*entity.Field, nameOrID string) *entity.Field {
	// 先尝试按ID查找
	for _, field := range fields {
		if field.ID().String() == nameOrID {
			return field
		}
	}

	// 再尝试按名称查找
	for _, field := range fields {
		if field.Name().String() == nameOrID {
			return field
		}
	}

	return nil
}

