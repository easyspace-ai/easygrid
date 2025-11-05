package http

import (
    "bytes"
    "encoding/json"
    "io"
    "strings"
    "time"

    "github.com/gin-gonic/gin"

    "github.com/easyspace-ai/luckdb/server/internal/container"
)

type cachedResponse struct {
    Status int               `json:"status"`
    Header map[string]string `json:"header"`
    Body   json.RawMessage   `json:"body"`
}

// mcpIdempotencyMiddleware 基于 X-Idempotency-Key 的写操作幂等缓存
func mcpIdempotencyMiddleware(cont *container.Container) gin.HandlerFunc {
    return func(c *gin.Context) {
        key := c.GetHeader("X-Idempotency-Key")
        if key == "" || cont.CacheClient() == nil {
            c.Next()
            return
        }

        tool := c.Param("tool")
        isWrite := strings.Contains(tool, ".create") || strings.Contains(tool, ".update") || strings.Contains(tool, ".delete")
        if !isWrite {
            c.Next()
            return
        }

        cacheKey := "idem:" + key

        // 命中直接返回
        var cached cachedResponse
        if err := cont.CacheClient().Get(c.Request.Context(), cacheKey, &cached); err == nil && cached.Body != nil {
            for k, v := range cached.Header {
                c.Header(k, v)
            }
            c.Data(cached.Status, "application/json", cached.Body)
            c.Abort()
            return
        }

        // 包装响应写入器
        rw := &bodyCaptureResponseWriter{ResponseWriter: c.Writer, buf: bytes.NewBuffer(nil)}
        c.Writer = rw

        c.Next()

        // 仅缓存 2xx
        if rw.status >= 200 && rw.status < 300 {
            resp := cachedResponse{Status: rw.status, Header: map[string]string{"Content-Type": "application/json"}, Body: rw.buf.Bytes()}
            _ = cont.CacheClient().Set(c.Request.Context(), cacheKey, resp, 10*time.Minute)
        }
    }
}

type bodyCaptureResponseWriter struct {
    gin.ResponseWriter
    buf    *bytes.Buffer
    status int
}

func (w *bodyCaptureResponseWriter) WriteHeader(code int) {
    w.status = code
    w.ResponseWriter.WriteHeader(code)
}

func (w *bodyCaptureResponseWriter) Write(b []byte) (int, error) {
    if w.buf != nil {
        w.buf.Write(b)
    }
    return w.ResponseWriter.Write(b)
}

func (w *bodyCaptureResponseWriter) WriteString(s string) (int, error) {
    if w.buf != nil {
        io.WriteString(w.buf, s)
    }
    return w.ResponseWriter.WriteString(s)
}


