#!/bin/bash
# 自动从 ~/.easygrid/api-key 读取并更新 ~/.cursor/mcp.json

MCP_JSON="$HOME/.cursor/mcp.json"
API_KEY_FILE="$HOME/.easygrid/api-key"

if [ ! -f "$API_KEY_FILE" ]; then
  echo "Error: API Key file not found at $API_KEY_FILE"
  echo "Run: go run server/cmd/mcp-api-key/main.go -action=create"
  exit 1
fi

API_KEY=$(cat "$API_KEY_FILE" | tr -d '\n')

if [ -z "$API_KEY" ]; then
  echo "Error: API Key is empty"
  exit 1
fi

# 使用 jq 更新配置（如果安装了）
if command -v jq &> /dev/null; then
  # 备份原配置
  cp "$MCP_JSON" "${MCP_JSON}.bak"
  
  # 更新 easygrid-mcp 的 headers
  jq --arg key "$API_KEY" '.mcpServers["easygrid-mcp"].headers["X-MCP-API-Key"] = $key' "$MCP_JSON" > "${MCP_JSON}.tmp" && mv "${MCP_JSON}.tmp" "$MCP_JSON"
  
  echo "✅ Updated ~/.cursor/mcp.json with API Key from ~/.easygrid/api-key"
  echo "Please restart Cursor to apply changes"
else
  echo "jq not found. Install jq: brew install jq"
  echo "Or manually update ~/.cursor/mcp.json with:"
  echo "  X-MCP-API-Key: $API_KEY"
fi

