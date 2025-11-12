# Link 字段的"对称字段"概念解释

## 什么是对称字段（Symmetric Field）？

**对称字段**是双向 Link 关联中的反向字段。当两个表之间建立双向关联时，需要在两个表中各创建一个 Link 字段，这两个字段互为"对称字段"。

## 具体例子

### 场景：学生表和课程表的多对多关系

假设有两个表：
- **学生表（Students）**：存储学生信息
- **课程表（Courses）**：存储课程信息

一个学生可以选多门课程，一门课程也可以被多个学生选择（多对多关系）。

### 单向关联 vs 双向关联

#### 1. 单向关联（One-Way Link）

**只在学生表创建 Link 字段**：
- 学生表有一个 Link 字段："已选课程"（指向课程表）
- 课程表**没有**对应的 Link 字段

**问题**：
- 从学生表可以看到"这个学生选了哪些课程"
- 但从课程表**看不到**"哪些学生选了这门课"
- 需要反向查询才能知道

#### 2. 双向关联（Symmetric Link，对称字段）

**在两个表都创建 Link 字段**：
- 学生表有一个 Link 字段："已选课程"（`field_student_courses`）
- 课程表有一个 Link 字段："选课学生"（`field_course_students`）
- 这两个字段互为**对称字段**

**优势**：
- 从学生表可以看到"这个学生选了哪些课程"
- 从课程表可以直接看到"哪些学生选了这门课"
- **数据自动同步**：当学生 A 选了课程 B，两个字段都会自动更新

## 代码中的实现

### Server 中的对称字段配置

```go
// LinkOptions 结构
type LinkOptions struct {
    LinkedTableID     string  // 关联表ID（课程表ID）
    SymmetricFieldID  string  // 对称字段ID（课程表中的"选课学生"字段ID）
    IsSymmetric       bool    // 是否为双向关联
    Relationship      string  // 关系类型：manyMany, manyOne, oneMany, oneOne
}
```

### 示例配置

**学生表的 Link 字段配置**：
```json
{
  "type": "link",
  "name": "已选课程",
  "options": {
    "link": {
      "linked_table_id": "tbl_courses",           // 指向课程表
      "relationship": "manyMany",                 // 多对多关系
      "is_symmetric": true,                       // 双向关联
      "symmetric_field_id": "fld_course_students" // 对称字段ID（课程表中的字段）
    }
  }
}
```

**课程表的对称字段配置**：
```json
{
  "type": "link",
  "name": "选课学生",
  "options": {
    "link": {
      "linked_table_id": "tbl_students",          // 指向学生表
      "relationship": "manyMany",                 // 多对多关系
      "is_symmetric": true,                       // 双向关联
      "symmetric_field_id": "fld_student_courses" // 对称字段ID（学生表中的字段）
    }
  }
}
```

## 对称字段的自动同步

### 理想行为（Teable 的实现）

当更新一个 Link 字段时，对称字段应该**自动同步**：

**示例**：
1. 学生 A 的"已选课程"字段添加了"数学"课程
2. **自动同步**：课程"数学"的"选课学生"字段自动添加学生 A

**代码位置**：`server/internal/domain/table/service/link_service.go:713-794`

```go
// updateSymmetricFields 更新对称字段
func (s *LinkService) updateSymmetricFields(...) {
    // 计算对称字段需要更新的值
    // TODO: 实际更新对称字段的值（目前只是计算，没有应用）
}
```

### 当前 Server 的问题

**问题**：代码计算了对称字段的变更，但**没有实际应用**（TODO 状态）

**影响**：
- 学生 A 选了课程 B
- 学生表的"已选课程"字段更新了 ✅
- 但课程表的"选课学生"字段**没有自动更新** ❌
- 需要手动更新或通过其他方式同步

## 不同关系类型的对称字段

### 1. 多对多（ManyMany）

**示例**：学生 ↔ 课程
- 学生表："已选课程"（数组）
- 课程表："选课学生"（数组，对称字段）

**同步规则**：
- 学生 A 添加课程 B → 课程 B 的"选课学生"自动添加学生 A
- 学生 A 移除课程 B → 课程 B 的"选课学生"自动移除学生 A

### 2. 多对一（ManyOne）

**示例**：员工 ↔ 部门
- 员工表："所属部门"（单个值）
- 部门表："部门员工"（数组，对称字段）

**同步规则**：
- 员工 A 设置部门为"技术部" → "技术部"的"部门员工"自动添加员工 A
- 员工 A 从"技术部"改为"销售部" → "技术部"移除员工 A，"销售部"添加员工 A

### 3. 一对多（OneMany）

**示例**：订单 ↔ 订单项
- 订单表："订单项列表"（数组）
- 订单项表："所属订单"（单个值，对称字段）

**同步规则**：
- 订单 A 添加订单项 B → 订单项 B 的"所属订单"自动设置为订单 A
- 订单 A 移除订单项 B → 订单项 B 的"所属订单"自动清空

### 4. 一对一（OneOne）

**示例**：用户 ↔ 用户资料
- 用户表："用户资料"（单个值）
- 用户资料表："所属用户"（单个值，对称字段）

**同步规则**：
- 用户 A 设置资料为 B → 资料 B 的"所属用户"自动设置为用户 A
- 用户 A 更换资料为 C → 资料 B 的"所属用户"清空，资料 C 的"所属用户"设置为用户 A

## 当前 Server 实现的状态

### ✅ 已实现的功能

1. **对称字段配置支持**
   - 支持 `IsSymmetric` 标志
   - 支持 `SymmetricFieldID` 配置
   - 支持单向关联（`IsOneWay=true`）

2. **对称字段变更计算**
   - `updateSymmetricFields` 方法计算了需要更新的对称字段值
   - 支持所有关系类型（manyMany、manyOne、oneMany、oneOne）

### ❌ 缺失的功能

1. **对称字段自动创建**
   - 创建 Link 字段时，如果 `IsSymmetric=true`，**不会自动创建对称字段**
   - 需要手动创建两个字段，然后设置 `symmetricFieldID`

2. **对称字段自动同步**
   - 计算了对称字段的变更，但**没有实际应用**（TODO 状态）
   - 需要手动实现 `recordRepo.BatchUpdateFields` 来更新对称字段

## 修复建议

### 1. 实现对称字段自动创建

**文件**：`server/internal/application/field_service.go`

**改动**：
```go
// 在 CreateField 方法中，如果 IsSymmetric=true，自动创建对称字段
if req.Type == "link" && options.Link != nil && options.Link.IsSymmetric {
    // 1. 先创建主字段
    // 2. 创建对称字段（在关联表中）
    // 3. 设置两个字段的 symmetricFieldID
}
```

### 2. 实现对称字段自动同步

**文件**：`server/internal/domain/table/service/link_service.go`

**改动**：
```go
// 在 updateSymmetricFields 中，实际更新对称字段的值
func (s *LinkService) updateSymmetricFields(...) {
    // 计算变更
    cellChanges := ...
    
    // 实际应用变更
    for _, change := range cellChanges {
        s.recordRepo.BatchUpdateFields(ctx, change.TableID, []FieldUpdate{
            {
                RecordID: change.RecordID,
                FieldID:  change.FieldID,
                Value:    change.NewValue,
            },
        })
    }
}
```

## 总结

**对称字段**是双向 Link 关联中的反向字段，用于实现数据的双向可见和自动同步。当前 Server 的实现**计算了对称字段的变更，但没有实际应用**，这是需要优先修复的关键问题。

