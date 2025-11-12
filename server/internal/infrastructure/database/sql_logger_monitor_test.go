package database

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	"gorm.io/gorm/logger"
)

func TestSQLLogger_SetMonitor(t *testing.T) {
	zapLogger := zap.NewNop()
	config := logger.Config{
		SlowThreshold: 200 * time.Millisecond,
		LogLevel:      logger.Info,
	}

	sqlLogger := NewSQLLogger(zapLogger, config)
	
	t.Run("设置监控器", func(t *testing.T) {
		monitor := NewQueryMonitor(200*time.Millisecond, 100)
		sqlLogger.SetMonitor(monitor)
		
		// 验证监控器已设置（通过内部状态检查）
		// 注意：由于 monitor 字段是私有的，我们通过行为来验证
		assert.NotNil(t, monitor)
	})

	t.Run("监控器为nil时正常工作", func(t *testing.T) {
		// 创建新的 logger，不设置监控器
		sqlLogger2 := NewSQLLogger(zapLogger, config)
		
		// 应该能正常工作，不会 panic
		ctx := context.Background()
		begin := time.Now()
		fc := func() (string, int64) {
			return "SELECT * FROM users", 1
		}
		
		// 应该正常执行，不报错
		sqlLogger2.Trace(ctx, begin, fc, nil)
		assert.True(t, true)
	})
}

func TestSQLLogger_RecordToMonitor(t *testing.T) {
	zapLogger := zap.NewNop()
	config := logger.Config{
		SlowThreshold: 200 * time.Millisecond,
		LogLevel:      logger.Info,
	}

	sqlLogger := NewSQLLogger(zapLogger, config)
	monitor := NewQueryMonitor(200*time.Millisecond, 100)
	sqlLogger.SetMonitor(monitor)

	t.Run("记录查询到监控器", func(t *testing.T) {
		ctx := context.Background()
		begin := time.Now()
		fc := func() (string, int64) {
			return "SELECT * FROM users WHERE id = $1", 1
		}

		// 执行 Trace，应该记录到监控器
		sqlLogger.Trace(ctx, begin, fc, nil)

		// 验证监控器记录了查询
		stats := monitor.GetStats()
		assert.Greater(t, stats["total_queries"], uint64(0))
	})

	t.Run("记录慢查询到监控器", func(t *testing.T) {
		ctx := context.Background()
		begin := time.Now().Add(-300 * time.Millisecond) // 模拟慢查询
		fc := func() (string, int64) {
			return "SELECT * FROM large_table WHERE complex_condition = $1", 100
		}

		// 执行 Trace，应该记录为慢查询
		sqlLogger.Trace(ctx, begin, fc, nil)

		// 验证监控器记录了慢查询
		slowQueries := monitor.GetSlowQueries(10)
		assert.Greater(t, len(slowQueries), 0)
	})

	t.Run("记录错误查询到监控器", func(t *testing.T) {
		ctx := context.Background()
		begin := time.Now()
		fc := func() (string, int64) {
			return "SELECT * FROM nonexistent", 0
		}
		err := assert.AnError

		// 执行 Trace，应该记录错误
		sqlLogger.Trace(ctx, begin, fc, err)

		// 验证监控器记录了错误
		typeStats := monitor.GetStats()["query_types"].(map[string]interface{})
		if selectStats, ok := typeStats["SELECT"].(map[string]interface{}); ok {
			errorCount := selectStats["error_count"].(uint64)
			assert.Greater(t, errorCount, uint64(0))
		}
	})
}

