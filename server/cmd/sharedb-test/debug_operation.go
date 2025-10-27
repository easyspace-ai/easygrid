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

// 调试操作测试
func main() {
	fmt.Println("🧪 ShareDB 调试操作测试")
	fmt.Println("======================")

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

	// 4. 提交操作并立即检查连接状态
	fmt.Println("\n4️⃣ 提交操作...")
	if err := submitOperationWithDebug(conn); err != nil {
		fmt.Printf("❌ 操作提交失败: %v\n", err)
		return
	}
	fmt.Println("✅ 操作已提交")

	// 5. 尝试读取响应（短超时）
	fmt.Println("\n5️⃣ 尝试读取响应...")
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var response map[string]interface{}
	if err := conn.ReadJSON(&response); err != nil {
		fmt.Printf("❌ 读取响应失败: %v\n", err)
	} else {
		fmt.Printf("✅ 收到响应: %+v\n", response)
	}

	fmt.Println("\n🎉 调试操作测试完成")
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

func submitOperationWithDebug(conn *websocket.Conn) error {
	// 创建 JSON0 OT 操作
	op := []map[string]interface{}{
		{
			"p":  []string{"fields", "test_field"},
			"oi": "Hello from debug operation test!",
			"od": "old_value",
		},
	}

	operationMsg := map[string]interface{}{
		"a": "op",
		"c": "rec_tbl_oz9EbQgbTZBuF7FSSJvet",
		"d": "test_record_001",
		"v": 1,
		"op": op,
	}

	fmt.Printf("📤 发送操作: %+v\n", operationMsg)
	
	// 检查连接状态
	if err := conn.WriteJSON(operationMsg); err != nil {
		fmt.Printf("❌ 发送操作失败: %v\n", err)
		return err
	}
	
	fmt.Println("✅ 操作已发送到服务器")
	return nil
}
