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

// 调试服务器端处理
func main() {
	fmt.Println("🧪 ShareDB 服务器端调试")
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

	// 4. 订阅
	fmt.Println("\n4️⃣ 订阅文档...")
	if err := subscribe(conn); err != nil {
		fmt.Printf("❌ 订阅失败: %v\n", err)
		return
	}
	fmt.Println("✅ 订阅成功")

	// 5. 提交操作并等待响应
	fmt.Println("\n5️⃣ 提交操作...")
	if err := submitOperationAndWait(conn); err != nil {
		fmt.Printf("❌ 操作提交失败: %v\n", err)
		return
	}

	fmt.Println("\n🎉 服务器端调试完成")
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

func subscribe(conn *websocket.Conn) error {
	subscribeMsg := map[string]interface{}{
		"a": "s",
		"c": "rec_tbl_oz9EbQgbTZBuF7FSSJvet",
		"d": "test_record_001",
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

func submitOperationAndWait(conn *websocket.Conn) error {
	// 创建操作
	operationMsg := map[string]interface{}{
		"a": "op",
		"c": "rec_tbl_oz9EbQgbTZBuF7FSSJvet",
		"d": "test_record_001",
		"v": 1,
		"op": []map[string]interface{}{
			{
				"p":  []string{"fields", "test_field"},
				"oi": "Hello from debug server test!",
			},
		},
	}

	fmt.Printf("📤 发送操作: %+v\n", operationMsg)
	
	if err := conn.WriteJSON(operationMsg); err != nil {
		return err
	}
	
	fmt.Println("✅ 操作已发送")

	// 等待响应（10秒）
	fmt.Println("⏳ 等待服务器响应（10秒）...")
	timeout := time.After(10 * time.Second)
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-timeout:
			fmt.Println("⏰ 等待超时，没有收到响应")
			return nil
		case <-ticker.C:
			conn.SetReadDeadline(time.Now().Add(50 * time.Millisecond))
			var response map[string]interface{}
			if err := conn.ReadJSON(&response); err != nil {
				// 忽略超时错误
				continue
			}
			fmt.Printf("📬 收到响应: %+v\n", response)
			return nil
		}
	}
}
