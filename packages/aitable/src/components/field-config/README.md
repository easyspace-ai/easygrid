# AddFieldDialog V2 - Airtable 风格字段创建对话框

## 🎨 设计理念

参考 Airtable 的字段创建体验，实现了流畅的两步式创建流程、智能分类系统、实时搜索和精美的动画效果。

### 核心特性

- ✅ **两步式流程** - 先选择类型，再配置详情，降低认知负担
- ✅ **智能分类** - 6大分类 + 常用标记，快速定位需要的字段
- ✅ **实时搜索** - 支持中英文、关键词模糊匹配
- ✅ **专属配置** - 每种字段类型都有定制化的配置面板
- ✅ **流畅动画** - 入场动画、Stagger 效果、Hover 微交互
- ✅ **类型安全** - 完整的 TypeScript 类型定义

## 📦 安装使用

### 基础用法

```tsx
import { AddFieldDialogV2 } from '@easygrid/aitable/field-config';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddField = (name: string, type: string, config?: any) => {
    console.log('创建字段:', { name, type, config });
    // 调用 API 创建字段...
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        ➕ 添加新字段
      </button>

      <AddFieldDialogV2
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleAddField}
      />
    </>
  );
}
```

### Props

```typescript
interface AddFieldDialogProps {
  isOpen: boolean;                    // 是否显示对话框
  onClose: () => void;                // 关闭回调
  onConfirm: (                        // 确认创建回调
    fieldName: string,                // 字段名称
    fieldType: string,                // 字段类型 ID
    config?: FieldConfig              // 字段配置（可选）
  ) => void;
}
```

### 字段配置类型

不同的字段类型会返回不同的配置对象：

#### 单选/多选字段

```typescript
interface SelectFieldConfig {
  options: Array<{
    id: string;      // 选项 ID
    label: string;   // 选项显示文本
    color: string;   // 选项颜色
  }>;
  allowOther?: boolean;  // 是否允许用户自定义选项（仅多选）
}

// 示例
{
  options: [
    { id: 'opt-1', label: '待处理', color: '#ef4444' },
    { id: 'opt-2', label: '进行中', color: '#f59e0b' },
    { id: 'opt-3', label: '已完成', color: '#22c55e' },
  ],
  allowOther: false
}
```

#### 数字字段

```typescript
interface NumberFieldConfig {
  format?: 'number' | 'currency' | 'percent';  // 数字格式
  precision?: number;                          // 小数位数
  min?: number;                                // 最小值
  max?: number;                                // 最大值
}

// 示例
{
  format: 'currency',
  precision: 2,
  min: 0,
  max: 999999
}
```

#### 日期字段

```typescript
interface DateFieldConfig {
  includeTime?: boolean;                                    // 是否包含时间
  dateFormat?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY'; // 日期格式
  timeFormat?: '24h' | '12h';                               // 时间格式
}

// 示例
{
  includeTime: true,
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h'
}
```

#### 评分字段

```typescript
interface RatingFieldConfig {
  maxRating?: number;                      // 最大评分（1-10）
  icon?: 'star' | 'heart' | 'thumbsup';   // 评分图标
}

// 示例
{
  maxRating: 5,
  icon: 'star'
}
```

## 🎯 字段类型

### 分类系统

```
📝 基础类型 (basic)
  - text          单行文本
  - longText      长文本
  - number        数字

☑️ 选择类型 (select)
  - singleSelect  单选
  - multipleSelect 多选
  - checkbox      复选框

📅 日期时间 (datetime)
  - date          日期
  - duration      时长

🔗 链接类型 (link)
  - link          链接
  - email         邮箱
  - phone         电话
  - location      地址

⭐ 高级类型 (advanced)
  - rating        评分
  - progress      进度

👤 协作类型 (collab)
  - user          成员
  - attachment    附件
```

### 常用字段（带 ⭐ 标记）

- 单行文本
- 长文本
- 数字
- 单选
- 多选
- 日期

## 🎨 视觉设计

### 设计 Token

```typescript
// 使用统一的设计系统
import { tokens, transitions, elevation } from '../../grid/design-system';

// 示例
style={{
  borderRadius: tokens.radius.lg,          // 8px
  padding: tokens.spacing[4],              // 16px
  color: tokens.colors.text.primary,       // #0f172a
  transition: transitions.presets.all,     // 200ms cubic-bezier
  boxShadow: elevation.sm,                 // 微妙阴影
}}
```

### 配色方案

每个字段类型都有专属主题色：

```typescript
const fieldTypeColors = {
  text: '#3b82f6',        // 蓝色 - 专业、信任
  number: '#f59e0b',      // 橙色 - 醒目、数据
  singleSelect: '#8b5cf6', // 紫色 - 选项、分类
  date: '#06b6d4',        // 青色 - 时间流动
  rating: '#eab308',      // 金色 - 价值、质量
  // ... 更多
};
```

### 动画效果

#### 入场动画

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

#### Stagger 列表动画

```typescript
animation: `slideInStagger 300ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`
```

#### Hover 微交互

- 卡片上浮 2px
- 阴影加深
- 边框颜色变化
- 箭头图标淡入

## ⌨️ 键盘快捷键

- `Escape` - 关闭对话框 / 返回上一步
- `Enter` - 确认创建（在配置界面）
- 搜索框自动获取焦点

## 📝 完整示例

### 创建单选字段

```tsx
function CreateStatusField() {
  const [isOpen, setIsOpen] = useState(false);

  const handleCreateField = (name: string, type: string, config?: any) => {
    if (type === 'singleSelect') {
      // config 的类型为 SelectFieldConfig
      console.log('创建单选字段:', {
        name,              // "状态"
        type,              // "singleSelect"
        options: config.options  // [{ id, label, color }, ...]
      });
      
      // 调用 API
      api.createField({
        name,
        type,
        settings: config,
      });
    }
  };

  return (
    <AddFieldDialogV2
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onConfirm={handleCreateField}
    />
  );
}
```

### 创建数字字段

```tsx
function CreatePriceField() {
  const handleCreateField = (name: string, type: string, config?: any) => {
    if (type === 'number') {
      // config 的类型为 NumberFieldConfig
      console.log('创建数字字段:', {
        name,              // "价格"
        type,              // "number"
        format: config.format,      // "currency"
        precision: config.precision, // 2
        min: config.min,            // 0
      });
    }
  };

  return <AddFieldDialogV2 /* ... */ />;
}
```

## 🚀 高级用法

### 自定义字段类型

如果需要添加自定义字段类型：

1. 在 `AddFieldDialog.v2.tsx` 的 `fieldTypes` 数组中添加新类型
2. 创建对应的配置面板组件
3. 在 `ConfigurationStep` 的 `renderFieldConfiguration` 中添加渲染逻辑

```typescript
// 1. 添加字段类型定义
const fieldTypes: FieldType[] = [
  // ... 现有类型
  {
    id: 'custom',
    name: '自定义字段',
    icon: MyCustomIcon,
    description: '我的自定义字段类型',
    example: '示例说明',
    category: 'advanced',
    color: '#ff0000',
    keywords: ['custom', '自定义'],
  },
];

// 2. 创建配置面板
function CustomFieldConfiguration({ config, onChange }) {
  return (
    <div>
      {/* 配置界面 */}
    </div>
  );
}

// 3. 添加渲染逻辑
function renderFieldConfiguration() {
  switch (selectedType.id) {
    // ... 现有case
    case 'custom':
      return <CustomFieldConfiguration config={fieldConfig} onChange={onFieldConfigChange} />;
  }
}
```

## 🎯 最佳实践

### 1. 提供默认配置

为常用字段类型提供合理的默认配置：

```typescript
const defaultConfigs = {
  status: {
    type: 'singleSelect',
    options: [
      { label: '待处理', color: '#ef4444' },
      { label: '进行中', color: '#f59e0b' },
      { label: '已完成', color: '#22c55e' },
    ],
  },
  priority: {
    type: 'singleSelect',
    options: [
      { label: '高', color: '#ef4444' },
      { label: '中', color: '#f59e0b' },
      { label: '低', color: '#3b82f6' },
    ],
  },
};
```

### 2. 验证字段配置

在确认创建前验证配置的有效性：

```typescript
const handleConfirm = (name: string, type: string, config?: any) => {
  // 验证字段名称
  if (!name || name.trim().length === 0) {
    toast.error('字段名称不能为空');
    return;
  }

  // 验证选择字段的选项
  if (type === 'singleSelect' || type === 'multipleSelect') {
    if (!config?.options || config.options.length === 0) {
      toast.error('请至少添加一个选项');
      return;
    }
  }

  // 调用 API
  createField(name, type, config);
};
```

### 3. 错误处理

```typescript
const handleCreateField = async (name: string, type: string, config?: any) => {
  try {
    await api.createField({ name, type, settings: config });
    toast.success(`字段 "${name}" 创建成功`);
    setIsOpen(false);
  } catch (error) {
    toast.error('创建字段失败: ' + error.message);
  }
};
```

## 🔧 配置选项

### 禁用某些字段类型

如果需要隐藏某些字段类型：

```typescript
// 在 fieldTypes 数组中过滤掉不需要的类型
const availableFieldTypes = fieldTypes.filter(
  type => !['attachment', 'user'].includes(type.id)
);
```

### 自定义分类

修改 `categoryConfig` 来自定义分类名称和图标：

```typescript
const categoryConfig = {
  basic: {
    name: '基础',  // 改名
    icon: FileText,
    color: '#3b82f6',
  },
  // ...
};
```

## 📊 性能优化

### 1. 使用 useMemo

搜索和筛选逻辑使用 `useMemo` 缓存：

```typescript
const filteredFieldTypes = useMemo(() => {
  // 复杂的筛选逻辑
}, [selectedCategory, searchQuery]);
```

### 2. 动画性能

- 使用 `transform` 和 `opacity`（GPU 加速）
- 避免 `height`、`width` 动画
- 合理设置 `will-change`

### 3. 懒加载配置面板

对于复杂的配置面板，可以使用懒加载：

```typescript
const SelectFieldConfiguration = lazy(
  () => import('./field-configurations/SelectFieldConfiguration')
);
```

## 🎨 主题定制

对话框使用统一的 Design System，支持主题定制：

```typescript
// 自定义主题
const customTokens = {
  ...tokens,
  colors: {
    ...tokens.colors,
    primary: {
      500: '#your-brand-color',
    },
  },
};
```

## 📱 响应式支持

对话框已经针对不同屏幕尺寸优化：

- **桌面端**: 720px（类型选择） / 560px（配置）
- **平板**: 自适应
- **移动端**: 待优化（可以设置为全屏）

## 🧪 测试

### 单元测试示例

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { AddFieldDialogV2 } from './AddFieldDialog.v2';

test('应该能够选择字段类型', () => {
  const onConfirm = jest.fn();
  
  render(
    <AddFieldDialogV2
      isOpen={true}
      onClose={() => {}}
      onConfirm={onConfirm}
    />
  );

  // 点击单选字段类型
  fireEvent.click(screen.getByText('单选'));
  
  // 输入字段名称
  fireEvent.change(screen.getByPlaceholderText(/请输入字段名称/), {
    target: { value: '状态' },
  });
  
  // 确认创建
  fireEvent.click(screen.getByText('创建字段'));
  
  expect(onConfirm).toHaveBeenCalledWith('状态', 'singleSelect', expect.any(Object));
});
```

## 📚 相关资源

- [设计系统文档](../../grid/design-system/README.md)
- [Airtable 设计参考](https://airtable.com)
- [完整演示](../../demo/field-dialog-demo.tsx)

## 🤝 贡献

如果你想添加新的字段类型或配置面板：

1. Fork 项目
2. 创建新的字段类型定义
3. 实现配置面板组件
4. 添加测试用例
5. 提交 PR

## 📄 License

MIT

---

**享受创建字段的愉悦体验！** 🎉

