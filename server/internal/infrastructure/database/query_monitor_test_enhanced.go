package database

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// TestQueryMonitor_GenerateReport 测试查询性能统计报告生成
func TestQueryMonitor_GenerateReport(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	// 记录一些查询
	ctx := context.Background()
	monitor.RecordQuery(ctx, "SELECT * FROM users", 100*time.Millisecond, 10, nil)
	monitor.RecordQuery(ctx, "SELECT * FROM orders", 300*time.Millisecond, 20, nil) // 慢查询
	monitor.RecordQuery(ctx, "INSERT INTO users VALUES (...)", 50*time.Millisecond, 1, nil)
	monitor.RecordQuery(ctx, "UPDATE users SET name = 'test'", 150*time.Millisecond, 5, nil)

	// 生成报告
	report := monitor.GenerateReport(10)

	// 验证报告内容
	assert.NotNil(t, report)
	assert.Equal(t, uint64(4), report.Summary.TotalQueries)
	assert.Equal(t, 1, report.Summary.SlowQueryCount)
	assert.True(t, report.Summary.AvgDuration > 0)
	assert.NotEmpty(t, report.QueryTypeStats)
	assert.NotEmpty(t, report.SlowQueries)
	assert.NotEmpty(t, report.TopSlowQueries)
}

// TestQueryMonitor_GenerateRecommendations 测试优化建议生成
func TestQueryMonitor_GenerateRecommendations(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	// 记录大量慢查询
	ctx := context.Background()
	for i := 0; i < 15; i++ {
		monitor.RecordQuery(ctx, "SELECT * FROM large_table", 500*time.Millisecond, 1000, nil)
	}

	report := monitor.GenerateReport(10)
	
	// 验证有优化建议
	assert.NotEmpty(t, report.Recommendations)
}

// TestQueryMonitor_GetStatsEnhanced 测试统计信息获取（增强版）
func TestQueryMonitor_GetStatsEnhanced(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	ctx := context.Background()
	monitor.RecordQuery(ctx, "SELECT * FROM users", 100*time.Millisecond, 10, nil)
	monitor.RecordQuery(ctx, "SELECT * FROM orders", 300*time.Millisecond, 20, nil)

	stats := monitor.GetStats()

	assert.NotNil(t, stats)
	assert.Equal(t, uint64(2), stats["total_queries"])
	assert.Equal(t, 1, stats["slow_query_count"])
	assert.NotNil(t, stats["query_types"])
}

