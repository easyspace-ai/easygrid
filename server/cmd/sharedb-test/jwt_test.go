package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// 测试 JWT 验证
func main() {
	fmt.Println("🧪 JWT 验证测试")
	fmt.Println("===============")

	// 1. 认证获取 token
	fmt.Println("1️⃣ 获取 JWT Token...")
	token, err := authenticate()
	if err != nil {
		fmt.Printf("❌ 认证失败: %v\n", err)
		return
	}
	fmt.Printf("✅ 认证成功，Token: %s...\n", token[:30])

	// 2. 测试 JWT 验证
	fmt.Println("\n2️⃣ 测试 JWT 验证...")
	if err := testJWTValidation(token); err != nil {
		fmt.Printf("❌ JWT 验证失败: %v\n", err)
		return
	}
	fmt.Println("✅ JWT 验证成功")

	// 3. 测试 WebSocket 连接
	fmt.Println("\n3️⃣ 测试 WebSocket 连接...")
	if err := testWebSocketConnection(token); err != nil {
		fmt.Printf("❌ WebSocket 连接失败: %v\n", err)
		return
	}
	fmt.Println("✅ WebSocket 连接成功")

	fmt.Println("\n🎉 JWT 测试完成")
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

func testJWTValidation(token string) error {
	// 测试一个需要认证的 API 端点
	req, err := http.NewRequest("GET", "http://localhost:8080/api/v1/auth/me", nil)
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", "Bearer "+token)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("JWT 验证失败 (状态码: %d): %s", resp.StatusCode, string(body))
	}

	var userResp struct {
		Code int `json:"code"`
		Data struct {
			User struct {
				ID    string `json:"id"`
				Email string `json:"email"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userResp); err != nil {
		return err
	}

	if userResp.Code != 200000 {
		return fmt.Errorf("JWT 验证失败，代码: %d", userResp.Code)
	}

	fmt.Printf("✅ 用户信息: ID=%s, Email=%s\n", userResp.Data.User.ID, userResp.Data.User.Email)
	return nil
}

func testWebSocketConnection(token string) error {
	// 测试 WebSocket 连接（只连接，不发送消息）
	url := fmt.Sprintf("ws://localhost:8080/socket?token=%s", token)
	headers := make(map[string][]string)
	headers["Authorization"] = []string{"Bearer " + token}

	conn, _, err := websocket.DefaultDialer.Dial(url, headers)
	if err != nil {
		return err
	}
	defer conn.Close()

	// 发送握手消息
	handshakeMsg := map[string]interface{}{
		"a": "hs",
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
	return nil
}
