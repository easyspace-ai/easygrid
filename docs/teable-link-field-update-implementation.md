# Teable 关联字段自动更新实现逻辑总结

## 一、核心实现流程

### 1. 触发时机
当源记录（被引用的记录）更新时，后端会：
1. 在 `RecordService.Update` 中保存记录后
2. 通过事务回调（`database.AddTxCallback`）触发 `LinkTitleUpdateService.UpdateLinkTitlesForRecord`
3. 确保在事务提交后执行，避免影响主流程性能

### 2. 扫描引用表（FindLinkFieldsToTable）

**实现位置：** `server/internal/infrastructure/repository/field_repository.go`

**SQL 查询：**
```sql
SELECT * FROM field 
WHERE type = 'link' 
  AND deleted_time IS NULL 
  AND options::jsonb->'link'->>'linked_table_id' = ?
ORDER BY field_order ASC
```

**关键点：**
- 使用 PostgreSQL 的 JSONB 操作符 `->` 和 `->>'` 直接查询字段选项
- 只查询未删除的 link 类型字段
- 通过 `linked_table_id` 匹配指向目标表的字段

**性能优化：**
- ✅ 使用 JSONB 索引（如果创建了 `options` 字段的 GIN 索引）
- ✅ 只查询元数据表（`field` 表），数据量小
- ✅ 使用 `deleted_time IS NULL` 过滤已删除字段

### 3. 查找引用记录（FindRecordsByLinkValue）

**实现位置：** `server/internal/infrastructure/repository/record_repository_dynamic.go`

**SQL 查询：**
```sql
SELECT __id FROM table_name
WHERE (
  -- 数组格式：field @> '[{"id": "rec_xxx"}]'::jsonb
  field_name @> '[{"id": "rec_xxx"}]'::jsonb
  OR
  -- 单个对象格式：field->>'id' = 'rec_xxx'
  field_name->>'id' = 'rec_xxx'
)
```

**关键点：**
- 使用 PostgreSQL 的 JSONB 操作符：
  - `@>`：包含操作符（用于数组）
  - `->>'id'`：提取 JSON 对象的 id 字段（用于单个对象）
- 支持两种数据格式：
  - 单选：`{"id": "rec_xxx", "title": "yyy"}`
  - 多选：`[{"id": "rec_xxx", "title": "yyy"}, ...]`

**性能优化：**
- ✅ 使用 JSONB GIN 索引（如果创建了）
- ✅ 只查询 `__id` 列，减少数据传输
- ✅ 使用 OR 条件批量查询多个 recordID

### 4. 数据库级别批量更新

**实现位置：** `server/internal/application/batch_service.go`

**更新流程：**
1. 按表分组更新（`groupUpdatesByTable`）
2. 合并同一记录的多个字段更新（`mergeRecordUpdates`）
3. 分批处理（`splitRecordUpdatesIntoBatches`）
4. 对每个记录：
   - 查询记录（`FindByTableAndID`）
   - 更新数据（`record.Update`）
   - 保存记录（`recordRepo.Save`）

**性能问题：**
- ❌ 当前实现是逐条更新，每条记录都需要：
  - 1 次查询（`FindByTableAndID`）
  - 1 次更新（`record.Update`）
  - 1 次保存（`recordRepo.Save`）
- ❌ 如果有 1000 条记录需要更新，需要执行 3000 次数据库操作

## 二、Teable 的性能优化策略

### 1. 数据库索引优化

**JSONB GIN 索引：**
```sql
-- 为 Link 字段创建 GIN 索引（支持 JSONB 查询）
CREATE INDEX idx_link_field_gin ON table_name USING GIN (field_name);

-- 为字段选项创建 GIN 索引（支持 FindLinkFieldsToTable 查询）
CREATE INDEX idx_field_options_gin ON field USING GIN (options);
```

**外键索引：**
- ManyMany 关系：在 junction table 的外键列上创建索引
- ManyOne/OneMany 关系：在外键列上创建索引

### 2. 批量更新优化

**方案 A：使用 PostgreSQL 的批量 UPDATE**
```sql
-- 使用 CASE WHEN 批量更新
UPDATE table_name
SET field_name = CASE
  WHEN __id = 'rec1' THEN '{"id": "rec1", "title": "new_title1"}'::jsonb
  WHEN __id = 'rec2' THEN '{"id": "rec2", "title": "new_title2"}'::jsonb
  ...
END
WHERE __id IN ('rec1', 'rec2', ...)
```

**方案 B：使用临时表 + JOIN**
```sql
-- 1. 创建临时表
CREATE TEMP TABLE temp_updates (
  record_id VARCHAR(50),
  field_value JSONB
);

-- 2. 批量插入更新数据
INSERT INTO temp_updates VALUES
  ('rec1', '{"id": "rec1", "title": "new_title1"}'::jsonb),
  ('rec2', '{"id": "rec2", "title": "new_title2"}'::jsonb),
  ...;

-- 3. 使用 JOIN 批量更新
UPDATE table_name t
SET field_name = tu.field_value
FROM temp_updates tu
WHERE t.__id = tu.record_id;
```

**方案 C：使用 PostgreSQL 的 JSONB 函数批量更新**
```sql
-- 使用 jsonb_set 函数更新 JSONB 字段中的 title
UPDATE table_name
SET field_name = jsonb_set(
  field_name,
  '{title}',
  '"new_title"'::jsonb
)
WHERE field_name @> '[{"id": "rec_xxx"}]'::jsonb
   OR field_name->>'id' = 'rec_xxx';
```

### 3. 异步处理优化

**当前实现：**
- ✅ 使用事务回调，在事务提交后执行
- ✅ 不阻塞主流程

**进一步优化：**
- 使用消息队列（如 Redis Queue、RabbitMQ）
- 后台任务异步处理
- 支持重试机制

### 4. 缓存优化

**字段元数据缓存：**
- `FindLinkFieldsToTable` 的结果可以缓存
- 字段配置变化不频繁，适合缓存

**记录查询缓存：**
- 对于热点记录，可以缓存查询结果
- 使用 Redis 缓存

### 5. 增量更新策略

**只更新变化的字段：**
- 比较旧值和新值
- 只更新 title 字段，不更新整个 JSONB 对象

**使用 JSONB 路径更新：**
```sql
-- 只更新 title，不替换整个对象
UPDATE table_name
SET field_name = jsonb_set(
  field_name,
  '{title}',
  '"new_title"'::jsonb
)
WHERE field_name->>'id' = 'rec_xxx';
```

## 三、当前实现的性能瓶颈

### 1. 逐条更新问题

**当前代码：**
```go
for _, update := range batch {
  record, err := s.recordRepo.FindByTableAndID(ctx, tableID, recordIDVO)
  // ... 更新逻辑
  if err := s.recordRepo.Save(ctx, record); err != nil {
    // ...
  }
}
```

**问题：**
- 每条记录需要 3 次数据库操作（查询、更新、保存）
- 如果有 1000 条记录，需要 3000 次操作
- 网络往返次数多，延迟高

### 2. 缺少批量更新接口

**需要实现：**
- `BatchUpdateRecords` 方法，支持批量更新
- 使用 PostgreSQL 的批量 UPDATE 语句
- 减少数据库往返次数

### 3. 缺少 JSONB 索引

**需要创建：**
- Link 字段的 GIN 索引
- 字段选项的 GIN 索引
- 外键列的 B-tree 索引

## 四、优化建议

### 1. 实现批量更新接口

**在 `RecordRepository` 中添加：**
```go
// BatchUpdateLinkFieldTitle 批量更新 Link 字段的 title
func (r *RecordRepositoryDynamic) BatchUpdateLinkFieldTitle(
  ctx context.Context,
  tableID string,
  linkFieldID string,
  updates map[string]string, // recordID -> newTitle
) error {
  // 使用 PostgreSQL 的批量 UPDATE
  // 或使用临时表 + JOIN
}
```

### 2. 创建数据库索引

**在创建 Link 字段时：**
```sql
-- 为 Link 字段创建 GIN 索引
CREATE INDEX idx_link_field_gin ON table_name USING GIN (field_name);
```

**在字段元数据表：**
```sql
-- 为字段选项创建 GIN 索引
CREATE INDEX idx_field_options_gin ON field USING GIN (options);
```

### 3. 使用 JSONB 路径更新

**优化 `updateLinkValueTitle` 方法：**
- 使用 `jsonb_set` 函数直接更新 title
- 避免读取整个记录、修改、保存的流程

### 4. 异步处理

**使用消息队列：**
- 将更新任务放入队列
- 后台 worker 异步处理
- 支持重试和错误处理

## 五、Teable 实现逻辑总结

### 核心流程

**1. 触发机制：**
- 当源记录更新时，在事务提交后触发回调
- 使用 `database.AddTxCallback` 确保在事务提交后执行
- 不阻塞主流程，异步处理

**2. 扫描引用表：**
- 使用 `FindLinkFieldsToTable` 查询所有指向目标表的 Link 字段
- SQL: `WHERE options::jsonb->'link'->>'linked_table_id' = ?`
- 使用 JSONB 操作符直接查询，性能高
- 只查询元数据表（`field` 表），数据量小

**3. 查找引用记录：**
- 使用 `FindRecordsByLinkValue` 查询包含指定 recordID 的记录
- SQL: `WHERE field @> '[{"id": "rec_xxx"}]'::jsonb OR field->>'id' = 'rec_xxx'`
- 使用 JSONB GIN 索引加速查询
- 只查询 `__id` 列，减少数据传输

**4. 数据库级别批量更新：**
- **当前实现（性能瓶颈）：**
  - 逐条更新：每条记录需要 3 次数据库操作
  - 查询记录 → 更新数据 → 保存记录
  - 如果有 1000 条记录，需要 3000 次操作

- **Teable 优化方案：**
  - 使用 PostgreSQL 的 `jsonb_set` 函数直接更新 JSONB 字段
  - 使用批量 UPDATE 语句，一次更新多条记录
  - 使用临时表 + JOIN 批量更新

### 性能优化策略

**1. 数据库索引：**
- ✅ Link 字段的 GIN 索引（已实现）
- ✅ 字段选项的 GIN 索引（需要实现）
- ✅ 外键列的 B-tree 索引（已实现）

**2. 批量更新：**
- ❌ 当前：逐条更新（慢）
- ✅ 优化：使用 `jsonb_set` 函数批量更新（快）

**3. 异步处理：**
- ✅ 当前：事务回调（不阻塞）
- ✅ 优化：消息队列（可扩展）

**4. 缓存：**
- ❌ 当前：无缓存
- ✅ 优化：字段元数据缓存（Redis）

## 六、优化实现建议

### 1. 实现 JSONB 路径批量更新

**在 `RecordRepository` 中添加：**
```go
// BatchUpdateLinkFieldTitle 批量更新 Link 字段的 title
// 使用 PostgreSQL 的 jsonb_set 函数直接更新，避免读取整个记录
func (r *RecordRepositoryDynamic) BatchUpdateLinkFieldTitle(
  ctx context.Context,
  tableID string,
  linkFieldID string,
  sourceRecordID string,
  newTitle string,
) error {
  // 获取表信息
  table, err := r.tableRepo.GetByID(ctx, tableID)
  if err != nil {
    return err
  }
  
  baseID := table.BaseID()
  fullTableName := r.dbProvider.GenerateTableName(baseID, tableID)
  
  // 获取 Link 字段信息
  field, err := r.fieldRepo.FindByID(ctx, linkFieldID)
  if err != nil {
    return err
  }
  
  dbFieldName := field.DBFieldName().String()
  
  // 使用 jsonb_set 函数批量更新
  // 对于数组格式：jsonb_set(field, '{0,title}', '"new_title"', false)
  // 对于单个对象：jsonb_set(field, '{title}', '"new_title"', false)
  updateSQL := fmt.Sprintf(`
    UPDATE %s
    SET %s = CASE
      -- 数组格式：更新数组中匹配的记录
      WHEN %s @> '[{"id": "%s"}]'::jsonb THEN
        jsonb_set(
          %s,
          (SELECT ('{' || (idx-1)::text || ',title}')::text[]
           FROM jsonb_array_elements(%s) WITH ORDINALITY arr(elem, idx)
           WHERE elem->>'id' = '%s'
           LIMIT 1),
          '"%s"'::jsonb,
          false
        )
      -- 单个对象格式：直接更新
      WHEN %s->>'id' = '%s' THEN
        jsonb_set(%s, '{title}', '"%s"'::jsonb, false)
      ELSE
        %s
    END
    WHERE %s @> '[{"id": "%s"}]'::jsonb
       OR %s->>'id' = '%s'
  `, fullTableName, dbFieldName, dbFieldName, sourceRecordID,
     dbFieldName, dbFieldName, sourceRecordID, newTitle,
     dbFieldName, sourceRecordID, dbFieldName, newTitle,
     dbFieldName, dbFieldName, sourceRecordID, dbFieldName, sourceRecordID)
  
  return r.db.WithContext(ctx).Exec(updateSQL).Error
}
```

**简化版本（推荐）：**
```go
// BatchUpdateLinkFieldTitle 批量更新 Link 字段的 title
// 使用 jsonb_set 函数直接更新，避免读取整个记录
func (r *RecordRepositoryDynamic) BatchUpdateLinkFieldTitle(
  ctx context.Context,
  tableID string,
  linkFieldID string,
  sourceRecordID string,
  newTitle string,
) error {
  // ... 获取表信息和字段信息 ...
  
  // 方案1：使用 jsonb_set 更新数组中的 title
  updateArraySQL := fmt.Sprintf(`
    UPDATE %s
    SET %s = (
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'id' = '%s' THEN
            jsonb_set(elem, '{title}', '"%s"'::jsonb, false)
          ELSE
            elem
        END
      )
      FROM jsonb_array_elements(%s) AS elem
    )
    WHERE %s @> '[{"id": "%s"}]'::jsonb
  `, fullTableName, dbFieldName, sourceRecordID, newTitle,
     dbFieldName, dbFieldName, sourceRecordID)
  
  // 方案2：使用 jsonb_set 更新单个对象
  updateObjectSQL := fmt.Sprintf(`
    UPDATE %s
    SET %s = jsonb_set(%s, '{title}', '"%s"'::jsonb, false)
    WHERE %s->>'id' = '%s'
  `, fullTableName, dbFieldName, dbFieldName, newTitle,
     dbFieldName, sourceRecordID)
  
  // 执行两个更新（使用 UNION 或分别执行）
  // ...
}
```

### 2. 创建字段选项的 GIN 索引

**在数据库迁移中添加：**
```sql
-- 为字段选项创建 GIN 索引（支持 FindLinkFieldsToTable 查询）
CREATE INDEX IF NOT EXISTS idx_field_options_gin ON field USING GIN (options);
```

### 3. 优化批量更新流程

**修改 `LinkTitleUpdateService.updateLinkFieldTitles`：**
- 使用 `BatchUpdateLinkFieldTitle` 方法
- 直接使用 SQL 更新，避免读取记录
- 减少数据库往返次数

## 七、总结

**Teable 的核心实现：**
1. ✅ 使用 JSONB 查询快速找到引用记录
2. ✅ 使用数据库索引优化查询性能
3. ✅ 使用批量更新减少数据库往返
4. ✅ 使用异步处理避免阻塞主流程

**当前实现的改进方向：**
1. **实现批量更新接口**：使用 `jsonb_set` 函数直接更新 JSONB 字段
2. **创建 JSONB GIN 索引**：为字段选项创建索引
3. **使用 JSONB 路径更新**：避免读取整个记录
4. **考虑异步处理机制**：使用消息队列处理大量更新

**性能对比：**
- **当前实现**：1000 条记录 = 3000 次数据库操作
- **优化后**：1000 条记录 = 1-2 次数据库操作（批量 UPDATE）
- **性能提升**：约 1500 倍

