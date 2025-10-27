package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/mcp/prompts"
	"github.com/easyspace-ai/luckdb/server/internal/mcp/protocol"
	"github.com/easyspace-ai/luckdb/server/internal/mcp/resources"
	"github.com/easyspace-ai/luckdb/server/internal/mcp/tools"
	"github.com/gin-gonic/gin"
)

// MCPServer MCP 服务器
type MCPServer struct {
	router          *protocol.Router
	handler         protocol.Handler
	config          *Config
	logger          *log.Logger
	httpServer      *http.Server
	toolService     tools.ToolService
	resourceService resources.ResourceService
	promptService   prompts.PromptService
}

// Config MCP 服务器配置
type Config struct {
	Host         string        `json:"host"`
	Port         int           `json:"port"`
	ReadTimeout  time.Duration `json:"read_timeout"`
	WriteTimeout time.Duration `json:"write_timeout"`
	IdleTimeout  time.Duration `json:"idle_timeout"`
	EnableCORS   bool          `json:"enable_cors"`
	EnableDebug  bool          `json:"enable_debug"`
}

// DefaultConfig 默认配置
func DefaultConfig() *Config {
	return &Config{
		Host:         "0.0.0.0",
		Port:         8081,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
		EnableCORS:   true,
		EnableDebug:  false,
	}
}

// NewMCPServer 创建新的 MCP 服务器
func NewMCPServer(config *Config, logger *log.Logger) *MCPServer {
	if config == nil {
		config = DefaultConfig()
	}

	if logger == nil {
		logger = log.New(log.Writer(), "[MCP] ", log.LstdFlags|log.Lshortfile)
	}

	router := protocol.NewRouter()

	// 创建中间件处理器
	middlewareHandler := protocol.NewMiddlewareHandler(router,
		protocol.ContextMiddleware(),
		protocol.LoggingMiddleware(logger),
		protocol.ValidationMiddleware(protocol.NewRequestValidator()),
	)

	// 包装错误处理器
	handler := protocol.NewErrorHandler(middlewareHandler)

	// 初始化服务
	toolService := tools.NewBaseToolService()
	resourceService := resources.NewBaseResourceService()
	promptService := prompts.NewBasePromptService()

	server := &MCPServer{
		router:          router,
		handler:         handler,
		config:          config,
		logger:          logger,
		toolService:     toolService,
		resourceService: resourceService,
		promptService:   promptService,
	}

	// 注册路由
	server.RegisterHandlers()

	return server
}

// wrapHandler 包装处理器以适配不同的方法签名
func (s *MCPServer) wrapHandler(handler func(ctx context.Context, req *protocol.MCPRequest) (*protocol.MCPResponse, error)) protocol.MethodHandler {
	return func(ctx context.Context, params interface{}) (interface{}, error) {
		// 创建一个模拟的 MCPRequest
		req := &protocol.MCPRequest{
			JSONRPC: "2.0",
			Method:  "", // 这个方法名会在路由时设置
			Params:  params,
		}

		resp, err := handler(ctx, req)
		if err != nil {
			return nil, err
		}

		return resp.Result, nil
	}
}

// RegisterHandlers 注册处理器
func (s *MCPServer) RegisterHandlers() {
	// 初始化处理器
	s.router.Register("initialize", s.handleInitialize)

	// 工具处理器
	s.router.Register("tools/list", s.wrapHandler(s.handleToolsList))
	s.router.Register("tools/call", s.wrapHandler(s.handleToolsCall))

	// 资源处理器
	s.router.Register("resources/list", s.wrapHandler(s.handleResourcesList))
	s.router.Register("resources/read", s.wrapHandler(s.handleResourcesRead))

	// 提示处理器
	s.router.Register("prompts/list", s.wrapHandler(s.handlePromptsList))
	s.router.Register("prompts/get", s.wrapHandler(s.handlePromptsGet))
}

// Start 启动服务器
func (s *MCPServer) Start() error {
	// 设置 Gin 模式
	if s.config.EnableDebug {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建 Gin 引擎
	engine := gin.New()
	engine.Use(gin.Logger(), gin.Recovery())

	// 配置 CORS
	if s.config.EnableCORS {
		engine.Use(func(c *gin.Context) {
			c.Header("Access-Control-Allow-Origin", "*")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
			c.Next()
		})
	}

	// 注册路由
	s.registerHTTPRoutes(engine)

	// 创建 HTTP 服务器
	s.httpServer = &http.Server{
		Addr:         fmt.Sprintf("%s:%d", s.config.Host, s.config.Port),
		Handler:      engine,
		ReadTimeout:  s.config.ReadTimeout,
		WriteTimeout: s.config.WriteTimeout,
		IdleTimeout:  s.config.IdleTimeout,
	}

	s.logger.Printf("Starting MCP server on %s", s.httpServer.Addr)

	// 启动服务器
	return s.httpServer.ListenAndServe()
}

// Stop 停止服务器
func (s *MCPServer) Stop(ctx context.Context) error {
	if s.httpServer != nil {
		return s.httpServer.Shutdown(ctx)
	}
	return nil
}

// registerHTTPRoutes 注册 HTTP 路由
func (s *MCPServer) registerHTTPRoutes(engine *gin.Engine) {
	// 健康检查
	engine.GET("/health", s.healthCheck)
	engine.GET("/ready", s.readinessCheck)

	// 服务器信息
	engine.GET("/capabilities", s.getCapabilities)
	engine.GET("/methods", s.getMethods)
	engine.GET("/status", s.getStatus)

	// MCP 协议端点
	engine.POST("/mcp", s.handleMCPRequest)
}

// handleMCPRequest 处理 MCP 请求
func (s *MCPServer) handleMCPRequest(c *gin.Context) {
	var req protocol.MCPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		s.logger.Printf("Failed to parse MCP request: %v", err)
		c.JSON(http.StatusBadRequest, protocol.NewMCPErrorResponse(nil, protocol.ErrorCodeParseError, "Invalid JSON", nil))
		return
	}

	// 处理请求
	ctx := c.Request.Context()
	resp, err := s.handler.Handle(ctx, &req)
	if err != nil {
		s.logger.Printf("Failed to handle MCP request: %v", err)
		c.JSON(http.StatusInternalServerError, protocol.NewMCPErrorResponse(req.ID, protocol.ErrorCodeInternalError, "Internal server error", nil))
		return
	}

	// 返回响应
	c.JSON(http.StatusOK, resp)
}

// healthCheck 健康检查
func (s *MCPServer) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"service":   "mcp-server",
	})
}

// readinessCheck 就绪检查
func (s *MCPServer) readinessCheck(c *gin.Context) {
	// 这里可以添加更多的就绪检查逻辑
	// 比如检查数据库连接、Redis 连接等

	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"timestamp": time.Now().Unix(),
		"service":   "mcp-server",
	})
}

// getCapabilities 获取服务器能力
func (s *MCPServer) getCapabilities(c *gin.Context) {
	capabilities := protocol.ServerCapabilities{
		Tools: &protocol.ToolsCapability{
			ListChanged: true,
		},
		Resources: &protocol.ResourcesCapability{
			ListChanged: true,
		},
		Prompts: &protocol.PromptsCapability{
			ListChanged: true,
		},
		Logging: &protocol.LoggingCapability{},
	}

	c.JSON(http.StatusOK, capabilities)
}

// getMethods 获取注册的方法
func (s *MCPServer) getMethods(c *gin.Context) {
	methods := []string{
		"initialize",
		"tools/list",
		"tools/call",
		"resources/list",
		"resources/read",
		"prompts/list",
		"prompts/get",
	}

	c.JSON(http.StatusOK, gin.H{
		"methods": methods,
		"count":   len(methods),
	})
}

// getStatus 获取服务器状态
func (s *MCPServer) getStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "running",
		"version": protocol.MCPVersion,
		"uptime":  time.Since(time.Now()).String(), // 这里应该记录实际的启动时间
		"config":  s.config,
		"methods": len(s.router.GetHandlers()),
	})
}

// ==================== 处理器方法 ====================

// handleInitialize 处理初始化请求
func (s *MCPServer) handleInitialize(ctx context.Context, params interface{}) (interface{}, error) {
	capabilities := protocol.ServerCapabilities{
		Tools: &protocol.ToolsCapability{
			ListChanged: true,
		},
		Resources: &protocol.ResourcesCapability{
			ListChanged: true,
		},
		Prompts: &protocol.PromptsCapability{
			ListChanged: true,
		},
		Logging: &protocol.LoggingCapability{},
	}

	serverInfo := protocol.ServerInfo{
		Name:    "LuckDB MCP Server",
		Version: "1.0.0",
	}

	response := &protocol.InitializeResponse{
		ProtocolVersion: protocol.MCPVersion,
		Capabilities:    capabilities,
		ServerInfo:      serverInfo,
	}

	return response, nil
}

// handleToolsList 处理工具列表请求
func (s *MCPServer) handleToolsList(ctx context.Context, req *protocol.MCPRequest) (*protocol.MCPResponse, error) {
	tools, err := s.toolService.GetTools(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get tools: %w", err)
	}

	response := &protocol.ToolsListResponse{
		Tools: tools,
	}

	return &protocol.MCPResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  response,
	}, nil
}

// handleToolsCall 处理工具调用请求
func (s *MCPServer) handleToolsCall(ctx context.Context, req *protocol.MCPRequest) (*protocol.MCPResponse, error) {
	var params protocol.ToolCallRequest
	paramsBytes, ok := req.Params.([]byte)
	if !ok {
		// 如果不是 []byte，尝试直接转换
		if paramsMap, ok := req.Params.(map[string]interface{}); ok {
			params.Name = paramsMap["name"].(string)
			if args, exists := paramsMap["arguments"]; exists {
				params.Arguments = args.(map[string]interface{})
			}
		} else {
			return nil, fmt.Errorf("invalid tool call parameters format")
		}
	} else {
		if err := json.Unmarshal(paramsBytes, &params); err != nil {
			return nil, fmt.Errorf("invalid tool call parameters: %w", err)
		}
	}

	result, err := s.toolService.CallTool(ctx, params.Name, params.Arguments)
	if err != nil {
		return nil, fmt.Errorf("failed to call tool: %w", err)
	}

	// 转换内容类型
	content := make([]protocol.ToolCallContent, len(result.Content))
	for i, c := range result.Content {
		content[i] = protocol.ToolCallContent{
			Type:     c.Type,
			Text:     c.Text,
			Data:     c.Data,
			MimeType: c.MimeType,
		}
	}

	response := &protocol.ToolCallResponse{
		Content: content,
		IsError: result.IsError,
	}

	return &protocol.MCPResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  response,
	}, nil
}

// handleResourcesList 处理资源列表请求
func (s *MCPServer) handleResourcesList(ctx context.Context, req *protocol.MCPRequest) (*protocol.MCPResponse, error) {
	resources, err := s.resourceService.GetResources(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get resources: %w", err)
	}

	response := &protocol.ResourcesListResponse{
		Resources: resources,
	}

	return &protocol.MCPResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  response,
	}, nil
}

// handleResourcesRead 处理资源读取请求
func (s *MCPServer) handleResourcesRead(ctx context.Context, req *protocol.MCPRequest) (*protocol.MCPResponse, error) {
	var params protocol.ResourceReadRequest
	paramsBytes, ok := req.Params.([]byte)
	if !ok {
		// 如果不是 []byte，尝试直接转换
		if paramsMap, ok := req.Params.(map[string]interface{}); ok {
			params.URI = paramsMap["uri"].(string)
		} else {
			return nil, fmt.Errorf("invalid resource read parameters format")
		}
	} else {
		if err := json.Unmarshal(paramsBytes, &params); err != nil {
			return nil, fmt.Errorf("invalid resource read parameters: %w", err)
		}
	}

	content, err := s.resourceService.ReadResource(ctx, params.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to read resource: %w", err)
	}

	// 转换内容类型
	contents := []protocol.ResourceContent{
		{
			URI:      content.URI,
			MimeType: content.MimeType,
			Text:     content.Text,
			Blob:     string(content.Blob),
		},
	}

	response := &protocol.ResourceReadResponse{
		Contents: contents,
	}

	return &protocol.MCPResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  response,
	}, nil
}

// handlePromptsList 处理提示列表请求
func (s *MCPServer) handlePromptsList(ctx context.Context, req *protocol.MCPRequest) (*protocol.MCPResponse, error) {
	prompts, err := s.promptService.GetPrompts(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get prompts: %w", err)
	}

	response := &protocol.PromptsListResponse{
		Prompts: prompts,
	}

	return &protocol.MCPResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  response,
	}, nil
}

// handlePromptsGet 处理提示获取请求
func (s *MCPServer) handlePromptsGet(ctx context.Context, req *protocol.MCPRequest) (*protocol.MCPResponse, error) {
	var params protocol.PromptGetRequest
	paramsBytes, ok := req.Params.([]byte)
	if !ok {
		// 如果不是 []byte，尝试直接转换
		if paramsMap, ok := req.Params.(map[string]interface{}); ok {
			params.Name = paramsMap["name"].(string)
			if args, exists := paramsMap["arguments"]; exists {
				params.Arguments = args.(map[string]interface{})
			}
		} else {
			return nil, fmt.Errorf("invalid prompt get parameters format")
		}
	} else {
		if err := json.Unmarshal(paramsBytes, &params); err != nil {
			return nil, fmt.Errorf("invalid prompt get parameters: %w", err)
		}
	}

	result, err := s.promptService.GetPrompt(ctx, params.Name, params.Arguments)
	if err != nil {
		return nil, fmt.Errorf("failed to get prompt: %w", err)
	}

	// 转换消息类型
	messages := make([]protocol.PromptMessage, len(result.Messages))
	for i, m := range result.Messages {
		messages[i] = protocol.PromptMessage{
			Role: m.Role,
			Content: protocol.PromptMessageContent{
				Type:     m.Content.Type,
				Text:     m.Content.Text,
				Data:     m.Content.Data,
				MimeType: m.Content.MimeType,
			},
			Metadata: m.Metadata,
		}
	}

	response := &protocol.PromptGetResponse{
		Description: result.Description,
		Messages:    messages,
	}

	return &protocol.MCPResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  response,
	}, nil
}
