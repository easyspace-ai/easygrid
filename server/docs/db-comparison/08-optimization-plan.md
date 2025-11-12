# Server vs Teable 数据库对齐优化重构计划

## 📋 执行摘要

基于对 Server（Go 实现）和 Teable（参考项目）的全面对比分析，本计划制定了详细的优化重构路线图，确保 Server 在数据库设计上与 Teable 完全对齐，并持续优化性能和功能。

### 对齐状态总览

| 对比维度 | 当前状态 | 目标状态 | 优先级 |
|---------|---------|---------|--------|
| **数据库架构** | ✅ 完全对齐 | ✅ 保持 | - |
| **元数据表设计** | ⚠️ 基本对齐 | ✅ 完全对齐 | 🟡 中 |
| **索引策略** | ✅ 完全对齐 | ✅ 保持 | - |
| **SQL 查询模式** | ✅ 完全对齐 | ✅ 保持 | - |
| **性能优化** | ✅ 基本对齐 | ✅ 完全对齐 | 🟡 中 |
| **功能对齐** | ✅ 完全对齐 | ✅ 保持 | - |

---

## 🎯 优化目标

1. **完全对齐 Teable 数据库设计**：确保所有元数据表结构与 Teable 一致
2. **性能优化**：添加性能监控，优化批量操作
3. **功能增强**：添加可选功能，提升用户体验
4. **代码质量**：统一模型定义，确保一致性

---

## 📅 重构计划（分阶段执行）

### 阶段一：数据库结构对齐（1-2周）

#### 🔴 高优先级任务

##### 任务 1.1：验证并统一字段定义
**目标**：确保模型定义与迁移文件完全一致

**工作内容**：
1. 检查所有模型的字段类型定义
2. 对比迁移文件中的字段定义
3. 统一不一致的字段定义

**涉及文件**：
- `server/internal/infrastructure/database/models/base.go`
- `server/internal/infrastructure/database/models/table.go`
- `server/internal/infrastructure/database/models/field.go`
- `server/internal/infrastructure/database/models/view.go`
- `server/migrations/*.sql`

**验收标准**：
- [ ] 所有模型字段类型与迁移文件一致
- [ ] 运行迁移测试通过
- [ ] 代码审查通过

**预计工作量**：2-3 天

---

##### 任务 1.2：添加缺失字段（可选）
**目标**：添加 Teable 中存在但 Server 缺失的字段

**工作内容**：
1. 评估是否需要 `table_meta.db_view_name` 字段
2. 评估是否需要 `field.is_conditional_lookup` 字段
3. 评估是否需要 `field.meta` 字段
4. 如需要，创建迁移文件添加字段

**涉及文件**：
- `server/internal/infrastructure/database/models/table.go`
- `server/internal/infrastructure/database/models/field.go`
- `server/migrations/000011_add_missing_fields.up.sql`（新建）
- `server/migrations/000011_add_missing_fields.down.sql`（新建）

**SQL 示例**：
```sql
-- 添加 db_view_name 字段（如需要）
ALTER TABLE table_meta ADD COLUMN db_view_name VARCHAR(255);
CREATE INDEX idx_table_meta_db_view_name ON table_meta(db_view_name);

-- 添加 is_conditional_lookup 字段（如需要）
ALTER TABLE field ADD COLUMN is_conditional_lookup BOOLEAN DEFAULT FALSE;

-- 添加 meta 字段（如需要）
ALTER TABLE field ADD COLUMN meta TEXT;
```

**验收标准**：
- [ ] 迁移文件创建完成
- [ ] 模型定义更新完成
- [ ] 迁移测试通过
- [ ] 功能测试通过（如适用）

**预计工作量**：1-2 天

---

### 阶段二：性能优化（2-3周）

#### 🟡 中优先级任务

##### 任务 2.1：添加慢查询监控
**目标**：实现慢查询监控和性能分析

**工作内容**：
1. 实现 GORM 慢查询钩子
2. 配置慢查询阈值（默认 1 秒）
3. 添加查询性能统计
4. 集成到日志系统

**涉及文件**：
- `server/internal/infrastructure/database/connection.go`（修改）
- `server/internal/config/config.go`（添加配置）
- `server/config.yaml`（添加配置项）

**代码实现**：
```go
// 在 connection.go 中添加
func setupSlowQueryLogger(db *gorm.DB, config *config.DatabaseConfig) {
    db.Callback().Query().Before("gorm:query").Register("slow_query_logger", func(db *gorm.DB) {
        start := time.Now()
        db.InstanceSet("start_time", start)
    })

    db.Callback().Query().After("gorm:query").Register("slow_query_logger", func(db *gorm.DB) {
        start, ok := db.InstanceGet("start_time")
        if !ok {
            return
        }
        
        duration := time.Since(start.(time.Time))
        threshold := config.SlowQueryThreshold
        if threshold == 0 {
            threshold = 1 * time.Second
        }
        
        if duration > threshold {
            logger.Warn("慢查询检测",
                logger.String("sql", db.Statement.SQL.String()),
                logger.Duration("duration", duration),
                logger.String("table", extractTableName(db.Statement.SQL.String())),
            )
        }
    })
}
```

**配置项**：
```yaml
database:
  slow_query_threshold: 1s  # 慢查询阈值
  enable_query_stats: true   # 启用查询统计
```

**验收标准**：
- [ ] 慢查询监控功能实现
- [ ] 配置项添加完成
- [ ] 日志输出正确
- [ ] 性能测试通过

**预计工作量**：3-4 天

---

##### 任务 2.2：优化批量操作大小
**目标**：根据实际数据量动态调整批量操作大小

**工作内容**：
1. 实现动态批量大小计算逻辑
2. 根据表大小和记录数量调整批量大小
3. 添加批量操作性能监控
4. 优化内存使用

**涉及文件**：
- `server/internal/application/batch_service.go`（修改）
- `server/internal/config/config.go`（添加配置）

**代码实现**：
```go
// 在 batch_service.go 中添加
func (s *BatchService) getOptimalBatchSize(ctx context.Context, tableID string, recordCount int) int {
    // 获取表信息
    table, err := s.tableRepo.GetByID(ctx, tableID)
    if err != nil {
        return DefaultBatchSize
    }
    
    // 获取字段数量
    fields, err := s.fieldRepo.FindByTableID(ctx, tableID)
    fieldCount := len(fields)
    
    // 根据记录数量和字段数量动态调整
    if recordCount < 50 {
        return recordCount
    } else if recordCount < 200 {
        // 字段多时减小批量大小
        if fieldCount > 20 {
            return 50
        }
        return 100
    } else if recordCount < 1000 {
        if fieldCount > 20 {
            return 100
        }
        return 200
    } else {
        if fieldCount > 20 {
            return 200
        }
        return 500
    }
}
```

**配置项**：
```yaml
batch:
  default_size: 100
  max_size: 1000
  min_size: 10
  enable_auto_adjust: true  # 启用自动调整
```

**验收标准**：
- [ ] 动态批量大小计算实现
- [ ] 配置项添加完成
- [ ] 性能测试通过
- [ ] 内存使用优化

**预计工作量**：2-3 天

---

##### 任务 2.3：添加查询性能统计
**目标**：实现查询性能统计和报告

**工作内容**：
1. 实现查询性能统计收集
2. 添加性能报告生成
3. 集成到监控系统

**涉及文件**：
- `server/internal/infrastructure/database/query_stats.go`（新建）
- `server/internal/interfaces/http/admin_handler.go`（添加性能报告接口）

**代码实现**：
```go
// query_stats.go
type QueryStats struct {
    SQL           string
    Duration      time.Duration
    Table         string
    Count         int64
    AvgDuration   time.Duration
    MaxDuration   time.Duration
    MinDuration   time.Duration
}

type QueryStatsCollector struct {
    stats map[string]*QueryStats
    mu    sync.RWMutex
}

func (c *QueryStatsCollector) Record(sql string, duration time.Duration, table string) {
    // 记录查询统计
}

func (c *QueryStatsCollector) GetReport() []QueryStats {
    // 生成性能报告
}
```

**验收标准**：
- [ ] 查询性能统计实现
- [ ] 性能报告生成功能
- [ ] API 接口添加完成
- [ ] 测试通过

**预计工作量**：3-4 天

---

### 阶段三：功能增强（3-4周）

#### 🟢 低优先级任务

##### 任务 3.1：支持关系类型变更
**目标**：支持 Link 字段关系类型变更（如 manyMany 改为 manyOne）

**工作内容**：
1. 实现关系类型变更逻辑
2. 实现数据迁移逻辑
3. 添加变更验证
4. 添加回滚支持

**涉及文件**：
- `server/internal/domain/table/service/link_service.go`（修改）
- `server/internal/domain/table/service/link_migration.go`（新建）

**代码实现**：
```go
// link_service.go
func (s *LinkService) ChangeRelationType(ctx context.Context, fieldID string, newType string) error {
    // 1. 获取当前字段
    field, err := s.fieldRepo.GetByID(ctx, fieldID)
    if err != nil {
        return err
    }
    
    oldType := field.Options().Link.RelationType
    if oldType == newType {
        return nil
    }
    
    // 2. 验证变更是否可行
    if err := s.validateRelationTypeChange(oldType, newType); err != nil {
        return err
    }
    
    // 3. 执行数据迁移
    if err := s.migrateRelationType(ctx, field, oldType, newType); err != nil {
        return err
    }
    
    // 4. 更新字段配置
    field.Options().Link.RelationType = newType
    return s.fieldRepo.Save(ctx, field)
}

func (s *LinkService) migrateRelationType(ctx context.Context, field *entity.Field, oldType, newType string) error {
    // 实现数据迁移逻辑
    // 例如：从 manyMany 改为 manyOne
    // 1. 从 junction table 读取数据
    // 2. 更新到外键列
    // 3. 删除 junction table
    // 4. 更新索引
}
```

**验收标准**：
- [ ] 关系类型变更功能实现
- [ ] 数据迁移逻辑实现
- [ ] 变更验证实现
- [ ] 回滚支持实现
- [ ] 功能测试通过

**预计工作量**：5-7 天

---

##### 任务 3.2：记录删除时清理 Link 引用
**目标**：删除记录时自动清理 JSONB 列中的 link 值

**工作内容**：
1. 实现 Link 引用清理逻辑
2. 在记录删除时自动调用
3. 添加清理验证
4. 优化清理性能

**涉及文件**：
- `server/internal/application/record_service.go`（修改）
- `server/internal/domain/table/service/link_cleanup.go`（新建）

**代码实现**：
```go
// record_service.go
func (s *RecordService) DeleteRecord(ctx context.Context, tableID string, recordID valueobject.RecordID) error {
    // 1. 获取所有 Link 字段
    linkFields, err := s.fieldRepo.FindLinkFieldsToTable(ctx, tableID)
    if err != nil {
        return err
    }
    
    // 2. 清理 JSONB 列中的 link 值
    for _, linkField := range linkFields {
        if err := s.linkCleanup.CleanLinkReference(ctx, tableID, recordID, linkField); err != nil {
            logger.Warn("清理 Link 引用失败",
                logger.String("field_id", linkField.ID().String()),
                logger.ErrorField(err),
            )
        }
    }
    
    // 3. 删除记录
    return s.recordRepo.Delete(ctx, tableID, recordID)
}

// link_cleanup.go
func (c *LinkCleanup) CleanLinkReference(ctx context.Context, tableID string, recordID valueobject.RecordID, linkField *entity.Field) error {
    // 1. 获取所有包含此记录的 Link 字段
    // 2. 从 JSONB 列中移除该记录的引用
    // 3. 更新记录
}
```

**验收标准**：
- [ ] Link 引用清理功能实现
- [ ] 自动清理集成完成
- [ ] 清理验证实现
- [ ] 性能测试通过
- [ ] 功能测试通过

**预计工作量**：3-4 天

---

## 📊 任务优先级和时间表

### 第一阶段（1-2周）
- [x] 任务 1.1：验证并统一字段定义（2-3 天）
- [ ] 任务 1.2：添加缺失字段（可选，1-2 天）

### 第二阶段（2-3周）
- [ ] 任务 2.1：添加慢查询监控（3-4 天）
- [ ] 任务 2.2：优化批量操作大小（2-3 天）
- [ ] 任务 2.3：添加查询性能统计（3-4 天）

### 第三阶段（3-4周）
- [ ] 任务 3.1：支持关系类型变更（5-7 天）
- [ ] 任务 3.2：记录删除时清理 Link 引用（3-4 天）

---

## 🧪 测试计划

### 单元测试
- [ ] 模型定义测试
- [ ] 迁移文件测试
- [ ] 性能监控测试
- [ ] 批量操作测试

### 集成测试
- [ ] 数据库迁移测试
- [ ] 查询性能测试
- [ ] Link 字段功能测试
- [ ] 记录删除测试

### 性能测试
- [ ] 慢查询监控测试
- [ ] 批量操作性能测试
- [ ] 查询性能统计测试
- [ ] 内存使用测试

---

## 📝 文档更新

### 需要更新的文档
- [ ] API 文档（如添加性能报告接口）
- [ ] 配置文档（如添加新配置项）
- [ ] 迁移指南（如添加新字段）
- [ ] 性能优化指南

---

## 🎯 成功标准

### 技术指标
- [ ] 所有模型定义与迁移文件一致
- [ ] 慢查询监控功能正常工作
- [ ] 批量操作性能提升 20%+
- [ ] 查询性能统计准确

### 功能指标
- [ ] 关系类型变更功能可用
- [ ] Link 引用清理功能正常
- [ ] 所有测试通过

### 质量指标
- [ ] 代码审查通过
- [ ] 文档更新完成
- [ ] 性能测试通过

---

## 🔄 持续改进

### 监控指标
- 慢查询数量
- 批量操作性能
- 查询性能统计
- 内存使用情况

### 优化方向
- 根据监控数据持续优化
- 定期对比 Teable 新功能
- 收集用户反馈

---

## 📅 时间线

```
Week 1-2:  阶段一 - 数据库结构对齐
Week 3-5:  阶段二 - 性能优化
Week 6-9:  阶段三 - 功能增强
Week 10:   测试和文档
Week 11:   代码审查和发布
```

---

## 🚀 快速开始

### 立即执行的任务
1. **任务 1.1**：验证并统一字段定义（高优先级）
2. **任务 2.1**：添加慢查询监控（中优先级，影响大）

### 后续任务
根据项目进度和需求，逐步执行其他任务。

---

**计划制定时间**：2025-01-XX  
**预计完成时间**：2025-03-XX  
**负责人**：开发团队  
**状态**：📋 待执行

