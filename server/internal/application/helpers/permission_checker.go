package helpers

import (
	"context"

	"github.com/easyspace-ai/luckdb/server/internal/application/permission"
	"github.com/easyspace-ai/luckdb/server/internal/domain/collaborator/entity"
	pkgErrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
)

// PermissionChecker 权限检查助手类
// 提供统一的权限检查接口，减少代码重复
type PermissionChecker struct {
	permissionService permission.Service
}

// NewPermissionChecker 创建权限检查助手
func NewPermissionChecker(permissionService permission.Service) *PermissionChecker {
	return &PermissionChecker{
		permissionService: permissionService,
	}
}

// CheckResourcePermission 检查资源权限（通用方法）
func (c *PermissionChecker) CheckResourcePermission(
	ctx context.Context,
	userID string,
	resourceType entity.ResourceType,
	resourceID string,
	action permission.Action,
) error {
	if !c.permissionService.Can(ctx, userID, resourceID, resourceType, action) {
		return pkgErrors.ErrForbidden.WithMessage("没有权限执行此操作")
	}
	return nil
}

// CheckSpacePermission 检查Space权限
func (c *PermissionChecker) CheckSpacePermission(ctx context.Context, userID, spaceID string, action permission.Action) error {
	var allowed bool
	switch action {
	case permission.ActionSpaceRead:
		allowed = c.permissionService.CanAccessSpace(ctx, userID, spaceID)
	case permission.ActionSpaceUpdate:
		allowed = c.permissionService.CanUpdateSpace(ctx, userID, spaceID)
	case permission.ActionSpaceDelete:
		allowed = c.permissionService.CanDeleteSpace(ctx, userID, spaceID)
	default:
		allowed = c.permissionService.Can(ctx, userID, spaceID, entity.ResourceTypeSpace, action)
	}

	if !allowed {
		return pkgErrors.ErrForbidden.WithMessage("没有权限访问此Space")
	}
	return nil
}

// CheckBasePermission 检查Base权限
func (c *PermissionChecker) CheckBasePermission(ctx context.Context, userID, baseID string, action permission.Action) error {
	var allowed bool
	switch action {
	case permission.ActionBaseRead:
		allowed = c.permissionService.CanAccessBase(ctx, userID, baseID)
	case permission.ActionBaseUpdate:
		allowed = c.permissionService.CanUpdateBase(ctx, userID, baseID)
	case permission.ActionBaseDelete:
		allowed = c.permissionService.CanDeleteBase(ctx, userID, baseID)
	default:
		allowed = c.permissionService.Can(ctx, userID, baseID, entity.ResourceTypeBase, action)
	}

	if !allowed {
		return pkgErrors.ErrForbidden.WithMessage("没有权限访问此Base")
	}
	return nil
}

// CheckTablePermission 检查Table权限
func (c *PermissionChecker) CheckTablePermission(ctx context.Context, userID, tableID string, action permission.Action) error {
	var allowed bool
	switch action {
	case permission.ActionTableRead:
		allowed = c.permissionService.CanAccessTable(ctx, userID, tableID)
	case permission.ActionTableUpdate:
		allowed = c.permissionService.CanUpdateTable(ctx, userID, tableID)
	case permission.ActionTableDelete:
		allowed = c.permissionService.CanDeleteTable(ctx, userID, tableID)
	default:
		// 对于其他操作，使用CanAccessTable作为基础检查
		allowed = c.permissionService.CanAccessTable(ctx, userID, tableID)
	}

	if !allowed {
		return pkgErrors.ErrForbidden.WithMessage("没有权限访问此Table")
	}
	return nil
}

// CheckFieldPermission 检查Field权限
func (c *PermissionChecker) CheckFieldPermission(ctx context.Context, userID, fieldID string, action permission.Action) error {
	var allowed bool
	switch action {
	case permission.ActionTableRead:
		// Field的read权限通过CanReadField检查
		allowed = c.permissionService.CanReadField(ctx, userID, fieldID)
	case permission.ActionTableFieldUpdate:
		allowed = c.permissionService.CanUpdateField(ctx, userID, fieldID)
	case permission.ActionTableFieldDelete:
		allowed = c.permissionService.CanDeleteField(ctx, userID, fieldID)
	default:
		// 对于其他操作，通过Field获取TableID，然后检查Table权限
		return c.CheckFieldPermissionByTable(ctx, userID, fieldID, action)
	}

	if !allowed {
		return pkgErrors.ErrForbidden.WithMessage("没有权限访问此Field")
	}
	return nil
}

// CheckFieldPermissionByTable 通过FieldID检查Table权限
func (c *PermissionChecker) CheckFieldPermissionByTable(ctx context.Context, userID, fieldID string, action permission.Action) error {
	// 通过CanReadField等方法已经内部获取了Field信息
	// 这里直接使用CanReadField来检查权限，它会内部获取TableID
	if !c.permissionService.CanReadField(ctx, userID, fieldID) {
		return pkgErrors.ErrForbidden.WithMessage("没有权限访问此Field")
	}
	return nil
}

// CheckViewPermission 检查View权限
func (c *PermissionChecker) CheckViewPermission(ctx context.Context, userID, viewID string, action permission.Action) error {
	var allowed bool
	switch action {
	case permission.ActionTableRead, permission.ActionViewRead:
		allowed = c.permissionService.CanReadView(ctx, userID, viewID)
	case permission.ActionTableViewUpdate, permission.ActionViewUpdate:
		allowed = c.permissionService.CanUpdateView(ctx, userID, viewID)
	case permission.ActionTableViewDelete, permission.ActionViewDelete:
		allowed = c.permissionService.CanDeleteView(ctx, userID, viewID)
	default:
		// 对于其他操作，使用CanReadView来检查（它会内部获取TableID）
		allowed = c.permissionService.CanReadView(ctx, userID, viewID)
	}

	if !allowed {
		return pkgErrors.ErrForbidden.WithMessage("没有权限访问此View")
	}
	return nil
}

// CheckViewPermissionByTable 通过ViewID检查Table权限（已废弃，使用CheckViewPermission）
func (c *PermissionChecker) CheckViewPermissionByTable(ctx context.Context, userID, viewID string, action permission.Action) error {
	return c.CheckViewPermission(ctx, userID, viewID, action)
}

// CheckRecordPermission 检查Record权限（Record继承Table的权限）
func (c *PermissionChecker) CheckRecordPermission(ctx context.Context, userID, tableID string, action permission.Action) error {
	// Record权限继承自Table
	return c.CheckTablePermission(ctx, userID, tableID, action)
}

