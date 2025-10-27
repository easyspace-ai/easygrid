# 过滤组件系统

## 概述

过滤组件系统为 aitable 提供了完整的数据过滤功能，包括过滤条件设置、数据过滤逻辑和用户界面。

## 组件架构

```
filter/
├── FilterDialog.tsx      # 过滤条件设置对话框
├── FilterCondition.tsx   # 单个过滤条件组件
├── FilterButton.tsx      # 过滤按钮组件
├── FilterManager.tsx     # 过滤管理器（主要组件）
├── FilterExample.tsx     # 使用示例
└── index.ts             # 导出文件
```

## 核心组件

### FilterManager

主要的过滤管理组件，集成了所有过滤功能。

```tsx
import { FilterManager, type FilterField, type FilterCondition } from '@aitable/filter';

const fields: FilterField[] = [
  { id: 'name', name: '姓名', type: 'text' },
  { id: 'age', name: '年龄', type: 'number' },
  { id: 'department', name: '部门', type: 'select', options: ['技术部', '产品部'] },
];

const [conditions, setConditions] = useState<FilterCondition[]>([]);

<FilterManager
  data={yourData}
  fields={fields}
  conditions={conditions}
  onConditionsChange={setConditions}
  onFilteredDataChange={(filtered) => console.log(filtered)}
/>
```

### FilterDialog

过滤条件设置对话框，支持多条件组合。

**特性：**
- 直观的条件构建界面
- 支持多种字段类型
- 智能的操作符选择
- 条件添加/删除/编辑

### FilterCondition

单个过滤条件组件，根据字段类型动态调整输入方式。

**支持的字段类型：**
- `text`: 文本输入
- `number`: 数字输入
- `date`: 日期选择
- `select`: 下拉选择
- `boolean`: 布尔选择
- `attachment`: 附件（仅支持空值检查）

**支持的操作符：**
- 等于/不等于
- 包含/不包含
- 开头是/结尾是
- 大于/小于/大于等于/小于等于
- 为空/不为空
- 在列表中/不在列表中

## 集成到 ViewToolbar

过滤功能已集成到 ViewToolbar 中：

```tsx
import { ViewToolbar } from '@aitable/view-toolbar';

<ViewToolbar
  config={{ showFilter: true }}
  filterFields={fields}
  filterConditions={conditions}
  onFilterConditionsChange={setConditions}
  onFilteredDataChange={handleFilteredData}
/>
```

## 使用示例

### 基础用法

```tsx
import React, { useState } from 'react';
import { FilterManager, type FilterField, type FilterCondition } from '@aitable/filter';

function MyComponent() {
  const [data] = useState([
    { id: 1, name: '张三', age: 25, department: '技术部' },
    { id: 2, name: '李四', age: 30, department: '产品部' },
  ]);

  const fields: FilterField[] = [
    { id: 'name', name: '姓名', type: 'text' },
    { id: 'age', name: '年龄', type: 'number' },
    { id: 'department', name: '部门', type: 'select', options: ['技术部', '产品部'] },
  ];

  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [filteredData, setFilteredData] = useState(data);

  return (
    <div>
      <FilterManager
        data={data}
        fields={fields}
        conditions={conditions}
        onConditionsChange={setConditions}
        onFilteredDataChange={setFilteredData}
      />
      
      {/* 显示过滤后的数据 */}
      <div>
        {filteredData.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </div>
  );
}
```

### 高级用法

```tsx
// 自定义过滤逻辑
const customFilterData = (data: any[], conditions: FilterCondition[]) => {
  // 实现自定义过滤逻辑
  return data.filter(item => {
    return conditions.every(condition => {
      // 自定义条件检查
      return checkCondition(item, condition);
    });
  });
};

// 使用自定义过滤
<FilterManager
  data={data}
  fields={fields}
  conditions={conditions}
  onConditionsChange={setConditions}
  onFilteredDataChange={setFilteredData}
  customFilter={customFilterData}
/>
```

## API 参考

### FilterField

```tsx
interface FilterField {
  id: string;           // 字段ID
  name: string;         // 字段显示名称
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'attachment';
  options?: string[];   // 选择类型字段的选项
}
```

### FilterCondition

```tsx
interface FilterCondition {
  id: string;           // 条件ID
  fieldId: string;      // 字段ID
  operator: FilterOperator; // 操作符
  value: any;           // 过滤值
}
```

### FilterOperator

```tsx
type FilterOperator = 
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than'
  | 'greater_equal' | 'less_equal'
  | 'is_empty' | 'is_not_empty'
  | 'in' | 'not_in';
```

## 设计原则

1. **直观性**: 过滤条件构建界面简单直观
2. **灵活性**: 支持多种字段类型和操作符
3. **性能**: 优化的过滤算法，支持大数据集
4. **可访问性**: 完整的键盘导航和屏幕阅读器支持
5. **一致性**: 与 aitable 设计系统保持一致

## 最佳实践

1. **字段配置**: 确保字段类型正确，选择类型字段提供选项
2. **性能优化**: 对于大数据集，考虑使用防抖或虚拟滚动
3. **用户体验**: 提供清晰的过滤状态反馈
4. **错误处理**: 处理无效的过滤条件
5. **国际化**: 支持多语言的操作符标签

## 扩展

过滤系统设计为可扩展的，可以轻松添加：

- 新的字段类型
- 新的操作符
- 自定义过滤逻辑
- 过滤条件持久化
- 过滤条件导入/导出
