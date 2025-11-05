package http

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mark3labs/mcp-go/server"

	"github.com/easyspace-ai/luckdb/server/internal/container"
	mcpv2 "github.com/easyspace-ai/luckdb/server/internal/mcp/v2"
)

// MCPHandler MCP 处理器
type MCPHandler struct {
	mcpServer *mcpv2.MCPServerV2
	httpServer *server.StreamableHTTPServer
	cont      *container.Container
}

// NewMCPHandler 创建新的 MCP 处理器
func NewMCPHandler(cont *container.Container) (*MCPHandler, error) {
	// 创建 MCP 服务器 V2
	mcpServer := mcpv2.NewMCPServerV2(cont)

	// 注册所有工具
	if err := mcpServer.RegisterTools(); err != nil {
		return nil, err
	}

	// 创建认证适配器
	mcpConfig := cont.Config().MCP
	authAdapter := mcpv2.NewAuthAdapter(cont, &mcpConfig)

	// 创建 HTTP 服务器（Streamable HTTP）
	httpServer := server.NewStreamableHTTPServer(
		mcpServer.GetServer(),
		server.WithEndpointPath("/api/mcp/v1"),
		server.WithHTTPContextFunc(authAdapter.HTTPContextFunc()),
		server.WithHeartbeatInterval(30*time.Second),
		server.WithStateLess(false),
	)

	return &MCPHandler{
		mcpServer:  mcpServer,
		httpServer: httpServer,
		cont:       cont,
	}, nil
}

// SetupRoutes 设置 MCP 路由
func (h *MCPHandler) SetupRoutes(router *gin.Engine) {
	// 先注册不需要认证的路径（在路由组之外）
	router.GET("/api/mcp/v1/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	router.GET("/api/mcp/v1/meta", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"mcpVersion": "2024-11-05",
			"serverName": "luckdb-mcp",
			"features":   []string{"tools"},
		})
	})

	// 创建需要认证的路由组
	group := router.Group("/api/mcp/v1")

	// 应用认证中间件
	mcpConfig := h.cont.Config().MCP
	authAdapter := mcpv2.NewAuthAdapter(h.cont, &mcpConfig)
	group.Use(authAdapter.GinMiddleware())

	// 应用其他中间件（限流、幂等性、审计）
	if h.cont.Config() != nil {
		mcpConfig := h.cont.Config().MCP
		group.Use(buildMCPAPIKeyMiddleware(h.cont, &mcpConfig))
		group.Use(injectBaseAllowlist())
		group.Use(mcpRateLimitMiddleware(h.cont))
		group.Use(mcpIdempotencyMiddleware(h.cont))
		group.Use(mcpAuditMiddleware())
	}

	// 将 MCP HTTP 服务器集成到 Gin 路由
	// 使用中间件处理器来捕获所有请求
	mcpHandler := gin.WrapH(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.httpServer.ServeHTTP(w, r)
	}))

	// 只在路由组中注册根路径，不注册通配符路径，避免路由冲突
	// MCP HTTP 服务器会处理所有子路径，因为它内部会处理路径匹配
	group.Any("", mcpHandler)
	
	// 使用 NoRoute 在 engine 层面处理未匹配的 MCP 路径
	// 这样可以捕获所有 /api/mcp/v1/* 路径，但不会与已注册的 /health 和 /meta 冲突
	router.NoRoute(func(c *gin.Context) {
		// 只处理 /api/mcp/v1 路径下的请求，排除已注册的 /health 和 /meta
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/mcp/v1") && 
		   path != "/api/mcp/v1/health" && 
		   path != "/api/mcp/v1/meta" {
			// 应用认证中间件
			mcpConfig := h.cont.Config().MCP
			authAdapter := mcpv2.NewAuthAdapter(h.cont, &mcpConfig)
			authAdapter.GinMiddleware()(c)
			
			if !c.IsAborted() {
				// 应用其他中间件
				if h.cont.Config() != nil {
					mcpConfig := h.cont.Config().MCP
					buildMCPAPIKeyMiddleware(h.cont, &mcpConfig)(c)
					injectBaseAllowlist()(c)
					mcpRateLimitMiddleware(h.cont)(c)
					mcpIdempotencyMiddleware(h.cont)(c)
					mcpAuditMiddleware()(c)
				}
				
				if !c.IsAborted() {
					h.httpServer.ServeHTTP(c.Writer, c.Request)
				}
			}
			return
		}
	})
}

// GetHTTPServer 获取 HTTP 服务器实例（用于直接启动）
func (h *MCPHandler) GetHTTPServer() *server.StreamableHTTPServer {
	return h.httpServer
}

