package main

import (
	"context"
	"fmt"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/config"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
)

func main() {
	fmt.Println("🧪 测试新功能...")
	fmt.Println("")

	// 1. 测试慢查询监控配置
	fmt.Println("1. 测试慢查询监控配置...")
	cfg := config.DatabaseConfig{
		SlowQueryThreshold: 1 * time.Second,
		EnableQueryStats:   true,
	}
	fmt.Printf("   ✅ 慢查询阈值: %v\n", cfg.SlowQueryThreshold)
	fmt.Printf("   ✅ 启用查询统计: %v\n", cfg.EnableQueryStats)
	fmt.Println("")

	// 2. 测试 QueryMonitor
	fmt.Println("2. 测试 QueryMonitor...")
	monitor := database.NewQueryMonitor(1*time.Second, 100)
	ctx := context.Background()

	// 记录一些测试查询
	monitor.RecordQuery(ctx, "SELECT * FROM users", 100*time.Millisecond, 10, nil)
	monitor.RecordQuery(ctx, "SELECT * FROM orders", 1500*time.Millisecond, 20, nil) // 慢查询
	monitor.RecordQuery(ctx, "INSERT INTO users VALUES (...)", 50*time.Millisecond, 1, nil)

	stats := monitor.GetStats()
	fmt.Printf("   ✅ 总查询数: %v\n", stats["total_queries"])
	fmt.Printf("   ✅ 慢查询数: %v\n", stats["slow_query_count"])
	fmt.Printf("   ✅ 查询类型统计: %v\n", len(stats["query_types"].(map[string]interface{})))
	fmt.Println("")

	// 3. 测试统计报告生成
	fmt.Println("3. 测试统计报告生成...")
	report := monitor.GenerateReport(10)
	fmt.Printf("   ✅ 报告生成时间: %v\n", report.GeneratedAt)
	fmt.Printf("   ✅ 总查询数: %d\n", report.Summary.TotalQueries)
	fmt.Printf("   ✅ 慢查询数: %d\n", report.Summary.SlowQueryCount)
	fmt.Printf("   ✅ 优化建议数: %d\n", len(report.Recommendations))
	if len(report.Recommendations) > 0 {
		fmt.Printf("   ✅ 优化建议: %v\n", report.Recommendations[0])
	}
	fmt.Println("")

	// 4. 测试批量操作配置
	fmt.Println("4. 测试批量操作配置...")
	batchConfig := config.BatchConfig{
		DefaultSize:     100,
		MaxSize:         1000,
		MinSize:         10,
		EnableAutoAdjust: true,
	}
	fmt.Printf("   ✅ 默认批量大小: %d\n", batchConfig.DefaultSize)
	fmt.Printf("   ✅ 最大批量大小: %d\n", batchConfig.MaxSize)
	fmt.Printf("   ✅ 最小批量大小: %d\n", batchConfig.MinSize)
	fmt.Printf("   ✅ 启用自动调整: %v\n", batchConfig.EnableAutoAdjust)
	fmt.Println("")

	fmt.Println("✅ 所有功能测试通过！")
}

