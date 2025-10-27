package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// 测试 Redis 发布订阅
func main() {
	fmt.Println("🧪 Redis 发布订阅测试")
	fmt.Println("====================")

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

	// 2. 启动订阅者
	fmt.Println("\n2️⃣ 启动订阅者...")
	go func() {
		pubsub := client.Subscribe(ctx, "sharedb:rec_tbl_oz9EbQgbTZBuF7FSSJvet.test_record_001")
		defer pubsub.Close()

		ch := pubsub.Channel()
		for msg := range ch {
			fmt.Printf("📬 订阅者收到消息: %s\n", msg.Payload)
		}
	}()

	// 等待订阅者启动
	time.Sleep(1 * time.Second)

	// 3. 发布测试消息
	fmt.Println("\n3️⃣ 发布测试消息...")
	testOp := map[string]interface{}{
		"type":    "edit",
		"op":      []map[string]interface{}{{"p": []string{"fields", "test"}, "oi": "test_value"}},
		"version": 1,
		"source":  "test_client",
	}

	jsonData, _ := json.Marshal(testOp)
	if err := client.Publish(ctx, "sharedb:rec_tbl_oz9EbQgbTZBuF7FSSJvet.test_record_001", jsonData).Err(); err != nil {
		fmt.Printf("❌ 发布失败: %v\n", err)
		return
	}
	fmt.Println("✅ 消息已发布")

	// 4. 等待消息接收
	fmt.Println("\n4️⃣ 等待消息接收（3秒）...")
	time.Sleep(3 * time.Second)

	fmt.Println("\n🎉 Redis 测试完成")
}
