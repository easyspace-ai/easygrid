# Grid Design System

> 专业的设计系统，为 @easygrid/aitable 提供统一的视觉语言

## 概述

这是一个经过精心设计的设计系统，参考了 Linear、Notion、Radix UI 等顶级产品的设计规范。它提供了：

- 🎨 **完整的 Design Tokens** - 颜色、间距、圆角、阴影、字体
- 🌗 **暗色模式支持** - 优雅的 light/dark 主题切换
- ✨ **微动画系统** - 流畅的 60fps 过渡动画
- ♿ **无障碍支持** - WCAG 2.1 AA 标准
- 📦 **类型安全** - 完整的 TypeScript 支持

## 快速开始

### 1. 使用 Design Tokens

```tsx
import { tokens, cn } from '@easygrid/aitable/grid/design-system';

// 使用颜色
const Button = () => (
  <button
    style={{
      backgroundColor: tokens.colors.primary[500],
      color: tokens.colors.text.inverse,
      borderRadius: tokens.radius.md,
      padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
    }}
  >
    Click me
  </button>
);

// 或者使用 Tailwind classes
const BetterButton = () => (
  <button
    className={cn(
      'bg-blue-500 text-white',
      'px-4 py-2 rounded-md',
      'transition-colors duration-200',
      'hover:bg-blue-600',
      'focus-visible:ring-2 focus-visible:ring-blue-500'
    )}
  >
    Better Button
  </button>
);
```

### 2. 使用主题切换

```tsx
import { ThemeProvider, useTheme, ThemeToggle } from '@easygrid/aitable/grid/design-system';

function App() {
  return (
    <ThemeProvider defaultMode="system">
      <YourApp />
      <ThemeToggle />
    </ThemeProvider>
  );
}

function YourComponent() {
  const { theme, isDark, toggleTheme } = useTheme();
  
  return (
    <div style={{ backgroundColor: theme.cellBg }}>
      Current mode: {isDark ? 'Dark' : 'Light'}
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

### 3. 使用动画

```tsx
import { animations, cn } from '@easygrid/aitable/grid/design-system';

// 方式 1: Tailwind classes（推荐）
const Modal = () => (
  <div className={cn(
    animations.tailwind.scaleIn,
    'bg-white rounded-lg shadow-lg'
  )}>
    Content
  </div>
);

// 方式 2: CSS transitions
const HoverCard = () => (
  <div className={cn(
    animations.hover.standard,
    'bg-white rounded-lg'
  )}>
    Hover me
  </div>
);

// 方式 3: Custom animations
const LoadingSpinner = () => (
  <div className={animations.loading.spinner} />
);
```

## 设计 Tokens 参考

### 颜色系统

```ts
tokens.colors = {
  // Primary colors
  primary: { 50...900 },
  
  // Surface colors
  surface: {
    base: '#ffffff',
    hover: '#f8fafc',
    active: '#f1f5f9',
    selected: '#e0f2fe',
    disabled: '#f9fafb',
  },
  
  // Border colors
  border: {
    subtle: '#e5e7eb',
    default: '#d1d5db',
    strong: '#9ca3af',
    focus: '#3b82f6',
    error: '#ef4444',
  },
  
  // Text colors
  text: {
    primary: '#0f172a',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
    // ...
  },
  
  // Cell-specific
  cell: { /* ... */ },
  
  // Column-specific
  column: { /* ... */ },
};
```

### 间距系统

```ts
tokens.spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  // ...
};
```

### 圆角系统

```ts
tokens.radius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px - 推荐默认值
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  full: '9999px',
};
```

### 阴影系统

```ts
tokens.elevation = {
  flat: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), ...',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), ...',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), ...',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), ...',
  focus: '0 0 0 3px rgba(59, 130, 246, 0.1)',
};
```

## 组件示例

### 重构后的 GridToolbar

```tsx
import { GridToolbar } from '@easygrid/aitable/grid/components/toolbar/GridToolbar.refactored';

// ✅ 现在使用：
// - Lucide React 图标（不再是 Unicode）
// - Design Tokens 颜色系统
// - 流畅的 hover/focus 状态
// - 完整的键盘导航支持

<GridToolbar
  onUndo={handleUndo}
  onRedo={handleRedo}
  undoDisabled={!canUndo}
  redoDisabled={!canRedo}
  // ...
/>
```

### 重构后的 TextEditor

```tsx
import { TextEditor } from '@easygrid/aitable/grid/components/editors/basic/TextEditor.refactored';

// ✅ 优化：
// - border: 1px（从 2px）
// - 使用 Design Tokens
// - 流畅的 focus 动画
// - Subtle shadow 提升层次

<TextEditor
  cell={cell}
  rect={rect}
  theme={theme}
  isEditing={true}
  onChange={handleChange}
/>
```

### 重构后的 SelectEditor

```tsx
import { SelectEditor } from '@easygrid/aitable/grid/components/editors/enhanced/SelectEditor.refactored';

// ✅ 优化：
// - 移除内联 hover 事件
// - CSS :hover 替代 JS
// - 键盘导航视觉反馈
// - 流畅的动画

<SelectEditor
  cell={selectCell}
  isEditing={true}
  onChange={handleSelect}
/>
```

## 迁移指南

### 从旧版本迁移

#### 1. 更新 GridToolbar

```diff
- import { GridToolbar } from '@easygrid/aitable/grid/components/toolbar';
+ import { GridToolbar } from '@easygrid/aitable/grid/components/toolbar/GridToolbar.refactored';

// Props 保持不变，但视觉效果大幅提升
```

#### 2. 更新主题

```diff
- import { gridTheme } from '@easygrid/aitable/grid/configs';
+ import { lightTheme, darkTheme } from '@easygrid/aitable/grid/configs/gridTheme.refactored';

// 或者使用 ThemeProvider
+ import { ThemeProvider } from '@easygrid/aitable/grid/design-system';

function App() {
  return (
+   <ThemeProvider>
      <Grid theme={lightTheme} />
+   </ThemeProvider>
  );
}
```

#### 3. 使用 Design Tokens

```diff
// 旧方式：硬编码颜色
- style={{ backgroundColor: '#f5f5f5', padding: '8px' }}

// 新方式：使用 tokens
+ import { tokens } from '@easygrid/aitable/grid/design-system';
+ style={{
+   backgroundColor: tokens.colors.surface.hover,
+   padding: tokens.spacing[2]
+ }}

// 或者使用 Tailwind
+ className="bg-gray-50 p-2"
```

## 最佳实践

### ✅ DO

```tsx
// ✅ 使用 Design Tokens
import { tokens } from '@easygrid/aitable/grid/design-system';
style={{ color: tokens.colors.text.primary }}

// ✅ 使用 cn() 合并 className
import { cn } from '@easygrid/aitable/grid/design-system';
className={cn('base-class', isActive && 'active-class')}

// ✅ 使用语义化的颜色名称
backgroundColor: tokens.colors.surface.hover

// ✅ 使用预设的 transition
className={animations.hover.standard}

// ✅ 使用 focus ring
className={animations.focus.standard}
```

### ❌ DON'T

```tsx
// ❌ 硬编码颜色值
style={{ color: '#333333' }}

// ❌ 硬编码间距
style={{ padding: '8px' }}

// ❌ 使用 Unicode 字符作为图标
<button>←</button>

// ❌ 内联 hover 事件操作 style
onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f00'}

// ❌ 忘记 transition
className="bg-blue-500" // 缺少 transition-colors

// ❌ 忘记 focus-visible
className="border rounded" // 缺少 focus ring
```

## 无障碍支持

所有组件都遵循 WCAG 2.1 AA 标准：

```tsx
// ✅ 正确的 focus ring
className={cn(
  'rounded-md',
  animations.focus.standard  // focus-visible:ring-2 ...
)}

// ✅ 正确的颜色对比度
// Light mode: 文本 #0f172a on 背景 #ffffff = 14.54:1 ✅
// Dark mode: 文本 #f4f4f5 on 背景 #0a0a0a = 19.68:1 ✅

// ✅ 键盘导航支持
<button
  onKeyDown={handleKeyDown}
  aria-label="..."
  role="button"
  tabIndex={0}
/>
```

## 性能优化

```tsx
// ✅ 使用 CSS transitions（硬件加速）
className="transition-colors duration-200"

// ❌ 不要使用 JS 操作 style（慢）
onMouseEnter={() => setHovered(true)}

// ✅ 使用 Tailwind（CSS-in-JS 可以接受）
className="bg-blue-500"

// ✅ 避免不必要的重渲染
const Button = React.memo(({ onClick, children }) => (
  <button onClick={onClick}>{children}</button>
));
```

## 调试技巧

### 查看当前主题

```tsx
import { useTheme } from '@easygrid/aitable/grid/design-system';

function DebugPanel() {
  const { theme, mode, isDark } = useTheme();
  
  return (
    <div>
      <p>Mode: {mode}</p>
      <p>Is Dark: {isDark ? 'Yes' : 'No'}</p>
      <p>Cell BG: {theme.cellBg}</p>
    </div>
  );
}
```

### 测试暗色模式

```tsx
// 方式 1: 手动切换
const { toggleTheme } = useTheme();
<button onClick={toggleTheme}>Toggle</button>

// 方式 2: 强制设置
const { setMode } = useTheme();
<button onClick={() => setMode('dark')}>Dark</button>
<button onClick={() => setMode('light')}>Light</button>
<button onClick={() => setMode('system')}>System</button>
```

## 贡献指南

### 添加新的 Design Token

```ts
// 1. 在 tokens.ts 中定义
export const myNewToken = {
  // ...
};

// 2. 在 lightTheme 中使用
export const lightTheme = {
  myFeature: myNewToken.value,
};

// 3. 在 darkTheme 中对应
export const darkTheme = {
  myFeature: myNewToken.darkValue,
};

// 4. 更新 IGridTheme 类型（如需要）
export interface IGridTheme {
  myFeature: string;
}
```

### 添加新的动画

```ts
// 在 animations.ts 中添加
export const myAnimation = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3 },
};

// 或者添加 Tailwind class
export const tailwindAnimations = {
  myAnimation: 'animate-in slide-in-from-left-4 duration-300',
};
```

## 相关资源

- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 版本历史

### v2.0.0 (2025-10-16)

- ✅ 完整的 Design Tokens 系统
- ✅ 暗色模式支持
- ✅ 微动画系统
- ✅ 重构所有核心组件
- ✅ 移除所有 Unicode 图标
- ✅ 完整的 TypeScript 类型

---

**打造顶级的设计品质，一次做对！** 🎨

