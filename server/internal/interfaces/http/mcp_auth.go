package http

import (
    "github.com/gin-gonic/gin"

    appcfg "github.com/easyspace-ai/luckdb/server/internal/config"
    "github.com/easyspace-ai/luckdb/server/internal/container"
    mcpauth "github.com/easyspace-ai/luckdb/server/internal/mcp/auth"
    mcpRepo "github.com/easyspace-ai/luckdb/server/internal/mcp/auth/repository"
)

// buildMCPAPIKeyMiddleware 基于配置与容器构建 API Key 中间件
func buildMCPAPIKeyMiddleware(cont *container.Container, cfg *appcfg.MCPConfig) gin.HandlerFunc {
    repo := mcpRepo.NewAPIKeyRepository(cont.DB())
    svc := mcpauth.NewAPIKeyService(repo, &mcpauth.APIKeyConfig{
        Enabled:      cfg.Auth.APIKey.Enabled,
        KeyLength:    cfg.Auth.APIKey.KeyLength,
        SecretLength: cfg.Auth.APIKey.SecretLength,
        DefaultTTL:   cfg.Auth.APIKey.DefaultTTL,
        MaxTTL:       cfg.Auth.APIKey.MaxTTL,
        Header:       cfg.Auth.APIKey.Header,
        Format:       cfg.Auth.APIKey.Format,
    })
    return mcpauth.APIKeyAuthMiddleware(svc, &mcpauth.APIKeyConfig{
        Enabled:      cfg.Auth.APIKey.Enabled,
        KeyLength:    cfg.Auth.APIKey.KeyLength,
        SecretLength: cfg.Auth.APIKey.SecretLength,
        DefaultTTL:   cfg.Auth.APIKey.DefaultTTL,
        MaxTTL:       cfg.Auth.APIKey.MaxTTL,
        Header:       cfg.Auth.APIKey.Header,
        Format:       cfg.Auth.APIKey.Format,
    })
}


