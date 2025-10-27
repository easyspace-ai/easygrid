#!/bin/bash

# 优雅关闭测试脚本
# 用于测试服务关闭时的错误处理和资源清理

echo "🧪 测试优雅关闭功能..."

# 设置测试环境
export LUCKDB_GRACEFUL_SHUTDOWN=true
export LUCKDB_SHUTDOWN_TIMEOUT=30s

# 启动服务器
echo "🚀 启动服务器..."
./server --config=config.yaml &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 5

# 检查服务器是否正在运行
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ 服务器启动失败"
    exit 1
fi

echo "✅ 服务器已启动 (PID: $SERVER_PID)"

# 测试健康检查
echo "🔍 测试健康检查..."
curl -s http://localhost:2345/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ 健康检查通过"
else
    echo "⚠️  健康检查失败，但继续测试"
fi

# 模拟优雅关闭
echo "🛑 发送SIGTERM信号进行优雅关闭..."
kill -TERM $SERVER_PID

# 等待关闭完成
echo "⏳ 等待优雅关闭完成..."
WAIT_TIME=0
MAX_WAIT=30

while kill -0 $SERVER_PID 2>/dev/null && [ $WAIT_TIME -lt $MAX_WAIT ]; do
    sleep 1
    WAIT_TIME=$((WAIT_TIME + 1))
    echo "   等待中... ${WAIT_TIME}s"
done

# 检查关闭结果
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ 优雅关闭超时，强制终止"
    kill -KILL $SERVER_PID
    exit 1
else
    echo "✅ 优雅关闭成功"
fi

# 检查日志中的错误
echo "📊 分析关闭日志..."
if [ -f "app.log" ]; then
    # 检查是否有Redis连接错误
    REDIS_ERRORS=$(grep -c "use of closed network connection" app.log || echo "0")
    if [ "$REDIS_ERRORS" -gt 0 ]; then
        echo "⚠️  发现 $REDIS_ERRORS 个Redis连接错误"
    else
        echo "✅ 未发现Redis连接错误"
    fi
    
    # 检查关闭顺序
    echo "📋 关闭顺序检查:"
    grep "已关闭" app.log | tail -10
else
    echo "⚠️  未找到日志文件"
fi

echo "🎉 优雅关闭测试完成"

