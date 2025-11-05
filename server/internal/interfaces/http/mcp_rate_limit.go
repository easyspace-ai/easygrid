package http

import (
    "fmt"
    "net/http"
    "strings"
    "time"

    "github.com/gin-gonic/gin"

    "github.com/easyspace-ai/luckdb/server/internal/container"
)

// mcpRateLimitMiddleware 简单的基于 Redis 的按 API Key + 工具名限流（分钟级滑动窗口）
func mcpRateLimitMiddleware(cont *container.Container) gin.HandlerFunc {
    return func(c *gin.Context) {
        if cont.CacheClient() == nil {
            c.Next()
            return
        }

        apiKeyIDAny, ok := c.Get("api_key_id")
        if !ok {
            c.Next()
            return
        }
        apiKeyID, _ := apiKeyIDAny.(string)
        tool := c.Param("tool")
        if tool == "" {
            // 非工具调用不做限流
            c.Next()
            return
        }

        // 简单区分读/写
        isWrite := strings.Contains(tool, ".create") || strings.Contains(tool, ".update") || strings.Contains(tool, ".delete")
        limit := 60 // rpm for read
        if isWrite {
            limit = 30 // rpm for write
        }

        window := time.Minute
        now := time.Now().Unix()
        bucket := now / int64(window.Seconds())
        key := fmt.Sprintf("rate:%s:%s:%d", apiKeyID, tool, bucket)

        // INCR 并设置过期
        count, err := cont.CacheClient().GetClient().Incr(c.Request.Context(), key).Result()
        if err == nil && count == 1 {
            _ = cont.CacheClient().GetClient().Expire(c.Request.Context(), key, window).Err()
        }
        if err != nil {
            // Redis 异常时放行
            c.Next()
            return
        }

        if int(count) > limit {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "code":    http.StatusTooManyRequests,
                "message": "rate limit exceeded",
            })
            c.Abort()
            return
        }

        c.Next()
    }
}


