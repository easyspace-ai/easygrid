# Table Service 重构待办

## ✅ 已完成

- [x] 创建 `service/` 目录
- [x] 创建 `repository/` 目录  
- [x] 创建 `specification/` 目录
- [x] 移动领域服务到 `service/` 目录
- [x] 更新 package 名为 `service`
- [x] 拆分 `relationship.go` 为值对象
- [x] 移动 `batch_service` 到 `application/` 层
- [x] 创建 `repository/table_repository.go` 接口
- [x] 创建值对象：`relation_type.go`, `link_options.go`
- [x] 创建规约：`relationship_config.go`

## ⚠️ 待修复的编译错误

### 1. formula_evaluator.go

**错误：**
```
undefined: fields.FieldInstanceMap
undefined: fieldEntity
```

**修复方案：**
```go
// 添加 import
import (
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
)

// 修改所有 fields.FieldInstanceMap 引用
type FieldInstanceMap map[string]*fieldEntity.Field

// 修改方法签名
func (e *DefaultFormulaEvaluator) Evaluate(
    expression string,
    fieldMap FieldInstanceMap,  // 改为本地类型
    recordData map[string]interface{},
) (interface{}, error)
```

### 2. cross_table_service.go

**错误：**
```
undefined: FieldRepository
undefined: BatchService
```

**修复方案：**
```go
// 添加 import
import (
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
)

// 修改类型引用
type CrossTableCalculationService struct {
    db            *gorm.DB
    fieldRepo     repository.FieldRepository   // 使用仓储接口
    recordService RecordServiceInterface
    // 移除 batchService *BatchService（这个应该在 application 层）
}
```

### 3. schema_change_service.go

**错误：**
```
undefined: fields.Field
undefined: Table
undefined: Repository
```

**修复方案：**
```go
// 添加 import
import (
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
    tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
)

// 修改所有类型引用
type SchemaChange struct {
    FieldID        string
    OldFieldType   string
    NewFieldType   string
    OldField       *fieldEntity.Field  // 改为实体引用
    NewField       *fieldEntity.Field  // 改为实体引用
    Table          *tableEntity.Table  // 改为实体引用
    // ...
}

type SchemaService interface {
    ValidateSchemaChange(ctx context.Context, table *tableEntity.Table, change *SchemaChange) (*SchemaChangeResult, error)
    // ...
}
```

### 4. virtual_field_service.go

**需要检查的引用：**
- Field 类型引用
- Record 类型引用
- 各种接口定义

### 5. symmetric_field_service.go

**需要检查的引用：**
- Field 类型引用
- Record 类型引用
- Link 相关类型

### 6. record_interface.go

**可能需要移动到：**
- `repository/` 目录（作为仓储接口的一部分）
- 或保持在 `service/` 作为服务使用的接口

---

## 📋 详细修复步骤

### 步骤 1：统一更新 import

为所有服务文件添加正确的 import：

```go
package service

import (
    "context"
    
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
    tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
    "github.com/easyspace-ai/luckdb/server/internal/domain/table/repository"
)
```

### 步骤 2：替换类型引用

批量替换以下模式：

| 旧引用 | 新引用 |
|--------|--------|
| `fields.Field` | `fieldEntity.Field` |
| `fields.FieldType` | `fieldEntity.FieldType` |
| `table.Table` | `tableEntity.Table` |
| `FieldRepository` | `repository.FieldRepository` |
| `RecordRepository` | `repository.RecordRepository` |

### 步骤 3：移除循环依赖

某些服务可能相互依赖，需要：
1. 提取共享接口到 `repository/` 或独立的接口文件
2. 使用依赖注入而非直接引用

### 步骤 4：验证编译

```bash
go build ./internal/domain/table/...
```

---

## 🎯 优先级

### P0 - 高优先级（立即修复）

1. ✅ **formula_evaluator.go** - 公式评估是核心功能
2. ✅ **virtual_field_service.go** - 虚拟字段是核心功能
3. ✅ **schema_change_service.go** - Schema变更很重要

### P1 - 中优先级（本周修复）

4. **cross_table_service.go** - 跨表计算
5. **symmetric_field_service.go** - 对称同步

### P2 - 低优先级（后续优化）

6. **record_interface.go** - 可能需要重新设计位置

---

## 🔧 快速修复脚本

```bash
#!/bin/bash
# fix_imports.sh

cd /Users/leven/space/easy/luckdb/server/internal/domain/table/service

# 1. 批量添加 import
for file in *.go; do
    # 检查是否已有正确的 import
    if ! grep -q "fieldEntity.*fields/entity" "$file"; then
        # 在 import 部分添加
        sed -i '' '/^import (/a\
    fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"\
    tableEntity "github.com/easyspace-ai/luckdb/server/internal/domain/table/entity"
' "$file"
    fi
done

# 2. 批量替换类型引用
for file in *.go; do
    sed -i '' 's/fields\.Field\([^a-zA-Z]\)/fieldEntity.Field\1/g' "$file"
    sed -i '' 's/\*fields\.Field/*fieldEntity.Field/g' "$file"
    sed -i '' 's/\[\]fields\.Field/[]fieldEntity.Field/g' "$file"
done

echo "✅ Import 已更新，请运行 go build 验证"
```

---

## 📝 注意事项

1. **不要急于编译通过**
   - 这些服务文件包含核心业务逻辑
   - 需要仔细检查每个类型引用
   - 确保语义正确

2. **保持领域纯洁性**
   - service/ 中的服务应该是纯领域服务
   - 不应该有基础设施依赖（如 `*gorm.DB`）
   - 应该通过仓储接口访问数据

3. **考虑进一步拆分**
   - 某些服务文件较大（450+ 行）
   - 可能需要拆分成多个更小的服务

---

## ✅ 成功标准

- [ ] 所有服务文件编译通过
- [ ] 没有循环依赖
- [ ] 没有基础设施泄漏到领域层
- [ ] 类型引用正确
- [ ] 测试通过

---

**下一步：** 逐个文件修复编译错误，优先修复 P0 文件

