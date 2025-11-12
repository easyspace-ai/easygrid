-- 添加缺失字段以对齐 Teable 数据库设计
-- 迁移：000011_add_missing_fields

-- 1. 添加 table_meta.db_view_name 字段（用于视图功能）
ALTER TABLE table_meta ADD COLUMN IF NOT EXISTS db_view_name VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_table_meta_db_view_name ON table_meta(db_view_name);

-- 2. 添加 field.is_conditional_lookup 字段（用于条件查找功能）
ALTER TABLE field ADD COLUMN IF NOT EXISTS is_conditional_lookup BOOLEAN DEFAULT FALSE;

-- 3. 添加 field.meta 字段（用于存储字段元数据）
ALTER TABLE field ADD COLUMN IF NOT EXISTS meta TEXT;

-- 添加注释
COMMENT ON COLUMN table_meta.db_view_name IS '数据库视图名称（用于视图功能）';
COMMENT ON COLUMN field.is_conditional_lookup IS '是否为条件查找字段';
COMMENT ON COLUMN field.meta IS '字段元数据（JSON格式）';

