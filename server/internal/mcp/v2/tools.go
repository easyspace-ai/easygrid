package v2

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"

	"github.com/easyspace-ai/luckdb/server/internal/application/dto"
	"github.com/easyspace-ai/luckdb/server/pkg/authctx"
)

// registerBaseTools 注册 Base 相关工具
func (m *MCPServerV2) registerBaseTools() error {
	// base.create
	m.server.AddTool(
		mcp.NewTool("base.create",
			mcp.WithDescription("Create a base. If spaceId is not provided, the system will use the user's first space or create a default space."),
			mcp.WithString("name", mcp.Required()),
			mcp.WithString("spaceId"),
		),
		m.handleBaseCreate,
	)

	// base.get
	m.server.AddTool(
		mcp.NewTool("base.get",
			mcp.WithDescription("Get a base by id"),
			mcp.WithString("baseId", mcp.Required()),
		),
		m.handleBaseGet,
	)

	// base.update
	m.server.AddTool(
		mcp.NewTool("base.update",
			mcp.WithDescription("Update a base"),
			mcp.WithString("baseId", mcp.Required()),
			mcp.WithString("name"),
		),
		m.handleBaseUpdate,
	)

	// base.delete
	m.server.AddTool(
		mcp.NewTool("base.delete",
			mcp.WithDescription("Delete a base"),
			mcp.WithString("baseId", mcp.Required()),
		),
		m.handleBaseDelete,
	)

	// base.list
	m.server.AddTool(
		mcp.NewTool("base.list",
			mcp.WithDescription("List bases"),
			mcp.WithString("spaceId"),
		),
		m.handleBaseList,
	)

	return nil
}

// registerTableTools 注册 Table 相关工具
func (m *MCPServerV2) registerTableTools() error {
	// table.create
	m.server.AddTool(
		mcp.NewTool("table.create",
			mcp.WithDescription("Create a table"),
			mcp.WithString("baseId", mcp.Required()),
			mcp.WithString("name", mcp.Required()),
		),
		m.handleTableCreate,
	)

	// table.get
	m.server.AddTool(
		mcp.NewTool("table.get",
			mcp.WithDescription("Get a table by id"),
			mcp.WithString("tableId", mcp.Required()),
		),
		m.handleTableGet,
	)

	// table.update
	m.server.AddTool(
		mcp.NewTool("table.update",
			mcp.WithDescription("Update a table"),
			mcp.WithString("tableId", mcp.Required()),
			mcp.WithString("name"),
		),
		m.handleTableUpdate,
	)

	// table.delete
	m.server.AddTool(
		mcp.NewTool("table.delete",
			mcp.WithDescription("Delete a table"),
			mcp.WithString("tableId", mcp.Required()),
		),
		m.handleTableDelete,
	)

	// table.list
	m.server.AddTool(
		mcp.NewTool("table.list",
			mcp.WithDescription("List tables in a base"),
			mcp.WithString("baseId", mcp.Required()),
		),
		m.handleTableList,
	)

	return nil
}

// registerFieldTools 注册 Field 相关工具
func (m *MCPServerV2) registerFieldTools() error {
	// field.create
	m.server.AddTool(
		mcp.NewTool("field.create",
			mcp.WithDescription("Create a field"),
			mcp.WithString("tableId", mcp.Required()),
			mcp.WithString("name", mcp.Required()),
			mcp.WithString("type", mcp.Required()),
			mcp.WithObject("options"),
		),
		m.handleFieldCreate,
	)

	// field.get
	m.server.AddTool(
		mcp.NewTool("field.get",
			mcp.WithDescription("Get a field by id"),
			mcp.WithString("fieldId", mcp.Required()),
		),
		m.handleFieldGet,
	)

	// field.update
	m.server.AddTool(
		mcp.NewTool("field.update",
			mcp.WithDescription("Update a field"),
			mcp.WithString("fieldId", mcp.Required()),
			mcp.WithString("name"),
			mcp.WithObject("options"),
		),
		m.handleFieldUpdate,
	)

	// field.delete
	m.server.AddTool(
		mcp.NewTool("field.delete",
			mcp.WithDescription("Delete a field"),
			mcp.WithString("fieldId", mcp.Required()),
		),
		m.handleFieldDelete,
	)

	// field.list
	m.server.AddTool(
		mcp.NewTool("field.list",
			mcp.WithDescription("List fields in a table"),
			mcp.WithString("tableId", mcp.Required()),
		),
		m.handleFieldList,
	)

	return nil
}

// registerRecordTools 注册 Record 相关工具
func (m *MCPServerV2) registerRecordTools() error {
	// record.create
	m.server.AddTool(
		mcp.NewTool("record.create",
			mcp.WithDescription("Create a record"),
			mcp.WithString("tableId", mcp.Required()),
			mcp.WithObject("data", mcp.Required()),
		),
		m.handleRecordCreate,
	)

	// record.get
	m.server.AddTool(
		mcp.NewTool("record.get",
			mcp.WithDescription("Get a record by id"),
			mcp.WithString("tableId", mcp.Required()),
			mcp.WithString("recordId", mcp.Required()),
		),
		m.handleRecordGet,
	)

	// record.update
	m.server.AddTool(
		mcp.NewTool("record.update",
			mcp.WithDescription("Update a record"),
			mcp.WithString("tableId", mcp.Required()),
			mcp.WithString("recordId", mcp.Required()),
			mcp.WithObject("data", mcp.Required()),
		),
		m.handleRecordUpdate,
	)

	// record.delete
	m.server.AddTool(
		mcp.NewTool("record.delete",
			mcp.WithDescription("Delete a record"),
			mcp.WithString("tableId", mcp.Required()),
			mcp.WithString("recordId", mcp.Required()),
		),
		m.handleRecordDelete,
	)

	// record.list
	m.server.AddTool(
		mcp.NewTool("record.list",
			mcp.WithDescription("List records with pagination"),
			mcp.WithString("tableId", mcp.Required()),
			mcp.WithNumber("pageSize"),
			mcp.WithNumber("page"),
		),
		m.handleRecordList,
	)

	return nil
}

// ==================== Base 工具处理器 ====================

func (m *MCPServerV2) handleBaseCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	name := mcp.ParseString(req, "name", "")
	spaceID := mcp.ParseString(req, "spaceId", "")

	if name == "" {
		return mcp.NewToolResultError("name is required"), nil
	}

	// 获取用户ID
	userID, exists := getUserIDFromContext(ctx)
	if !exists {
		return mcp.NewToolResultError("user context is not available"), nil
	}

	// 如果未提供 spaceId，尝试获取或创建用户的默认空间
	if spaceID == "" {
		spaces, err := m.cont.SpaceService().ListSpaces(ctx, userID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("Failed to list spaces: %v", err)), nil
		}

		if len(spaces) > 0 {
			spaceID = spaces[0].ID
		} else {
			// 创建默认空间
			createSpaceReq := dto.CreateSpaceRequest{
				Name:        "Default",
				Description: "Default space for MCP operations",
			}
			defaultSpace, err := m.cont.SpaceService().CreateSpace(ctx, createSpaceReq, userID)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to create default space: %v", err)), nil
			}
			spaceID = defaultSpace.ID
		}
	}

	// 将 userID 设置到 context 中
	ctx = authctx.WithUser(ctx, userID)
	createReq := dto.CreateBaseRequest{SpaceID: spaceID, Name: name}
	result, err := m.cont.BaseService().CreateBase(ctx, createReq, userID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to create base: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleBaseGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	baseID := mcp.ParseString(req, "baseId", "")
	if baseID == "" {
		return mcp.NewToolResultError("baseId is required"), nil
	}

	result, err := m.cont.BaseService().GetBase(ctx, baseID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to get base: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleBaseUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	baseID := mcp.ParseString(req, "baseId", "")
	name := mcp.ParseString(req, "name", "")

	if baseID == "" {
		return mcp.NewToolResultError("baseId is required"), nil
	}

	updateReq := dto.UpdateBaseRequest{Name: name}
	result, err := m.cont.BaseService().UpdateBase(ctx, baseID, updateReq)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to update base: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleBaseDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	baseID := mcp.ParseString(req, "baseId", "")
	if baseID == "" {
		return mcp.NewToolResultError("baseId is required"), nil
	}

	err := m.cont.BaseService().DeleteBase(ctx, baseID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to delete base: %v", err)), nil
	}

	return mcp.NewToolResultText(`{"deleted": true}`), nil
}

func (m *MCPServerV2) handleBaseList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	spaceID := mcp.ParseString(req, "spaceId", "")

	bases, err := m.cont.BaseService().ListBases(ctx, spaceID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to list bases: %v", err)), nil
	}

	result := map[string]interface{}{
		"items": bases,
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

// ==================== Table 工具处理器 ====================

func (m *MCPServerV2) handleTableCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	baseID := mcp.ParseString(req, "baseId", "")
	name := mcp.ParseString(req, "name", "")

	if baseID == "" || name == "" {
		return mcp.NewToolResultError("baseId and name are required"), nil
	}

	createReq := dto.CreateTableRequest{Name: name, BaseID: baseID}
	result, err := m.cont.TableService().CreateTable(ctx, createReq, "mcp")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to create table: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleTableGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	if tableID == "" {
		return mcp.NewToolResultError("tableId is required"), nil
	}

	result, err := m.cont.TableService().GetTable(ctx, tableID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to get table: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleTableUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	name := mcp.ParseString(req, "name", "")

	if tableID == "" {
		return mcp.NewToolResultError("tableId is required"), nil
	}

	var updateReq dto.UpdateTableRequest
	if name != "" {
		updateReq.Name = &name
	}

	result, err := m.cont.TableService().UpdateTable(ctx, tableID, updateReq)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to update table: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleTableDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	if tableID == "" {
		return mcp.NewToolResultError("tableId is required"), nil
	}

	err := m.cont.TableService().DeleteTable(ctx, tableID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to delete table: %v", err)), nil
	}

	return mcp.NewToolResultText(`{"deleted": true}`), nil
}

func (m *MCPServerV2) handleTableList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	baseID := mcp.ParseString(req, "baseId", "")
	if baseID == "" {
		return mcp.NewToolResultError("baseId is required"), nil
	}

	items, err := m.cont.TableService().ListTables(ctx, baseID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to list tables: %v", err)), nil
	}

	result := map[string]interface{}{
		"items": items,
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

// ==================== Field 工具处理器 ====================

func (m *MCPServerV2) handleFieldCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	name := mcp.ParseString(req, "name", "")
	typeStr := mcp.ParseString(req, "type", "")
	options := mcp.ParseStringMap(req, "options", nil)

	if tableID == "" || name == "" || typeStr == "" {
		return mcp.NewToolResultError("tableId, name and type are required"), nil
	}

	createReq := dto.CreateFieldRequest{
		TableID: tableID,
		Name:    name,
		Type:    typeStr,
		Options: options,
	}

	result, err := m.cont.FieldService().CreateField(ctx, createReq, "mcp")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to create field: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleFieldGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	fieldID := mcp.ParseString(req, "fieldId", "")
	if fieldID == "" {
		return mcp.NewToolResultError("fieldId is required"), nil
	}

	result, err := m.cont.FieldService().GetField(ctx, fieldID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to get field: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleFieldUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	fieldID := mcp.ParseString(req, "fieldId", "")
	name := mcp.ParseString(req, "name", "")
	options := mcp.ParseStringMap(req, "options", nil)

	if fieldID == "" {
		return mcp.NewToolResultError("fieldId is required"), nil
	}

	var updateReq dto.UpdateFieldRequest
	if name != "" {
		updateReq.Name = &name
	}
	if options != nil {
		updateReq.Options = options
	}

	result, err := m.cont.FieldService().UpdateField(ctx, fieldID, updateReq)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to update field: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleFieldDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	fieldID := mcp.ParseString(req, "fieldId", "")
	if fieldID == "" {
		return mcp.NewToolResultError("fieldId is required"), nil
	}

	err := m.cont.FieldService().DeleteField(ctx, fieldID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to delete field: %v", err)), nil
	}

	return mcp.NewToolResultText(`{"deleted": true}`), nil
}

func (m *MCPServerV2) handleFieldList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	if tableID == "" {
		return mcp.NewToolResultError("tableId is required"), nil
	}

	fields, err := m.cont.FieldService().ListFields(ctx, tableID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to list fields: %v", err)), nil
	}

	result := map[string]interface{}{
		"items": fields,
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

// ==================== Record 工具处理器 ====================

func (m *MCPServerV2) handleRecordCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	data := mcp.ParseStringMap(req, "data", nil)

	if tableID == "" || data == nil {
		return mcp.NewToolResultError("tableId and data are required"), nil
	}

	createReq := dto.CreateRecordRequest{TableID: tableID, Data: data}
	result, err := m.cont.RecordService().CreateRecord(ctx, createReq, "mcp")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to create record: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleRecordGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	recordID := mcp.ParseString(req, "recordId", "")

	if tableID == "" || recordID == "" {
		return mcp.NewToolResultError("tableId and recordId are required"), nil
	}

	result, err := m.cont.RecordService().GetRecord(ctx, tableID, recordID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to get record: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleRecordUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	recordID := mcp.ParseString(req, "recordId", "")
	data := mcp.ParseStringMap(req, "data", nil)

	if tableID == "" || recordID == "" || data == nil {
		return mcp.NewToolResultError("tableId, recordId and data are required"), nil
	}

	updateReq := dto.UpdateRecordRequest{Data: data}
	result, err := m.cont.RecordService().UpdateRecord(ctx, tableID, recordID, updateReq, "mcp")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to update record: %v", err)), nil
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

func (m *MCPServerV2) handleRecordDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	recordID := mcp.ParseString(req, "recordId", "")

	if tableID == "" || recordID == "" {
		return mcp.NewToolResultError("tableId and recordId are required"), nil
	}

	err := m.cont.RecordService().DeleteRecord(ctx, tableID, recordID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to delete record: %v", err)), nil
	}

	return mcp.NewToolResultText(`{"deleted": true}`), nil
}

func (m *MCPServerV2) handleRecordList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	tableID := mcp.ParseString(req, "tableId", "")
	pageSize := mcp.ParseInt(req, "pageSize", 10)
	page := mcp.ParseInt(req, "page", 0)

	if tableID == "" {
		return mcp.NewToolResultError("tableId is required"), nil
	}

	limit := pageSize
	if limit <= 0 {
		limit = 10
	}
	offset := page * limit

	items, total, err := m.cont.RecordService().ListRecords(ctx, tableID, limit, offset)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to list records: %v", err)), nil
	}

	result := map[string]interface{}{
		"items": items,
		"total": total,
	}

	return mcp.NewToolResultText(marshalJSON(result)), nil
}

// ==================== 辅助函数 ====================

// getUserIDFromContext 从上下文获取用户ID
func getUserIDFromContext(ctx context.Context) (string, bool) {
	// 尝试从 context 值获取
	if userID, ok := ctx.Value("user_id").(string); ok && userID != "" {
		return userID, true
	}

	// 尝试从 authctx 获取
	if userID, exists := authctx.UserFrom(ctx); exists {
		return userID, true
	}

	return "", false
}

// marshalJSON 将对象序列化为 JSON 字符串
func marshalJSON(v interface{}) string {
	data, err := json.Marshal(v)
	if err != nil {
		return fmt.Sprintf(`{"error": "Failed to serialize: %v"}`, err)
	}
	return string(data)
}

