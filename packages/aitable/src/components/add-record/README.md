# AddRecordDialog - 添加记录弹窗

> 内置的、零配置的添加记录弹窗组件

## ✨ 特性

- **零配置**：基于 `fields` 自动生成表单，开箱即用
- **完整的字段类型支持**：text、number、boolean、date、select、multiSelect、rating、link、email、phone 等
- **实时校验**：必填校验、类型校验、自定义校验
- **完美的交互**：
  - ESC 关闭
  - Enter 提交
  - 自动焦点管理
  - Tab 捕获（焦点陷阱）
  - 禁用 body 滚动
- **移动端适配**：响应式设计，小屏幕自适应
- **加载状态**：loading、成功、失败状态完整呈现
- **Portal 居中**：使用 `createPortal` 挂载到 `document.body`

## 📦 安装

```bash
# AddRecordDialog 已内置在 @easygrid/aitable 中
import { AddRecordDialog } from '@easygrid/aitable/components/add-record';
```

## 🚀 快速开始

### 基础用法

```tsx
import { AddRecordDialog } from '@easygrid/aitable';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const fields = [
    { id: '1', name: '姓名', type: 'text', required: true, isPrimary: true },
    { id: '2', name: '年龄', type: 'number', required: false },
    { id: '3', name: '邮箱', type: 'email', required: true },
  ];

  return (
    <>
      <button onClick={() => setIsOpen(true)}>添加记录</button>
      
      <AddRecordDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fields={fields}
        tableId="table-123"
        adapter={sdk} // 或 apiClient
        onSuccess={(record) => {
          console.log('记录创建成功:', record);
          // 刷新数据
        }}
      />
    </>
  );
}
```

### 在 StandardDataView 中使用（自动集成）

`StandardDataView` 已经内置了 `AddRecordDialog`，只需传入 `fields`、`tableId` 和 `sdk/apiClient` 即可：

```tsx
import { StandardDataView } from '@easygrid/aitable';

function TableView() {
  const { fields, tableId, sdk } = useTableData();

  return (
    <StandardDataView
      fields={fields}
      tableId={tableId}
      sdk={sdk}
      toolbarConfig={{
        showAddNew: true, // 显示"添加记录"按钮
      }}
      gridProps={{
        // ... grid props
        onDataRefresh: () => {
          // 刷新数据回调
          refetch();
        },
      }}
    />
  );
}
```

## 📚 API

### AddRecordDialogProps

| 属性 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `isOpen` | `boolean` | ✅ | - | 是否打开弹窗 |
| `onClose` | `() => void` | ✅ | - | 关闭弹窗回调 |
| `fields` | `FieldConfig[]` | ✅ | - | 字段列表 |
| `tableId` | `string` | ✅ | - | 表格 ID |
| `adapter` | `LuckDB \| ApiClient` | ✅ | - | SDK/ApiClient 实例 |
| `onSuccess` | `(record: any) => void` | ❌ | - | 保存成功回调 |
| `onError` | `(error: Error) => void` | ❌ | - | 保存失败回调 |
| `defaultValues` | `FormValues` | ❌ | `{}` | 默认值 |
| `customEditors` | `Record<string, React.ComponentType>` | ❌ | `{}` | 自定义编辑器 |
| `transformBeforeSubmit` | `(values: FormValues) => FormValues` | ❌ | - | 提交前数据转换 |
| `locale` | `LocaleConfig` | ❌ | 中文 | 国际化文案 |

### FieldConfig

```typescript
interface FieldConfig {
  id: string;                    // 字段 ID
  name: string;                  // 字段名称
  type: FieldType;               // 字段类型
  visible?: boolean;             // 是否可见（默认 true）
  locked?: boolean;              // 是否锁定（默认 false）
  required?: boolean;            // 是否必填（默认 false）
  isPrimary?: boolean;           // 是否为主字段（默认 false）
  description?: string;          // 字段描述
  options?: {
    choices?: Array<{            // 选择类字段的选项
      id: string;
      name: string;
      color?: string;
    }>;
    min?: number;                // 数字最小值
    max?: number;                // 数字最大值/评分最大值
    precision?: number;          // 数字精度
  };
}
```

### 支持的字段类型

| 字段类型 | 对应编辑器 | 校验规则 |
|----------|-----------|----------|
| `text`、`singleLineText` | 单行文本输入框 | 长度校验 |
| `longText` | 多行文本输入框 | 长度校验 |
| `number` | 数字输入框 | 数字格式、min/max 校验 |
| `boolean`、`checkbox` | 开关按钮 | - |
| `date`、`dateTime` | 日期选择器 | 日期格式校验 |
| `singleSelect` | 下拉单选 | 选项有效性校验 |
| `multipleSelect`、`multiSelect` | 多选列表 | 选项有效性校验 |
| `rating` | 星级评分 | 评分范围校验 |
| `link`、`url` | URL 输入框 | URL 格式校验 |
| `email` | 邮箱输入框 | 邮箱格式校验 |
| `phone` | 电话输入框 | 电话格式校验 |

> **注意**：计算字段（formula、rollup、count、createdTime 等）会自动跳过，不会在表单中显示。

## 🎨 高级用法

### 1. 自定义默认值

```tsx
<AddRecordDialog
  // ...
  defaultValues={{
    '1': '张三',
    '2': 25,
    '3': 'zhangsan@example.com',
  }}
/>
```

### 2. 自定义编辑器

```tsx
import { FieldEditorProps } from '@easygrid/aitable';

function MyCustomEditor({ field, value, onChange, error }: FieldEditorProps) {
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={error ? 'border-red-500' : ''}
    />
  );
}

<AddRecordDialog
  // ...
  customEditors={{
    'myCustomType': MyCustomEditor,
  }}
/>
```

### 3. 提交前数据转换

```tsx
<AddRecordDialog
  // ...
  transformBeforeSubmit={(values) => {
    // 将邮箱转为小写
    if (values['3']) {
      values['3'] = values['3'].toLowerCase();
    }
    return values;
  }}
/>
```

### 4. 国际化

```tsx
<AddRecordDialog
  // ...
  locale={{
    title: 'Add Record',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    required: 'This field is required',
    invalidFormat: 'Invalid format',
  }}
/>
```

### 5. 保存成功后刷新数据

#### 方式一：React Query

```tsx
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();

  return (
    <AddRecordDialog
      // ...
      onSuccess={(record) => {
        // 触发 React Query 刷新
        queryClient.invalidateQueries(['table', tableId]);
      }}
    />
  );
}
```

#### 方式二：手动刷新

```tsx
<AddRecordDialog
  // ...
  onSuccess={(record) => {
    // 手动刷新数据
    loadTableData();
  }}
/>
```

#### 方式三：通过 StandardDataView

```tsx
<StandardDataView
  // ...
  gridProps={{
    // ...
    onDataRefresh: () => {
      queryClient.invalidateQueries(['table', tableId]);
    },
  }}
/>
```

## 🎯 最佳实践

### 1. 字段排序

- Primary 字段会自动置顶
- 建议将重要字段标记为 `required`
- 可以通过 `visible: false` 隐藏不需要的字段

### 2. 校验规则

```tsx
// 推荐：在字段定义中设置校验规则
const fields: FieldConfig[] = [
  {
    id: '1',
    name: '年龄',
    type: 'number',
    required: true,
    options: {
      min: 0,
      max: 120,
    },
  },
];
```

### 3. 错误处理

```tsx
<AddRecordDialog
  // ...
  onError={(error) => {
    // 推荐：使用 toast 提示用户
    toast.error(`保存失败: ${error.message}`);
    
    // 或者上报错误
    Sentry.captureException(error);
  }}
/>
```

### 4. 性能优化

```tsx
// ✅ 推荐：缓存 fields 定义
const fields = useMemo(() => [
  { id: '1', name: '姓名', type: 'text' },
  // ...
], []);

// ❌ 避免：每次渲染都创建新的 fields 数组
<AddRecordDialog fields={[...]} />
```

## 🐛 常见问题

### 1. 弹窗不显示？

检查：
- `isOpen` 是否为 `true`
- `fields` 是否为空
- `tableId` 是否有效

### 2. 保存按钮禁用？

可能原因：
- 必填字段未填写
- 校验未通过
- `fields` 为空数组

### 3. 保存失败？

检查：
- `adapter` 是否正确传入
- `tableId` 是否正确
- SDK/ApiClient 是否已登录
- 网络连接是否正常

### 4. 表单数据格式不对？

使用 `transformBeforeSubmit` 转换数据：

```tsx
<AddRecordDialog
  transformBeforeSubmit={(values) => {
    // 转换日期格式
    if (values.date) {
      values.date = new Date(values.date).toISOString();
    }
    return values;
  }}
/>
```

## 🔍 调试

启用详细日志：

```tsx
<AddRecordDialog
  // ...
  onSuccess={(record) => {
    console.log('✅ 记录创建成功:', record);
  }}
  onError={(error) => {
    console.error('❌ 记录创建失败:', error);
  }}
/>
```

## 📝 示例

完整示例请参考：
- [基础用法示例](../../examples/add-record-basic)
- [高级用法示例](../../examples/add-record-advanced)
- [自定义编辑器示例](../../examples/add-record-custom-editors)

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可

MIT © LuckDB

