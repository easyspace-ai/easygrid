# Dice UI Data Grid Demo

这是一个基于 Dice UI Data Grid 组件的演示项目，展示了高性能的可编辑数据表格，具有虚拟化、键盘导航和单元格编辑功能。

## 功能特性

- **虚拟化渲染**: 使用 `@tanstack/react-virtual` 优化大数据集性能
- **单元格编辑**: 支持多种单元格类型（文本、数字、选择、复选框、日期等）
- **键盘导航**: 完整的方向键、Tab、Enter 导航支持
- **搜索功能**: 实时搜索和结果高亮
- **排序和筛选**: 列排序和可见性控制
- **行高调整**: 紧凑、正常、舒适三种行高模式
- **类型安全**: 完整的 TypeScript 类型定义

## 演示数据

项目使用滑板技巧数据作为演示，包含以下字段：
- 招式名称 (Trick name)
- 滑手 (Skater)
- 难度 (Difficulty)
- 类别 (Category)
- 是否成功 (Landed)
- 尝试次数 (Attempts)
- 得分 (Score)
- 地点 (Location)
- 尝试日期 (Attempted at)

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **TanStack Table v8** - 表格状态管理
- **TanStack Virtual** - 虚拟化
- **Radix UI** - 无障碍 UI 组件
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库
- **Faker.js** - 测试数据生成

## 安装和运行

1. 在项目根目录安装依赖：
```bash
pnpm install
```

2. 进入演示项目目录：
```bash
cd packages/demo-dice-grid
```

3. 启动开发服务器：
```bash
pnpm dev
```

4. 访问 `http://localhost:3060` 查看演示

## 使用方法

### 基本操作
- **点击单元格**: 聚焦到该单元格
- **双击单元格**: 进入编辑模式
- **方向键**: 在单元格间导航
- **Enter**: 保存编辑或进入编辑模式
- **Escape**: 取消编辑或清除焦点
- **Tab**: 移动到下一个单元格

### 搜索功能
- **Ctrl+F**: 打开搜索框
- **Enter**: 跳转到下一个匹配项
- **Shift+Enter**: 跳转到上一个匹配项
- **Escape**: 关闭搜索框

### 工具栏功能
- **搜索**: 实时搜索表格内容
- **排序**: 按列排序数据
- **行高**: 调整行高（紧凑/正常/舒适）
- **视图**: 控制列的显示/隐藏
- **快捷键**: 查看所有键盘快捷键

## 项目结构

```
src/
├── main.tsx                 # 应用入口
├── App.tsx                  # 主应用组件
├── index.css               # 全局样式
├── lib/
│   └── utils.ts            # 工具函数
├── components/
│   ├── ui/                 # shadcn/ui 基础组件
│   └── data-grid/          # Data Grid 组件
│       ├── data-grid.tsx
│       ├── data-grid-cell.tsx
│       ├── data-grid-cell-wrapper.tsx
│       ├── data-grid-cell-variants/
│       │   ├── short-text-cell.tsx
│       │   ├── long-text-cell.tsx
│       │   ├── number-cell.tsx
│       │   ├── select-cell.tsx
│       │   ├── multi-select-cell.tsx
│       │   ├── checkbox-cell.tsx
│       │   └── date-cell.tsx
│       ├── data-grid-column-header.tsx
│       ├── data-grid-row.tsx
│       ├── data-grid-search.tsx
│       ├── data-grid-sort-menu.tsx
│       ├── data-grid-row-height-menu.tsx
│       ├── data-grid-view-menu.tsx
│       └── data-grid-keyboard-shortcuts.tsx
├── hooks/
│   └── use-data-grid.ts    # Data Grid Hook
└── types/
    └── data-grid.ts        # 类型定义
```

## 自定义单元格类型

你可以通过实现 `DataGridCellVariantProps` 接口来创建自定义单元格类型：

```typescript
import { DataGridCellWrapper } from "@/components/data-grid/data-grid-cell-wrapper"
import type { DataGridCellVariantProps } from "@/types/data-grid"

export function CustomCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: DataGridCellVariantProps<TData>) {
  const value = cell.getValue() as YourType
  
  return (
    <DataGridCellWrapper
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
    >
      {/* 你的自定义单元格内容 */}
    </DataGridCellWrapper>
  )
}
```

## 性能优化

- **虚拟化**: 只渲染可见的行和列
- **防抖更新**: 单元格编辑使用防抖来避免过度重渲染
- **记忆化**: 列定义和数据应该被记忆化
- **懒加载**: 考虑为大数据集实现服务端分页

## 无障碍支持

Data Grid 遵循 WAI-ARIA 网格组件指南：
- 完整的键盘导航支持
- 屏幕阅读器对单元格变化的播报
- 编辑时的焦点管理
- 适当的 ARIA 标签和角色
- 高对比度模式支持

## 致谢

- [TanStack Table](https://tanstack.com/table) - 表格状态管理
- [shadcn/ui](https://ui.shadcn.com) - UI 组件
- [Dice UI](https://www.diceui.com) - Data Grid 组件设计灵感
- [Airtable](https://airtable.com) 和 [Glide Data Grid](https://grid.glideapps.com) - 设计灵感


