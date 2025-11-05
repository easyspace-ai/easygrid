#!/bin/bash
# MCP 诊断脚本
# 用于排查 Cursor 中 MCP 服务器 "Loading tools" 的问题

echo "=== MCP 服务诊断 ==="
echo ""

# 1. 检查健康状态
echo "1. 检查健康状态..."
HEALTH_RESPONSE=$(curl -s http://localhost:8080/api/mcp/v1/health)
if [ "$HEALTH_RESPONSE" = '{"status":"ok"}' ]; then
    echo "✅ 服务运行正常"
else
    echo "❌ 服务未运行或响应异常: $HEALTH_RESPONSE"
fi
echo ""

# 2. 检查 API Key
echo "2. 检查 API Key..."
API_KEY_FILE="$HOME/.easygrid/api-key"
if [ -f "$API_KEY_FILE" ]; then
    echo "✅ API Key 文件存在"
    API_KEY=$(cat "$API_KEY_FILE")
    if [[ "$API_KEY" == *":"* ]]; then
        echo "✅ API Key 格式正确（包含冒号）"
        KEY_ID=$(echo "$API_KEY" | cut -d: -f1)
        SECRET=$(echo "$API_KEY" | cut -d: -f2)
        echo "   Key ID 长度: ${#KEY_ID}"
        echo "   Secret 长度: ${#SECRET}"
    else
        echo "❌ API Key 格式错误（应为 key_id:secret）"
    fi
else
    echo "❌ API Key 文件不存在: $API_KEY_FILE"
    echo "   运行: go run server/cmd/mcp-api-key/main.go -action=create"
fi
echo ""

# 3. 测试工具列表
echo "3. 测试工具列表端点..."
if [ -f "$API_KEY_FILE" ]; then
    API_KEY=$(cat "$API_KEY_FILE")
    TOOLS_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/mcp/v1/tools" \
        -H "X-MCP-API-Key: $API_KEY")
    
    if echo "$TOOLS_RESPONSE" | grep -q '"tools"'; then
        TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('tools', [])))" 2>/dev/null)
        if [ -n "$TOOL_COUNT" ]; then
            echo "✅ 工具列表端点正常，找到 $TOOL_COUNT 个工具"
        else
            echo "✅ 工具列表端点正常"
        fi
    else
        echo "❌ 工具列表端点返回错误: $TOOLS_RESPONSE"
    fi
else
    echo "⚠️  跳过（API Key 不存在）"
fi
echo ""

# 4. 测试 JSON-RPC initialize
echo "4. 测试 JSON-RPC initialize..."
if [ -f "$API_KEY_FILE" ]; then
    API_KEY=$(cat "$API_KEY_FILE")
    INIT_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/mcp/v1" \
        -H "X-MCP-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}')
    
    if echo "$INIT_RESPONSE" | grep -q '"protocolVersion"'; then
        echo "✅ initialize 方法正常"
    else
        echo "❌ initialize 方法返回错误: $INIT_RESPONSE"
    fi
else
    echo "⚠️  跳过（API Key 不存在）"
fi
echo ""

# 5. 测试 JSON-RPC tools/list
echo "5. 测试 JSON-RPC tools/list..."
if [ -f "$API_KEY_FILE" ]; then
    API_KEY=$(cat "$API_KEY_FILE")
    TOOLS_LIST_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/mcp/v1" \
        -H "X-MCP-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')
    
    if echo "$TOOLS_LIST_RESPONSE" | grep -q '"tools"'; then
        TOOL_COUNT=$(echo "$TOOLS_LIST_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('result', {}).get('tools', [])))" 2>/dev/null)
        if [ -n "$TOOL_COUNT" ]; then
            echo "✅ tools/list 方法正常，返回 $TOOL_COUNT 个工具"
        else
            echo "✅ tools/list 方法正常"
        fi
    else
        echo "❌ tools/list 方法返回错误: $TOOLS_LIST_RESPONSE"
    fi
else
    echo "⚠️  跳过（API Key 不存在）"
fi
echo ""

# 6. 检查 Cursor 配置
echo "6. 检查 Cursor 配置..."
CURSOR_MCP_JSON="$HOME/.cursor/mcp.json"
PROJECT_MCP_JSON="$(pwd)/.cursor/mcp.json"

if [ -f "$CURSOR_MCP_JSON" ]; then
    echo "✅ 全局 Cursor 配置文件存在: $CURSOR_MCP_JSON"
    if command -v jq &> /dev/null; then
        EASYGRID_CONFIG=$(jq '.mcpServers["easygrid"] // .mcpServers["easygrid-mcp"]' "$CURSOR_MCP_JSON" 2>/dev/null)
        if [ "$EASYGRID_CONFIG" != "null" ] && [ -n "$EASYGRID_CONFIG" ]; then
            echo "✅ easygrid 服务器配置存在"
            URL=$(echo "$EASYGRID_CONFIG" | jq -r '.url // empty' 2>/dev/null)
            API_KEY_CONFIG=$(echo "$EASYGRID_CONFIG" | jq -r '.headers["X-MCP-API-Key"] // empty' 2>/dev/null)
            if [ -n "$URL" ]; then
                echo "   URL: $URL"
            else
                echo "   ⚠️  URL 未配置"
            fi
            if [ -n "$API_KEY_CONFIG" ]; then
                if [[ "$API_KEY_CONFIG" == *":"* ]]; then
                    echo "   ✅ API Key 已配置且格式正确"
                else
                    echo "   ❌ API Key 格式错误"
                fi
            else
                echo "   ⚠️  API Key 未配置"
            fi
        else
            echo "❌ easygrid 服务器配置不存在"
        fi
    else
        echo "⚠️  jq 未安装，无法解析配置"
    fi
elif [ -f "$PROJECT_MCP_JSON" ]; then
    echo "✅ 项目级 Cursor 配置文件存在: $PROJECT_MCP_JSON"
else
    echo "❌ Cursor 配置文件不存在"
fi
echo ""

# 7. 检查端口
echo "7. 检查端口..."
if command -v lsof &> /dev/null; then
    PORT_CHECK=$(lsof -i :8080 2>/dev/null)
    if [ -n "$PORT_CHECK" ]; then
        echo "✅ 端口 8080 正在监听"
    else
        echo "❌ 端口 8080 未监听"
    fi
else
    echo "⚠️  lsof 未安装，无法检查端口"
fi
echo ""

# 8. 总结和建议
echo "=== 诊断总结 ==="
echo ""
echo "如果以上检查都通过，但 Cursor 仍然显示 'Loading tools'，请尝试："
echo "1. 重启 Cursor 应用"
echo "2. 检查 Cursor 的 MCP 服务器配置是否正确（确保 URL 和 API Key 正确）"
echo "3. 查看 Cursor 的开发者工具或日志（如果有）"
echo "4. 确认 Cursor 版本支持 MCP HTTP 协议"
echo "5. 尝试使用脚本更新配置："
echo "   python3 server/scripts/update_cursor_mcp_config.py"
echo ""

