# 对称字段双向同步设计文档

## 概述

对称字段（Symmetric Field）是Link字段的高级特性，用于自动维护双向关联关系。当在一个表中创建Link字段指向另一个表时，可以在目标表中自动创建一个反向Link字段，两者互为对称字段。

## 核心概念

### 对称字段关系

**场景：学生和课程的多对多关系**

```
Table: Students
- Field: courses (Link → Courses)
  - symmetricFieldID: "students_link"

Table: Courses  
- Field: students (Link → Students)
  - symmetricFieldID: "courses_link"
```

**双向同步**:
- 当在 `student_1.courses` 中添加 `course_1` 时
- 自动在 `course_1.students` 中添加 `student_1`

## 原 Teable-Develop 项目 的实现

### 核心流程

参考 `teable-develop/apps/nestjs-backend/src/features/calculation/link.service.ts`:

```typescript
// 同步对称字段
private async updateLinkRecord(
  tableId: string,
  fkRecordMap: IFkRecordMap,
  fieldMapByTableId: { [tableId: string]: IFieldMap },
  originRecordMapByTableId: IRecordMapByTableId
): Promise<IRecordMapByTableId> {
  for (const fieldId in fkRecordMap) {
    const linkField = fieldMapByTableId[tableId][fieldId];
    const symmetricFieldId = linkField.options.symmetricFieldId;
    
    if (symmetricFieldId) {
      // 处理对称字段同步
      await this.syncSymmetricField(
        linkField,
        symmetricFieldId,
        fkRecordMap[fieldId]
      );
    }
  }
}
```

### 同步逻辑

```typescript
async syncSymmetricField(
  linkField: LinkFieldDto,
  symmetricFieldId: string,
  recordChanges: { [recordId: string]: IFkRecordItem }
) {
  const foreignTableId = linkField.options.foreignTableId;
  
  for (const recordId in recordChanges) {
    const { oldKey, newKey } = recordChanges[recordId];
    
    // 1. 从旧关联中移除
    if (oldKey) {
      await this.removeFromSymmetricField(
        foreignTableId,
        symmetricFieldId,
        oldKey,
        recordId
      );
    }
    
    // 2. 添加到新关联
    if (newKey) {
      await this.addToSymmetricField(
        foreignTableId,
        symmetricFieldId,
        newKey,
        recordId
      );
    }
  }
}
```

### Link Cell 标题更新

```typescript
// 更新Link Cell的标题
updateCellTitle(
  linkCellValues: ILinkCellValue[],
  titles: string[]
): ILinkCellValue[] {
  return linkCellValues.map((cell, index) => ({
    ...cell,
    title: titles[index]
  }));
}

// 修复Link Cell标题
fixLinkCellTitle({
  newKey,
  recordId,
  linkFieldId,
  foreignLookedFieldId,
  sourceRecordMap,
  foreignRecordMap,
}) {
  const foreignRecord = foreignRecordMap[newKey];
  const foreignTitle = foreignRecord.fields[foreignLookedFieldId];
  
  return {
    id: newKey,
    title: foreignTitle
  };
}
```

## 新系统的实现方案

### 1. 对称字段同步服务

```go
// SymmetricFieldService 对称字段同步服务
type SymmetricFieldService struct {
    db           *gorm.DB
    fieldRepo    FieldRepository
    batchService *BatchService
}

// SyncSymmetricField 同步对称字段
func (s *SymmetricFieldService) SyncSymmetricField(
    ctx context.Context,
    linkField *Field,
    changes []LinkCellChange,
) error {
    if linkField.Options == nil || linkField.Options.SymmetricFieldID == nil {
        return nil // 没有对称字段，无需同步
    }
    
    symmetricFieldID := *linkField.Options.SymmetricFieldID
    linkedTableID := linkField.Options.LinkedTableID
    
    // 对每个变更，执行双向同步
    for _, change := range changes {
        // 1. 从旧关联中移除
        if err := s.removeFromSymmetricField(
            ctx, linkedTableID, symmetricFieldID,
            change.OldValue, change.RecordID,
        ); err != nil {
            return err
        }
        
        // 2. 添加到新关联
        if err := s.addToSymmetricField(
            ctx, linkedTableID, symmetricFieldID,
            change.NewValue, change.RecordID,
        ); err != nil {
            return err
        }
    }
    
    return nil
}
```

### 2. Link Cell 标题管理

```go
// LinkCellValue Link单元格值
type LinkCellValue struct {
    ID    string `json:"id"`
    Title string `json:"title"`
}

// UpdateLinkCellTitles 更新Link Cell的标题
func (s *SymmetricFieldService) UpdateLinkCellTitles(
    ctx context.Context,
    linkField *Field,
    recordID string,
    linkValues []LinkCellValue,
) ([]LinkCellValue, error) {
    if len(linkValues) == 0 {
        return linkValues, nil
    }
    
    // 获取标题字段ID
    titleFieldID := linkField.Options.LookupFieldID
    if titleFieldID == "" {
        // 默认使用主字段
        titleFieldID = s.getPrimaryFieldID(ctx, linkField.Options.LinkedTableID)
    }
    
    // 批量查询关联记录的标题
    linkedRecordIDs := make([]string, len(linkValues))
    for i, v := range linkValues {
        linkedRecordIDs[i] = v.ID
    }
    
    records, err := s.batchService.BatchQueryRecords(
        ctx,
        linkField.Options.LinkedTableID,
        linkedRecordIDs,
        []string{titleFieldID},
    )
    if err != nil {
        return nil, err
    }
    
    // 更新标题
    updatedValues := make([]LinkCellValue, len(linkValues))
    for i, v := range linkValues {
        if recordData, exists := records[v.ID]; exists {
            title := recordData[titleFieldID]
            updatedValues[i] = LinkCellValue{
                ID:    v.ID,
                Title: fmt.Sprintf("%v", title),
            }
        } else {
            updatedValues[i] = v
        }
    }
    
    return updatedValues, nil
}
```

### 3. 冲突检测和处理

```go
// DetectConflicts 检测对称字段同步冲突
func (s *SymmetricFieldService) DetectConflicts(
    ctx context.Context,
    linkField *Field,
    changes []LinkCellChange,
) ([]Conflict, error) {
    var conflicts []Conflict
    
    // 检查是否有其他用户同时修改对称字段
    for _, change := range changes {
        // 查询对称字段的当前值
        currentValue, err := s.getCurrentSymmetricValue(
            ctx, linkField, change.RecordID,
        )
        if err != nil {
            return nil, err
        }
        
        // 检查是否与预期不一致
        if !s.valuesMatch(currentValue, change.ExpectedValue) {
            conflicts = append(conflicts, Conflict{
                RecordID:      change.RecordID,
                FieldID:       *linkField.Options.SymmetricFieldID,
                ExpectedValue: change.ExpectedValue,
                ActualValue:   currentValue,
            })
        }
    }
    
    return conflicts, nil
}

// ResolveConflicts 解决冲突
func (s *SymmetricFieldService) ResolveConflicts(
    ctx context.Context,
    conflicts []Conflict,
    strategy ConflictResolutionStrategy,
) error {
    for _, conflict := range conflicts {
        switch strategy {
        case StrategyLastWriteWins:
            // 最后写入胜出，直接覆盖
            continue
            
        case StrategyMerge:
            // 合并两边的值
            mergedValue := s.mergeValues(
                conflict.ExpectedValue,
                conflict.ActualValue,
            )
            // 更新为合并后的值
            s.updateValue(ctx, conflict.RecordID, conflict.FieldID, mergedValue)
            
        case StrategyAbort:
            // 中止操作，报错
            return fmt.Errorf("conflict detected: %v", conflict)
        }
    }
    
    return nil
}
```

## 完整示例

### 场景：学生选课

```go
// 1. 学生选课（添加关联）
student1.courses = []string{"course_math", "course_physics"}

// 2. 触发对称字段同步
linkField := getField("students", "courses")
changes := []LinkCellChange{
    {
        RecordID: "student_1",
        OldValue: []string{},
        NewValue: []string{"course_math", "course_physics"},
    },
}

// 3. 执行同步
symmetricService.SyncSymmetricField(ctx, linkField, changes)

// 结果：
// course_math.students = [..., "student_1"]
// course_physics.students = [..., "student_1"]

// 4. 更新Link Cell标题
linkValues := []LinkCellValue{
    {ID: "course_math"},
    {ID: "course_physics"},
}

updatedValues := symmetricService.UpdateLinkCellTitles(
    ctx, linkField, "student_1", linkValues,
)

// 结果：
// [{ID: "course_math", Title: "Mathematics"},
//  {ID: "course_physics", Title: "Physics"}]
```

### 场景：冲突处理

```go
// 两个用户同时修改
// User A: student_1.courses += course_math
// User B: student_1.courses += course_biology

// 1. 检测冲突
conflicts := symmetricService.DetectConflicts(ctx, linkField, changes)

// 2. 解决冲突（合并策略）
symmetricService.ResolveConflicts(ctx, conflicts, StrategyMerge)

// 结果：
// student_1.courses = ["course_math", "course_biology"]
```

## 优化策略

### 1. 批量同步

```go
// 批量处理对称字段同步，而不是逐个处理
func (s *SymmetricFieldService) BatchSyncSymmetricFields(
    ctx context.Context,
    changes []LinkFieldChange,
) error {
    // 按对称字段分组
    groupedChanges := s.groupBySymmetricField(changes)
    
    // 批量更新每个对称字段
    for symmetricFieldID, fieldChanges := range groupedChanges {
        s.batchUpdateSymmetricField(ctx, symmetricFieldID, fieldChanges)
    }
}
```

### 2. 事务保护

```go
// 确保同步操作的原子性
func (s *SymmetricFieldService) SyncWithTransaction(
    ctx context.Context,
    linkField *Field,
    changes []LinkCellChange,
) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 在事务中执行所有同步操作
        return s.SyncSymmetricField(ctx, linkField, changes)
    })
}
```

### 3. 延迟标题更新

```go
// 标题更新可以异步进行，不阻塞主流程
func (s *SymmetricFieldService) UpdateTitlesAsync(
    ctx context.Context,
    linkField *Field,
    recordIDs []string,
) {
    go func() {
        for _, recordID := range recordIDs {
            s.UpdateLinkCellTitles(ctx, linkField, recordID, nil)
        }
    }()
}
```

## 测试用例

### 测试1: 基本双向同步

```go
// Student A 添加 Course 1
// 验证 Course 1 中自动添加 Student A
```

### 测试2: 移除关联

```go
// Student A 移除 Course 1
// 验证 Course 1 中自动移除 Student A
```

### 测试3: 多对多关系

```go
// Student A <-> Course 1, 2
// Student B <-> Course 1, 3
// 验证所有对称关系正确
```

### 测试4: 冲突检测

```go
// 两个用户同时修改同一个Link字段
// 验证冲突被正确检测和处理
```

### 测试5: Link Cell标题更新

```go
// 添加Link后，验证标题正确显示
// 修改关联记录的主字段，验证标题自动更新
```

## 总结

对称字段同步的关键点：
1. **双向同步**: A→B 自动触发 B→A
2. **标题管理**: Link Cell显示可读的标题而不是ID
3. **冲突处理**: 检测并解决并发修改冲突
4. **批量优化**: 批量同步提升性能
5. **事务保护**: 确保同步的原子性

---

**状态**: 设计完成，待实现
**预计工期**: 2天
**优先级**: P1 (中高)

