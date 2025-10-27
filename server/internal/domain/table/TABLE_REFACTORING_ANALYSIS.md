# Table 包重构分析报告

## 📊 当前状态

### 已重构文件 ✅
```
table/
├── entity/
│   └── table.go              # ✅ Table 实体（纯领域模型）
├── valueobject/
│   ├── table_id.go           # ✅ TableID 值对象
│   └── table_name.go         # ✅ TableName 值对象
├── aggregate/
│   └── table_aggregate.go    # ✅ TableAggregate 聚合根
├── event/
│   └── table_events.go       # ✅ 领域事件
└── errors.go                 # ✅ 领域错误
```

### 备份中的重要文件 ⚠️

#### 1. 领域服务（Domain Services）

| 文件 | 行数 | 功能 | 建议 |
|------|------|------|------|
| `virtual_field_service.go` | 413 | 虚拟字段计算（Formula/Rollup/Lookup） | ⚠️ **需要重构回来** |
| `formula_evaluator.go` | 482 | 公式评估器 | ⚠️ **需要重构回来** |
| `schema_service.go` | 337 | Schema 变更管理 | ⚠️ **需要重构回来** |
| `batch_service.go` | 371 | 批量计算服务 | ⚠️ **需要重构回来** |
| `cross_table_calculation_service.go` | 480 | 跨表计算和记录裂变 | ⚠️ **需要重构回来** |
| `symmetric_field_service.go` | 450 | Link字段对称同步 | ⚠️ **需要重构回来** |

#### 2. 领域接口和类型

| 文件 | 行数 | 功能 | 建议 |
|------|------|------|------|
| `relationship.go` | 435 | 关系类型定义和配置 | ⚠️ **需要重构** |
| `record_interface.go` | 43 | 记录数据接口 | ⚠️ **需要重构** |
| `repository.go` | 28 | 仓储接口（旧版） | ✅ 可删除（已有新版） |
| `service.go` | 607 | 服务接口（旧版） | ⚠️ **需要拆分** |

#### 3. 测试文件

| 文件 | 功能 |
|------|------|
| `test_models.go` | 测试模型 |

---

## 🎯 重构建议

### 方案 A：保守重构（推荐）

保留领域服务，按 DDD 原则重新组织：

```
table/
├── entity/
│   └── table.go                           # ✅ 已完成
├── valueobject/
│   ├── table_id.go                        # ✅ 已完成
│   └── table_name.go                      # ✅ 已完成
├── aggregate/
│   └── table_aggregate.go                 # ✅ 已完成
├── event/
│   └── table_events.go                    # ✅ 已完成
├── repository/
│   └── table_repository.go                # ⚠️ 新增：仓储接口
├── service/                               # ⚠️ 新增：领域服务目录
│   ├── virtual_field_service.go           # 虚拟字段服务
│   ├── formula_evaluator.go               # 公式评估器
│   ├── schema_change_service.go           # Schema变更服务
│   ├── batch_calculation_service.go       # 批量计算服务
│   ├── cross_table_service.go             # 跨表服务
│   └── symmetric_field_service.go         # 对称字段服务
├── specification/                         # ⚠️ 新增：规约模式
│   └── relationship_spec.go               # 关系规约
└── errors.go                              # ✅ 已完成
```

### 方案 B：激进重构（完全 DDD）

将服务拆分到更细粒度的子领域：

```
table/
├── entity/
├── valueobject/
├── aggregate/
├── event/
├── repository/
└── errors.go

calculation/                               # 计算子域
├── service/
│   ├── formula_service.go
│   ├── rollup_service.go
│   ├── lookup_service.go
│   └── batch_service.go
└── evaluator/
    └── formula_evaluator.go

relationship/                              # 关系子域
├── entity/
│   └── link_relationship.go
├── valueobject/
│   └── relation_type.go
└── service/
    ├── symmetric_sync_service.go
    └── cross_table_service.go

schema/                                    # Schema子域
├── entity/
│   └── schema_change.go
└── service/
    └── schema_validator.go
```

---

## 📋 详细分析

### 1. Virtual Field Service (虚拟字段服务)

**文件:** `virtual_field_service.go` (413 行)

**功能:**
- Formula 字段计算
- Rollup 字段计算（聚合）
- Lookup 字段计算（查找）
- 虚拟字段缓存
- AI 字段处理

**DDD 定位:** **领域服务 (Domain Service)**

**原因:**
- 虚拟字段计算是跨实体的业务逻辑
- 不自然属于任何单一实体
- 需要协调 Field 和 Record

**重构建议:**
```go
// table/service/virtual_field_service.go
package service

import (
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
    recordEntity "github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
)

// VirtualFieldService 虚拟字段领域服务
// 负责：Formula, Rollup, Lookup 字段的计算
type VirtualFieldService struct {
    formulaEvaluator FormulaEvaluator
    recordRepo       RecordRepository
    fieldRepo        FieldRepository
    cache            VirtualFieldCache
}

// CalculateFormula 计算 Formula 字段
func (s *VirtualFieldService) CalculateFormula(
    ctx context.Context,
    field *fieldEntity.Field,
    record *recordEntity.Record,
) (interface{}, error) {
    // 业务逻辑
}

// CalculateRollup 计算 Rollup 字段（聚合）
func (s *VirtualFieldService) CalculateRollup(
    ctx context.Context,
    field *fieldEntity.Field,
    linkedRecords []*recordEntity.Record,
) (interface{}, error) {
    // 业务逻辑
}

// CalculateLookup 计算 Lookup 字段（查找）
func (s *VirtualFieldService) CalculateLookup(
    ctx context.Context,
    field *fieldEntity.Field,
    record *recordEntity.Record,
) (interface{}, error) {
    // 业务逻辑
}
```

**是否拆分:** ⚠️ **建议保留**，但移到 `service/` 目录

---

### 2. Formula Evaluator (公式评估器)

**文件:** `formula_evaluator.go` (482 行)

**功能:**
- 解析公式表达式
- 计算公式结果
- 支持各种函数（SUM, AVG, IF等）
- 处理字段引用

**DDD 定位:** **领域服务 (Domain Service)**

**重构建议:**
```go
// table/service/formula_evaluator.go
package service

// FormulaEvaluator 公式评估器接口
type FormulaEvaluator interface {
    // Evaluate 评估公式
    Evaluate(
        ctx context.Context,
        formula string,
        record RecordData,
        fields FieldInstanceMap,
    ) (interface{}, error)
    
    // ValidateFormula 验证公式语法
    ValidateFormula(formula string) error
    
    // ExtractDependencies 提取公式依赖的字段
    ExtractDependencies(formula string) ([]string, error)
}

// DefaultFormulaEvaluator 默认实现
type DefaultFormulaEvaluator struct {
    // 可以使用 govaluate 或自定义解析器
}
```

**是否拆分:** ⚠️ **建议保留**，移到 `service/` 目录

---

### 3. Schema Service (Schema 变更服务)

**文件:** `schema_service.go` (337 行)

**功能:**
- 验证 Schema 变更
- 检查字段类型兼容性
- 数据迁移策略
- 变更影响分析

**DDD 定位:** **领域服务 (Domain Service)**

**重构建议:**
```go
// table/service/schema_change_service.go
package service

// SchemaChangeService Schema 变更领域服务
type SchemaChangeService struct {
    fieldRepo      FieldRepository
    recordRepo     RecordRepository
    schemaValidator SchemaValidator
}

// ValidateSchemaChange 验证 Schema 变更
func (s *SchemaChangeService) ValidateSchemaChange(
    ctx context.Context,
    change *SchemaChange,
) (*SchemaChangeResult, error) {
    // 1. 检查字段类型兼容性
    // 2. 分析数据迁移影响
    // 3. 返回变更结果
}

// ApplySchemaChange 应用 Schema 变更
func (s *SchemaChangeService) ApplySchemaChange(
    ctx context.Context,
    change *SchemaChange,
) error {
    // 1. 验证变更
    // 2. 更新字段定义
    // 3. 迁移现有数据
}
```

**是否拆分:** ⚠️ **建议保留**，移到 `service/` 目录

---

### 4. Batch Service (批量计算服务)

**文件:** `batch_service.go` (371 行)

**功能:**
- 批量记录更新
- 并发处理
- 性能优化
- 进度跟踪

**DDD 定位:** **应用服务 (Application Service)** ⚠️

**理由:**
- 批量处理是技术关注点
- 涉及性能优化、并发控制
- 协调多个领域服务

**重构建议:**
```
❌ 不应该在 domain/table 中
✅ 应该在 application/batch_service.go
```

**是否拆分:** ⚠️ **移动到 application 层**

---

### 5. Cross Table Calculation Service (跨表计算服务)

**文件:** `cross_table_calculation_service.go` (480 行)

**功能:**
- 查找引用记录
- 记录裂变（Record Split）
- 跨表依赖分析
- 级联更新

**DDD 定位:** **领域服务 (Domain Service)**

**理由:**
- 跨表引用是核心业务逻辑
- 涉及多个聚合根协调
- 记录裂变是重要业务规则

**重构建议:**
```go
// table/service/cross_table_service.go
package service

// CrossTableService 跨表计算领域服务
type CrossTableService struct {
    tableRepo  TableRepository
    recordRepo RecordRepository
    fieldRepo  FieldRepository
}

// FindReferencingRecords 查找引用指定记录的所有记录
func (s *CrossTableService) FindReferencingRecords(
    ctx context.Context,
    tableID, recordID string,
) ([]RecordReference, error) {
    // 业务逻辑
}

// PropagateRecordSplit 传播记录裂变
func (s *CrossTableService) PropagateRecordSplit(
    ctx context.Context,
    splitContext *RecordSplitContext,
) error {
    // 业务逻辑
}
```

**是否拆分:** ⚠️ **建议保留**，移到 `service/` 目录

---

### 6. Symmetric Field Service (对称字段服务)

**文件:** `symmetric_field_service.go` (450 行)

**功能:**
- Link 字段双向同步
- 检测同步冲突
- 解决冲突策略
- 保证数据一致性

**DDD 定位:** **领域服务 (Domain Service)**

**理由:**
- 对称性是 Link 字段的核心业务规则
- 维护聚合间的引用完整性
- 冲突解决是重要业务逻辑

**重构建议:**
```go
// table/service/symmetric_field_service.go
package service

// SymmetricFieldService Link字段对称同步领域服务
type SymmetricFieldService struct {
    fieldRepo  FieldRepository
    recordRepo RecordRepository
}

// SyncSymmetricField 同步对称字段
func (s *SymmetricFieldService) SyncSymmetricField(
    ctx context.Context,
    change *LinkCellChange,
) error {
    // 1. 找到对称字段
    // 2. 更新对称方记录
    // 3. 检测冲突
    // 4. 解决冲突
}

// DetectConflicts 检测同步冲突
func (s *SymmetricFieldService) DetectConflicts(
    ctx context.Context,
    changes []*LinkCellChange,
) ([]*Conflict, error) {
    // 业务逻辑
}
```

**是否拆分:** ⚠️ **建议保留**，移到 `service/` 目录

---

### 7. Relationship (关系定义)

**文件:** `relationship.go` (435 行)

**功能:**
- 关系类型枚举
- Link 字段配置
- 关系元数据

**DDD 定位:** **值对象 / 规约**

**重构建议:**
```
table/
├── valueobject/
│   ├── relation_type.go       # RelationType 枚举
│   └── link_options.go        # LinkFieldOptions 配置
└── specification/
    └── relationship_spec.go   # 关系验证规约
```

**是否拆分:** ✅ **应该拆分**

---

## 🎯 推荐的重构方案

### 阶段 1：整理目录结构（立即）

```bash
# 1. 创建 service 目录
mkdir -p table/service
mkdir -p table/specification

# 2. 移动领域服务
mv _old_backup/virtual_field_service.go service/
mv _old_backup/formula_evaluator.go service/
mv _old_backup/schema_service.go service/schema_change_service.go
mv _old_backup/cross_table_calculation_service.go service/cross_table_service.go
mv _old_backup/symmetric_field_service.go service/

# 3. 拆分 relationship.go
# 手动拆分到 valueobject/ 和 specification/

# 4. 移动 batch_service 到 application 层
mv _old_backup/batch_service.go ../../application/batch_calculation_service.go

# 5. 创建仓储接口
# 基于 _old_backup/repository.go 创建新的 repository/table_repository.go
```

### 阶段 2：清理和重构（后续）

1. **清理 service.go**
   - 607 行的服务接口太大
   - 拆分成具体的领域服务接口

2. **更新 import 路径**
   - 所有引用 fields.Field 的地方
   - 改为 fieldEntity.Field

3. **添加接口定义**
   - RecordData 接口
   - Repository 接口

4. **测试文件**
   - 保留测试文件在 table/ 根目录
   - 确保测试通过

---

## 📊 最终目录结构

```
table/
├── entity/
│   └── table.go                           # ✅ Table 实体
├── valueobject/
│   ├── table_id.go                        # ✅ TableID
│   ├── table_name.go                      # ✅ TableName
│   ├── relation_type.go                   # ⚠️ 新增：关系类型
│   └── link_options.go                    # ⚠️ 新增：Link选项
├── aggregate/
│   └── table_aggregate.go                 # ✅ 聚合根
├── event/
│   └── table_events.go                    # ✅ 领域事件
├── repository/
│   └── table_repository.go                # ⚠️ 新增：仓储接口
├── service/
│   ├── virtual_field_service.go           # ⚠️ 领域服务：虚拟字段
│   ├── formula_evaluator.go               # ⚠️ 领域服务：公式评估
│   ├── schema_change_service.go           # ⚠️ 领域服务：Schema变更
│   ├── cross_table_service.go             # ⚠️ 领域服务：跨表计算
│   └── symmetric_field_service.go         # ⚠️ 领域服务：对称同步
├── specification/
│   └── relationship_spec.go               # ⚠️ 规约：关系验证
├── errors.go                              # ✅ 领域错误
├── *_test.go                              # ✅ 测试文件
└── _old_backup/                           # 清理后删除
```

---

## ⚠️ 重要说明

### 领域服务 vs 应用服务

**领域服务特征：**
- ✅ 实现核心业务规则
- ✅ 无状态或最小状态
- ✅ 协调多个实体/聚合
- ✅ 可能包含复杂算法
- ✅ 与基础设施无关

**应用服务特征：**
- ⚠️ 协调领域对象完成用例
- ⚠️ 事务管理
- ⚠️ 权限检查
- ⚠️ 与基础设施交互
- ⚠️ 编排领域服务

**Table 包中的服务分类：**

| 服务 | 类型 | 位置 |
|------|------|------|
| VirtualFieldService | 领域服务 | domain/table/service/ |
| FormulaEvaluator | 领域服务 | domain/table/service/ |
| SchemaChangeService | 领域服务 | domain/table/service/ |
| CrossTableService | 领域服务 | domain/table/service/ |
| SymmetricFieldService | 领域服务 | domain/table/service/ |
| **BatchService** | **应用服务** | **application/** |

---

## 📋 执行检查清单

### 立即执行（重要）

- [ ] 创建 `table/service/` 目录
- [ ] 创建 `table/repository/` 目录
- [ ] 创建 `table/specification/` 目录
- [ ] 移动领域服务到 `service/`
- [ ] 拆分 `relationship.go` 到值对象
- [ ] 移动 `batch_service.go` 到 `application/`
- [ ] 清理空目录 (`repository_new`, `service_new`)

### 后续优化（可选）

- [ ] 重构 `service.go` 接口（607行太大）
- [ ] 提取 `record_interface.go` 到合适位置
- [ ] 更新所有 import 路径
- [ ] 确保测试通过
- [ ] 更新文档

---

## 🎯 总结

**Table 包不应该简单清空！**

它包含了 **2500+ 行** 的核心业务逻辑：
- 虚拟字段计算（Formula/Rollup/Lookup）
- 公式评估引擎
- Schema 安全变更
- 跨表引用和裂变
- Link 字段对称同步

**这些都是纯粹的领域逻辑，应该保留在领域层！**

**推荐方案：**
1. ✅ 保留现有的 entity/valueobject/aggregate/event
2. ⚠️ 将备份中的领域服务移到 `service/` 目录
3. ⚠️ 将 `batch_service.go` 移到 `application/` 层
4. ⚠️ 拆分 `relationship.go` 到值对象
5. ✅ 保持测试文件在根目录

这样可以：
- ✅ 保留所有重要的业务逻辑
- ✅ 符合 DDD 分层架构
- ✅ 清晰的职责划分
- ✅ 易于测试和维护

