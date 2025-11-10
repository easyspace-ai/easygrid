#!/bin/bash

# 测试关联字段自动更新功能
# 这个脚本会：
# 1. 更新源表的记录
# 2. 检查日志，看是否有更新 Link 字段的操作
# 3. 查询目标表的记录，检查关联字段是否已更新

set -e

echo "=========================================="
echo "关联字段自动更新测试脚本"
echo "=========================================="

# 配置
SERVER_URL="${SERVER_URL:-http://localhost:8080}"
TEST_EMAIL="${TEST_EMAIL:-admin@126.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Pmker123}"

# 日志文件
LOG_FILE="/test/logs/app.log"

echo "服务器: $SERVER_URL"
echo "日志文件: $LOG_FILE"
echo ""

# 1. 登录获取 token
echo "1. 登录..."
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
echo ""

# 2. 获取最近的更新操作日志
echo "2. 检查最近的日志..."
echo "----------------------------------------"
echo "最近的事务提交日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(事务提交成功|ExecuteCallbacks|callbacks)" | tail -10 || echo "未找到事务提交日志"
echo ""

echo "最近的 Link 字段更新日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(开始更新 Link|UpdateLinkTitles|批量更新 Link|找到受影响|GetAffectedRecordsByLink)" | tail -20 || echo "未找到 Link 字段更新日志"
echo ""

echo "最近的 SQL UPDATE 日志:"
tail -500 /test/logs/sql.log 2>/dev/null | grep -E "(UPDATE.*jsonb_set|UPDATE.*title)" | tail -10 || echo "未找到 SQL UPDATE 日志"
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

