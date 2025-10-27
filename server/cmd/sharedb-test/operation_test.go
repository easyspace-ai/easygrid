package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// 测试操作提交和发布
func main() {
	fmt.Println("🧪 ShareDB 操作测试")
	fmt.Println("==================")

	// 1. 认证
	fmt.Println("1️⃣ 认证...")
	token, err := authenticate()
	if err != nil {
		fmt.Printf("❌ 认证失败: %v\n", err)
		return
	}
	fmt.Printf("✅ 认证成功\n")

	// 2. 连接 WebSocket
	fmt.Println("\n2️⃣ 连接 WebSocket...")
	conn, err := connectWebSocket(token)
	if err != nil {
		fmt.Printf("❌ WebSocket 连接失败: %v\n", err)
		return
	}
	defer conn.Close()
	fmt.Println("✅ WebSocket 连接成功")

	// 3. 握手
	fmt.Println("\n3️⃣ 握手...")
	if err := handshake(conn); err != nil {
		fmt.Printf("❌ 握手失败: %v\n", err)
		return
	}
	fmt.Println("✅ 握手成功")

	// 4. 订阅
	fmt.Println("\n4️⃣ 订阅文档...")
	collection := "rec_tbl_oz9EbQgbTZBuF7FSSJvet"
	docID := "test_record_001"
	
	if err := subscribe(conn, collection, docID); err != nil {
		fmt.Printf("❌ 订阅失败: %v\n", err)
		return
	}
	fmt.Printf("✅ 订阅成功: %s.%s\n", collection, docID)

	// 5. 提交操作
	fmt.Println("\n5️⃣ 提交操作...")
	if err := submitOperation(conn, collection, docID); err != nil {
		fmt.Printf("❌ 操作提交失败: %v\n", err)
		return
	}
	fmt.Println("✅ 操作已提交")

	// 6. 监听消息（5秒）
	fmt.Println("\n6️⃣ 监听消息（5秒）...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	listenForMessages(conn, ctx)

	fmt.Println("\n🎉 操作测试完成")
}

func authenticate() (string, error) {
	loginURL := "http://localhost:8080/api/v1/auth/login"
	loginData := map[string]string{
		"email":    "admin@126.com",
		"password": "Pmker123",
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

	var authResp struct {
		Code int `json:"code"`
		Data struct {
			AccessToken string `json:"accessToken"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return "", err
	}

	if authResp.Code != 200000 {
		return "", fmt.Errorf("登录失败，代码: %d", authResp.Code)
	}

	return authResp.Data.AccessToken, nil
}

func connectWebSocket(token string) (*websocket.Conn, error) {
	url := fmt.Sprintf("ws://localhost:8080/socket?token=%s", token)
	headers := make(map[string][]string)
	headers["Authorization"] = []string{"Bearer " + token}

	conn, _, err := websocket.DefaultDialer.Dial(url, headers)
	return conn, err
}

func handshake(conn *websocket.Conn) error {
	handshakeMsg := map[string]interface{}{
		"a": "hs",
	}

	if err := conn.WriteJSON(handshakeMsg); err != nil {
		return err
	}

	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	var response map[string]interface{}
	if err := conn.ReadJSON(&response); err != nil {
		return err
	}

	fmt.Printf("📨 握手响应: %+v\n", response)
	return nil
}

func subscribe(conn *websocket.Conn, collection, docID string) error {
	subscribeMsg := map[string]interface{}{
		"a": "s",
		"c": collection,
		"d": docID,
	}

	if err := conn.WriteJSON(subscribeMsg); err != nil {
		return err
	}

	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	var response map[string]interface{}
	if err := conn.ReadJSON(&response); err != nil {
		return err
	}

	fmt.Printf("📨 订阅响应: %+v\n", response)
	return nil
}

func submitOperation(conn *websocket.Conn, collection, docID string) error {
	// 创建 JSON0 OT 操作
	op := []map[string]interface{}{
		{
			"p":  []string{"fields", "test_field"},
			"oi": "Hello from operation test!",
			"od": "old_value",
		},
	}

	operationMsg := map[string]interface{}{
		"a": "op",
		"c": collection,
		"d": docID,
		"v": 1,
		"op": op,
	}

	if err := conn.WriteJSON(operationMsg); err != nil {
		return err
	}

	// 等待操作响应
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	var response map[string]interface{}
	if err := conn.ReadJSON(&response); err != nil {
		return err
	}

	fmt.Printf("📨 操作响应: %+v\n", response)
	return nil
}

func listenForMessages(conn *websocket.Conn, ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			fmt.Println("⏰ 监听超时")
			return
		case <-ticker.C:
			conn.SetReadDeadline(time.Now().Add(100 * time.Millisecond))
			var msg map[string]interface{}
			if err := conn.ReadJSON(&msg); err != nil {
				if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					fmt.Println("🔌 连接已关闭")
					return
				}
				// 忽略超时错误
				continue
			}
			fmt.Printf("📬 收到消息: %+v\n", msg)
		}
	}
}
