#!/bin/bash

# LuckDB SDK 完整测试套件运行脚本
# 
# 用法: 
#   ./run-all-tests.sh              # 运行所有测试
#   ./run-all-tests.sh --destructive # 只运行破坏性测试
#   ./run-all-tests.sh --performance # 只运行性能测试
#   ./run-all-tests.sh --functional  # 只运行功能测试

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_separator() {
    echo -e "${BLUE}================================================${NC}"
}

# 检查服务器是否运行
check_server() {
    print_info "检查服务器状态..."
    
    if curl -s http://localhost:2345/api/v1/health > /dev/null 2>&1; then
        print_success "服务器正在运行"
        return 0
    else
        print_error "服务器未运行！"
        print_info "请先启动服务器: cd ../server && ./bin/luckdb serve"
        return 1
    fi
}

# 设置测试用户
setup_test_user() {
    print_separator
    print_info "设置测试用户..."
    
    if pnpm test:setup; then
        print_success "测试用户设置成功"
    else
        print_warning "测试用户可能已存在，继续..."
    fi
}

# 运行功能测试
run_functional_tests() {
    print_separator
    print_info "运行功能测试..."
    
    local tests=(
        "test:auth:认证测试"
        "test:space:空间管理测试"
        "test:record:记录操作测试"
        "test:view:视图管理测试"
        "test:comprehensive:完整集成测试"
    )
    
    local passed=0
    local failed=0
    
    for test_item in "${tests[@]}"; do
        IFS=':' read -r test_cmd test_name <<< "$test_item"
        
        print_info "运行: $test_name"
        
        if pnpm "$test_cmd"; then
            print_success "$test_name 通过"
            ((passed++))
        else
            print_error "$test_name 失败"
            ((failed++))
        fi
        
        echo ""
    done
    
    print_separator
    print_info "功能测试完成: $passed 通过, $failed 失败"
    
    return $failed
}

# 运行破坏性测试
run_destructive_tests() {
    print_separator
    print_info "运行破坏性测试..."
    
    if pnpm test:destructive; then
        print_success "破坏性测试完成"
        return 0
    else
        print_warning "破坏性测试发现问题（这是预期的，用于发现需要改进的地方）"
        return 1
    fi
}

# 运行性能测试
run_performance_tests() {
    print_separator
    print_info "运行性能测试..."
    
    if pnpm test:performance; then
        print_success "性能测试完成"
        return 0
    else
        print_error "性能测试失败"
        return 1
    fi
}

# 生成测试报告
generate_report() {
    print_separator
    print_info "测试总结"
    print_separator
    
    echo ""
    echo "📊 测试套件执行完成！"
    echo ""
    echo "📁 详细日志请查看:"
    echo "   - 功能测试: 终端输出"
    echo "   - 破坏性测试: 终端输出"
    echo "   - 性能测试: 终端输出"
    echo ""
    
    if [ $1 -eq 0 ]; then
        print_success "所有测试通过！系统状态良好！"
        echo ""
        echo "🎉 恭喜！SDK 和 API 服务运行正常，可以用于生产环境。"
    else
        print_warning "部分测试失败，请查看上方日志了解详情"
        echo ""
        echo "💡 建议："
        echo "   1. 检查失败的测试用例"
        echo "   2. 修复服务端错误处理"
        echo "   3. 重新运行测试验证修复"
    fi
    
    echo ""
}

# 主函数
main() {
    local test_type="${1:-all}"
    local exit_code=0
    
    print_separator
    echo -e "${BLUE}🧪 LuckDB SDK 测试套件${NC}"
    print_separator
    
    # 检查服务器
    if ! check_server; then
        exit 1
    fi
    
    # 设置测试用户
    setup_test_user
    
    # 根据参数运行不同的测试
    case "$test_type" in
        --functional)
            run_functional_tests
            exit_code=$?
            ;;
        --destructive)
            run_destructive_tests
            exit_code=$?
            ;;
        --performance)
            run_performance_tests
            exit_code=$?
            ;;
        all|--all|*)
            # 运行所有测试
            run_functional_tests
            local func_code=$?
            
            run_destructive_tests
            local dest_code=$?
            
            run_performance_tests
            local perf_code=$?
            
            # 如果任何测试失败，返回非零退出码
            if [ $func_code -ne 0 ] || [ $dest_code -ne 0 ] || [ $perf_code -ne 0 ]; then
                exit_code=1
            fi
            ;;
    esac
    
    # 生成报告
    generate_report $exit_code
    
    exit $exit_code
}

# 运行主函数
main "$@"
