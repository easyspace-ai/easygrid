-- 为字段选项创建 GIN 索引（支持 FindLinkFieldsToTable 查询）
-- 这个索引可以加速查询所有指向指定表的 Link 字段
CREATE INDEX IF NOT EXISTS idx_field_options_gin ON field USING GIN (options);

-- 添加注释说明索引用途
COMMENT ON INDEX idx_field_options_gin IS 'GIN index on field.options for fast JSONB queries, used by FindLinkFieldsToTable';

