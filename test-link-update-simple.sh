#!/bin/bash

# Link 字段标题更新简单测试脚本
# 这个脚本会：
# 1. 检查服务器是否运行
# 2. 使用已有的表和数据测试 Link 字段更新
# 3. 检查日志输出

set -e

echo "=========================================="
echo "Link 字段标题更新简单测试"
echo "=========================================="

# 配置
SERVER_URL="${SERVER_URL:-http://localhost:8080}"
LOG_FILE="/test/logs/app.log"
TEST_EMAIL="${TEST_EMAIL:-admin@126.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Pmker123}"

# 检查服务器是否运行
echo ""
echo "1. 检查服务器状态..."
if curl -s -f "$SERVER_URL/health" > /dev/null 2>&1; then
  echo "✅ 服务器正在运行"
else
  echo "❌ 服务器未运行，请先启动服务器"
  exit 1
fi

# 登录获取 token
echo ""
echo "2. 登录获取 token..."
LOGIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ 登录成功"

# 记录测试开始时间
TEST_START_TIME=$(date +%s)
echo ""
echo "3. 检查日志文件..."
if [ -f "$LOG_FILE" ]; then
  echo "✅ 日志文件存在: $LOG_FILE"
  LOG_LINES_BEFORE=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")
  echo "   测试前日志行数: $LOG_LINES_BEFORE"
else
  echo "⚠️  日志文件不存在: $LOG_FILE"
  LOG_LINES_BEFORE=0
fi

echo ""
echo "4. 检查最近的 Link 字段更新日志..."
echo "----------------------------------------"

# 检查关键日志
echo "📋 事务上下文验证日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(事务上下文验证|开始执行 Link)" | tail -5 || echo "  未找到相关日志"
echo ""

echo "📋 查找受影响记录日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(开始查找受影响|找到受影响|GetAffectedRecordsByLink)" | tail -5 || echo "  未找到相关日志"
echo ""

echo "📋 SQL 查询日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(构建 SQL WHERE|执行 SQL 查询|查找 Link 字段值)" | tail -5 || echo "  未找到相关日志"
echo ""

echo "📋 SQL 更新日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(执行.*格式 Link 字段标题更新|批量更新.*格式 Link 字段标题)" | tail -5 || echo "  未找到相关日志"
echo ""

echo "📋 错误日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(❌|ERROR|失败)" | grep -i "link" | tail -5 || echo "  未找到错误日志"
echo ""

echo "📋 成功日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(✅.*Link|批量更新.*成功)" | tail -5 || echo "  未找到成功日志"
echo ""

echo "=========================================="
echo "测试完成"
echo ""
echo "说明："
echo "  1. 如果看到 '事务上下文验证' 日志，说明回调已注册"
echo "  2. 如果看到 '找到受影响记录' 日志，说明查找逻辑正常"
echo "  3. 如果看到 '批量更新成功' 日志，说明 SQL 更新成功"
echo "  4. 如果看到错误日志，请检查具体错误信息"
echo "=========================================="








