#!/bin/bash

# Link 字段标题更新完整测试脚本
# 这个脚本会：
# 1. 检查服务器是否运行
# 2. 如果未运行，提示用户启动
# 3. 执行测试
# 4. 检查日志输出

set -e

echo "=========================================="
echo "Link 字段标题更新完整测试"
echo "=========================================="

# 配置
SERVER_URL="${SERVER_URL:-http://localhost:8080}"
LOG_FILE="/test/logs/app.log"
TEST_SCRIPT="packages/sdk/examples/run-link-field-test.ts"

# 检查服务器是否运行
echo ""
echo "1. 检查服务器状态..."
if curl -s -f "$SERVER_URL/health" > /dev/null 2>&1; then
  echo "✅ 服务器正在运行"
  SERVER_RUNNING=true
else
  echo "⚠️  服务器未运行"
  SERVER_RUNNING=false
  
  echo ""
  echo "请先启动服务器："
  echo "  cd server && go run cmd/server/main.go"
  echo ""
  echo "或者使用："
  echo "  cd server && make run"
  echo ""
  read -p "是否已启动服务器？(y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 测试已取消"
    exit 1
  fi
  
  # 等待服务器启动
  echo ""
  echo "等待服务器启动..."
  for i in {1..30}; do
    if curl -s -f "$SERVER_URL/health" > /dev/null 2>&1; then
      echo "✅ 服务器已就绪"
      SERVER_RUNNING=true
      break
    else
      echo "   等待中... ($i/30)"
      sleep 1
    fi
  done
  
  if [ "$SERVER_RUNNING" = false ]; then
    echo "❌ 服务器启动超时"
    exit 1
  fi
fi

# 检查日志文件
echo ""
echo "2. 检查日志文件..."
if [ -f "$LOG_FILE" ]; then
  echo "✅ 日志文件存在: $LOG_FILE"
  # 记录测试开始前的日志行数
  LOG_LINES_BEFORE=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")
  echo "   测试前日志行数: $LOG_LINES_BEFORE"
else
  echo "⚠️  日志文件不存在: $LOG_FILE"
  echo "   将创建日志目录..."
  mkdir -p "$(dirname "$LOG_FILE")"
  LOG_LINES_BEFORE=0
fi

# 记录测试开始时间
TEST_START_TIME=$(date +%s)
echo ""
echo "3. 开始执行测试..."
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

# 等待日志写入
echo ""
echo "4. 等待日志写入..."
sleep 3

# 检查日志
echo ""
echo "5. 检查日志输出..."
echo "----------------------------------------"

# 获取测试后的日志
LOG_LINES_AFTER=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")
echo "测试后日志行数: $LOG_LINES_AFTER"
echo "新增日志行数: $((LOG_LINES_AFTER - LOG_LINES_BEFORE))"
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

# 6. 成功日志
echo "📋 成功日志:"
tail -2000 "$LOG_FILE" 2>/dev/null | grep -E "(✅.*Link|批量更新.*成功)" | tail -5 || echo "  未找到成功日志"
echo ""

# 总结
echo "=========================================="
if [ "$TEST_SUCCESS" = true ]; then
  echo "✅ 测试完成"
  echo ""
  echo "请检查上面的日志输出，确认："
  echo "  1. ✅ 事务上下文验证成功"
  echo "  2. ✅ 找到受影响的记录"
  echo "  3. ✅ SQL 更新成功"
  echo "  4. ✅ Link 字段的 title 已自动更新"
else
  echo "❌ 测试失败"
  echo ""
  echo "请检查："
  echo "  1. 服务器是否正常运行"
  echo "  2. 日志文件中的错误信息"
  echo "  3. 测试脚本的输出"
fi
echo "=========================================="




