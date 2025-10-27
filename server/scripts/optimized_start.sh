#!/bin/bash

# 优化启动脚本
# 应用启动优化配置，减少启动时间和日志输出

echo "🚀 启动 LuckDB 服务器（优化模式）..."

# 设置环境变量
export LUCKDB_STARTUP_OPTIMIZATION=true
export LUCKDB_QUIET_STARTUP=true
export LUCKDB_SKIP_METADATA_LOGS=true

# 检查配置文件
if [ ! -f "config.yaml" ]; then
    echo "❌ 配置文件 config.yaml 不存在"
    exit 1
fi

# 检查启动优化配置
if [ ! -f "startup_optimization.yaml" ]; then
    echo "⚠️  启动优化配置文件不存在，使用默认配置"
fi

# 创建日志目录
mkdir -p /test/logs

# 清理旧的日志文件（可选）
if [ "$1" = "--clean-logs" ]; then
    echo "🧹 清理旧日志文件..."
    rm -f /test/logs/app.log
    rm -f /test/logs/sql.log
fi

# 启动服务器
echo "📊 启动参数："
echo "  - 优化模式: 启用"
echo "  - 静默启动: 启用"
echo "  - 跳过元数据日志: 启用"
echo "  - 数据库日志级别: warn"
echo ""

# 启动服务器
./server \
    --config=config.yaml \
    --startup-optimization=startup_optimization.yaml \
    --quiet-startup \
    --skip-metadata-logs \
    --log-level=warn

echo "✅ 服务器启动完成"

