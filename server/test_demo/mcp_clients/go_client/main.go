package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/user"
	"path/filepath"
	"strings"
)

type ToolInvokeReq struct {
	ID    string                 `json:"id"`
	Input map[string]interface{} `json:"input"`
}

func main() {
	baseURL := os.Getenv("MCP_BASE_URL") // e.g. http://localhost:8080/api/mcp/v1
	if baseURL == "" {
		fmt.Println("set MCP_BASE_URL")
		os.Exit(1)
	}

	// 优先从 ~/.easygrid/api-key 读取，fallback 到环境变量
	apiKey := getAPIKey()
	if apiKey == "" {
		fmt.Println("API Key not found. Set MCP_API_KEY env var or run: mcp-api-key -action=create")
		os.Exit(1)
	}

	// list tools
	doGET(baseURL+"/tools", apiKey)

	// example: base.list
	invoke := ToolInvokeReq{ID: "req-1", Input: map[string]interface{}{"spaceId": "default"}}
	doPOST(baseURL+"/tools/base.list/invoke", apiKey, invoke)
}

func doGET(url, apiKey string) {
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("X-MCP-API-Key", apiKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("GET error:", err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println("GET", url, resp.Status, string(body))
}

func doPOST(url, apiKey string, payload any) {
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-MCP-API-Key", apiKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("POST error:", err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println("POST", url, resp.Status, string(body))
}

// getAPIKey 优先从 ~/.easygrid/api-key 读取，fallback 到环境变量
func getAPIKey() string {
	// 先尝试环境变量
	if key := os.Getenv("MCP_API_KEY"); key != "" {
		return key
	}

	// 尝试从 ~/.easygrid/api-key 读取
	usr, err := user.Current()
	if err != nil {
		return ""
	}

	filePath := filepath.Join(usr.HomeDir, ".easygrid", "api-key")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return ""
	}

	return strings.TrimSpace(string(data))
}
