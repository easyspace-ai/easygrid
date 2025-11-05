package http

import (
    "github.com/gin-gonic/gin"
    mcpauth "github.com/easyspace-ai/luckdb/server/internal/mcp/auth"
)

// injectBaseAllowlist 从认证上下文的 Metadata 注入 base 白名单
func injectBaseAllowlist() gin.HandlerFunc {
    return func(c *gin.Context) {
        if authCtx, ok := mcpauth.GetAuthContext(c); ok && authCtx != nil {
            if authCtx.Metadata != nil {
                if v, exists := authCtx.Metadata["base_allowlist"]; exists {
                    c.Set("base_allowlist", v)
                }
            }
        }
        c.Next()
    }
}


