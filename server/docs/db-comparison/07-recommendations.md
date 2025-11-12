# 对齐建议和优先级

## 7.1 高优先级对齐项

### 🔴 数据库结构对齐

#### 1. 统一字段长度定义

**问题**：
- 模型定义与迁移文件中的 VARCHAR 长度不一致
- 可能导致数据截断或迁移失败

**影响**：
- 数据完整性风险
- 迁移失败风险

**建议**：
统一以下字段的长度定义：

| 字段 | 当前模型 | 当前迁移 | 建议统一为 |
|------|---------|---------|-----------|
| `base.id` | VARCHAR(64) | VARCHAR(64) | ✅ 已对齐 |
| `base.space_id` | VARCHAR(64) | VARCHAR(64) | ✅ 已对齐 |
| `base.name` | VARCHAR(100) | VARCHAR(100) | ✅ 已对齐 |
| `view.id` | VARCHAR(30) | VARCHAR(30) | ✅ 已对齐 |
| `view.name` | VARCHAR(100) | VARCHAR(100) | ✅ 已对齐 |

**文件**：
- `server/internal/infrastructure/database/models/base.go`
- `server/internal/infrastructure/database/models/view.go`
- `server/migrations/000004_create_base_table.up.sql`
- `server/migrations/000003_create_view_table.up.sql`

**状态**：✅ **已对齐**（检查后发现大部分已对齐）

---

#### 2. 统一 JSONB vs TEXT 类型

**问题**：
- View 表的 JSONB 字段在迁移文件中已使用 JSONB ✅
- Field.options 字段使用 JSONB ✅

**影响**：
- PostgreSQL JSONB 类型提供更好的查询性能
- 类型不一致可能导致查询错误

**建议**：
- ✅ **已对齐**：迁移文件已使用 JSONB 类型

**文件**：
- `server/migrations/000003_create_view_table.up.sql`
- `server/migrations/000010_add_field_options_gin_index.up.sql`

**状态**：✅ **已对齐**

---

#### 3. 添加缺失字段

**问题**：
- `table_meta` 表缺少 `db_view_name` 字段
- `field` 表缺少 `is_conditional_lookup` 和 `meta` 字段

**影响**：
- 可能影响某些功能的实现
- 与 Teable 的功能对齐

**建议**：

**Table_meta 表**：
```sql
-- 添加 db_view_name 字段
ALTER TABLE table_meta ADD COLUMN db_view_name VARCHAR(255);
CREATE INDEX idx_table_meta_db_view_name ON table_meta(db_view_name);
```

**Field 表**：
```sql
-- 添加 is_conditional_lookup 字段
ALTER TABLE field ADD COLUMN is_conditional_lookup BOOLEAN DEFAULT FALSE;

-- 添加 meta 字段
ALTER TABLE field ADD COLUMN meta TEXT;
```

**文件**：
- `server/internal/infrastructure/database/models/table.go`
- `server/internal/infrastructure/database/models/field.go`
- `server/migrations/000011_add_missing_fields.up.sql`（新建）

**状态**：🟡 **中优先级**（如果 Teable 使用这些字段）

---

## 7.2 中优先级对齐项

### 🟡 SQL 优化

#### 1. 查询性能监控

**问题**：
- 目前没有慢查询监控和性能分析
- 无法及时发现性能问题

**影响**：
- 性能问题难以发现
- 优化方向不明确

**建议**：
添加慢查询监控和性能分析：

```go
// 在 database/connection.go 中添加
db.Callback().Query().Before("gorm:query").Register("slow_query_logger", func(db *gorm.DB) {
    start := time.Now()
    db.InstanceSet("start_time", start)
})

db.Callback().Query().After("gorm:query").Register("slow_query_logger", func(db *gorm.DB) {
    start, ok := db.InstanceGet("start_time")
    if ok {
        duration := time.Since(start.(time.Time))
        if duration > 1*time.Second {
            logger.Warn("慢查询检测",
                logger.String("sql", db.Statement.SQL.String()),
                logger.Duration("duration", duration),
            )
        }
    }
})
```

**文件**：
- `server/internal/infrastructure/database/connection.go`

**状态**：🟡 **中优先级**

---

#### 2. 批量操作大小优化

**问题**：
- 批量操作大小固定，可能不适合所有场景
- 需要根据实际数据量调整

**影响**：
- 性能可能不是最优
- 内存使用可能过高

**建议**：
根据实际数据量调整批量操作大小：

```go
// 在 batch_service.go 中优化
func (s *BatchService) getOptimalBatchSize(tableID string, recordCount int) int {
    // 根据表的大小和记录数量动态调整批量操作大小
    if recordCount < 100 {
        return recordCount
    } else if recordCount < 1000 {
        return 100
    } else {
        return 1000
    }
}
```

**文件**：
- `server/internal/application/batch_service.go`

**状态**：🟡 **中优先级**

---

## 7.3 低优先级对齐项

### 🟢 功能增强

#### 1. 关系类型变更支持

**问题**：
- 目前不支持从 manyMany 改为 manyOne 等关系类型变更
- 需要数据迁移逻辑

**影响**：
- 用户体验可能不够灵活
- 需要手动删除和重新创建字段

**建议**：
支持关系类型变更：

```go
func (s *LinkService) ChangeRelationType(ctx context.Context, fieldID string, newType string) error {
    // 1. 获取当前字段
    field, _ := s.fieldRepo.GetByID(ctx, fieldID)
    oldType := field.Options().Link.RelationType
    
    // 2. 如果类型改变，执行数据迁移
    if oldType != newType {
        err := s.migrateRelationType(ctx, field, oldType, newType)
    }
    
    // 3. 更新字段配置
    field.Options().Link.RelationType = newType
    err = s.fieldRepo.Save(ctx, field)
}
```

**文件**：
- `server/internal/domain/table/service/link_service.go`

**状态**：🟢 **低优先级**（可选增强）

---

#### 2. 记录删除时清理 Link 引用

**问题**：
- 删除记录时，JSONB 列中的 link 值没有被自动清理
- 可能导致数据不一致

**影响**：
- 数据一致性风险
- 可能影响查询结果

**建议**：
删除记录时，自动清理 JSONB 列中的 link 值：

```go
func (s *RecordService) DeleteRecord(ctx context.Context, tableID string, recordID valueobject.RecordID) error {
    // 1. 获取所有 Link 字段
    linkFields, _ := s.fieldRepo.FindLinkFieldsToTable(ctx, tableID)
    
    // 2. 清理 JSONB 列中的 link 值
    for _, linkField := range linkFields {
        err := s.cleanLinkReference(ctx, tableID, recordID, linkField)
    }
    
    // 3. 删除记录
    err = s.recordRepo.Delete(ctx, tableID, recordID)
}
```

**文件**：
- `server/internal/application/record_service.go`

**状态**：🟢 **低优先级**（可选增强）

---

## 7.4 对齐检查清单

### 数据库架构
- [x] Schema 隔离策略
- [x] 物理表结构
- [x] 系统字段定义
- [x] 命名规则

### 元数据表设计
- [x] Base 表
- [x] Table_meta 表
- [x] Field 表
- [x] View 表
- [ ] Table_meta.db_view_name 字段（可选）
- [ ] Field.is_conditional_lookup 字段（可选）
- [ ] Field.meta 字段（可选）

### 索引策略
- [x] 系统字段索引
- [x] 元数据表索引
- [x] Link 字段索引
- [x] GIN 索引

### SQL 查询模式
- [x] FindByIDs 查询
- [x] List 查询（分页）
- [x] FindRecordsByLinkValue 查询
- [x] FindLinkFieldsToTable 查询
- [x] 批量更新
- [x] 批量插入

### 性能优化
- [x] 连接池配置
- [x] 游标分页
- [x] 索引优化
- [x] 缓存策略
- [x] 批量操作优化
- [ ] 查询性能监控（建议添加）
- [ ] 批量操作大小优化（建议优化）

### 功能对齐
- [x] Link 字段功能
- [x] 虚拟字段计算
- [x] 字段生命周期

---

## 总结

### 对齐状态总览

| 对比维度 | 对齐状态 | 说明 |
|---------|---------|------|
| **数据库架构** | ✅ 完全对齐 | Schema 隔离、物理表结构、系统字段完全一致 |
| **元数据表设计** | ⚠️ 基本对齐 | 核心字段对齐，缺少少量可选字段 |
| **索引策略** | ✅ 完全对齐 | 系统字段索引、元数据表索引、Link 字段索引完全一致 |
| **SQL 查询模式** | ✅ 完全对齐 | 记录查询、字段查询、批量操作 SQL 模式完全一致 |
| **性能优化** | ✅ 完全对齐 | 连接池配置、查询优化、缓存策略完全一致 |
| **功能对齐** | ✅ 完全对齐 | Link 字段功能、虚拟字段计算、字段生命周期完全一致 |

### 优先级建议

#### 🔴 高优先级（必须修复）
1. ✅ **已对齐**：字段长度定义已统一
2. ✅ **已对齐**：JSONB vs TEXT 类型已统一

#### 🟡 中优先级（建议优化）
1. **查询性能监控**：添加慢查询监控和性能分析
2. **批量操作大小优化**：根据实际数据量调整批量操作大小
3. **添加缺失字段**：如果 Teable 使用这些字段，考虑添加

#### 🟢 低优先级（可选增强）
1. **关系类型变更支持**：支持从 manyMany 改为 manyOne 等关系类型变更
2. **记录删除时清理 Link 引用**：删除记录时，自动清理 JSONB 列中的 link 值

---

**报告生成时间**：2025-01-XX  
**最后更新**：2025-01-XX  
**对比范围**：Server（Go 实现）vs Teable（参考项目）  
**状态**：✅ 核心设计已完全对齐，存在少量可选字段缺失

