#!/bin/bash

# Link 字段标题自动更新自动化测试脚本
# 这个脚本会：
# 1. 检查服务器是否运行
# 2. 如果服务器未运行，尝试启动服务器
# 3. 执行测试
# 4. 检查日志

set -e

echo "=========================================="
echo "Link 字段标题自动更新自动化测试"
echo "=========================================="

# 配置
SERVER_URL="${SERVER_URL:-http://localhost:8080}"
LOG_FILE="/test/logs/app.log"
TEST_SCRIPT="packages/sdk/examples/run-link-field-test.ts"

# 检查服务器是否运行
echo "1. 检查服务器状态..."
if curl -s -f "$SERVER_URL/health" > /dev/null 2>&1; then
  echo "✅ 服务器正在运行"
else
  echo "⚠️  服务器未运行，尝试启动..."
  
  # 检查是否有服务器进程
  if pgrep -f "luckdb|server" > /dev/null; then
    echo "⚠️  发现服务器进程，但无法连接，等待 5 秒..."
    sleep 5
  else
    echo "❌ 服务器未运行，请手动启动服务器："
    echo "   cd server && go run cmd/server/main.go"
    echo ""
    echo "或者使用："
    echo "   cd server && make run"
    exit 1
  fi
fi

# 等待服务器完全启动
echo ""
echo "2. 等待服务器完全启动..."
for i in {1..10}; do
  if curl -s -f "$SERVER_URL/health" > /dev/null 2>&1; then
    echo "✅ 服务器已就绪"
    break
  else
    echo "   等待中... ($i/10)"
    sleep 1
  fi
done

# 检查日志文件
echo ""
echo "3. 检查日志文件..."
if [ -f "$LOG_FILE" ]; then
  echo "✅ 日志文件存在: $LOG_FILE"
  # 清空之前的 Link 相关日志（可选）
  # echo "   清空之前的 Link 相关日志..."
else
  echo "⚠️  日志文件不存在: $LOG_FILE"
  echo "   将创建日志目录..."
  mkdir -p "$(dirname "$LOG_FILE")"
fi

# 记录测试开始时间
TEST_START_TIME=$(date +%s)
echo ""
echo "4. 开始执行测试..."
echo "   测试开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 运行测试
cd packages/sdk
if npx tsx examples/run-link-field-test.ts; then
  echo ""
  echo "✅ 测试执行成功"
  TEST_SUCCESS=true
else
  echo ""
  echo "❌ 测试执行失败"
  TEST_SUCCESS=false
fi

cd ../..

# 等待一段时间，确保所有日志都已写入
echo ""
echo "5. 等待日志写入..."
sleep 3

# 检查日志
echo ""
echo "6. 检查日志输出..."
echo "----------------------------------------"

# 查找测试期间的日志
TEST_END_TIME=$(date +%s)
TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))

echo "测试持续时间: ${TEST_DURATION} 秒"
echo ""

# 检查关键日志
echo "关键日志检查:"
echo ""

# 1. 事务上下文验证
echo "📋 事务上下文验证日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(事务上下文验证|开始执行 Link)" | tail -5 || echo "  未找到相关日志"
echo ""

# 2. 查找受影响记录
echo "📋 查找受影响记录日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(开始查找受影响|找到受影响|GetAffectedRecordsByLink)" | tail -5 || echo "  未找到相关日志"
echo ""

# 3. SQL 查询日志
echo "📋 SQL 查询日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(构建 SQL WHERE|执行 SQL 查询|查找 Link 字段值)" | tail -5 || echo "  未找到相关日志"
echo ""

# 4. SQL 更新日志
echo "📋 SQL 更新日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(执行.*格式 Link 字段标题更新|批量更新.*格式 Link 字段标题)" | tail -5 || echo "  未找到相关日志"
echo ""

# 5. 错误日志
echo "📋 错误日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(❌|ERROR|失败)" | grep -i "link" | tail -5 || echo "  未找到错误日志"
echo ""

# 总结
echo "=========================================="
if [ "$TEST_SUCCESS" = true ]; then
  echo "✅ 测试完成"
  echo ""
  echo "请检查上面的日志输出，确认："
  echo "  1. 事务上下文验证成功"
  echo "  2. 找到受影响的记录"
  echo "  3. SQL 更新成功"
  echo "  4. Link 字段的 title 已自动更新"
else
  echo "❌ 测试失败"
  echo ""
  echo "请检查："
  echo "  1. 服务器是否正常运行"
  echo "  2. 日志文件中的错误信息"
  echo "  3. 测试脚本的输出"
fi
echo "=========================================="







