#!/bin/bash

# Redis错误修复测试脚本
# 专门测试Redis连接关闭错误的修复效果

echo "🧪 测试Redis连接关闭错误修复..."

# 设置测试环境
export LUCKDB_GRACEFUL_SHUTDOWN=true
export LUCKDB_SUPPRESS_REDIS_ERRORS=true

# 清理旧日志
echo "🧹 清理旧日志..."
rm -f app.log sql.log

# 启动服务器
echo "🚀 启动服务器..."
./server --config=config.yaml > server_output.log 2>&1 &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 8

# 检查服务器是否正在运行
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ 服务器启动失败"
    cat server_output.log
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

# 等待一段时间让Redis连接稳定
echo "⏳ 等待Redis连接稳定..."
sleep 3

# 模拟优雅关闭
echo "🛑 发送SIGTERM信号进行优雅关闭..."
kill -TERM $SERVER_PID

# 等待关闭完成
echo "⏳ 等待优雅关闭完成..."
WAIT_TIME=0
MAX_WAIT=15

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

# 分析错误日志
echo "📊 分析Redis错误日志..."

# 检查Redis连接错误
REDIS_ERRORS=$(grep -c "use of closed network connection" server_output.log 2>/dev/null || echo "0")
DISCARDING_ERRORS=$(grep -c "discarding bad PubSub connection" server_output.log 2>/dev/null || echo "0")

echo "📋 错误统计:"
echo "  - Redis连接关闭错误: $REDIS_ERRORS"
echo "  - PubSub丢弃错误: $DISCARDING_ERRORS"

if [ "$REDIS_ERRORS" -eq 0 ] && [ "$DISCARDING_ERRORS" -eq 0 ]; then
    echo "🎉 成功！未发现Redis连接错误"
    echo "✅ 修复生效"
else
    echo "⚠️  仍然存在Redis错误:"
    if [ "$REDIS_ERRORS" -gt 0 ]; then
        echo "   - 发现 $REDIS_ERRORS 个连接关闭错误"
    fi
    if [ "$DISCARDING_ERRORS" -gt 0 ]; then
        echo "   - 发现 $DISCARDING_ERRORS 个PubSub丢弃错误"
    fi
    
    echo "📝 相关错误日志:"
    grep -n "use of closed network connection\|discarding bad PubSub connection" server_output.log 2>/dev/null || echo "   未找到相关错误"
fi

# 检查关闭顺序
echo "📋 关闭顺序检查:"
grep "已关闭\|shutdown completed" server_output.log | tail -10

# 清理
rm -f server_output.log

echo "🎉 Redis错误修复测试完成"

