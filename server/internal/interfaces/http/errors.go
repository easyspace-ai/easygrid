package http

import (
	"github.com/easyspace-ai/luckdb/server/pkg/response"

	"github.com/gin-gonic/gin"
)

// handleError 统一错误处理
// 已废弃：请直接使用 response.Error(c, err)
// Deprecated: Use response.Error(c, err) instead
func handleError(c *gin.Context, err error) {
	response.Error(c, err)
}
