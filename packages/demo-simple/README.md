# EasyGrid Simple Demo

一个极简但功能完整的 EasyGrid SDK 演示项目，展示登录认证、数据展示和实时编辑功能。

## 功能特性

- ✅ **简单登录** - 使用 SDK 的 `login()` 方法，自动处理 WebSocket 连接
- ✅ **数据展示** - 清晰的字段信息和记录列表视图
- ✅ **实时编辑** - 点击字段值进行编辑，失焦自动保存
- ✅ **连接状态** - 实时显示 WebSocket 连接状态
- ✅ **错误处理** - 完善的错误边界和用户友好的错误提示
- ✅ **本地存储** - 自动保存登录状态，刷新页面无需重新登录

## 技术架构

- **React 18** - 现代化的 React 开发
- **TypeScript** - 类型安全的开发体验
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Vite** - 快速的构建工具
- **EasyGrid SDK** - 核心功能 SDK

## 快速开始

### 1. 启动后端服务

```bash
cd server
go run cmd/server/main.go serve
```

### 2. 安装依赖

```bash
cd packages/demo-simple
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 访问应用

打开浏览器访问：http://localhost:3050

## 使用说明

1. **登录** - 使用默认账号 `admin@126.com` / `Pmker123`
2. **查看数据** - 登录后自动加载字段信息和记录数据
3. **编辑数据** - 点击任意字段值进行编辑
4. **保存更改** - 按 Enter 键或失焦自动保存
5. **取消编辑** - 按 Escape 键取消编辑

## 项目结构

```
packages/demo-simple/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx    # 错误边界组件
│   │   ├── LoginForm.tsx        # 登录表单
│   │   └── DataList.tsx        # 数据列表
│   ├── App.tsx                  # 主应用组件
│   ├── main.tsx                # 应用入口
│   └── index.css               # 全局样式
├── package.json                # 项目配置
├── vite.config.ts             # Vite 配置
├── tailwind.config.js         # Tailwind 配置
└── README.md                  # 项目文档
```

## 核心组件

### App.tsx
- 管理全局状态（登录状态、用户信息、SDK 实例）
- 处理本地存储的登录状态恢复
- 提供 EasyGridProvider 上下文

### LoginForm.tsx
- 简洁的登录界面
- 集成 SDK 的 `login()` 方法
- 完善的错误处理和加载状态

### DataList.tsx
- 使用 `useEasyGrid` hook 获取数据
- 字段信息卡片展示
- 可编辑的记录列表
- 实时连接状态指示器

### ErrorBoundary.tsx
- React 错误边界
- 友好的错误页面
- 一键重新加载功能

## 开发说明

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 故障排除

### WebSocket 连接失败
- 确保后端服务正在运行（端口 8080）
- 检查网络连接
- 查看浏览器控制台的错误信息

### 登录失败
- 确认使用正确的账号密码
- 检查后端服务是否正常
- 查看网络请求是否成功

### 数据加载失败
- 确认已成功登录
- 检查 WebSocket 连接状态
- 查看浏览器控制台的错误信息

## 技术亮点

1. **极简架构** - 代码量减少 50%，易于理解和维护
2. **错误优先** - 完善的错误处理，不会出现白屏
3. **类型安全** - 完整的 TypeScript 类型支持
4. **用户体验** - 清晰的界面和流畅的交互
5. **实时同步** - 基于 WebSocket 的实时数据同步

## 与 demo-new-sdk 的对比

| 特性 | demo-simple | demo-new-sdk |
|------|-------------|--------------|
| 代码量 | ~400 行 | ~800 行 |
| 架构复杂度 | 简单 | 复杂 |
| 错误处理 | 完善 | 基础 |
| 维护性 | 高 | 中等 |
| 功能完整性 | 完整 | 完整 |
| 学习成本 | 低 | 高 |

这个简单演示项目展示了如何使用 EasyGrid SDK 快速构建一个功能完整的实时协作应用。
