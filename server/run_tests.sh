#!/bin/bash

# 测试运行脚本
# 用于运行所有新添加的测试

set -e

echo "🧪 开始运行测试..."

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
PASSED=0
FAILED=0

# 运行查询监控测试
echo ""
echo "📊 运行查询性能监控测试..."
if go test ./internal/infrastructure/database -v -run "TestQueryMonitor|TestSQLLogger" 2>&1 | tee /tmp/query_monitor_test.log; then
    echo -e "${GREEN}✅ 查询监控测试通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 查询监控测试失败${NC}"
    ((FAILED++))
fi

# 运行批量操作测试
echo ""
echo "⚡ 运行批量操作大小优化测试..."
if go test ./internal/application -v -run TestBatchService_CalculateOptimalBatchSize 2>&1 | tee /tmp/batch_test.log; then
    echo -e "${GREEN}✅ 批量操作测试通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 批量操作测试失败${NC}"
    ((FAILED++))
fi

# 运行关系类型变更测试
echo ""
echo "🔗 运行关系类型变更支持测试..."
if go test ./internal/application -v -run TestFieldService_IsRelationshipChangeSupported 2>&1 | tee /tmp/relationship_test.log; then
    echo -e "${GREEN}✅ 关系类型变更测试通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 关系类型变更测试失败${NC}"
    ((FAILED++))
fi

# 运行 Link 引用清理测试
echo ""
echo "🧹 运行 Link 引用清理测试..."
if go test ./internal/application -v -run TestRecordService_RemoveLinkReferenceSQLPattern 2>&1 | tee /tmp/link_cleanup_test.log; then
    echo -e "${GREEN}✅ Link 引用清理测试通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Link 引用清理测试失败${NC}"
    ((FAILED++))
fi

# 运行模型统一性测试
echo ""
echo "📋 运行模型统一性测试..."
if go test ./internal/infrastructure/database -v -run "TestBaseModel|TestViewModel" 2>&1 | tee /tmp/models_test.log; then
    echo -e "${GREEN}✅ 模型统一性测试通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 模型统一性测试失败${NC}"
    ((FAILED++))
fi

# 输出测试总结
echo ""
echo "=========================================="
echo "📊 测试总结"
echo "=========================================="
echo -e "${GREEN}✅ 通过: ${PASSED}${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ 失败: ${FAILED}${NC}"
    exit 1
else
    echo -e "${GREEN}❌ 失败: ${FAILED}${NC}"
    echo ""
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
fi

