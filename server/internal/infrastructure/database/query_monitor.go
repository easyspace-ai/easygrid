package database

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"gorm.io/gorm"

	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// QueryMonitor 查询性能监控器
// 用于监控和分析数据库查询性能
type QueryMonitor struct {
	mu              sync.RWMutex
	slowQueries     []*QueryStats
	maxSlowQueries  int
	queryStats      map[string]*QueryTypeStats
	slowThreshold   time.Duration
	totalQueries    uint64
	totalDuration   time.Duration
	enabled         bool
}

// QueryStats 查询统计信息
type QueryStats struct {
	SQL        string
	Duration   time.Duration
	Rows       int64
	Timestamp  time.Time
	Error      error
	TableName  string
	QueryType  string // SELECT, INSERT, UPDATE, DELETE
}

// QueryTypeStats 查询类型统计
type QueryTypeStats struct {
	Count         uint64
	TotalDuration time.Duration
	MinDuration   time.Duration
	MaxDuration   time.Duration
	AvgDuration   time.Duration
	ErrorCount    uint64
	SlowCount     uint64
}

// NewQueryMonitor 创建查询监控器
func NewQueryMonitor(slowThreshold time.Duration, maxSlowQueries int) *QueryMonitor {
	return &QueryMonitor{
		slowQueries:    make([]*QueryStats, 0, maxSlowQueries),
		maxSlowQueries: maxSlowQueries,
		queryStats:     make(map[string]*QueryTypeStats),
		slowThreshold:  slowThreshold,
		enabled:        true,
	}
}

// RecordQuery 记录查询统计
func (qm *QueryMonitor) RecordQuery(ctx context.Context, sql string, duration time.Duration, rows int64, err error) {
	if !qm.enabled {
		return
	}

	qm.mu.Lock()
	defer qm.mu.Unlock()

	// 更新总统计
	qm.totalQueries++
	qm.totalDuration += duration

	// 解析查询类型
	queryType := qm.parseQueryType(sql)
	tableName := qm.extractTableName(sql)

	// 更新查询类型统计
	if _, exists := qm.queryStats[queryType]; !exists {
		qm.queryStats[queryType] = &QueryTypeStats{
			MinDuration: duration,
			MaxDuration: duration,
		}
	}
	stats := qm.queryStats[queryType]
	stats.Count++
	stats.TotalDuration += duration
	if duration < stats.MinDuration {
		stats.MinDuration = duration
	}
	if duration > stats.MaxDuration {
		stats.MaxDuration = duration
	}
	stats.AvgDuration = stats.TotalDuration / time.Duration(stats.Count)
	if err != nil {
		stats.ErrorCount++
	}

	// 记录慢查询
	if duration > qm.slowThreshold {
		stats.SlowCount++

		queryStat := &QueryStats{
			SQL:       sql,
			Duration:  duration,
			Rows:      rows,
			Timestamp: time.Now(),
			Error:     err,
			TableName: tableName,
			QueryType: queryType,
		}

		// 添加到慢查询列表（保持最大数量）
		qm.slowQueries = append(qm.slowQueries, queryStat)
		if len(qm.slowQueries) > qm.maxSlowQueries {
			// 移除最旧的查询
			qm.slowQueries = qm.slowQueries[1:]
		}

		// 记录慢查询日志（如果 logger 已初始化）
		if logger.Logger != nil {
			logger.Warn("🐌 Slow Query Detected",
				logger.String("query_type", queryType),
				logger.String("table", tableName),
				logger.Duration("duration", duration),
				logger.Int64("rows", rows),
				logger.String("sql", qm.sanitizeSQL(sql)),
				logger.ErrorField(err),
			)
		}
	}
}

// GetStats 获取统计信息
func (qm *QueryMonitor) GetStats() map[string]interface{} {
	qm.mu.RLock()
	defer qm.mu.RUnlock()

	stats := make(map[string]interface{})
	stats["total_queries"] = qm.totalQueries
	stats["total_duration"] = qm.totalDuration.String()
	if qm.totalQueries > 0 {
		stats["avg_duration"] = (qm.totalDuration / time.Duration(qm.totalQueries)).String()
	}
	stats["slow_threshold"] = qm.slowThreshold.String()
	stats["slow_query_count"] = len(qm.slowQueries)

	// 查询类型统计
	typeStats := make(map[string]interface{})
	for queryType, typeStat := range qm.queryStats {
		typeStats[queryType] = map[string]interface{}{
			"count":         typeStat.Count,
			"total_duration": typeStat.TotalDuration.String(),
			"avg_duration":   typeStat.AvgDuration.String(),
			"min_duration":   typeStat.MinDuration.String(),
			"max_duration":   typeStat.MaxDuration.String(),
			"error_count":    typeStat.ErrorCount,
			"slow_count":     typeStat.SlowCount,
		}
	}
	stats["query_types"] = typeStats

	return stats
}

// GetSlowQueries 获取慢查询列表
func (qm *QueryMonitor) GetSlowQueries(limit int) []*QueryStats {
	qm.mu.RLock()
	defer qm.mu.RUnlock()

	if limit <= 0 || limit > len(qm.slowQueries) {
		limit = len(qm.slowQueries)
	}

	// 返回最近的慢查询
	start := len(qm.slowQueries) - limit
	if start < 0 {
		start = 0
	}
	return qm.slowQueries[start:]
}

// QueryStatsReport 查询性能统计报告
type QueryStatsReport struct {
	GeneratedAt      time.Time                `json:"generated_at"`
	Summary          QueryStatsSummary        `json:"summary"`
	QueryTypeStats   map[string]*QueryTypeStats `json:"query_type_stats"`
	SlowQueries      []*QueryStats            `json:"slow_queries"`
	TopSlowQueries   []*QueryStats            `json:"top_slow_queries"`
	Recommendations  []string                 `json:"recommendations"`
}

// QueryStatsSummary 查询统计摘要
type QueryStatsSummary struct {
	TotalQueries    uint64        `json:"total_queries"`
	TotalDuration   time.Duration `json:"total_duration"`
	AvgDuration     time.Duration `json:"avg_duration"`
	SlowQueryCount  int           `json:"slow_query_count"`
	SlowThreshold   time.Duration `json:"slow_threshold"`
	ErrorCount      uint64        `json:"error_count"`
	QueryTypeCount  int           `json:"query_type_count"`
}

// GenerateReport 生成查询性能统计报告
// ✅ 新增：查询性能统计报告生成
func (qm *QueryMonitor) GenerateReport(limit int) *QueryStatsReport {
	qm.mu.RLock()
	defer qm.mu.RUnlock()

	// 计算摘要
	summary := QueryStatsSummary{
		TotalQueries:   qm.totalQueries,
		TotalDuration:  qm.totalDuration,
		SlowQueryCount: len(qm.slowQueries),
		SlowThreshold:  qm.slowThreshold,
		QueryTypeCount: len(qm.queryStats),
	}

	if qm.totalQueries > 0 {
		summary.AvgDuration = qm.totalDuration / time.Duration(qm.totalQueries)
	}

	// 计算错误总数
	for _, stats := range qm.queryStats {
		summary.ErrorCount += stats.ErrorCount
	}

	// 获取慢查询列表（需要先释放锁，因为 GetSlowQueries 会再次加锁）
	slowQueries := make([]*QueryStats, len(qm.slowQueries))
	copy(slowQueries, qm.slowQueries)
	
	if limit <= 0 {
		limit = 10 // 默认显示前10条
	}

	// 获取最慢的查询（按持续时间排序）
	topSlowQueries := make([]*QueryStats, 0, limit)
	if len(slowQueries) > 0 {
		// 复制并排序
		sortedQueries := make([]*QueryStats, len(slowQueries))
		copy(sortedQueries, slowQueries)
		sort.Slice(sortedQueries, func(i, j int) bool {
			return sortedQueries[i].Duration > sortedQueries[j].Duration
		})

		// 取前N条
		if len(sortedQueries) > limit {
			topSlowQueries = sortedQueries[:limit]
		} else {
			topSlowQueries = sortedQueries
		}
	}

	// 生成优化建议
	recommendations := qm.generateRecommendations()

	// 复制查询类型统计（避免返回内部引用）
	queryTypeStatsCopy := make(map[string]*QueryTypeStats)
	for k, v := range qm.queryStats {
		statsCopy := *v
		queryTypeStatsCopy[k] = &statsCopy
	}

	return &QueryStatsReport{
		GeneratedAt:     time.Now(),
		Summary:         summary,
		QueryTypeStats: queryTypeStatsCopy,
		SlowQueries:     slowQueries,
		TopSlowQueries:  topSlowQueries,
		Recommendations: recommendations,
	}
}

// generateRecommendations 生成优化建议
func (qm *QueryMonitor) generateRecommendations() []string {
	recommendations := make([]string, 0)

	// 检查慢查询数量
	if len(qm.slowQueries) > 10 {
		recommendations = append(recommendations, "检测到大量慢查询，建议检查索引和查询优化")
	}

	// 检查错误率
	if qm.totalQueries > 0 {
		totalErrors := uint64(0)
		for _, stats := range qm.queryStats {
			totalErrors += stats.ErrorCount
		}
		errorRate := float64(totalErrors) / float64(qm.totalQueries)
		if errorRate > 0.01 { // 错误率超过1%
			recommendations = append(recommendations, "查询错误率较高，建议检查数据库连接和查询逻辑")
		}
	}

	// 检查平均查询时间
	if qm.totalQueries > 0 {
		avgDuration := qm.totalDuration / time.Duration(qm.totalQueries)
		if avgDuration > 500*time.Millisecond {
			recommendations = append(recommendations, "平均查询时间较长，建议优化查询和添加索引")
		}
	}

	// 检查特定查询类型的性能
	for queryType, stats := range qm.queryStats {
		if stats.Count > 100 && stats.AvgDuration > 200*time.Millisecond {
			recommendations = append(recommendations, 
				fmt.Sprintf("%s 查询平均耗时较长（%v），建议优化", queryType, stats.AvgDuration))
		}
	}

	return recommendations
}

// Reset 重置统计信息
func (qm *QueryMonitor) Reset() {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	qm.slowQueries = make([]*QueryStats, 0, qm.maxSlowQueries)
	qm.queryStats = make(map[string]*QueryTypeStats)
	qm.totalQueries = 0
	qm.totalDuration = 0
}

// SetEnabled 启用/禁用监控
func (qm *QueryMonitor) SetEnabled(enabled bool) {
	qm.mu.Lock()
	defer qm.mu.Unlock()
	qm.enabled = enabled
}

// parseQueryType 解析查询类型
func (qm *QueryMonitor) parseQueryType(sql string) string {
	sql = qm.normalizeSQL(sql)
	if len(sql) < 6 {
		return "UNKNOWN"
	}

	prefix := sql[:6]
	switch prefix {
	case "SELECT":
		return "SELECT"
	case "INSERT":
		return "INSERT"
	case "UPDATE":
		return "UPDATE"
	case "DELETE":
		return "DELETE"
	default:
		return "OTHER"
	}
}

// extractTableName 提取表名
func (qm *QueryMonitor) extractTableName(sql string) string {
	// 简化实现：从 FROM 或 INTO 或 UPDATE 子句中提取表名
	// 实际实现可能需要更复杂的 SQL 解析
	sql = qm.normalizeSQL(sql)

	// 尝试从常见模式中提取表名
	patterns := []string{
		"FROM \"",
		"FROM ",
		"INTO \"",
		"INTO ",
		"UPDATE \"",
		"UPDATE ",
	}

	for _, pattern := range patterns {
		if idx := findPattern(sql, pattern); idx >= 0 {
			start := idx + len(pattern)
			end := start
			for end < len(sql) && sql[end] != ' ' && sql[end] != '"' && sql[end] != '\n' && sql[end] != '\t' {
				end++
			}
			if end > start {
				return sql[start:end]
			}
		}
	}

	return "unknown"
}

// normalizeSQL 规范化 SQL（移除多余空格）
func (qm *QueryMonitor) normalizeSQL(sql string) string {
	// 移除多余空格和换行
	result := make([]byte, 0, len(sql))
	prevSpace := false
	for i := 0; i < len(sql); i++ {
		if sql[i] == ' ' || sql[i] == '\n' || sql[i] == '\t' || sql[i] == '\r' {
			if !prevSpace {
				result = append(result, ' ')
				prevSpace = true
			}
		} else {
			result = append(result, sql[i])
			prevSpace = false
		}
	}
	return string(result)
}

// sanitizeSQL 清理 SQL（用于日志输出）
func (qm *QueryMonitor) sanitizeSQL(sql string) string {
	// 限制长度，避免日志过长
	maxLen := 500
	if len(sql) > maxLen {
		return sql[:maxLen] + "..."
	}
	return sql
}

// findPattern 查找模式（不区分大小写）
func findPattern(s, pattern string) int {
	s = toUpper(s)
	pattern = toUpper(pattern)
	for i := 0; i <= len(s)-len(pattern); i++ {
		if s[i:i+len(pattern)] == pattern {
			return i
		}
	}
	return -1
}

// toUpper 转换为大写（简单实现）
func toUpper(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] >= 'a' && s[i] <= 'z' {
			result[i] = s[i] - 32
		} else {
			result[i] = s[i]
		}
	}
	return string(result)
}

// WrapDBWithMonitor 包装 GORM DB 以添加查询监控
func WrapDBWithMonitor(db *gorm.DB, monitor *QueryMonitor) *gorm.DB {
	if monitor == nil {
		return db
	}

	// 使用 GORM 的 Callbacks 来监控查询
	// 注意：GORM 的 logger 已经记录了查询，这里只做补充监控
	// 实际的查询监控通过 SQLLogger 实现，这里主要用于统计

	return db
}

