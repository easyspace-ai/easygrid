package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"gorm.io/gorm"
)

type MonitoringHandler struct {
	db      *gorm.DB
	monitor *database.QueryMonitor // ✅ 查询性能监控器
}

func NewMonitoringHandler(db *gorm.DB) *MonitoringHandler {
	return &MonitoringHandler{db: db}
}

// SetMonitor 设置查询监控器
func (h *MonitoringHandler) SetMonitor(monitor *database.QueryMonitor) {
	h.monitor = monitor
}

// GetDBStats 获取数据库连接池统计
func (h *MonitoringHandler) GetDBStats(c *gin.Context) {
	sqlDB, err := h.db.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	stats := sqlDB.Stats()

	c.JSON(http.StatusOK, gin.H{
		"max_open_connections": stats.MaxOpenConnections,
		"open_connections":     stats.OpenConnections,
		"in_use":               stats.InUse,
		"idle":                 stats.Idle,
		"wait_count":           stats.WaitCount,
		"wait_duration":        stats.WaitDuration.String(),
		"max_idle_closed":      stats.MaxIdleClosed,
		"max_idle_time_closed": stats.MaxIdleTimeClosed,
		"max_lifetime_closed":  stats.MaxLifetimeClosed,
	})
}

// GetQueryStats 获取查询性能统计
// ✅ 新增：查询性能统计接口
func (h *MonitoringHandler) GetQueryStats(c *gin.Context) {
	if h.monitor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "查询监控器未启用",
		})
		return
	}

	stats := h.monitor.GetStats()
	c.JSON(http.StatusOK, stats)
}

// GetQueryStatsReport 获取查询性能统计报告
// ✅ 新增：查询性能统计报告接口
func (h *MonitoringHandler) GetQueryStatsReport(c *gin.Context) {
	if h.monitor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "查询监控器未启用",
		})
		return
	}

	// 获取 limit 参数
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	report := h.monitor.GenerateReport(limit)
	c.JSON(http.StatusOK, report)
}

// GetSlowQueries 获取慢查询列表
// ✅ 新增：慢查询列表接口
func (h *MonitoringHandler) GetSlowQueries(c *gin.Context) {
	if h.monitor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "查询监控器未启用",
		})
		return
	}

	// 获取 limit 参数
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	slowQueries := h.monitor.GetSlowQueries(limit)
	c.JSON(http.StatusOK, gin.H{
		"count":        len(slowQueries),
		"slow_queries": slowQueries,
	})
}

// ResetQueryStats 重置查询统计
// ✅ 新增：重置查询统计接口
func (h *MonitoringHandler) ResetQueryStats(c *gin.Context) {
	if h.monitor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "查询监控器未启用",
		})
		return
	}

	h.monitor.Reset()
	c.JSON(http.StatusOK, gin.H{
		"message": "查询统计已重置",
	})
}
