# Table Service 迁移执行计划

## 🎯 目标

将 `_old_backup/` 中的功能完全迁移到新架构，做到可以删除 `_old_backup/`

## 📊 迁移清单

### 需要迁移的文件

| 文件 | 行数 | 状态 | 优先级 |
|------|------|------|--------|
| ✅ relationship.go | 435 | 已拆分为值对象 | - |
| ✅ repository.go | 28 | 已重建 | - |
| ✅ batch_service.go | 371 | 已移到 application 层 | - |
| ⚠️ formula_evaluator.go | 482 | 已复制，需修复 | **P0** |
| ⚠️ virtual_field_service.go | 413 | 已复制，需修复 | **P0** |
| ⚠️ schema_service.go | 337 | 已复制为 schema_change_service.go | **P1** |
| ⚠️ cross_table_calculation_service.go | 480 | 已复制为 cross_table_service.go | **P1** |
| ⚠️ symmetric_field_service.go | 450 | 已复制，需修复 | **P1** |
| ⚠️ record_interface.go | 43 | 已复制，需修复 | **P2** |
| ❓ service.go | 607 | 需分析是否需要 | **P3** |

### 已完成 ✅

- [x] 创建新目录结构
- [x] 拆分 relationship.go 为值对象
- [x] 创建仓储接口
- [x] 移动 batch_service 到 application 层
- [x] 复制服务文件到 service/ 目录
- [x] 更新 package 名为 service

### 待完成 ⚠️

- [ ] 修复 formula_evaluator.go
- [ ] 修复 virtual_field_service.go
- [ ] 修复 schema_change_service.go
- [ ] 修复 cross_table_service.go
- [ ] 修复 symmetric_field_service.go
- [ ] 修复 record_interface.go
- [ ] 分析 service.go 是否需要
- [ ] 删除 _old_backup/

---

## 🚀 执行策略

### 方案：增量式迁移

**原则：逐个文件修复并验证**

每个文件的步骤：
1. 📋 检查功能完整性
2. 🔧 更新 import 路径
3. 🔨 修复类型引用
4. ✅ 编译验证
5. 🧪 简单测试
6. 💾 提交

### 为什么不能一次性修复所有 import？

❌ **问题：**
- 大量编译错误，难以定位
- 不知道哪些功能是必需的
- 可能浪费时间在不需要的代码上

✅ **增量式的优势：**
- 每步都可编译验证
- 进度可追踪
- 问题可定位
- 随时可中断和恢复

---

## 📋 详细迁移步骤

### 第1步：formula_evaluator.go (P0 - 最高优先级)

**为什么优先：** 公式评估器是虚拟字段的基础

**需要修复：**
```go
// 1. Import 路径
- import "github.com/easyspace-ai/luckdb/server/internal/domain/fields"
+ import fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"

// 2. 类型引用
- type FieldInstanceMap = fields.FieldInstanceMap
+ type FieldInstanceMap map[string]*fieldEntity.Field

// 3. 方法签名
func (e *DefaultFormulaEvaluator) Evaluate(
    expression string,
-   fieldMap fields.FieldInstanceMap,
+   fieldMap FieldInstanceMap,
    recordData map[string]interface{},
) (interface{}, error)

// 4. 字段访问
- field := fieldMap[fieldName]
- fieldType := field.Type
+ field := fieldMap[fieldName]
+ fieldType := field.Type().String()  // 如果 Type 是方法
```

**验证：**
```bash
go build ./internal/domain/table/service/formula_evaluator.go
```

---

### 第2步：virtual_field_service.go (P0)

**为什么第二：** 依赖 formula_evaluator

**需要修复：**
```go
// 1. Import 路径
import (
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
    recordEntity "github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/service"
)

// 2. 类型引用
type VirtualFieldService struct {
-   formulaEvaluator FormulaEvaluator
+   formulaEvaluator service.FormulaEvaluator
-   recordRepo       RecordRepository
+   recordRepo       repository.RecordRepository
-   fieldRepo        FieldRepository
+   fieldRepo        repository.FieldRepository
}

// 3. 方法签名
func (s *VirtualFieldService) CalculateFormula(
    ctx context.Context,
-   field *fields.Field,
+   field *fieldEntity.Field,
-   record *record.Record,
+   record *recordEntity.Record,
) (interface{}, error)
```

**验证：**
```bash
go build ./internal/domain/table/service/virtual_field_service.go
```

---

### 第3步：schema_change_service.go (P1)

**需要修复：**
```go
import (
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
    tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
)

type SchemaChange struct {
-   OldField *fields.Field
+   OldField *fieldEntity.Field
-   NewField *fields.Field
+   NewField *fieldEntity.Field
-   Table    *table.Table
+   Table    *tableEntity.Table
}
```

---

### 第4步：cross_table_service.go (P1)

**需要修复：**
```go
import (
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
)

type CrossTableCalculationService struct {
-   fieldRepo FieldRepository
+   fieldRepo repository.FieldRepository
    // 移除 batchService（已在 application 层）
}
```

---

### 第5步：symmetric_field_service.go (P1)

**需要修复：**
```go
import (
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
)

type SymmetricFieldService struct {
-   fieldRepo  FieldRepository
+   fieldRepo  repository.FieldRepository
-   recordRepo RecordRepository
+   recordRepo repository.RecordRepository
}
```

---

### 第6步：record_interface.go (P2)

**决策：** 这个文件可能需要移动到 repository/ 作为接口的一部分

**待定：**
- 是否需要独立文件？
- 还是合并到 repository/table_repository.go？

---

### 第7步：分析 service.go (P3)

**文件：** `_old_backup/service.go` (607 行)

**分析任务：**
1. 列出所有接口方法
2. 检查哪些已在新架构中实现
3. 哪些需要补充
4. 哪些可以废弃

---

## 📝 检查清单

### 每个文件修复后检查

- [ ] Import 路径正确
- [ ] 类型引用正确
- [ ] 编译通过
- [ ] 没有循环依赖
- [ ] 没有基础设施泄漏（如 `*gorm.DB`）
- [ ] 方法签名正确
- [ ] 提交代码

### 全部完成后检查

- [ ] 所有 service/ 文件编译通过
- [ ] 测试通过
- [ ] 文档更新
- [ ] 可以删除 _old_backup/

---

## 🎯 当前任务

**立即开始：修复 formula_evaluator.go**

```bash
# 1. 查看当前错误
cd /Users/leven/space/easy/luckdb/server
go build ./internal/domain/table/service/formula_evaluator.go 2>&1

# 2. 修复 import 和类型引用
# 3. 验证编译
# 4. 提交
```

---

## 📊 进度跟踪

| 文件 | 状态 | 进度 |
|------|------|------|
| formula_evaluator.go | ⏳ 进行中 | 0% |
| virtual_field_service.go | ⏸️ 等待 | 0% |
| schema_change_service.go | ⏸️ 等待 | 0% |
| cross_table_service.go | ⏸️ 等待 | 0% |
| symmetric_field_service.go | ⏸️ 等待 | 0% |
| record_interface.go | ⏸️ 等待 | 0% |
| service.go (分析) | ⏸️ 等待 | 0% |

**总体进度：** 0/7 (0%)

---

## 💡 快速参考

### 常见类型映射

| 旧引用 | 新引用 |
|--------|--------|
| `fields.Field` | `fieldEntity.Field` |
| `fields.FieldType` | `string` 或 `fieldEntity.FieldType` |
| `table.Table` | `tableEntity.Table` |
| `record.Record` | `recordEntity.Record` |
| `FieldRepository` | `repository.FieldRepository` |
| `RecordRepository` | `repository.RecordRepository` |

### Import 模板

```go
package service

import (
    "context"
    
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
    recordEntity "github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
    tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/valueobject"
)
```

---

**现在开始执行第1步！** 🚀

