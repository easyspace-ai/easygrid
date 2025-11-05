package v2

import (
	"context"
	"net/http"

	"github.com/mark3labs/mcp-go/server"

	"github.com/easyspace-ai/luckdb/server/internal/container"
)

// MCPServerV2 MCP 服务器 V2（使用标准库）
type MCPServerV2 struct {
	server *server.MCPServer
	cont   *container.Container
}

// NewMCPServerV2 创建新的 MCP 服务器 V2
func NewMCPServerV2(cont *container.Container) *MCPServerV2 {
	// 创建标准 MCP 服务器
	s := server.NewMCPServer(
		"LuckDB MCP Server",
		"1.0.0",
		server.WithToolCapabilities(true),
		server.WithResourceCapabilities(false, false),
		server.WithPromptCapabilities(false),
	)

	return &MCPServerV2{
		server: s,
		cont:   cont,
	}
}

// GetServer 获取 MCP 服务器实例
func (m *MCPServerV2) GetServer() *server.MCPServer {
	return m.server
}

// RegisterTools 注册所有工具
func (m *MCPServerV2) RegisterTools() error {
	// 注册 Base 工具
	if err := m.registerBaseTools(); err != nil {
		return err
	}

	// 注册 Table 工具
	if err := m.registerTableTools(); err != nil {
		return err
	}

	// 注册 Field 工具
	if err := m.registerFieldTools(); err != nil {
		return err
	}

	// 注册 Record 工具
	if err := m.registerRecordTools(); err != nil {
		return err
	}

	return nil
}

// CreateHTTPContextFunc 创建 HTTP 上下文函数，用于注入认证信息
func (m *MCPServerV2) CreateHTTPContextFunc() func(ctx context.Context, r *http.Request) context.Context {
	return func(ctx context.Context, r *http.Request) context.Context {
		// 从请求头获取用户ID（由认证中间件注入）
		userID := r.Header.Get("X-User-ID")
		if userID != "" {
			ctx = context.WithValue(ctx, "user_id", userID)
		}

		// 从请求头获取 API Key ID
		apiKeyID := r.Header.Get("X-API-Key-ID")
		if apiKeyID != "" {
			ctx = context.WithValue(ctx, "api_key_id", apiKeyID)
		}

		// 从请求头获取权限范围（逗号分隔）
		scopes := r.Header.Get("X-Scopes")
		if scopes != "" {
			ctx = context.WithValue(ctx, "scopes", scopes)
		}

		return ctx
	}
}

