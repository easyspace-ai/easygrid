#!/bin/bash

# MCP Server 启动脚本

set -e

echo "🚀 Starting LuckDB MCP Server..."

# 检查 Go 环境
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed or not in PATH"
    exit 1
fi

# 检查配置文件
if [ ! -f "config.yaml" ]; then
    echo "❌ config.yaml not found"
    exit 1
fi

# 设置环境变量
export LUCKDB_ENV=development
export JWT_SECRET=dev-secret-key-change-in-production

# 构建 MCP 服务器
echo "📦 Building MCP Server..."
go build -o bin/mcp-server ./cmd/mcp-server

# 启动 MCP 服务器
echo "🎯 Starting MCP Server on port 8081..."
./bin/mcp-server

echo "✅ MCP Server started successfully!"

