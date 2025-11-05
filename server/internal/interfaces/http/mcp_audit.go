package http

import (
    "time"

    "github.com/gin-gonic/gin"
    "github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// mcpAuditMiddleware 结构化审计（日志版，后续可落库）
func mcpAuditMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        tool := c.Param("tool")
        apiKeyID, _ := c.Get("api_key_id")

        c.Next()

        duration := time.Since(start)
        logger.Info("mcp_http_call",
            logger.String("tool", tool),
            logger.Int("status", c.Writer.Status()),
            logger.String("api_key_id", toString(apiKeyID)),
            logger.String("path", c.FullPath()),
            logger.String("method", c.Request.Method),
            logger.Int("bytes", c.Writer.Size()),
            logger.String("duration_ms", duration.String()),
        )
    }
}

func toString(v interface{}) string {
    if v == nil { return "" }
    if s, ok := v.(string); ok { return s }
    return ""
}


