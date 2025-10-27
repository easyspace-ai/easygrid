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

// ShareDB 协议消息类型
type Message struct {
	Action     string        `json:"a"`
	Collection string        `json:"c,omitempty"`
	DocID      string        `json:"d,omitempty"`
	Version    int64         `json:"v,omitempty"`
	Op         []OTOperation `json:"op,omitempty"`
	Data       interface{}   `json:"data,omitempty"`
	Error      *Error        `json:"error,omitempty"`
}

type OTOperation map[string]interface{}

type Error struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// 认证响应
type AuthResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    struct {
		User struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
	} `json:"data"`
}

// ShareDB 客户端
type ShareDBClient struct {
	conn      *websocket.Conn
	token     string
	connected bool
	messages  chan Message
	clientID  string
	mu        sync.RWMutex
}

// 测试配置
type TestConfig struct {
	ServerURL string
	Email     string
	Password  string
	BaseID    string
	TableID   string
	ViewID    string
}

func main() {
	// 测试配置
	config := TestConfig{
		ServerURL: "http://localhost:8080",
		Email:     "admin@126.com",
		Password:  "Pmker123",
		BaseID:    "ece04dea-70bd-43e4-87b8-35af518caa5a",
		TableID:   "tbl_oz9EbQgbTZBuF7FSSJvet",
		ViewID:    "viw_F0SqlG0Y2m2kLX7cqjYX4",
	}

	fmt.Println("🚀 启动 ShareDB 测试客户端...")
	fmt.Printf("📡 服务器地址: %s\n", config.ServerURL)
	fmt.Printf("👤 测试账号: %s\n", config.Email)

	// 创建两个客户端进行同步测试
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 等待服务器启动
	fmt.Println("⏳ 等待服务器启动...")
	time.Sleep(2 * time.Second)

	// 启动客户端 A (监听者)
	go runClientA(ctx, config)

	// 等待一下再启动客户端 B
	time.Sleep(1 * time.Second)

	// 启动客户端 B (操作者)
	go runClientB(ctx, config)

	// 等待中断信号
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)
	<-interrupt

	fmt.Println("\n🛑 测试结束")
	cancel()
}

// 客户端 A: 监听者
func runClientA(ctx context.Context, config TestConfig) {
	fmt.Println("\n[客户端 A] 🔗 启动监听客户端...")

	client, err := createClient(config)
	if err != nil {
		fmt.Printf("[客户端 A] ❌ 创建客户端失败: %v\n", err)
		return
	}
	defer client.Close()

	// 连接
	if err := client.Connect(); err != nil {
		fmt.Printf("[客户端 A] ❌ 连接失败: %v\n", err)
		return
	}

	// 握手
	if err := client.Handshake(); err != nil {
		fmt.Printf("[客户端 A] ❌ 握手失败: %v\n", err)
		return
	}

	// 订阅记录
	collection := "rec_" + config.TableID
	recordID := "test_record_001" // 使用测试记录ID

	if err := client.Subscribe(collection, recordID); err != nil {
		fmt.Printf("[客户端 A] ❌ 订阅失败: %v\n", err)
		return
	}

	fmt.Printf("[客户端 A] 📡 开始监听 %s.%s...\n", collection, recordID)

	// 监听消息
	client.Listen(ctx)
}

// 客户端 B: 操作者
func runClientB(ctx context.Context, config TestConfig) {
	fmt.Println("\n[客户端 B] 🔗 启动操作客户端...")

	client, err := createClient(config)
	if err != nil {
		fmt.Printf("[客户端 B] ❌ 创建客户端失败: %v\n", err)
		return
	}
	defer client.Close()

	// 连接
	if err := client.Connect(); err != nil {
		fmt.Printf("[客户端 B] ❌ 连接失败: %v\n", err)
		return
	}

	// 握手
	if err := client.Handshake(); err != nil {
		fmt.Printf("[客户端 B] ❌ 握手失败: %v\n", err)
		return
	}

	// 等待一下再发送操作
	time.Sleep(2 * time.Second)

	// 提交操作
	collection := "rec_" + config.TableID
	recordID := "test_record_001"

	// 创建测试操作：更新字段值
	op := []OTOperation{
		{
			"p":  []interface{}{"fields", "fld_test_001"},
			"oi": "新值_" + time.Now().Format("15:04:05"),
			"od": "旧值",
		},
	}

	if err := client.SubmitOp(collection, recordID, op, 1); err != nil {
		fmt.Printf("[客户端 B] ❌ 提交操作失败: %v\n", err)
		return
	}

	fmt.Printf("[客户端 B] ✅ 操作已提交: %s.%s\n", collection, recordID)

	// 再发送一个操作
	time.Sleep(1 * time.Second)

	op2 := []OTOperation{
		{
			"p":  []interface{}{"fields", "fld_test_002"},
			"oi": "另一个字段值_" + time.Now().Format("15:04:05"),
			"od": nil,
		},
	}

	if err := client.SubmitOp(collection, recordID, op2, 2); err != nil {
		fmt.Printf("[客户端 B] ❌ 提交操作失败: %v\n", err)
		return
	}

	fmt.Printf("[客户端 B] ✅ 第二个操作已提交\n")
}

// 创建客户端
func createClient(config TestConfig) (*ShareDBClient, error) {
	// 1. 获取 JWT Token
	token, err := authenticate(config.ServerURL, config.Email, config.Password)
	if err != nil {
		return nil, fmt.Errorf("认证失败: %w", err)
	}

	client := &ShareDBClient{
		token:    token,
		messages: make(chan Message, 100),
		clientID: fmt.Sprintf("client_%d", time.Now().UnixNano()),
	}

	return client, nil
}

// 认证获取 Token
func authenticate(serverURL, email, password string) (string, error) {
	loginURL := serverURL + "/api/v1/auth/login"
	
	loginData := map[string]string{
		"email":    email,
		"password": password,
	}

	jsonData, err := json.Marshal(loginData)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(loginURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("登录失败 (状态码: %d): %s", resp.StatusCode, string(body))
	}

	var authResp AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return "", err
	}

	if authResp.Code != 200000 {
		return "", fmt.Errorf("登录失败: %s", authResp.Message)
	}

	return authResp.Data.AccessToken, nil
}

// 连接 WebSocket
func (c *ShareDBClient) Connect() error {
	// 构建 WebSocket URL，将 token 作为查询参数传递
	u, err := url.Parse("ws://localhost:8080/socket")
	if err != nil {
		return err
	}
	
	// 添加 token 作为查询参数
	q := u.Query()
	q.Set("token", c.token)
	u.RawQuery = q.Encode()

	// 添加认证头（备用）
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
func (c *ShareDBClient) Handshake() error {
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

// 订阅文档
func (c *ShareDBClient) Subscribe(collection, docID string) error {
	msg := Message{
		Action:     "s", // subscribe
		Collection: collection,
		DocID:      docID,
	}

	if err := c.sendMessage(msg); err != nil {
		return err
	}

	// 等待订阅确认
	response, err := c.receiveMessage()
	if err != nil {
		return err
	}

	if response.Action != "s" {
		return fmt.Errorf("订阅响应错误: %v", response)
	}

	fmt.Printf("[%s] ✅ 订阅成功: %s.%s\n", c.clientID, collection, docID)
	return nil
}

// 提交操作
func (c *ShareDBClient) SubmitOp(collection, docID string, op []OTOperation, version int64) error {
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

// 监听消息
func (c *ShareDBClient) Listen(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			// 设置较长的读取超时
			c.conn.SetReadDeadline(time.Now().Add(5 * time.Second))
			msg, err := c.receiveMessage()
			if err != nil {
				if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					fmt.Printf("[%s] 🔌 连接已关闭\n", c.clientID)
					return
				}
				// 忽略超时错误，继续循环
				if err.Error() == "websocket: read deadline exceeded" {
					continue
				}
				fmt.Printf("[%s] ❌ 接收消息失败: %v\n", c.clientID, err)
				continue
			}

			c.handleMessage(msg)
		}
	}
}

// 处理接收到的消息
func (c *ShareDBClient) handleMessage(msg Message) {
	fmt.Printf("[%s] 📨 收到消息: Action=%s, Collection=%s, DocID=%s\n", 
		c.clientID, msg.Action, msg.Collection, msg.DocID)
		
	switch msg.Action {
	case "op":
		fmt.Printf("[%s] 📬 收到同步操作:\n", c.clientID)
		fmt.Printf("  - Collection: %s\n", msg.Collection)
		fmt.Printf("  - DocID: %s\n", msg.DocID)
		fmt.Printf("  - Version: %d\n", msg.Version)
		fmt.Printf("  - Op: %v\n", msg.Op)
		fmt.Println("  ✅ 同步成功!")
		
	case "f":
		fmt.Printf("[%s] 📄 收到快照: %s.%s\n", c.clientID, msg.Collection, msg.DocID)
		
	case "hs":
		fmt.Printf("[%s] 🤝 收到握手响应\n", c.clientID)
		
	case "s":
		fmt.Printf("[%s] 📡 收到订阅确认: %s.%s\n", c.clientID, msg.Collection, msg.DocID)
		
	default:
		fmt.Printf("[%s] ❓ 未知消息类型: %s\n", c.clientID, msg.Action)
	}
}

// 发送消息
func (c *ShareDBClient) sendMessage(msg Message) error {
	if !c.connected {
		return fmt.Errorf("客户端未连接")
	}

	return c.conn.WriteJSON(msg)
}

// 接收消息
func (c *ShareDBClient) receiveMessage() (Message, error) {
	if !c.connected {
		return Message{}, fmt.Errorf("客户端未连接")
	}

	var msg Message
	err := c.conn.ReadJSON(&msg)
	return msg, err
}

// 关闭连接
func (c *ShareDBClient) Close() {
	if c.conn != nil {
		c.conn.Close()
		c.connected = false
	}
}
