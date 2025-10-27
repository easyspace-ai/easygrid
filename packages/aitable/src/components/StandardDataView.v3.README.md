# StandardDataViewV3 - 支持 LuckDB SDK 的现代化数据视图组件

## 概述

`StandardDataViewV3` 是一个功能完整、代码简洁的数据视图组件，专门设计用于集成 LuckDB SDK，提供类似 Airtable 的多维表格体验。

## 核心特性

### ✅ 架构优势
- **组合式架构**: 由 ViewHeader + ViewToolbar + ViewContent + ViewStatusBar 组成
- **SDK 适配器**: 通过 `createAdapter()` 自动识别 LuckDB SDK 或 ApiClient
- **内置视图管理**: 自动加载、创建、重命名、删除视图
- **Toast 通知**: 统一的用户反馈系统

### ✅ 功能完整
- 字段配置（Combobox + Panel 模式）
- 行高调整（4 种预设）
- 过滤系统（通过 ViewToolbar）
- 添加记录对话框
- 添加/编辑字段对话框
- 列宽调整和列排序
- 响应式设计（移动端优化）

### ✅ SDK 集成
- 支持 LuckDB SDK 和传统 ApiClient
- 自动视图数据加载
- 字段/记录的 CRUD 操作
- 实时数据刷新

## 快速开始

### 1. 基础用法

```typescript
import { StandardDataViewV3 } from '@easygrid/aitable';
import { LuckDB } from '@easygrid/sdk';

// 初始化 SDK
const sdk = new LuckDB({
  baseUrl: 'http://localhost:8888',
  debug: true,
});

await sdk.login({
  email: 'admin@126.com',
  password: 'password123',
});

// 使用组件
<StandardDataViewV3
  sdk={sdk}
  tableId="tbl_xxx"
  gridProps={{
    columns: [
      { id: 'fld_1', name: '姓名', type: 'text', width: 150 },
      { id: 'fld_2', name: '邮箱', type: 'email', width: 200 },
    ],
    data: [
      { id: 'rec_1', fld_1: '张三', fld_2: 'zhang@example.com' },
      { id: 'rec_2', fld_1: '李四', fld_2: 'li@example.com' },
    ],
    rowCount: 2,
    onDataRefresh: () => {
      // 刷新数据逻辑
    },
  }}
/>
```

### 2. 完整功能示例

```typescript
<StandardDataViewV3
  // ========== SDK 配置 ==========
  sdk={sdk}
  tableId="tbl_xxx"
  
  // ========== 字段配置 ==========
  fields={fields.map(f => ({
    id: f.id,
    name: f.name,
    type: f.type,
    visible: true,
  }))}
  fieldConfigMode="combobox" // 或 "panel"
  
  // ========== 行高配置 ==========
  rowHeight="medium" // short | medium | tall | extra-tall
  onRowHeightChange={(height) => console.log('行高:', height)}
  
  // ========== Grid 配置 ==========
  gridProps={{
    columns,
    data,
    rowCount: data.length,
    onDataRefresh: loadData,
    onCellEdit: async (cell, newValue) => {
      // 单元格编辑逻辑
    },
  }}
  
  // ========== 视图管理 ==========
  // 组件会自动加载视图，也可以自定义回调
  onViewChange={(viewId) => console.log('切换视图:', viewId)}
  onCreateView={(viewType) => console.log('创建视图:', viewType)}
  onRenameView={(viewId, name) => console.log('重命名:', name)}
  onDeleteView={(viewId) => console.log('删除视图:', viewId)}
  
  // ========== 工具栏配置 ==========
  toolbarConfig={{
    showUndoRedo: true,
    showAddNew: true,
    showFieldConfig: true,
    showRowHeight: true,
    showFilter: true,
    showSort: true,
    showGroup: true,
  }}
  
  // ========== 状态栏 ==========
  statusContent={<div>自定义状态信息</div>}
/>
```

## API 文档

### Props 说明

#### 基础配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sdk` | `LuckDB` | - | LuckDB SDK 实例（推荐） |
| `apiClient` | `any` | - | 传统 ApiClient（向后兼容） |
| `tableId` | `string` | - | 表格 ID |
| `state` | `'idle' \| 'loading' \| 'empty' \| 'error'` | `'idle'` | 视图状态 |

#### 区域显示控制

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showHeader` | `boolean` | `true` | 显示头部标签栏 |
| `showToolbar` | `boolean` | `true` | 显示工具栏 |
| `showStatus` | `boolean` | `true` | 显示状态栏 |

#### 视图管理

| Prop | 类型 | 说明 |
|------|------|------|
| `views` | `View[]` | 外部视图列表（可选，不传则自动加载） |
| `activeViewId` | `string` | 当前激活的视图 ID |
| `onViewChange` | `(viewId: string) => void` | 视图切换回调 |
| `onCreateView` | `(viewType: string) => void` | 视图创建回调 |
| `onRenameView` | `(viewId: string, newName: string) => void` | 视图重命名回调 |
| `onDeleteView` | `(viewId: string) => void` | 视图删除回调 |

#### 字段配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fields` | `FieldConfig[]` | - | 字段列表 |
| `fieldConfigMode` | `'panel' \| 'combobox'` | `'combobox'` | 字段配置模式 |
| `onFieldToggle` | `(fieldId: string, visible: boolean) => void` | - | 字段显示/隐藏 |
| `onFieldEdit` | `(fieldId: string) => void` | - | 编辑字段 |
| `onFieldDelete` | `(fieldId: string) => void` | - | 删除字段 |
| `onAddField` | `(fieldName: string, fieldType: string) => void` | - | 添加字段 |

#### 行高配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `rowHeight` | `'short' \| 'medium' \| 'tall' \| 'extra-tall'` | `'medium'` | 行高设置 |
| `onRowHeightChange` | `(rowHeight: RowHeight) => void` | - | 行高变更回调 |

#### 过滤配置

| Prop | 类型 | 说明 |
|------|------|------|
| `filterFields` | `FilterField[]` | 可过滤的字段列表 |
| `filterConditions` | `FilterCondition[]` | 当前过滤条件 |
| `onFilterConditionsChange` | `(conditions: FilterCondition[]) => void` | 过滤条件变更回调 |
| `onFilteredDataChange` | `(filteredData: any[]) => void` | 过滤后数据变更回调 |

#### Grid 配置

| Prop | 类型 | 说明 |
|------|------|------|
| `gridProps` | `IGridProps & { onDataRefresh?: () => void }` | Grid 组件配置（必填） |

## 核心功能说明

### 1. 自动视图管理

组件内部会自动加载视图数据，无需手动管理：

```typescript
// 组件内部逻辑
useEffect(() => {
  const loadViews = async () => {
    const adapter = createAdapter(sdk || apiClient);
    const viewsList = await adapter.getViews(tableId);
    setInternalViews(viewsList);
  };
  loadViews();
}, [tableId, sdk, apiClient]);
```

你也可以通过回调覆盖默认行为：

```typescript
<StandardDataViewV3
  onCreateView={async (viewType) => {
    // 自定义创建逻辑
    const newView = await customCreateView(viewType);
    // 更新 UI
  }}
/>
```

### 2. SDK 适配器模式

组件通过适配器自动识别 SDK 类型：

```typescript
const adapter = createAdapter(sdk || apiClient);
// 自动识别 LuckDB SDK 或 ApiClient
```

支持的操作：
- `adapter.getViews(tableId)` - 获取视图列表
- `adapter.createView(tableId, data)` - 创建视图
- `adapter.updateView(tableId, viewId, data)` - 更新视图
- `adapter.deleteView(tableId, viewId)` - 删除视图
- `adapter.createField(tableId, data)` - 创建字段
- 等等...

### 3. 列宽和列顺序持久化

组件内部维护列宽和列顺序状态：

```typescript
// 列宽状态（使用列 ID 作为 key，不依赖顺序）
const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

// 列顺序状态
const [columnOrder, setColumnOrder] = useState<number[]>([]);

// 自动应用到 Grid
const enhancedGridProps = useMemo(() => {
  const reorderedColumns = columnOrder.map(originalIndex => {
    const column = gridProps.columns[originalIndex];
    return {
      ...column,
      width: columnWidths[column.id] ?? column.width ?? 150,
    };
  });
  return { ...gridProps, columns: reorderedColumns };
}, [gridProps, columnWidths, columnOrder]);
```

### 4. 响应式设计

组件自动检测设备类型并优化布局：

```typescript
// 自动检测
const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
const [isTouch, setIsTouch] = useState(false);

// 移动端优化
const isMobile = deviceType === 'mobile';

// 条件渲染
{isMobile ? (
  <MobileLayout />
) : (
  <DesktopLayout />
)}
```

## 与旧版本对比

### StandardDataView (v1) - 重构版
- ✅ 组合式架构
- ❌ 不支持新 SDK
- ❌ 缺少过滤功能
- 682 行代码

### StandardDataView.legacy (v2) - 旧版
- ✅ 功能完整
- ❌ 不支持新 SDK
- ❌ 代码冗长
- 1157 行代码

### StandardDataViewV3 (v3) - 新版 ⭐
- ✅ 组合式架构
- ✅ 支持新 SDK
- ✅ 功能完整
- ✅ 代码简洁
- ~650 行代码

## 最佳实践

### 1. SDK 初始化

推荐在应用根组件初始化 SDK：

```typescript
// App.tsx
const sdk = new LuckDB({
  baseUrl: process.env.VITE_API_BASE_URL,
  debug: process.env.NODE_ENV === 'development',
});

await sdk.login({
  email: credentials.email,
  password: credentials.password,
});

// 传递给子组件
<StandardDataViewV3 sdk={sdk} tableId={tableId} />
```

### 2. 数据刷新

使用 `onDataRefresh` 回调重新加载数据：

```typescript
const loadData = async () => {
  const fields = await sdk.listFields({ tableId });
  const records = await sdk.listRecords({ tableId });
  // 更新状态
};

<StandardDataViewV3
  gridProps={{
    columns,
    data,
    rowCount: data.length,
    onDataRefresh: loadData, // 添加/编辑/删除后自动调用
  }}
/>
```

### 3. 错误处理

组件内部使用 Toast 通知，也可以自定义：

```typescript
<StandardDataViewV3
  onCreateView={async (viewType) => {
    try {
      await customCreateView(viewType);
      toast.showToast({ type: 'success', message: '创建成功' });
    } catch (error) {
      toast.showToast({ type: 'error', message: '创建失败' });
    }
  }}
/>
```

## 常见问题

### Q: 如何隐藏某些工具栏按钮？

```typescript
<StandardDataViewV3
  toolbarConfig={{
    showUndoRedo: false,
    showFilter: false,
    showSort: false,
  }}
/>
```

### Q: 如何自定义视图创建逻辑？

```typescript
<StandardDataViewV3
  onCreateView={async (viewType) => {
    // 自定义逻辑
    const newView = await myCustomCreateView(viewType);
    // 组件会自动刷新视图列表
  }}
/>
```

### Q: 如何持久化列宽？

```typescript
<StandardDataViewV3
  gridProps={{
    columns,
    data,
    rowCount: data.length,
    onColumnResize: async (column, newSize) => {
      // 保存到本地存储或后端
      await saveColumnWidth(column.id, newSize);
    },
  }}
/>
```

### Q: 如何在 demo-yjs 中使用？

参考 `packages/aitable/demo-yjs/src/components/TableView.tsx` 的实现，将 HTML 表格替换为 StandardDataViewV3 即可。

## 迁移指南

### 从 StandardDataView 迁移

```diff
- import { StandardDataView } from '@easygrid/aitable';
+ import { StandardDataViewV3 } from '@easygrid/aitable';
+ import { LuckDB } from '@easygrid/sdk';

+ const sdk = new LuckDB({ baseUrl: '...' });
+ await sdk.login({ email, password });

- <StandardDataView apiClient={apiClient} tableId={tableId} />
+ <StandardDataViewV3 sdk={sdk} tableId={tableId} />
```

### 从 StandardDataView.legacy 迁移

所有 props 保持兼容，只需替换组件名即可：

```diff
- import { StandardDataView } from '@easygrid/aitable';
+ import { StandardDataViewV3 } from '@easygrid/aitable';

- <StandardDataView {...props} />
+ <StandardDataViewV3 {...props} sdk={sdk} />
```

## 相关文档

- [LuckDB SDK 文档](../../sdk/README.md)
- [Grid 组件文档](../grid/README.md)
- [ViewHeader 文档](./view-header/README.md)
- [ViewToolbar 文档](./view-toolbar/README.md)
- [FilterManager 文档](./filter/README.md)

## 许可证

MIT


