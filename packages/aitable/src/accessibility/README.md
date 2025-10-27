# Grid 可访问性系统

## 概述

完整的可访问性支持，确保所有用户都能使用Grid组件。

## 组件

### 1. KeyboardNavigation

**用途**: 完整的键盘导航支持

```tsx
import { KeyboardNavigation } from '@easygrid/aitable/accessibility';

const navigation = new KeyboardNavigation({
  onNavigate: (direction, position) => {
    // 处理导航
  },
  onSelect: (selection) => {
    // 处理选择
  },
  onEdit: (cell) => {
    // 进入编辑模式
  },
  onCopy: () => {
    // 复制
  },
  onPaste: () => {
    // 粘贴
  },
  onDelete: () => {
    // 删除
  },
});

// 注册键盘事件
element.addEventListener('keydown', navigation.handleKeyDown);
```

**支持的快捷键**：

- `↑↓←→` - 单元格导航
- `Tab / Shift+Tab` - 横向导航
- `Enter` - 编辑单元格
- `Esc` - 退出编辑
- `Ctrl/Cmd+C` - 复制
- `Ctrl/Cmd+V` - 粘贴
- `Ctrl/Cmd+Z` - 撤销
- `Ctrl/Cmd+Shift+Z` - 重做
- `Delete / Backspace` - 删除
- `Ctrl/Cmd+A` - 全选
- `Shift+Click` - 范围选择
- `Ctrl/Cmd+Click` - 多选

### 2. FocusManager

**用途**: 焦点管理和焦点陷阱

```tsx
import { FocusManager } from '@easygrid/aitable/accessibility';

const focusManager = new FocusManager(containerElement);

// 设置焦点
focusManager.setFocus(targetElement);

// 焦点陷阱（模态框场景）
focusManager.trapFocus(modalElement);

// 释放焦点陷阱
focusManager.releaseFocus();

// 焦点循环（Tab导航）
focusManager.enableFocusCycle();
```

### 3. AriaManager

**用途**: ARIA标签和语义化管理

```tsx
import { AriaManager } from '@easygrid/aitable/accessibility';

const ariaManager = new AriaManager();

// 为Grid添加ARIA标签
ariaManager.labelGrid(gridElement, {
  label: '数据表格',
  description: '包含100行，5列的数据表格',
  rowCount: 100,
  columnCount: 5,
});

// 为单元格添加ARIA标签
ariaManager.labelCell(cellElement, {
  row: 1,
  column: 2,
  value: 'John Doe',
  columnName: '姓名',
});

// 更新实时区域（屏幕阅读器）
ariaManager.announce('已添加新行');
```

## ARIA标签规范

### Grid容器

```html
<div role="grid" aria-label="数据表格" aria-rowcount="100" aria-colcount="5" tabindex="0"></div>
```

### 行

```html
<div role="row" aria-rowindex="1"></div>
```

### 单元格

```html
<div role="gridcell" aria-colindex="1" aria-readonly="false" tabindex="0"></div>
```

### 列头

```html
<div role="columnheader" aria-sort="ascending" aria-colindex="1"></div>
```

## 屏幕阅读器支持

### 实时区域

```tsx
// Grid内部已集成
<div role="status" aria-live="polite" aria-atomic="true">
  {/* 状态变化通知 */}
</div>
```

### 状态通知

- ✅ 单元格编辑
- ✅ 行/列添加/删除
- ✅ 排序/筛选变化
- ✅ 数据加载状态

## 键盘导航模式

### 表格模式（默认）

- 箭头键：单元格导航
- Enter：编辑单元格
- Esc：退出编辑

### 编辑模式

- Tab：下一个可编辑单元格
- Shift+Tab：上一个可编辑单元格
- Enter：保存并移到下一行
- Esc：取消并退出编辑

### 选择模式

- Shift+箭头：扩展选择
- Ctrl/Cmd+Click：多选
- Ctrl/Cmd+A：全选

## 焦点管理

### 焦点顺序

1. Grid容器
2. 列头
3. 单元格（从左到右，从上到下）
4. 行控制按钮
5. 工具栏按钮

### 焦点可见性

```css
/* Grid使用Tailwind的focus-visible */
.grid-cell:focus-visible {
  outline: 2px solid theme('colors.blue.500');
  outline-offset: -2px;
}
```

## 最佳实践

### ✅ 推荐

- 所有交互元素都可键盘访问
- 清晰的焦点指示器
- 语义化的ARIA标签
- 实时状态通知

### ⚠️ 避免

- 仅鼠标操作的功能
- 过度使用ARIA标签
- 焦点陷阱未正确释放
- 缺少焦点可见性样式

## 测试

### 键盘导航测试

```tsx
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('支持箭头键导航', async () => {
  const { container } = render(<Grid {...props} />);
  const grid = container.querySelector('[role="grid"]');

  grid?.focus();
  await userEvent.keyboard('{ArrowDown}');

  // 验证焦点移动
});
```

### ARIA标签测试

```tsx
test('Grid有正确的ARIA标签', () => {
  const { container } = render(<Grid {...props} />);
  const grid = container.querySelector('[role="grid"]');

  expect(grid).toHaveAttribute('aria-rowcount');
  expect(grid).toHaveAttribute('aria-colcount');
});
```

## 浏览器兼容性

- ✅ NVDA (Windows)
- ✅ JAWS (Windows)
- ✅ VoiceOver (macOS/iOS)
- ✅ TalkBack (Android)
- ✅ ChromeVox (Chrome)

## 相关标准

- [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Practices - Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [Section 508](https://www.section508.gov/)
