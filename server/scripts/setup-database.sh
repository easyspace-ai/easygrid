#!/bin/bash

# LuckDB 数据库初始化脚本

set -e  # 遇到错误立即退出

echo "=========================================="
echo "LuckDB 数据库初始化"
echo "=========================================="
echo ""

# 数据库配置（从 config.yaml 读取）
DB_USER="luckdb"
DB_PASSWORD="luckdb"
DB_NAME="luckdb_dev"
DB_HOST="localhost"
DB_PORT="5432"

# 检查 PostgreSQL 是否安装
echo "🔍 检查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ 错误: PostgreSQL 未安装！"
    echo ""
    echo "请先安装 PostgreSQL："
    echo "  macOS:   brew install postgresql@15"
    echo "  Ubuntu:  sudo apt-get install postgresql"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL 已安装"
echo ""

# 检查 PostgreSQL 服务是否运行
echo "🔍 检查 PostgreSQL 服务..."
if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
    echo "❌ PostgreSQL 服务未运行！"
    echo ""
    echo "请先启动 PostgreSQL："
    echo "  macOS:   brew services start postgresql@15"
    echo "  Ubuntu:  sudo systemctl start postgresql"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL 服务正在运行"
echo ""

# 创建数据库用户
echo "👤 创建数据库用户: $DB_USER"
psql -h $DB_HOST -p $DB_PORT -U postgres -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
    echo "⚠️  用户可能已存在，继续..."
}
echo "✅ 用户创建成功"
echo ""

# 授予用户创建数据库权限
echo "🔑 授予用户权限..."
psql -h $DB_HOST -p $DB_PORT -U postgres -c "ALTER USER $DB_USER CREATEDB;" || true
echo "✅ 权限授予成功"
echo ""

# 创建数据库
echo "🗄️  创建数据库: $DB_NAME"
psql -h $DB_HOST -p $DB_PORT -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || {
    echo "❌ 数据库创建失败！"
    exit 1
}
echo "✅ 数据库创建成功"
echo ""

# 授予数据库权限
echo "🔑 配置数据库权限..."
psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" || true
echo "✅ 权限配置成功"
echo ""

# 测试连接
echo "🧪 测试数据库连接..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ 数据库连接测试成功！"
else
    echo "❌ 数据库连接测试失败！"
    exit 1
fi
echo ""

# 显示配置信息
echo "=========================================="
echo "✅ 数据库初始化完成！"
echo "=========================================="
echo ""
echo "📋 数据库配置信息："
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  用户: $DB_USER"
echo "  密码: $DB_PASSWORD"
echo "  数据库: $DB_NAME"
echo ""
echo "🔌 连接字符串："
echo "  postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "📝 下一步："
echo "  1. 运行数据库迁移: cd server && make migrate"
echo "  2. 启动服务器: make run"
echo ""

