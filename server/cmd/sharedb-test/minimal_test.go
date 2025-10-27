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

// 最小化测试
func main() {
	fmt.Println("🧪 ShareDB 最小化测试")
	fmt.Println("====================")

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

	// 4. 发送一个简单的操作（不等待响应）
	fmt.Println("\n4️⃣ 发送简单操作...")
	operationMsg := map[string]interface{}{
		"a": "op",
		"c": "rec_tbl_oz9EbQgbTZBuF7FSSJvet",
		"d": "test_record_001",
		"v": 1,
		"op": []map[string]interface{}{
			{
				"p":  []string{"fields", "test_field"},
				"oi": "Hello from minimal test!",
			},
		},
	}

	fmt.Printf("📤 发送操作: %+v\n", operationMsg)
	
	if err := conn.WriteJSON(operationMsg); err != nil {
		fmt.Printf("❌ 发送操作失败: %v\n", err)
		return
	}
	
	fmt.Println("✅ 操作已发送")

	// 5. 等待一下看看是否有任何响应
	fmt.Println("\n5️⃣ 等待响应（5秒）...")
	timeout := time.After(5 * time.Second)
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-timeout:
			fmt.Println("⏰ 等待超时，没有收到响应")
			return
		case <-ticker.C:
			conn.SetReadDeadline(time.Now().Add(50 * time.Millisecond))
			var response map[string]interface{}
			if err := conn.ReadJSON(&response); err != nil {
				// 忽略超时错误
				continue
			}
			fmt.Printf("📬 收到响应: %+v\n", response)
			return
		}
	}
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
