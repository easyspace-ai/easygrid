package database

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestQueryMonitor_RecordQuery(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	t.Run("记录正常查询", func(t *testing.T) {
		ctx := context.Background()
		sql := "SELECT * FROM users WHERE id = $1"
		duration := 50 * time.Millisecond
		rows := int64(1)

		monitor.RecordQuery(ctx, sql, duration, rows, nil)

		_ = monitor.GetStats() // 验证可以获取统计信息
		assert.Equal(t, uint64(1), monitor.GetStats()["total_queries"])
		// 注意：50ms 不超过 200ms 阈值，所以不是慢查询
		assert.Equal(t, 0, monitor.GetStats()["slow_query_count"])
	})

	t.Run("记录慢查询", func(t *testing.T) {
		ctx := context.Background()
		sql := "SELECT * FROM users WHERE name LIKE '%test%'"
		duration := 300 * time.Millisecond // 超过阈值
		rows := int64(100)

		monitor.RecordQuery(ctx, sql, duration, rows, nil)

		slowQueries := monitor.GetSlowQueries(10)
		assert.GreaterOrEqual(t, len(slowQueries), 1)
		assert.Equal(t, "SELECT", slowQueries[len(slowQueries)-1].QueryType)
	})

	t.Run("记录错误查询", func(t *testing.T) {
		ctx := context.Background()
		sql := "SELECT * FROM nonexistent"
		duration := 100 * time.Millisecond
		rows := int64(0)
		err := assert.AnError

		monitor.RecordQuery(ctx, sql, duration, rows, err)

		stats := monitor.GetStats()
		typeStats := stats["query_types"].(map[string]interface{})
		selectStats := typeStats["SELECT"].(map[string]interface{})
		assert.Greater(t, selectStats["error_count"], uint64(0))
	})
}

func TestQueryMonitor_GetStats(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	ctx := context.Background()
	
	// 记录不同类型的查询
	monitor.RecordQuery(ctx, "SELECT * FROM users", 50*time.Millisecond, 10, nil)
	monitor.RecordQuery(ctx, "INSERT INTO users VALUES ($1)", 30*time.Millisecond, 1, nil)
	monitor.RecordQuery(ctx, "UPDATE users SET name = $1", 40*time.Millisecond, 5, nil)
	monitor.RecordQuery(ctx, "DELETE FROM users WHERE id = $1", 20*time.Millisecond, 1, nil)

	stats := monitor.GetStats()
	
	assert.Equal(t, uint64(4), stats["total_queries"])
	assert.NotNil(t, stats["query_types"])
	
	typeStats := stats["query_types"].(map[string]interface{})
	assert.Contains(t, typeStats, "SELECT")
	assert.Contains(t, typeStats, "INSERT")
	assert.Contains(t, typeStats, "UPDATE")
	assert.Contains(t, typeStats, "DELETE")
}

func TestQueryMonitor_GetSlowQueries(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 10) // 最多保存10条

	ctx := context.Background()
	
	// 记录多个慢查询
	for i := 0; i < 15; i++ {
		sql := "SELECT * FROM large_table WHERE complex_condition = $1"
		duration := 300 * time.Millisecond
		monitor.RecordQuery(ctx, sql, duration, int64(i), nil)
	}

	slowQueries := monitor.GetSlowQueries(0) // 获取所有
	assert.LessOrEqual(t, len(slowQueries), 10) // 应该不超过最大数量
	
	// 验证最近的查询存在
	assert.Greater(t, len(slowQueries), 0)
}

func TestQueryMonitor_Reset(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	ctx := context.Background()
	monitor.RecordQuery(ctx, "SELECT * FROM users", 50*time.Millisecond, 10, nil)
	
	stats := monitor.GetStats()
	assert.Equal(t, uint64(1), stats["total_queries"])

	monitor.Reset()
	
	stats = monitor.GetStats()
	assert.Equal(t, uint64(0), stats["total_queries"])
	assert.Equal(t, 0, stats["slow_query_count"])
}

func TestQueryMonitor_ParseQueryType(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	testCases := []struct {
		name     string
		sql      string
		expected string
	}{
		{"SELECT查询", "SELECT * FROM users", "SELECT"},
		{"INSERT查询", "INSERT INTO users VALUES ($1)", "INSERT"},
		{"UPDATE查询", "UPDATE users SET name = $1", "UPDATE"},
		{"DELETE查询", "DELETE FROM users WHERE id = $1", "DELETE"},
		{"小写select", "select * from users", "SELECT"},
		{"未知类型", "CREATE TABLE users", "OTHER"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			monitor.RecordQuery(ctx, tc.sql, 50*time.Millisecond, 1, nil)
			
			stats := monitor.GetStats()
			typeStats := stats["query_types"].(map[string]interface{})
			
			if tc.expected != "OTHER" {
				assert.Contains(t, typeStats, tc.expected)
			}
		})
	}
}

func TestQueryMonitor_SetEnabled(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	ctx := context.Background()
	
	// 启用时记录查询
	monitor.SetEnabled(true)
	monitor.RecordQuery(ctx, "SELECT * FROM users", 50*time.Millisecond, 1, nil)
	stats := monitor.GetStats()
	assert.Equal(t, uint64(1), stats["total_queries"])

	// 禁用后不记录
	monitor.SetEnabled(false)
	monitor.RecordQuery(ctx, "SELECT * FROM users", 50*time.Millisecond, 1, nil)
	stats = monitor.GetStats()
	assert.Equal(t, uint64(1), stats["total_queries"]) // 仍然是1
}

func TestQueryMonitor_QueryTypeStats(t *testing.T) {
	monitor := NewQueryMonitor(200*time.Millisecond, 100)

	ctx := context.Background()
	
	// 记录多个SELECT查询
	for i := 0; i < 5; i++ {
		monitor.RecordQuery(ctx, "SELECT * FROM users", time.Duration(i+1)*10*time.Millisecond, int64(i), nil)
	}

	stats := monitor.GetStats()
	typeStats := stats["query_types"].(map[string]interface{})
	selectStats := typeStats["SELECT"].(map[string]interface{})

	assert.Equal(t, uint64(5), selectStats["count"])
	assert.NotNil(t, selectStats["avg_duration"])
	assert.NotNil(t, selectStats["min_duration"])
	assert.NotNil(t, selectStats["max_duration"])
}

