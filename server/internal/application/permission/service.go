package permission

import (
	"context"

	"github.com/easyspace-ai/luckdb/server/internal/domain/collaborator/entity"
)

// Service 权限服务接口
// 用于打破 application 和 application/helpers 之间的循环依赖
type Service interface {
	// 核心权限检查方法
	Can(ctx context.Context, userID, resourceID string, resourceType entity.ResourceType, action Action) bool

	// Space权限
	CanAccessSpace(ctx context.Context, userID, spaceID string) bool
	CanUpdateSpace(ctx context.Context, userID, spaceID string) bool
	CanDeleteSpace(ctx context.Context, userID, spaceID string) bool
	CanManageSpaceCollaborators(ctx context.Context, userID, spaceID string) bool
	CanCreateBaseInSpace(ctx context.Context, userID, spaceID string) bool

	// Base权限
	CanAccessBase(ctx context.Context, userID, baseID string) bool
	CanUpdateBase(ctx context.Context, userID, baseID string) bool
	CanDeleteBase(ctx context.Context, userID, baseID string) bool
	CanDuplicateBase(ctx context.Context, userID, baseID string) bool
	CanManageBaseCollaborators(ctx context.Context, userID, baseID string) bool
	CanCreateTablesInBase(ctx context.Context, userID, baseID string) bool

	// Table权限
	CanAccessTable(ctx context.Context, userID, tableID string) bool
	CanUpdateTable(ctx context.Context, userID, tableID string) bool
	CanManageTableSchema(ctx context.Context, userID, tableID string) bool
	CanDeleteTable(ctx context.Context, userID, tableID string) bool

	// Record权限
	CanAccessRecord(ctx context.Context, userID, tableID string) bool
	CanCreateRecordsInTable(ctx context.Context, userID, tableID string) bool
	CanUpdateRecordsInTable(ctx context.Context, userID, tableID string) bool
	CanDeleteRecordsInTable(ctx context.Context, userID, tableID string) bool
	FilterAccessibleRecords(ctx context.Context, userID, tableID string, recordIDs []string) []string

	// Field权限
	CanReadField(ctx context.Context, userID, fieldID string) bool
	CanUpdateField(ctx context.Context, userID, fieldID string) bool
	CanDeleteField(ctx context.Context, userID, fieldID string) bool
	CanCreateField(ctx context.Context, userID, tableID string) bool

	// View权限
	CanReadView(ctx context.Context, userID, viewID string) bool
	CanUpdateView(ctx context.Context, userID, viewID string) bool
	CanDeleteView(ctx context.Context, userID, viewID string) bool
}

