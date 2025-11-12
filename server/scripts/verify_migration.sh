#!/bin/bash
# 验证迁移是否成功

set -e

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-luckdb}
DB_PASSWORD=${DB_PASSWORD:-luckdb}
DB_NAME=${DB_NAME:-luckdb_dev}

echo "🔍 验证迁移结果..."
echo ""

# 验证 table_meta.db_view_name 字段
echo "1. 检查 table_meta.db_view_name 字段..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'table_meta' 
AND column_name = 'db_view_name';
" 2>&1 | grep -E "db_view_name|varchar|character|Column|row" || echo "❌ 字段不存在"

echo ""

# 验证 field.is_conditional_lookup 字段
echo "2. 检查 field.is_conditional_lookup 字段..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'field' 
AND column_name = 'is_conditional_lookup';
" 2>&1 | grep -E "is_conditional_lookup|boolean|Column|row" || echo "❌ 字段不存在"

echo ""

# 验证 field.meta 字段
echo "3. 检查 field.meta 字段..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'field' 
AND column_name = 'meta';
" 2>&1 | grep -E "meta|text|Column|row" || echo "❌ 字段不存在"

echo ""

# 验证索引
echo "4. 检查 idx_table_meta_db_view_name 索引..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'table_meta' 
AND indexname = 'idx_table_meta_db_view_name';
" 2>&1 | grep -E "idx_table_meta_db_view_name|Index|row" || echo "❌ 索引不存在"

echo ""
echo "✅ 验证完成！"

