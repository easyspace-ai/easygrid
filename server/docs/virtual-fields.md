# 虚拟字段支持文档

## 概述

虚拟字段（Virtual Fields）是一种计算型字段，其值不是直接由用户输入，而是通过计算其他字段的值或关联记录的数据自动生成的。虚拟字段大大增强了数据库的自动化能力和灵活性。

### 支持的虚拟字段类型

系统目前支持以下四种虚拟字段类型：

1. **Formula（公式字段）** - 基于同一记录中其他字段的值通过公式表达式计算
2. **Rollup（汇总字段）** - 对关联记录中的某个字段进行聚合计算
3. **Lookup（查找字段）** - 从关联记录中查找某个字段的值
4. **Count（计数字段）** - 统计关联记录的数量

## 虚拟字段类型详解

### Formula（公式字段）

#### 功能说明

Formula字段允许你使用表达式来计算基于同一记录中其他字段的值。表达式使用字段名称（用花括号包裹）来引用其他字段，支持常见的数学运算、函数调用等。

#### 依赖关系

Formula字段依赖于表达式中引用的所有字段。当这些依赖字段的值发生变化时，Formula字段会自动重新计算。

#### 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `formula.expression` | string | 是 | 公式表达式，如：`{价格} * {数量}` |
| `formula.timeZone` | string | 否 | 时区配置（用于日期时间计算），如：`"UTC"`, `"Asia/Shanghai"` |
| `formula.showAs` | object | 否 | 显示配置，用于控制字段的显示方式 |
| `formula.formatting` | object | 否 | 格式化配置，用于控制数值、日期等的显示格式 |

**showAs 配置选项：**
```json
{
  "type": "bar|line|ring",
  "color": "#FF5733",
  "config": {}
}
```

**formatting 配置选项：**
```json
{
  "type": "number|date|text",
  "precision": 2,
  "dateFormat": "YYYY-MM-DD",
  "timeFormat": "24h",
  "timeZone": "Asia/Shanghai",
  "showCommas": true,
  "currency": "CNY"
}
```

#### 使用示例

**示例1：计算总价**
```json
{
  "type": "formula",
  "name": "总价",
  "options": {
    "formula": {
      "expression": "{价格} * {数量}",
      "showAs": {
        "type": "number"
      },
      "formatting": {
        "type": "number",
        "precision": 2,
        "showCommas": true,
        "currency": "CNY"
      }
    }
  }
}
```

**示例2：计算日期差值**
```json
{
  "type": "formula",
  "name": "天数差",
  "options": {
    "formula": {
      "expression": "DAYS({结束日期}, {开始日期})",
      "formatting": {
        "type": "number"
      }
    }
  }
}
```

---

### Rollup（汇总字段）

#### 功能说明

Rollup字段用于对关联记录中的某个字段进行聚合计算。它需要一个Link字段来建立关联关系，然后对关联记录中指定字段的值执行聚合函数（如求和、平均值、最大值、最小值等）。

#### 依赖关系

Rollup字段依赖于：
- **Link字段**：用于建立关联关系的字段
- **被汇总的字段**：在关联记录中要进行聚合计算的字段

#### 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rollup.linkFieldId` | string | 是 | 关联的Link字段ID |
| `rollup.rollupFieldId` | string | 是 | 要汇总的字段ID |
| `rollup.aggregationFunction` | string | 是 | 聚合函数：`sum`, `count`, `avg`, `min`, `max` |
| `rollup.expression` | string | 否 | 自定义聚合表达式（高级用法） |
| `rollup.timeZone` | string | 否 | 时区配置 |
| `rollup.showAs` | object | 否 | 显示配置 |
| `rollup.formatting` | object | 否 | 格式化配置 |

**支持的聚合函数：**
- `sum` - 求和
- `count` - 计数
- `avg` - 平均值
- `min` - 最小值
- `max` - 最大值

#### 使用示例

**示例：计算订单总金额**
假设有一个订单表和一个订单项表，订单表通过Link字段关联到订单项表。

```json
{
  "type": "rollup",
  "name": "订单总金额",
  "options": {
    "rollup": {
      "linkFieldId": "fld_order_items",
      "rollupFieldId": "fld_item_total",
      "aggregationFunction": "sum",
      "formatting": {
        "type": "number",
        "precision": 2,
        "currency": "CNY",
        "showCommas": true
      }
    }
  }
}
```

---

### Lookup（查找字段）

#### 功能说明

Lookup字段用于从关联记录中查找某个字段的值。它需要一个Link字段来建立关联关系，然后返回关联记录中指定字段的值。

#### 依赖关系

Lookup字段依赖于：
- **Link字段**：用于建立关联关系的字段

#### 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `lookup.linkFieldId` | string | 是 | 关联的Link字段ID |
| `lookup.lookupFieldId` | string | 是 | 要查找的字段ID |
| `lookup.showAs` | object | 否 | 显示配置 |
| `lookup.formatting` | object | 否 | 格式化配置 |

**注意：** 如果Link字段关联了多条记录，Lookup字段会返回第一条关联记录的字段值。

#### 使用示例

**示例：查找客户名称**
假设有一个订单表，通过Link字段关联到客户表。

```json
{
  "type": "lookup",
  "name": "客户名称",
  "options": {
    "lookup": {
      "linkFieldId": "fld_customer",
      "lookupFieldId": "fld_customer_name",
      "formatting": {
        "type": "text"
      }
    }
  }
}
```

---

### Count（计数字段）

#### 功能说明

Count字段用于统计关联记录的数量。它通过Link字段关联到其他表，然后统计关联记录的数量。

#### 依赖关系

Count字段依赖于：
- **Link字段**：用于建立关联关系的字段

#### 配置参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `count.linkFieldId` | string | 是 | 被计数的Link字段ID |
| `count.filter` | string | 否 | 过滤条件（未来支持） |

#### 使用示例

**示例：统计订单项数量**
```json
{
  "type": "count",
  "name": "订单项数量",
  "options": {
    "count": {
      "linkFieldId": "fld_order_items"
    }
  }
}
```

---

## 数据库架构

### field 表的虚拟字段相关字段

系统在 `field` 表中添加了以下字段来支持虚拟字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `is_pending` | BOOLEAN | 虚拟字段是否正在等待计算 |
| `has_error` | BOOLEAN | 虚拟字段计算是否出错 |
| `lookup_linked_field_id` | VARCHAR(30) | Lookup字段关联的link字段ID |
| `lookup_options` | TEXT | Lookup字段配置选项（JSON格式） |
| `ai_config` | TEXT | AI字段配置（JSON格式） |

### field_dependency 表

字段依赖关系表，用于管理虚拟字段的依赖图：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | VARCHAR(50) | 主键 |
| `source_field_id` | VARCHAR(30) | 源字段ID（被依赖的字段） |
| `dependent_field_id` | VARCHAR(30) | 依赖字段ID（依赖其他字段的虚拟字段） |
| `dependency_type` | VARCHAR(50) | 依赖类型：`lookup`, `formula`, `rollup`, `ai` |
| `created_time` | TIMESTAMP | 创建时间 |

**索引：**
- `idx_field_dependency_source` - 基于 `source_field_id`
- `idx_field_dependency_dependent` - 基于 `dependent_field_id`
- `unique_dependency` - 唯一约束：`(source_field_id, dependent_field_id)`

### virtual_field_cache 表

虚拟字段计算结果缓存表，用于提升计算性能：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | VARCHAR(50) | 主键 |
| `record_id` | VARCHAR(30) | 记录ID |
| `field_id` | VARCHAR(30) | 字段ID |
| `cached_value` | TEXT | 缓存的计算结果（JSON格式） |
| `value_type` | VARCHAR(50) | 值类型（text/number/boolean/object等） |
| `cached_at` | TIMESTAMP | 缓存时间 |
| `expires_at` | TIMESTAMP | 缓存过期时间 |

**索引：**
- `idx_virtual_cache_record` - 基于 `record_id`
- `idx_virtual_cache_field` - 基于 `field_id`
- `idx_virtual_cache_expires` - 基于 `expires_at`（部分索引）

---

## API 接口使用

### 创建虚拟字段

**请求：**
```http
POST /api/v1/fields
Content-Type: application/json

{
  "tableId": "tbl_xxx",
  "name": "字段名称",
  "type": "formula|rollup|lookup|count",
  "options": {
    // 根据字段类型配置相应参数
  },
  "required": false,
  "unique": false
}
```

**响应：**
```json
{
  "id": "fld_xxx",
  "tableId": "tbl_xxx",
  "name": "字段名称",
  "type": "formula",
  "options": {
    // 字段配置
  },
  "required": false,
  "unique": false,
  "isPrimary": false,
  "description": "",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 更新虚拟字段

**请求：**
```http
PATCH /api/v1/fields/{fieldId}
Content-Type: application/json

{
  "name": "新字段名称",
  "options": {
    // 更新配置参数
  }
}
```

**响应：**
```json
{
  "id": "fld_xxx",
  "tableId": "tbl_xxx",
  "name": "新字段名称",
  "type": "formula",
  "options": {
    // 更新后的配置
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T01:00:00Z"
}
```

### 获取字段详情

**请求：**
```http
GET /api/v1/fields/{fieldId}
```

**响应：**
```json
{
  "id": "fld_xxx",
  "tableId": "tbl_xxx",
  "name": "字段名称",
  "type": "formula",
  "options": {
    // 字段配置
  },
  "required": false,
  "unique": false,
  "isPrimary": false,
  "description": "",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## 配置示例

### Formula 字段完整示例

```json
{
  "type": "formula",
  "name": "总价",
  "options": {
    "formula": {
      "expression": "{价格} * {数量}",
      "timeZone": "Asia/Shanghai",
      "showAs": {
        "type": "number"
      },
      "formatting": {
        "type": "number",
        "precision": 2,
        "showCommas": true,
        "currency": "CNY"
      }
    }
  }
}
```

### Rollup 字段完整示例

```json
{
  "type": "rollup",
  "name": "订单总金额",
  "options": {
    "rollup": {
      "linkFieldId": "fld_order_items",
      "rollupFieldId": "fld_item_total",
      "aggregationFunction": "sum",
      "timeZone": "Asia/Shanghai",
      "showAs": {
        "type": "number"
      },
      "formatting": {
        "type": "number",
        "precision": 2,
        "showCommas": true,
        "currency": "CNY"
      }
    }
  }
}
```

### Lookup 字段完整示例

```json
{
  "type": "lookup",
  "name": "客户名称",
  "options": {
    "lookup": {
      "linkFieldId": "fld_customer",
      "lookupFieldId": "fld_customer_name",
      "showAs": {
        "type": "text"
      },
      "formatting": {
        "type": "text"
      }
    }
  }
}
```

### Count 字段完整示例

```json
{
  "type": "count",
  "name": "订单项数量",
  "options": {
    "count": {
      "linkFieldId": "fld_order_items"
    }
  }
}
```

---

## 依赖关系与计算顺序

### 依赖图构建

系统会自动构建字段依赖图，识别虚拟字段之间的依赖关系：

- **Formula字段**：依赖表达式中引用的所有字段
- **Rollup字段**：依赖Link字段和被汇总的字段
- **Lookup字段**：依赖Link字段
- **Count字段**：依赖Link字段

### 拓扑排序

系统使用拓扑排序算法确保虚拟字段按照正确的依赖顺序计算。这保证了：
- 依赖字段先于依赖它的字段计算
- 不会出现计算顺序错误导致的错误结果

### 依赖图缓存

为了提高性能，系统会缓存依赖图：
- 缓存键：`tableID`
- 缓存失效：当字段配置更新时，依赖图缓存会自动失效
- 缓存版本：基于字段的更新时间戳

### 循环依赖检测

系统在创建虚拟字段时会自动检测循环依赖：
- 如果检测到循环依赖，创建请求会被拒绝
- 错误信息会明确指出导致循环依赖的字段链

**示例错误：**
```
字段A依赖于字段B，字段B依赖于字段C，字段C依赖于字段A → 循环依赖
```

---

## 计算时机

### 自动计算触发时机

虚拟字段会在以下情况下自动计算：

1. **记录创建时**
   - 新记录创建后，会立即计算所有虚拟字段
   - 确保新记录包含完整的计算字段值

2. **依赖字段更新时**
   - 当依赖字段的值发生变化时，系统会自动重新计算相关的虚拟字段
   - 支持批量更新优化，一次更新可能触发多个虚拟字段的重新计算

3. **字段配置更新时**
   - 当虚拟字段的配置（如公式表达式）发生变化时，会重新计算该字段的所有记录

### 批量计算优化

系统支持批量计算优化：
- **批量获取字段**：预先加载所有字段定义，避免N+1查询问题
- **依赖图缓存**：缓存依赖图，避免重复构建
- **批量计算**：对多条记录进行批量计算，提升性能

### 异步计算支持

对于计算量较大的虚拟字段，系统支持异步计算：
- 计算开始时，字段状态设置为 `is_pending = true`
- 计算完成后，更新字段值和状态
- 计算失败时，设置 `has_error = true`，并记录错误信息

---

## 注意事项

### 1. 虚拟字段不能直接编辑

虚拟字段的值是由系统自动计算的，用户无法直接编辑。要改变虚拟字段的值，需要修改：
- **Formula字段**：修改表达式中引用的依赖字段
- **Rollup字段**：修改关联记录中被汇总字段的值
- **Lookup字段**：修改关联记录中被查找字段的值
- **Count字段**：增加或删除关联记录

### 2. 循环依赖检测

系统会自动检测并阻止循环依赖，但在设计虚拟字段时仍需注意：
- 避免创建过深的依赖链（如：A依赖B，B依赖C，C依赖D...）
- 确保依赖关系清晰，便于理解和维护

### 3. 计算错误处理

当虚拟字段计算失败时：
- 字段的 `has_error` 标志会被设置为 `true`
- 记录的错误信息可以通过API查询
- 不影响记录的创建和更新，只是虚拟字段值可能为 `null`

常见计算错误原因：
- 公式表达式语法错误
- 依赖字段不存在或已被删除
- 关联记录不存在
- 数据类型不匹配

### 4. 性能考虑

虚拟字段的计算可能影响性能，建议：
- 避免在公式表达式中使用复杂的函数调用
- 合理使用缓存机制
- 对于大量数据的表格，考虑异步计算
- 定期清理过期的缓存数据

### 5. 字段类型兼容性

虚拟字段返回的值类型：
- **Formula字段**：根据表达式和 `showAs` 配置确定类型
- **Rollup字段**：根据聚合函数和被汇总字段类型确定
- **Lookup字段**：与被查找字段的类型相同
- **Count字段**：始终为数字类型

---

## 最佳实践

### 1. 命名规范

- 虚拟字段名称应该清晰描述其用途和计算逻辑
- 建议使用格式：`计算目标_计算方式`，如：`订单总金额`、`客户名称查找`

### 2. 依赖关系设计

- 保持依赖关系简单明了，避免过深的依赖链
- 如果可能，优先使用直接依赖而不是间接依赖
- 文档化字段依赖关系，便于团队协作

### 3. 公式表达式编写

- 使用清晰的字段名称（避免缩写）
- 添加必要的注释（未来可能支持）
- 测试公式表达式，确保计算逻辑正确
- 注意数据类型转换和边界情况

### 4. Rollup 字段使用

- 选择合适的聚合函数（sum/count/avg/min/max）
- 确保被汇总的字段类型与聚合函数兼容
- 对于大量关联记录，注意性能影响

### 5. Lookup 字段使用

- 明确了解如果关联多条记录，只会返回第一条的值
- 如果需要多条记录的值，考虑使用Rollup或创建多个Lookup字段
- 确保被查找的字段在关联表中存在

### 6. 性能优化

- 对于计算复杂的虚拟字段，考虑是否需要缓存
- 定期检查虚拟字段的计算性能
- 避免在虚拟字段的计算中执行外部API调用或数据库查询

### 7. 测试和验证

- 创建虚拟字段后，验证计算结果是否正确
- 测试依赖字段更新时，虚拟字段是否正确重新计算
- 测试边界情况（空值、删除关联记录等）

---

## 故障排查

### 问题：虚拟字段计算结果为 null

**可能原因：**
1. 依赖字段值为空
2. 关联记录不存在
3. 计算表达式错误

**解决方案：**
1. 检查依赖字段是否有值
2. 检查Link字段是否正确关联到记录
3. 检查公式表达式语法是否正确

### 问题：虚拟字段一直处于 pending 状态

**可能原因：**
1. 计算服务异常
2. 依赖字段配置错误
3. 循环依赖导致计算无法完成

**解决方案：**
1. 检查系统日志，查看计算错误信息
2. 检查依赖字段配置
3. 检查是否存在循环依赖

### 问题：虚拟字段计算性能慢

**可能原因：**
1. 依赖关系过于复杂
2. 关联记录数量过多
3. 缓存未生效

**解决方案：**
1. 简化依赖关系
2. 优化Rollup字段的聚合逻辑
3. 检查缓存配置和命中率

---

## 参考资源

- [数据库迁移文件](../migrations/000002_add_virtual_field_support.up.sql)
- [计算服务实现](../internal/application/calculation_service.go)
- [字段服务实现](../internal/application/field_service.go)
- [字段类型定义](../internal/domain/fields/valueobject/field_type.go)
- [字段选项定义](../internal/domain/fields/valueobject/field_options.go)

---

## 更新日志

- **2024-01-01** - 初始版本文档
  - 添加Formula、Rollup、Lookup、Count字段支持说明
  - 添加API接口使用文档
  - 添加配置示例和最佳实践
