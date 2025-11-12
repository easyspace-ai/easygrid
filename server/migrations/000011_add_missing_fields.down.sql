-- 回滚：移除添加的字段
-- 迁移：000011_add_missing_fields

-- 移除索引
DROP INDEX IF EXISTS idx_table_meta_db_view_name;

-- 移除字段
ALTER TABLE table_meta DROP COLUMN IF EXISTS db_view_name;
ALTER TABLE field DROP COLUMN IF EXISTS is_conditional_lookup;
ALTER TABLE field DROP COLUMN IF EXISTS meta;

