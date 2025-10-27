# ViewHeader 组件

现代化的视图头部组件，灵感来源于 Linear、Notion、Airtable 等顶级产品。

## 设计特点

### 视觉风格
- ✅ **底部指示条** - 替代传统的浮起效果
- ✅ **真实图标** - 使用 Lucide Icons，直观易懂
- ✅ **流畅动画** - 200ms cubic-bezier，60fps 体验
- ✅ **8px 网格对齐** - 精确的间距系统
- ✅ **现代配色** - 蓝色主题，清晰的视觉层次

### 交互细节
- **Hover**: 背景淡入 + 文字加深 + 轻微放大（1.02）
- **Active**: 轻微缩小（0.98）+ 更深背景
- **Selected**: 蓝色背景 + 底部 2px 指示条 + 图标高亮

## 使用示例

### 静态标签模式
```tsx
import { ViewHeader } from '@easygrid/aitable';

<ViewHeader
  tabs={[
    { key: 'table', label: '表格' },
    { key: 'chart', label: '图表' },
  ]}
  activeTabKey="table"
  onTabChange={(key) => console.log(key)}
/>
```

### 动态视图模式
```tsx
import { ViewHeader } from '@easygrid/aitable';

<ViewHeader
  views={[
    { id: '1', name: '所有任务', type: 'grid' },
    { id: '2', name: '看板', type: 'kanban' },
    { id: '3', name: '日历', type: 'calendar' },
  ]}
  activeViewId="1"
  onViewChange={(viewId) => console.log(viewId)}
  onCreateView={(viewType) => console.log('Create:', viewType)}
  onRenameView={(viewId, newName) => console.log('Rename:', viewId, newName)}
  onDeleteView={(viewId) => console.log('Delete:', viewId)}
/>
```

### 带操作按钮
```tsx
<ViewHeader
  views={views}
  activeViewId={activeViewId}
  onViewChange={handleViewChange}
  onCreateView={handleCreateView}
  onAdd={() => console.log('Add new item')}
/>
```

## 组件架构

```
view-header/
├── ViewHeader.tsx        # 主组件（容器）
├── ViewTab.tsx           # 标签组件（可复用）
├── CreateViewMenu.tsx    # 创建视图菜单
├── viewTypeIcons.ts      # 图标映射系统
├── index.ts              # 统一导出
└── README.md             # 文档
```

## API

### ViewHeader Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tabs` | `Tab[]` | - | 静态标签列表 |
| `activeTabKey` | `string` | - | 当前激活的标签 key |
| `onTabChange` | `(key: string) => void` | - | 标签切换回调 |
| `views` | `View[]` | - | 动态视图列表 |
| `activeViewId` | `string` | - | 当前激活的视图 ID |
| `onViewChange` | `(viewId: string) => void` | - | 视图切换回调 |
| `onCreateView` | `(viewType: string) => void` | - | 创建视图回调 |
| `onRenameView` | `(viewId: string, newName: string) => void` | - | 重命名视图回调 |
| `onDeleteView` | `(viewId: string) => void` | - | 删除视图回调 |
| `onAdd` | `() => void` | - | 右侧添加按钮回调 |
| `isMobile` | `boolean` | `false` | 是否为移动端 |
| `isTouch` | `boolean` | `false` | 是否为触摸设备 |
| `className` | `string` | - | 自定义类名 |

### Tab 类型
```typescript
interface Tab {
  key: string;      // 唯一标识
  label: string;    // 显示文本
}
```

### View 类型
```typescript
interface View {
  id: string;       // 唯一标识
  name: string;     // 显示名称
  type?: string;    // 视图类型（用于图标映射）
}
```

## 视图类型

支持的视图类型及其图标：

| 类型 | 名称 | 图标 | 颜色 |
|------|------|------|------|
| `grid` | 表格视图 | Table | 蓝色 |
| `kanban` | 看板视图 | LayoutGrid | 绿色 |
| `calendar` | 日历视图 | Calendar | 青色 |
| `gantt` | 甘特视图 | BarChart3 | 粉色 |
| `gallery` | 画册视图 | Image | 紫色 |
| `form` | 表单视图 | FileText | 琥珀色 |
| `list` | 列表视图 | List | 靛蓝色 |

## 设计规范

### 颜色
```css
/* 未选中 */
text: #64748b (gray-600)
icon: #94a3b8 (gray-400)
bg: transparent

/* Hover */
text: #0f172a (gray-900)
icon: #64748b (gray-600)
bg: #f8fafc (gray-50)

/* 选中 */
text: #1d4ed8 (blue-700)
icon: #2563eb (blue-600)
bg: #eff6ff (blue-50)
indicator: #3b82f6 (blue-500)
```

### 尺寸
```css
/* Desktop */
height: 56px (container) / 36px (tab)
padding: 16px (container) / 12px (tab)
gap: 4px (between tabs)
icon: 16px
text: 14px

/* Mobile */
height: 48px (container) / 32px (tab)
padding: 12px (container) / 8px (tab)
gap: 4px
icon: 14px
text: 12px
```

### 动画
```css
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
hover-scale: 1.02
active-scale: 0.98
indicator-transition: all 300ms ease-out
```

## 浏览器支持

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ iOS Safari 14+
- ✅ Chrome Mobile 90+

## 无障碍访问

- ✅ ARIA 标签支持
- ✅ 键盘导航（Tab 键）
- ✅ Focus 可见性
- ✅ 语义化 HTML
- ✅ 屏幕阅读器友好

## 性能

- ✅ 纯 CSS 动画（GPU 加速）
- ✅ 无运行时性能损耗
- ✅ 轻量级（< 10KB gzipped）
- ✅ Tree-shakeable

## 更新日志

### v2.0.0 (2025-10-17)
- 🎨 完整重构 UI/UE 设计
- ✨ 新增底部指示条
- ✨ 真实图标系统
- ✨ 流畅动画和微交互
- ✨ 8px 网格对齐
- ♻️ 纯 Tailwind，去除内联样式
- 📦 组件化拆分
- 📝 完善的 TypeScript 类型

### v1.0.0 (2024-10-11)
- 🎉 初始版本
- ✨ 基础标签功能
- ✨ 浮起效果设计

## 反馈

如有问题或建议，请提交 Issue 或 PR。

## 许可证

MIT

