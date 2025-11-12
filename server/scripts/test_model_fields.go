package main

import (
	"context"
	"fmt"
	"log"

	"github.com/easyspace-ai/luckdb/server/internal/config"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database"
	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/database/models"
	"gorm.io/gorm"
)

func main() {
	fmt.Println("🧪 测试模型字段...")
	fmt.Println("")

	// 加载配置
	cfg, err := config.LoadConfig("config.yaml")
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 连接数据库
	conn, err := database.NewConnection(cfg.Database)
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}
	defer conn.Close()

	db := conn.GetDB()
	ctx := context.Background()

	// 1. 测试 Table 模型的 db_view_name 字段
	fmt.Println("1. 测试 Table 模型的 db_view_name 字段...")
	var table models.Table
	if err := db.WithContext(ctx).First(&table).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			fmt.Println("   ⚠️  没有找到表记录，跳过测试")
		} else {
			fmt.Printf("   ❌ 查询失败: %v\n", err)
		}
	} else {
		fmt.Printf("   ✅ 表 ID: %s\n", table.ID)
		if table.DBViewName != nil {
			fmt.Printf("   ✅ db_view_name: %s\n", *table.DBViewName)
		} else {
			fmt.Println("   ✅ db_view_name: nil (正常，新字段)")
		}
	}
	fmt.Println("")

	// 2. 测试 Field 模型的 is_conditional_lookup 和 meta 字段
	fmt.Println("2. 测试 Field 模型的 is_conditional_lookup 和 meta 字段...")
	var field models.Field
	if err := db.WithContext(ctx).First(&field).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			fmt.Println("   ⚠️  没有找到字段记录，跳过测试")
		} else {
			fmt.Printf("   ❌ 查询失败: %v\n", err)
		}
	} else {
		fmt.Printf("   ✅ 字段 ID: %s\n", field.ID)
		if field.IsConditionalLookup != nil {
			fmt.Printf("   ✅ is_conditional_lookup: %v\n", *field.IsConditionalLookup)
		} else {
			fmt.Println("   ✅ is_conditional_lookup: nil (正常，新字段)")
		}
		if field.Meta != nil {
			fmt.Printf("   ✅ meta: %s\n", *field.Meta)
		} else {
			fmt.Println("   ✅ meta: nil (正常，新字段)")
		}
	}
	fmt.Println("")

	// 3. 测试字段更新
	fmt.Println("3. 测试字段更新...")
	if table.ID != "" {
		testViewName := "test_view_123"
		if err := db.WithContext(ctx).Model(&table).Update("db_view_name", testViewName).Error; err != nil {
			fmt.Printf("   ❌ 更新失败: %v\n", err)
		} else {
			fmt.Printf("   ✅ 成功更新 db_view_name 为: %s\n", testViewName)
			// 恢复
			db.WithContext(ctx).Model(&table).Update("db_view_name", nil)
		}
	}
	fmt.Println("")

	fmt.Println("✅ 模型字段测试完成！")
}

