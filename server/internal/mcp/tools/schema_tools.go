package tools

import (
	"context"
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/mcp/protocol"
)

// GetTableSchemaTool 获取表结构工具
type GetTableSchemaTool struct {
	// 这里将来会注入表仓储和字段仓储
	// tableRepo tableRepo.TableRepository
	// fieldRepo fieldRepo.FieldRepository
}

// NewGetTableSchemaTool 创建获取表结构工具
func NewGetTableSchemaTool() *GetTableSchemaTool {
	return &GetTableSchemaTool{}
}

// GetInfo 获取工具信息
func (t *GetTableSchemaTool) GetInfo() protocol.MCPTool {
	return protocol.MCPTool{
		Name:        "get_table_schema",
		Description: "获取指定表的结构信息",
		InputSchema: protocol.MCPToolInputSchema{
			Type: "object",
			Properties: map[string]protocol.MCPToolProperty{
				"space_id": {
					Type:        "string",
					Description: "空间ID",
				},
				"table_id": {
					Type:        "string",
					Description: "表ID",
				},
				"include_fields": {
					Type:        "boolean",
					Description: "是否包含字段信息（默认true）",
				},
				"include_metadata": {
					Type:        "boolean",
					Description: "是否包含元数据信息（默认true）",
				},
			},
			Required: []string{"space_id", "table_id"},
		},
	}
}

// ValidateArguments 验证参数
func (t *GetTableSchemaTool) ValidateArguments(arguments map[string]interface{}) error {
	// 验证必需参数
	if _, err := validateRequiredString(arguments, "space_id"); err != nil {
		return err
	}
	if _, err := validateRequiredString(arguments, "table_id"); err != nil {
		return err
	}

	// 验证可选参数
	if _, err := validateOptionalBool(arguments, "include_fields"); err != nil {
		return err
	}
	if _, err := validateOptionalBool(arguments, "include_metadata"); err != nil {
		return err
	}

	return nil
}

// Execute 执行工具
func (t *GetTableSchemaTool) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.MCPToolResult, error) {
	spaceID, _ := validateRequiredString(arguments, "space_id")
	tableID, _ := validateRequiredString(arguments, "table_id")
	includeFields, _ := validateOptionalBool(arguments, "include_fields")
	includeMetadata, _ := validateOptionalBool(arguments, "include_metadata")

	// 设置默认值
	if includeFields == false && arguments["include_fields"] == nil {
		includeFields = true
	}
	if includeMetadata == false && arguments["include_metadata"] == nil {
		includeMetadata = true
	}

	// TODO: 实现实际的表结构查询逻辑
	// 这里需要集成 LuckDB 的表仓储和字段仓储

	// 模拟表结构结果
	schema := map[string]interface{}{
		"table_id":         tableID,
		"space_id":         spaceID,
		"name":             "示例表",
		"description":      "这是一个示例表",
		"icon":             "📊",
		"created_at":       "2024-12-19T10:00:00Z",
		"updated_at":       "2024-12-19T10:00:00Z",
		"version":          1,
		"include_fields":   includeFields,
		"include_metadata": includeMetadata,
	}

	if includeFields {
		schema["fields"] = []map[string]interface{}{
			{
				"id":          "field_1",
				"name":        "ID",
				"type":        "number",
				"description": "主键字段",
				"is_primary":  true,
				"is_required": true,
				"order":       1.0,
			},
			{
				"id":          "field_2",
				"name":        "名称",
				"type":        "text",
				"description": "名称字段",
				"is_primary":  false,
				"is_required": true,
				"order":       2.0,
			},
		}
	}

	if includeMetadata {
		schema["metadata"] = map[string]interface{}{
			"record_count":  0,
			"field_count":   2,
			"last_modified": "2024-12-19T10:00:00Z",
			"permissions":   []string{"read", "write"},
		}
	}

	result := map[string]interface{}{
		"schema":  schema,
		"message": "表结构查询功能待实现，需要集成 LuckDB 表仓储和字段仓储",
	}

	return &protocol.MCPToolResult{
		Content: []protocol.MCPToolResultContent{
			{
				Type: "text",
				Text: fmt.Sprintf("获取表 %s 的结构信息（空间: %s）\n包含字段: %t, 包含元数据: %t\n\n注意：此功能需要集成 LuckDB 表仓储和字段仓储才能正常工作",
					tableID, spaceID, includeFields, includeMetadata),
			},
		},
		IsError:  false,
		Metadata: result,
	}, nil
}

// ListTablesTool 列出表工具
type ListTablesTool struct {
	// 这里将来会注入表仓储
	// tableRepo tableRepo.TableRepository
}

// NewListTablesTool 创建列出表工具
func NewListTablesTool() *ListTablesTool {
	return &ListTablesTool{}
}

// GetInfo 获取工具信息
func (t *ListTablesTool) GetInfo() protocol.MCPTool {
	return protocol.MCPTool{
		Name:        "list_tables",
		Description: "列出指定空间中的所有表",
		InputSchema: protocol.MCPToolInputSchema{
			Type: "object",
			Properties: map[string]protocol.MCPToolProperty{
				"space_id": {
					Type:        "string",
					Description: "空间ID",
				},
				"limit": {
					Type:        "integer",
					Description: "返回表数量限制（默认100，最大1000）",
					Minimum:     func() *float64 { v := 1.0; return &v }(),
					Maximum:     func() *float64 { v := 1000.0; return &v }(),
				},
				"offset": {
					Type:        "integer",
					Description: "偏移量（默认0）",
					Minimum:     func() *float64 { v := 0.0; return &v }(),
				},
				"include_metadata": {
					Type:        "boolean",
					Description: "是否包含元数据信息（默认false）",
				},
				"order_by": {
					Type:        "string",
					Description: "排序字段：name, created_at, updated_at（默认name）",
					Enum:        []string{"name", "created_at", "updated_at"},
				},
				"order_direction": {
					Type:        "string",
					Description: "排序方向：asc 或 desc（默认asc）",
					Enum:        []string{"asc", "desc"},
				},
			},
			Required: []string{"space_id"},
		},
	}
}

// ValidateArguments 验证参数
func (t *ListTablesTool) ValidateArguments(arguments map[string]interface{}) error {
	// 验证必需参数
	if _, err := validateRequiredString(arguments, "space_id"); err != nil {
		return err
	}

	// 验证可选参数
	if _, err := validateOptionalInt(arguments, "limit"); err != nil {
		return err
	}
	if _, err := validateOptionalInt(arguments, "offset"); err != nil {
		return err
	}
	if _, err := validateOptionalBool(arguments, "include_metadata"); err != nil {
		return err
	}
	if _, err := validateOptionalString(arguments, "order_by"); err != nil {
		return err
	}
	if _, err := validateOptionalString(arguments, "order_direction"); err != nil {
		return err
	}

	// 验证排序字段
	if orderBy, exists := arguments["order_by"]; exists {
		validOrderBy := []string{"name", "created_at", "updated_at"}
		isValid := false
		for _, valid := range validOrderBy {
			if orderBy == valid {
				isValid = true
				break
			}
		}
		if !isValid {
			return fmt.Errorf("order_by must be one of: %v", validOrderBy)
		}
	}

	// 验证排序方向
	if orderDir, exists := arguments["order_direction"]; exists {
		if orderDir != "asc" && orderDir != "desc" {
			return fmt.Errorf("order_direction must be 'asc' or 'desc'")
		}
	}

	return nil
}

// Execute 执行工具
func (t *ListTablesTool) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.MCPToolResult, error) {
	spaceID, _ := validateRequiredString(arguments, "space_id")
	limit, _ := validateOptionalInt(arguments, "limit")
	offset, _ := validateOptionalInt(arguments, "offset")
	includeMetadata, _ := validateOptionalBool(arguments, "include_metadata")
	orderBy, _ := validateOptionalString(arguments, "order_by")
	orderDirection, _ := validateOptionalString(arguments, "order_direction")

	// 设置默认值
	if limit == 0 {
		limit = 100
	}
	if orderBy == "" {
		orderBy = "name"
	}
	if orderDirection == "" {
		orderDirection = "asc"
	}

	// TODO: 实现实际的表列表查询逻辑
	// 这里需要集成 LuckDB 的表仓储

	// 模拟表列表结果
	tables := []map[string]interface{}{
		{
			"id":          "table_1",
			"name":        "用户表",
			"description": "用户信息表",
			"icon":        "👤",
			"created_at":  "2024-12-19T10:00:00Z",
			"updated_at":  "2024-12-19T10:00:00Z",
		},
		{
			"id":          "table_2",
			"name":        "产品表",
			"description": "产品信息表",
			"icon":        "📦",
			"created_at":  "2024-12-19T10:00:00Z",
			"updated_at":  "2024-12-19T10:00:00Z",
		},
	}

	if includeMetadata {
		for i, table := range tables {
			table["metadata"] = map[string]interface{}{
				"field_count":  2,
				"record_count": 0,
				"permissions":  []string{"read", "write"},
			}
			tables[i] = table
		}
	}

	result := map[string]interface{}{
		"space_id":         spaceID,
		"tables":           tables,
		"total_count":      len(tables),
		"returned_count":   len(tables),
		"limit":            limit,
		"offset":           offset,
		"order_by":         orderBy,
		"order_direction":  orderDirection,
		"include_metadata": includeMetadata,
		"message":          "表列表查询功能待实现，需要集成 LuckDB 表仓储",
	}

	return &protocol.MCPToolResult{
		Content: []protocol.MCPToolResultContent{
			{
				Type: "text",
				Text: fmt.Sprintf("列出空间 %s 中的表\n参数: limit=%d, offset=%d, order_by=%s, order_direction=%s, include_metadata=%t\n找到 %d 个表\n\n注意：此功能需要集成 LuckDB 表仓储才能正常工作",
					spaceID, limit, offset, orderBy, orderDirection, includeMetadata, len(tables)),
			},
		},
		IsError:  false,
		Metadata: result,
	}, nil
}
