#!/bin/bash

# MCP Server 测试脚本

set -e

MCP_SERVER_URL="http://localhost:8081"

echo "🧪 Testing LuckDB MCP Server..."

# 检查服务器是否运行
echo "📡 Checking if MCP Server is running..."
if ! curl -f -s "$MCP_SERVER_URL/health" > /dev/null; then
    echo "❌ MCP Server is not running. Please start it first with:"
    echo "   ./scripts/start-mcp.sh"
    exit 1
fi

echo "✅ MCP Server is running"

# 测试健康检查
echo "🏥 Testing health check..."
curl -s "$MCP_SERVER_URL/health" | jq '.'
echo ""

# 测试就绪检查
echo "🔍 Testing readiness check..."
curl -s "$MCP_SERVER_URL/ready" | jq '.'
echo ""

# 测试服务器能力
echo "⚡ Testing server capabilities..."
curl -s "$MCP_SERVER_URL/mcp/capabilities" | jq '.'
echo ""

# 测试已注册的方法
echo "📋 Testing registered methods..."
curl -s "$MCP_SERVER_URL/admin/methods" | jq '.'
echo ""

# 测试初始化请求
echo "🚀 Testing initialize request..."
INIT_REQUEST='{
  "jsonrpc": "2.0",
  "id": "test-1",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "Test Client",
      "version": "1.0.0"
    }
  }
}'

curl -s -X POST "$MCP_SERVER_URL/mcp/" \
  -H "Content-Type: application/json" \
  -d "$INIT_REQUEST" | jq '.'
echo ""

# 测试工具列表请求
echo "🔧 Testing tools list request..."
TOOLS_REQUEST='{
  "jsonrpc": "2.0",
  "id": "test-2",
  "method": "tools/list",
  "params": {}
}'

curl -s -X POST "$MCP_SERVER_URL/mcp/" \
  -H "Content-Type: application/json" \
  -d "$TOOLS_REQUEST" | jq '.'
echo ""

# 测试资源列表请求
echo "📚 Testing resources list request..."
RESOURCES_REQUEST='{
  "jsonrpc": "2.0",
  "id": "test-3",
  "method": "resources/list",
  "params": {}
}'

curl -s -X POST "$MCP_SERVER_URL/mcp/" \
  -H "Content-Type: application/json" \
  -d "$RESOURCES_REQUEST" | jq '.'
echo ""

# 测试提示列表请求
echo "💡 Testing prompts list request..."
PROMPTS_REQUEST='{
  "jsonrpc": "2.0",
  "id": "test-4",
  "method": "prompts/list",
  "params": {}
}'

curl -s -X POST "$MCP_SERVER_URL/mcp/" \
  -H "Content-Type: application/json" \
  -d "$PROMPTS_REQUEST" | jq '.'
echo ""

# 测试工具调用请求
echo "🎯 Testing tool call request..."
TOOL_CALL_REQUEST='{
  "jsonrpc": "2.0",
  "id": "test-5",
  "method": "tools/call",
  "params": {
    "name": "query_records",
    "arguments": {
      "space_id": "test_space",
      "table_id": "test_table"
    }
  }
}'

curl -s -X POST "$MCP_SERVER_URL/mcp/" \
  -H "Content-Type: application/json" \
  -d "$TOOL_CALL_REQUEST" | jq '.'
echo ""

# 测试无效方法请求
echo "❌ Testing invalid method request..."
INVALID_REQUEST='{
  "jsonrpc": "2.0",
  "id": "test-6",
  "method": "invalid_method",
  "params": {}
}'

curl -s -X POST "$MCP_SERVER_URL/mcp/" \
  -H "Content-Type: application/json" \
  -d "$INVALID_REQUEST" | jq '.'
echo ""

echo "🎉 All tests completed!"
echo ""
echo "📊 Server status:"
curl -s "$MCP_SERVER_URL/admin/status" | jq '.'

