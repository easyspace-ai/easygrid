# 跨表计算设计文档

## 概述

跨表计算是计算引擎的核心功能之一，用于处理Link字段触发的级联计算。当一个表的记录更新时，需要自动更新所有引用该记录的其他表中的计算字段。

## 核心概念

### 记录裂变 (Record Splitting)

**场景**:
```
Table A: Students
- student_1: { name: "Alice", grade: 95 }
- student_2: { name: "Bob", grade: 88 }

Table B: Classes  
- class_1: { 
    students: [student_1, student_2],  // Link字段
    avg_grade: 91.5                     // Rollup字段: average({students.grade})
  }
```

**问题**: 当 `student_1` 的 `grade` 从 95 改为 90 时，需要：
1. 更新 `student_1` 自己的记录
2. **找出所有引用 `student_1` 的记录**（class_1）
3. 重新计算 `class_1` 的 `avg_grade`

**这就是记录裂变**: 一个记录的变更，裂变成多个关联记录的计算。

## 原 Teable-Develop 项目 的实现

### 核心流程

参考 `teable-develop/apps/nestjs-backend/src/features/calculation/README.md`:

```typescript
// recordB1[fieldX] 变化
[
  { 
    id: "fieldX", 
    dependencies: [], 
    recordId: ["b1"] 
  },
  { 
    id: "fieldLinkB", 
    dependencies: ["fieldX"], 
    recordId: ["b1"],           // 来源记录
    targetRecordId: ["a1", "a2"] // 裂变到这些记录
  },
]
```

**关键**: Link字段包含两组记录ID：
- `recordId`: 来源记录（提供数据）
- `targetRecordId`: 目标记录（需要重算）

### 实现细节

#### 1. 获取受影响的记录

```typescript
// reference.service.ts: getAffectedRecordItems
async getAffectedRecordItems({
  fieldId,
  fieldMap,
  fromRecordIds,  // 来源记录
  toRecordIds,    // 目标记录
  fkRecordMap,    // 外键变更映射
  tableId2DbTableName,
}): Promise<IRecordItem[]> {
  const field = fieldMap[fieldId];
  
  // 如果是Link字段或Lookup/Rollup字段
  if (field.lookupOptions || field.type === FieldType.Link) {
    // 查询关联记录
    const relatedRecords = await this.queryRelatedRecords(
      field, fromRecordIds, fkRecordMap
    );
    
    return relatedRecords;
  }
  
  // 普通字段，直接查询
  return await this.queryRecords(fieldId, toRecordIds);
}
```

#### 2. 计算Link相关记录

```typescript
// reference.service.ts: calculateLinkRelatedRecords
async calculateLinkRelatedRecords({
  field,
  fieldMap,
  fieldId2DbTableName,
  tableId2DbTableName,
  fieldId2TableId,
  dbTableName2fields,
  relatedRecordItems,
}) {
  // 1. 准备依赖数据（关联表的记录）
  const dependencies = await this.prepareDependencies(
    field, relatedRecordItems
  );
  
  // 2. 计算每个目标记录
  for (const recordItem of relatedRecordItems) {
    // 将依赖记录附加到目标记录
    recordItem.dependencies = dependencies;
    
    // 计算字段值
    const value = this.calculateComputeField(
      field, fieldMap, recordItem
    );
    
    // 更新记录
    await this.updateRecord(recordItem, value);
  }
}
```

#### 3. 查询关联记录

```typescript
// 查询所有引用 fromRecordIds 的记录
async queryRelatedRecords(
  linkField: IFieldInstance,
  fromRecordIds: string[],
  fkRecordMap?: IFkRecordMap
): Promise<IRecordItem[]> {
  const { 
    foreignTableId, 
    relationship, 
    symmetricFieldId 
  } = linkField.options;
  
  // 根据关系类型查询
  if (relationship === Relationship.OneMany || 
      relationship === Relationship.ManyMany) {
    // 查询包含这些外键的记录
    return await this.knex
      .table(foreignTableId)
      .whereIn(`data->>${linkField.id}`, fromRecordIds);
  }
  
  // 其他关系类型...
}
```

## 新系统的实现方案

### 数据结构设计

```go
// RecordSplitContext 记录裂变上下文
type RecordSplitContext struct {
    SourceTableID    string   // 来源表
    SourceRecordIDs  []string // 来源记录
    TargetTableID    string   // 目标表
    TargetRecordIDs  []string // 目标记录（需要重算）
    LinkFieldID      string   // 关联字段
}

// CrossTableCalculationContext 跨表计算上下文
type CrossTableCalculationContext struct {
    FieldID         string
    Dependencies    []string
    SourceRecords   []*RecordItem
    TargetRecords   []*RecordItem
    SplitContexts   []RecordSplitContext
}
```

### 实现步骤

#### 步骤1: 识别Link字段变更

```go
// reference_calculation_service.go
func (s *ReferenceCalculationService) CalculateReferences(
    ctx context.Context,
    tableID string,
    recordIDs []string,
    changedFieldIDs []string,
) error {
    // 1. 构建依赖图
    graph, _ := s.BuildDependencyGraph(ctx, tableID)
    
    // 2. 拓扑排序
    topoOrder, _ := graph.TopologicalSort(changedFieldIDs)
    
    // 3. 按顺序计算
    for _, node := range topoOrder {
        field := node.Field
        
        // 检查是否是Link相关字段
        if s.isLinkRelatedField(field) {
            // 跨表计算
            s.calculateLinkRelatedRecords(ctx, field, recordIDs)
        } else {
            // 表内计算
            s.calculateInTableRecords(ctx, field, recordIDs)
        }
    }
}
```

#### 步骤2: 查询关联记录

```go
// 查询所有引用指定记录的记录
func (s *ReferenceCalculationService) FindReferencingRecords(
    ctx context.Context,
    linkField *Field,
    sourceRecordIDs []string,
) ([]RecordSplitContext, error) {
    linkedTableID := linkField.Options.LinkedTableID
    relationship := linkField.Options.Relationship
    
    var splits []RecordSplitContext
    
    // 根据关系类型查询
    switch *relationship {
    case "OneMany", "ManyMany":
        // 查询外键表：哪些记录的Link字段包含sourceRecordIDs
        targetRecords, _ := s.queryRecordsWithLinkValue(
            ctx, linkedTableID, linkField.ID, sourceRecordIDs,
        )
        
        splits = append(splits, RecordSplitContext{
            SourceTableID:   linkField.TableID,
            SourceRecordIDs: sourceRecordIDs,
            TargetTableID:   linkedTableID,
            TargetRecordIDs: extractRecordIDs(targetRecords),
            LinkFieldID:     linkField.ID,
        })
    
    case "ManyOne", "OneOne":
        // 直接从Link字段值中获取目标记录
        // ...
    }
    
    return splits, nil
}
```

#### 步骤3: 执行跨表计算

```go
func (s *ReferenceCalculationService) calculateLinkRelatedRecords(
    ctx context.Context,
    field *Field,
    sourceRecordIDs []string,
) error {
    // 1. 找出所有受影响的记录
    splits, _ := s.FindReferencingRecords(ctx, field, sourceRecordIDs)
    
    for _, split := range splits {
        // 2. 批量查询来源记录（提供依赖数据）
        sourceRecords, _ := s.batchService.BatchQueryRecords(
            ctx, split.SourceTableID, split.SourceRecordIDs, nil,
        )
        
        // 3. 批量查询目标记录（需要重算）
        targetRecords, _ := s.batchService.BatchQueryRecords(
            ctx, split.TargetTableID, split.TargetRecordIDs, nil,
        )
        
        // 4. 准备批量更新
        var updates []RecordUpdate
        
        for targetRecordID, targetData := range targetRecords {
            // 获取依赖的来源记录
            linkValue := targetData[split.LinkFieldID]
            dependencies := s.extractDependencies(
                linkValue, sourceRecords,
            )
            
            // 计算字段值
            value, _ := s.calculateFieldWithDependencies(
                ctx, field, targetData, dependencies,
            )
            
            updates = append(updates, RecordUpdate{
                TableID:  split.TargetTableID,
                RecordID: targetRecordID,
                FieldID:  field.ID,
                Value:    value,
            })
        }
        
        // 5. 批量更新
        s.batchService.BatchUpdateRecords(ctx, updates)
    }
    
    return nil
}
```

#### 步骤4: 查询包含特定Link值的记录

```go
// 查询哪些记录的linkFieldID字段包含sourceRecordIDs
func (s *ReferenceCalculationService) queryRecordsWithLinkValue(
    ctx context.Context,
    tableID string,
    linkFieldID string,
    sourceRecordIDs []string,
) ([]*record.Record, error) {
    // 使用JSONB查询
    // SELECT * FROM records 
    // WHERE table_id = ? 
    //   AND data->>linkFieldID ?| ARRAY[sourceRecordIDs]
    
    var records []*record.Record
    
    err := s.db.WithContext(ctx).
        Table("records").
        Where("table_id = ?", tableID).
        Where("data->>? \\?| ARRAY[?]", linkFieldID, pq.Array(sourceRecordIDs)).
        Find(&records).Error
    
    return records, err
}
```

## 完整示例

### 场景: 学生成绩更新 → 班级平均分重算

```go
// 1. 学生成绩更新
studentUpdates := []RecordUpdate{
    {
        TableID:  "students",
        RecordID: "student_1",
        FieldID:  "grade",
        Value:    90, // 从95改为90
    },
}

// 2. 触发引用计算
refCalcService.CalculateReferences(
    ctx,
    "students",
    []string{"student_1"},
    []string{"grade"}, // 变更的字段
)

// 内部流程:
// Step 1: 构建依赖图
//   - grade字段 (普通字段)
//   - Link字段被其他表的Rollup依赖

// Step 2: 拓扑排序
//   - 先计算grade (表内)
//   - 再计算引用grade的Rollup字段 (跨表)

// Step 3: 识别Link相关字段
//   - 发现 classes表的students字段(Link)
//   - 发现 classes表的avg_grade字段(Rollup)依赖students

// Step 4: 记录裂变
//   - 来源: students表的student_1
//   - 目标: classes表中所有students字段包含student_1的记录
//   - 查询结果: class_1

// Step 5: 重算class_1的avg_grade
//   - 查询class_1.students中的所有学生
//   - 提取grade字段: [90, 88]
//   - 计算平均值: (90+88)/2 = 89
//   - 更新class_1.avg_grade = 89
```

## 优化策略

### 1. 批量查询优化

```go
// 一次查询所有关联记录，而不是逐个查询
sourceRecords := batchService.BatchQueryRecords(
    ctx, sourceTableID, sourceRecordIDs, []string{"grade", "name"},
)
```

### 2. 分批处理

```go
// 如果目标记录太多，分批处理
batches := splitIntoBatches(targetRecordIDs, 100)
for _, batch := range batches {
    calculateBatch(batch)
}
```

### 3. 并发计算

```go
// 使用Worker池并发计算不同表
tasks := []func() error{}
for _, split := range splits {
    tasks = append(tasks, func() error {
        return calculateTable(split)
    })
}
batchService.BatchCalculateWithConcurrency(ctx, tasks)
```

### 4. 缓存优化

```go
// 缓存来源记录，避免重复查询
sourceRecordCache := make(map[string]*record.Record)
```

## 测试用例

### 测试1: 一对多关系

```go
// Student -> Class (一对多)
// 一个学生可以在多个班级
student_1.grade = 95
class_1.students = [student_1]
class_2.students = [student_1, student_2]

// 更新student_1.grade -> 重算class_1和class_2的avg_grade
```

### 测试2: 多对多关系

```go
// Student <-> Course (多对多)
student_1.courses = [course_1, course_2]
course_1.students = [student_1, student_2]

// 更新student_1 -> 重算course_1和course_2
```

### 测试3: 链式依赖

```go
// Department -> Class -> Student
student_1.grade = 95
class_1.students = [student_1]
class_1.avg_grade = 95 (Rollup)
dept_1.classes = [class_1]
dept_1.overall_avg = 95 (Rollup of Rollup)

// 更新student_1.grade -> 重算class_1.avg_grade -> 重算dept_1.overall_avg
```

## 总结

跨表计算的核心是**记录裂变**：
1. 识别Link字段相关的变更
2. 查询所有引用该记录的其他记录
3. 批量重算这些记录的计算字段
4. 使用批量服务优化性能

---

**状态**: 设计完成，待实现
**预计工期**: 3天
**优先级**: P0 (高)

