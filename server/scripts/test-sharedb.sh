#!/bin/bash

# ShareDB 测试脚本

echo "🚀 ShareDB 实时协作测试"
echo "================================"

# 检查服务器是否运行
echo "🔍 检查服务器状态..."
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ 服务器正在运行"
else
    echo "❌ 服务器未运行，请先启动服务器："
    echo "   cd server && go run cmd/server/main.go"
    exit 1
fi

echo ""
echo "📋 测试配置："
echo "  - 服务器: http://localhost:8080"
echo "  - 账号: admin@126.com"
echo "  - Table ID: tbl_oz9EbQgbTZBuF7FSSJvet"
echo "  - 测试记录: test_record_001"
echo ""

echo "🧪 开始测试..."
echo "================================"

# 运行测试客户端
cd "$(dirname "$0")/.."
go run cmd/sharedb-test/main.go
