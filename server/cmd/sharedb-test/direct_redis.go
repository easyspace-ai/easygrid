package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// 直接测试 Redis 发布订阅
func main() {
	fmt.Println("🧪 直接 Redis 发布订阅测试")
	fmt.Println("=========================")

	// 1. 连接 Redis
	fmt.Println("1️⃣ 连接 Redis...")
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   0,
	})
	defer client.Close()

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		fmt.Printf("❌ Redis 连接失败: %v\n", err)
		return
	}
	fmt.Println("✅ Redis 连接成功")

	// 2. 启动订阅者（使用 ShareDB 的频道格式）
	fmt.Println("\n2️⃣ 启动订阅者...")
	channel := "sharedb:rec_tbl_oz9EbQgbTZBuF7FSSJvet.test_record_001"
	
	go func() {
		pubsub := client.Subscribe(ctx, channel)
		defer pubsub.Close()

		ch := pubsub.Channel()
		for msg := range ch {
			fmt.Printf("📬 订阅者收到消息: %s\n", msg.Payload)
			
			// 尝试解析为 ShareDB 操作
			var op map[string]interface{}
			if err := json.Unmarshal([]byte(msg.Payload), &op); err != nil {
				fmt.Printf("❌ 解析操作失败: %v\n", err)
			} else {
				fmt.Printf("📋 解析的操作: %+v\n", op)
			}
		}
	}()

	// 等待订阅者启动
	time.Sleep(1 * time.Second)

	// 3. 发布测试消息（模拟 ShareDB 操作）
	fmt.Println("\n3️⃣ 发布测试消息...")
	testOp := map[string]interface{}{
		"Type":       "edit",
		"Op":         []map[string]interface{}{{"p": []string{"fields", "test"}, "oi": "test_value"}},
		"Version":    1,
		"Source":     "test_client",
		"Collection": "rec_tbl_oz9EbQgbTZBuF7FSSJvet",
		"DocID":      "test_record_001",
	}

	jsonData, _ := json.Marshal(testOp)
	if err := client.Publish(ctx, channel, jsonData).Err(); err != nil {
		fmt.Printf("❌ 发布失败: %v\n", err)
		return
	}
	fmt.Println("✅ 消息已发布")

	// 4. 等待消息接收
	fmt.Println("\n4️⃣ 等待消息接收（3秒）...")
	time.Sleep(3 * time.Second)

	fmt.Println("\n🎉 直接 Redis 测试完成")
}
