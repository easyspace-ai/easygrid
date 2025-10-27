# @easygrid/aitable

一个现代化的 Airtable 风格的表格组件库，专为 EasyGrid 项目设计。

## 特性

- 🚀 高性能网格渲染
- 📊 多种视图类型支持（网格、看板、日历等）
- 🔧 灵活的字段配置
- 🎨 现代化设计系统
- 📱 响应式设计
- ♿ 无障碍支持
- 🔄 实时协作

## 安装

```bash
npm install @easygrid/aitable
```

## 快速开始

```tsx
import { StandardDataView } from '@easygrid/aitable';
import '@easygrid/aitable/dist/index.css';

function App() {
  return (
    <StandardDataView
      tableId="your-table-id"
      baseId="your-base-id"
      // 其他配置...
    />
  );
}
```

## 组件

### 核心组件

- `StandardDataView` - 主要的数据视图组件
- `ViewHeader` - 视图头部
- `ViewToolbar` - 工具栏
- `AddRecordDialog` - 添加记录对话框

### 字段配置

- `AddFieldDialog` - 添加字段对话框
- `EditFieldDialog` - 编辑字段对话框
- `FieldConfigPanel` - 字段配置面板

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run typecheck

# 测试
npm run test
```

## 许可证

MIT
