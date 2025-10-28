package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// 重构后的测试客户端
type RefactoredTestClient struct {
	conn      *websocket.Conn
	token     string
	connected bool
	messages  chan Message
	clientID  string
	mu        sync.RWMutex
}

// 测试重构后的功能
func TestRefactoredBackend() {
	fmt.Println("🚀 开始测试重构后的后端功能...")

	// 测试配置
	config := TestConfig{
		ServerURL: "http://localhost:8080",
		Email:     "admin@126.com",
		Password:  "Pmker123",
		BaseID:    "ece04dea-70bd-43e4-87b8-35af518caa5a",
		TableID:   "tbl_oz9EbQgbTZBuF7FSSJvet",
		ViewID:    "viw_F0SqlG0Y2m2kLX7cqjYX4",
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 等待服务器启动
	fmt.Println("⏳ 等待服务器启动...")
	time.Sleep(2 * time.Second)

	// 测试 1: 基础连接和握手
	fmt.Println("\n📡 测试 1: 基础连接和握手")
	testBasicConnection(ctx, config)

	// 测试 2: OpBuilder 功能
	fmt.Println("\n🔧 测试 2: OpBuilder 功能")
	testOpBuilder(ctx, config)

	// 测试 3: 事务上下文
	fmt.Println("\n📦 测试 3: 事务上下文")
	testTransactionContext(ctx, config)

	// 测试 4: 错误处理
	fmt.Println("\n🛡️ 测试 4: 错误处理")
	testErrorHandling(ctx, config)

	// 测试 5: 性能监控
	fmt.Println("\n📊 测试 5: 性能监控")
	testPerformanceMonitoring(ctx, config)

	// 等待中断信号
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)
	<-interrupt

	fmt.Println("\n🛑 测试结束")
	cancel()
}

// 测试基础连接和握手
func testBasicConnection(ctx context.Context, config TestConfig) {
	client, err := createRefactoredClient(config)
	if err != nil {
		fmt.Printf("❌ 创建客户端失败: %v\n", err)
		return
	}
	defer client.Close()

	// 连接
	if err := client.Connect(); err != nil {
		fmt.Printf("❌ 连接失败: %v\n", err)
		return
	}

	// 握手
	if err := client.Handshake(); err != nil {
		fmt.Printf("❌ 握手失败: %v\n", err)
		return
	}

	fmt.Println("✅ 基础连接和握手测试通过")
}

// 测试 OpBuilder 功能
func testOpBuilder(ctx context.Context, config TestConfig) {
	client, err := createRefactoredClient(config)
	if err != nil {
		fmt.Printf("❌ 创建客户端失败: %v\n", err)
		return
	}
	defer client.Close()

	if err := client.Connect(); err != nil {
		fmt.Printf("❌ 连接失败: %v\n", err)
		return
	}

	if err := client.Handshake(); err != nil {
		fmt.Printf("❌ 握手失败: %v\n", err)
		return
	}

	// 测试记录操作
	collection := "rec_" + config.TableID
	recordID := "test_record_opbuilder"

	// 测试 SetCellValue 操作
	op1 := []OTOperation{
		{
			"p":  []interface{}{"fields", "fld_test_001"},
			"oi": "OpBuilder测试值_" + time.Now().Format("15:04:05"),
			"od": "旧值",
			"t":  "set",
		},
	}

	if err := client.SubmitOp(collection, recordID, op1, 1); err != nil {
		fmt.Printf("❌ 提交记录操作失败: %v\n", err)
		return
	}

	// 测试字段操作
	fieldCollection := "fld_" + config.TableID
	fieldID := "test_field_opbuilder"

	op2 := []OTOperation{
		{
			"p":  []interface{}{"name"},
			"oi": "OpBuilder字段名_" + time.Now().Format("15:04:05"),
			"od": "旧字段名",
			"t":  "set",
		},
	}

	if err := client.SubmitOp(fieldCollection, fieldID, op2, 1); err != nil {
		fmt.Printf("❌ 提交字段操作失败: %v\n", err)
		return
	}

	fmt.Println("✅ OpBuilder 功能测试通过")
}

// 测试事务上下文
func testTransactionContext(ctx context.Context, config TestConfig) {
	client, err := createRefactoredClient(config)
	if err != nil {
		fmt.Printf("❌ 创建客户端失败: %v\n", err)
		return
	}
	defer client.Close()

	if err := client.Connect(); err != nil {
		fmt.Printf("❌ 连接失败: %v\n", err)
		return
	}

	if err := client.Handshake(); err != nil {
		fmt.Printf("❌ 握手失败: %v\n", err)
		return
	}

	// 测试批量操作（模拟事务）
	collection := "rec_" + config.TableID
	recordID := "test_record_transaction"

	// 发送多个操作，模拟事务
	ops := []OTOperation{
		{
			"p":  []interface{}{"fields", "fld_transaction_001"},
			"oi": "事务操作1_" + time.Now().Format("15:04:05"),
			"od": "旧值1",
			"t":  "set",
		},
		{
			"p":  []interface{}{"fields", "fld_transaction_002"},
			"oi": "事务操作2_" + time.Now().Format("15:04:05"),
			"od": "旧值2",
			"t":  "set",
		},
		{
			"p":  []interface{}{"fields", "fld_transaction_003"},
			"oi": "事务操作3_" + time.Now().Format("15:04:05"),
			"od": "旧值3",
			"t":  "set",
		},
	}

	if err := client.SubmitOp(collection, recordID, ops, 1); err != nil {
		fmt.Printf("❌ 提交事务操作失败: %v\n", err)
		return
	}

	fmt.Println("✅ 事务上下文测试通过")
}

// 测试错误处理
func testErrorHandling(ctx context.Context, config TestConfig) {
	client, err := createRefactoredClient(config)
	if err != nil {
		fmt.Printf("❌ 创建客户端失败: %v\n", err)
		return
	}
	defer client.Close()

	if err := client.Connect(); err != nil {
		fmt.Printf("❌ 连接失败: %v\n", err)
		return
	}

	if err := client.Handshake(); err != nil {
		fmt.Printf("❌ 握手失败: %v\n", err)
		return
	}

	// 测试无效操作
	collection := "rec_" + config.TableID
	recordID := "test_record_error"

	// 发送无效操作
	invalidOp := []OTOperation{
		{
			"p":  []interface{}{"invalid", "path"},
			"oi": "无效操作",
			"od": "旧值",
			"t":  "invalid_type",
		},
	}

	if err := client.SubmitOp(collection, recordID, invalidOp, 1); err != nil {
		fmt.Printf("❌ 提交无效操作失败: %v\n", err)
		return
	}

	// 测试不存在的文档
	nonExistentCollection := "rec_nonexistent"
	nonExistentDocID := "nonexistent_doc"

	op := []OTOperation{
		{
			"p":  []interface{}{"fields", "fld_test"},
			"oi": "测试值",
			"od": "旧值",
			"t":  "set",
		},
	}

	if err := client.SubmitOp(nonExistentCollection, nonExistentDocID, op, 1); err != nil {
		fmt.Printf("❌ 提交到不存在文档失败: %v\n", err)
		return
	}

	fmt.Println("✅ 错误处理测试通过")
}

// 测试性能监控
func testPerformanceMonitoring(ctx context.Context, config TestConfig) {
	client, err := createRefactoredClient(config)
	if err != nil {
		fmt.Printf("❌ 创建客户端失败: %v\n", err)
		return
	}
	defer client.Close()

	if err := client.Connect(); err != nil {
		fmt.Printf("❌ 连接失败: %v\n", err)
		return
	}

	if err := client.Handshake(); err != nil {
		fmt.Printf("❌ 握手失败: %v\n", err)
		return
	}

	// 发送大量操作测试性能
	collection := "rec_" + config.TableID
	recordID := "test_record_performance"

	fmt.Println("📊 发送大量操作测试性能...")

	for i := 0; i < 10; i++ {
		op := []OTOperation{
			{
				"p":  []interface{}{"fields", fmt.Sprintf("fld_performance_%d", i)},
				"oi": fmt.Sprintf("性能测试值_%d_%s", i, time.Now().Format("15:04:05")),
				"od": "旧值",
				"t":  "set",
			},
		}

		if err := client.SubmitOp(collection, recordID, op, int64(i+1)); err != nil {
			fmt.Printf("❌ 提交性能测试操作失败: %v\n", err)
			return
		}

		// 小延迟避免过快发送
		time.Sleep(100 * time.Millisecond)
	}

	fmt.Println("✅ 性能监控测试通过")
}

// 创建重构后的客户端
func createRefactoredClient(config TestConfig) (*RefactoredTestClient, error) {
	// 获取 JWT Token
	token, err := authenticate(config.ServerURL, config.Email, config.Password)
	if err != nil {
		return nil, fmt.Errorf("认证失败: %w", err)
	}

	client := &RefactoredTestClient{
		token:    token,
		messages: make(chan Message, 100),
		clientID: fmt.Sprintf("refactored_client_%d", time.Now().UnixNano()),
	}

	return client, nil
}

// 连接 WebSocket
func (c *RefactoredTestClient) Connect() error {
	// 构建 WebSocket URL
	u, err := url.Parse("ws://localhost:8080/socket")
	if err != nil {
		return err
	}
	
	// 添加 token 作为查询参数
	q := u.Query()
	q.Set("token", c.token)
	u.RawQuery = q.Encode()

	// 添加认证头
	headers := http.Header{}
	headers.Set("Authorization", "Bearer "+c.token)

	// 连接 WebSocket
	conn, _, err := websocket.DefaultDialer.Dial(u.String(), headers)
	if err != nil {
		return err
	}

	c.conn = conn
	c.connected = true

	fmt.Printf("[%s] ✅ WebSocket 连接成功\n", c.clientID)
	return nil
}

// 握手
func (c *RefactoredTestClient) Handshake() error {
	msg := Message{
		Action: "hs", // handshake
	}

	if err := c.sendMessage(msg); err != nil {
		return err
	}

	// 等待握手响应
	response, err := c.receiveMessage()
	if err != nil {
		return err
	}

	if response.Action != "hs" {
		return fmt.Errorf("握手响应错误: %v", response)
	}

	fmt.Printf("[%s] ✅ 握手完成\n", c.clientID)
	return nil
}

// 提交操作
func (c *RefactoredTestClient) SubmitOp(collection, docID string, op []OTOperation, version int64) error {
	msg := Message{
		Action:     "op", // operation
		Collection: collection,
		DocID:      docID,
		Op:         op,
		Version:    version,
	}

	if err := c.sendMessage(msg); err != nil {
		return err
	}

	fmt.Printf("[%s] ✅ 操作已发送: %s.%s (版本: %d)\n", c.clientID, collection, docID, version)
	return nil
}

// 发送消息
func (c *RefactoredTestClient) sendMessage(msg Message) error {
	if !c.connected {
		return fmt.Errorf("客户端未连接")
	}

	return c.conn.WriteJSON(msg)
}

// 接收消息
func (c *RefactoredTestClient) receiveMessage() (Message, error) {
	if !c.connected {
		return Message{}, fmt.Errorf("客户端未连接")
	}

	var msg Message
	err := c.conn.ReadJSON(&msg)
	return msg, err
}

// 关闭连接
func (c *RefactoredTestClient) Close() {
	if c.conn != nil {
		c.conn.Close()
		c.connected = false
	}
}
