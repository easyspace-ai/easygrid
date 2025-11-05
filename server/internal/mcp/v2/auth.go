package v2

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/easyspace-ai/luckdb/server/internal/container"
	appcfg "github.com/easyspace-ai/luckdb/server/internal/config"
	mcpauth "github.com/easyspace-ai/luckdb/server/internal/mcp/auth"
	mcpRepo "github.com/easyspace-ai/luckdb/server/internal/mcp/auth/repository"
	"github.com/easyspace-ai/luckdb/server/pkg/authctx"
)

// AuthAdapter 认证适配器
type AuthAdapter struct {
	apiKeyService *mcpauth.APIKeyService
	config        *appcfg.MCPConfig
}

// NewAuthAdapter 创建新的认证适配器
func NewAuthAdapter(cont *container.Container, cfg *appcfg.MCPConfig) *AuthAdapter {
	repo := mcpRepo.NewAPIKeyRepository(cont.DB())
	apiKeyService := mcpauth.NewAPIKeyService(repo, &mcpauth.APIKeyConfig{
		Enabled:      cfg.Auth.APIKey.Enabled,
		KeyLength:    cfg.Auth.APIKey.KeyLength,
		SecretLength: cfg.Auth.APIKey.SecretLength,
		DefaultTTL:   cfg.Auth.APIKey.DefaultTTL,
		MaxTTL:       cfg.Auth.APIKey.MaxTTL,
		Header:       cfg.Auth.APIKey.Header,
		Format:       cfg.Auth.APIKey.Format,
	})

	return &AuthAdapter{
		apiKeyService: apiKeyService,
		config:        cfg,
	}
}

// HTTPContextFunc 创建 HTTP 上下文函数，用于注入认证信息
func (a *AuthAdapter) HTTPContextFunc() func(ctx context.Context, r *http.Request) context.Context {
	return func(ctx context.Context, r *http.Request) context.Context {
		// 从请求头获取 API Key
		keyString := r.Header.Get(a.config.Auth.APIKey.Header)
		if keyString == "" {
			return ctx
		}

		// 验证 API Key
		apiKey, err := a.apiKeyService.ValidateAPIKey(ctx, keyString)
		if err != nil {
			return ctx
		}

		// 将用户信息注入到 context
		if apiKey.UserID != "" {
			ctx = authctx.WithUser(ctx, apiKey.UserID)
			ctx = context.WithValue(ctx, "user_id", apiKey.UserID)
		}

		// 注入 API Key ID
		if apiKey.ID != "" {
			ctx = context.WithValue(ctx, "api_key_id", apiKey.ID)
		}

		// 注入权限范围
		if len(apiKey.Scopes) > 0 {
			ctx = context.WithValue(ctx, "scopes", apiKey.Scopes)
		}

		return ctx
	}
}

// GinMiddleware 创建 Gin 认证中间件
func (a *AuthAdapter) GinMiddleware() func(c *gin.Context) {
	return func(c *gin.Context) {
		// 从请求头获取 API Key
		keyString := c.GetHeader(a.config.Auth.APIKey.Header)
		if keyString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"jsonrpc": "2.0",
				"error": gin.H{
					"code":    -32001,
					"message": "API key is required",
				},
			})
			c.Abort()
			return
		}

		// 验证 API Key
		apiKey, err := a.apiKeyService.ValidateAPIKey(c.Request.Context(), keyString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"jsonrpc": "2.0",
				"error": gin.H{
					"code":    -32001,
					"message": "Invalid API key",
				},
			})
			c.Abort()
			return
		}

		// 设置认证上下文
		c.Set("user_id", apiKey.UserID)
		c.Set("api_key_id", apiKey.ID)
		c.Set("scopes", apiKey.Scopes)

		// 将用户信息注入到 context
		ctx := authctx.WithUser(c.Request.Context(), apiKey.UserID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

