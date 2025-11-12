package field

import (
	"context"
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/factory"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	pkgerrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// FieldCRUDService 字段CRUD服务
// 职责：基础的CRUD操作（不含Schema、依赖、广播）
type FieldCRUDService struct {
	fieldRepo    repository.FieldRepository
	fieldFactory *factory.FieldFactory
}

// NewFieldCRUDService 创建字段CRUD服务
func NewFieldCRUDService(
	fieldRepo repository.FieldRepository,
	fieldFactory *factory.FieldFactory,
) *FieldCRUDService {
	return &FieldCRUDService{
		fieldRepo:    fieldRepo,
		fieldFactory: fieldFactory,
	}
}

// CreateField 创建字段实体（不含Schema创建、依赖检查、广播）
func (s *FieldCRUDService) CreateField(ctx context.Context, tableID, name, fieldType, userID string) (*entity.Field, error) {
	// 验证字段名称
	fieldName, err := valueobject.NewFieldName(name)
	if err != nil {
		return nil, pkgerrors.ErrValidationFailed.WithDetails(fmt.Sprintf("字段名称无效: %v", err))
	}

	// 检查字段名称是否重复
	exists, err := s.fieldRepo.ExistsByName(ctx, tableID, fieldName, nil)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("检查字段名称失败: %v", err))
	}
	if exists {
		return nil, pkgerrors.ErrConflict.WithMessage(fmt.Sprintf("字段名 '%s' 已存在", name))
	}

	// 使用工厂创建字段
	field, err := s.fieldFactory.CreateFieldWithType(tableID, name, fieldType, userID)
	if err != nil {
		return nil, pkgerrors.ErrInternalServer.WithDetails(fmt.Sprintf("创建字段失败: %v", err))
	}

	// 计算字段order值
	maxOrder, err := s.fieldRepo.GetMaxOrder(ctx, tableID)
	if err != nil {
		logger.Warn("获取最大order失败，使用默认值-1", logger.ErrorField(err))
		maxOrder = -1
	}
	nextOrder := maxOrder + 1
	field.SetOrder(nextOrder)

	// 保存字段
	if err := s.fieldRepo.Save(ctx, field); err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("保存字段失败: %v", err))
	}

	logger.Info("字段创建成功",
		logger.String("field_id", field.ID().String()),
		logger.String("table_id", tableID))

	return field, nil
}

// GetField 获取字段（不含计算）
func (s *FieldCRUDService) GetField(ctx context.Context, fieldID string) (*entity.Field, error) {
	id := valueobject.NewFieldID(fieldID)

	field, err := s.fieldRepo.FindByID(ctx, id)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找字段失败: %v", err))
	}
	if field == nil {
		return nil, pkgerrors.ErrNotFound.WithDetails("字段不存在")
	}

	return field, nil
}

// UpdateField 更新字段实体（不含Schema更新、依赖检查、广播）
func (s *FieldCRUDService) UpdateField(ctx context.Context, fieldID string, updates func(*entity.Field) error) (*entity.Field, error) {
	// 查找字段
	id := valueobject.NewFieldID(fieldID)
	field, err := s.fieldRepo.FindByID(ctx, id)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找字段失败: %v", err))
	}
	if field == nil {
		return nil, pkgerrors.ErrNotFound.WithDetails("字段不存在")
	}

	// 应用更新
	if err := updates(field); err != nil {
		return nil, err
	}

	// 保存字段
	if err := s.fieldRepo.Save(ctx, field); err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("保存字段失败: %v", err))
	}

	logger.Info("字段更新成功",
		logger.String("field_id", fieldID))

	return field, nil
}

// DeleteField 删除字段（不含Schema删除、依赖检查、广播）
func (s *FieldCRUDService) DeleteField(ctx context.Context, fieldID string) error {
	id := valueobject.NewFieldID(fieldID)

	// 检查字段是否存在
	field, err := s.fieldRepo.FindByID(ctx, id)
	if err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查找字段失败: %v", err))
	}
	if field == nil {
		return pkgerrors.ErrNotFound.WithDetails("字段不存在")
	}

	// 删除字段
	if err := s.fieldRepo.Delete(ctx, id); err != nil {
		return pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("删除字段失败: %v", err))
	}

	logger.Info("字段删除成功",
		logger.String("field_id", fieldID))

	return nil
}

// ListFields 列出字段（不含计算）
func (s *FieldCRUDService) ListFields(ctx context.Context, tableID string) ([]*entity.Field, error) {
	fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
	if err != nil {
		return nil, pkgerrors.ErrDatabaseOperation.WithDetails(fmt.Sprintf("查询字段列表失败: %v", err))
	}

	return fields, nil
}

