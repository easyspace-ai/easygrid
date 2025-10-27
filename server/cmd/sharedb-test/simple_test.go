package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// 简化的测试：只测试 WebSocket 连接和基本消息
func main() {
	fmt.Println("🧪 ShareDB 简化测试")
	fmt.Println("==================")

	// 1. 测试认证
	fmt.Println("1️⃣ 测试认证...")
	token, err := testAuth()
	if err != nil {
		fmt.Printf("❌ 认证失败: %v\n", err)
		return
	}
	fmt.Printf("✅ 认证成功，Token: %s...\n", token[:20])

	// 2. 测试 WebSocket 连接
	fmt.Println("\n2️⃣ 测试 WebSocket 连接...")
	conn, err := testWebSocketConnection(token)
	if err != nil {
		fmt.Printf("❌ WebSocket 连接失败: %v\n", err)
		return
	}
	defer conn.Close()
	fmt.Println("✅ WebSocket 连接成功")

	// 3. 测试握手
	fmt.Println("\n3️⃣ 测试握手...")
	if err := testHandshake(conn); err != nil {
		fmt.Printf("❌ 握手失败: %v\n", err)
		return
	}
	fmt.Println("✅ 握手成功")

	// 4. 测试消息接收（短时间）
	fmt.Println("\n4️⃣ 测试消息接收（5秒）...")
	testMessageReceive(conn, 5*time.Second)

	fmt.Println("\n🎉 简化测试完成")
}

func testAuth() (string, error) {
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

func testWebSocketConnection(token string) (*websocket.Conn, error) {
	// 构建 WebSocket URL
	url := fmt.Sprintf("ws://localhost:8080/socket?token=%s", token)

	// 添加认证头
	headers := make(map[string][]string)
	headers["Authorization"] = []string{"Bearer " + token}

	// 连接 WebSocket
	conn, _, err := websocket.DefaultDialer.Dial(url, headers)
	if err != nil {
		return nil, err
	}

	return conn, nil
}

func testHandshake(conn *websocket.Conn) error {
	// 发送握手消息
	handshakeMsg := map[string]interface{}{
		"a": "hs", // handshake
	}

	if err := conn.WriteJSON(handshakeMsg); err != nil {
		return err
	}

	// 等待握手响应
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	var response map[string]interface{}
	if err := conn.ReadJSON(&response); err != nil {
		return err
	}

	fmt.Printf("📨 握手响应: %+v\n", response)

	if action, ok := response["a"].(string); !ok || action != "hs" {
		return fmt.Errorf("握手响应错误: %v", response)
	}

	return nil
}

func testMessageReceive(conn *websocket.Conn, duration time.Duration) {
	timeout := time.After(duration)
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-timeout:
			fmt.Println("⏰ 消息接收测试超时")
			return
		case <-ticker.C:
			// 尝试读取消息（非阻塞）
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
