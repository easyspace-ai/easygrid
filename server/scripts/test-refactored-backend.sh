#!/bin/bash

# 重构后端测试脚本
echo "🚀 开始测试重构后的后端功能..."

# 检查服务器是否运行
echo "📡 检查服务器状态..."
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo "❌ 服务器未运行，请先启动服务器"
    echo "💡 运行命令: cd server && go run cmd/server/main.go"
    exit 1
fi

echo "✅ 服务器正在运行"

# 进入测试目录
cd cmd/sharedb-test

# 编译测试程序
echo "🔨 编译测试程序..."
go build -o refactored_test refactored_test.go main.go

if [ $? -ne 0 ]; then
    echo "❌ 编译失败"
    exit 1
fi

echo "✅ 编译成功"

# 运行测试
echo "🧪 运行重构后端测试..."
./refactored_test

# 清理
echo "🧹 清理临时文件..."
rm -f refactored_test

echo "✅ 测试完成"
