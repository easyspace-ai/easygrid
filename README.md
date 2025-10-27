# EasyGrid

Next-generation collaborative database platform built with modern web technologies.

## 项目结构

```
easygrid/
├── packages/          # 共享包
│   ├── aitable/      # Airtable-like 组件库
│   └── sdk/          # TypeScript SDK
├── apps/             # 应用程序
└── server/           # Go 后端服务
```

## 技术栈

- **包管理**: pnpm workspace
- **构建工具**: Turbo
- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Go
- **数据库**: SQLite/PostgreSQL
- **实时协作**: WebSocket + Y.js

## 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Go >= 1.21

### 安装依赖

```bash
# 安装所有依赖
pnpm install

# 或者使用 pnpm 的别名
pnpm i
```

### 开发命令

```bash
# 启动所有包的开发模式
pnpm dev

# 构建所有包
pnpm build

# 运行所有测试
pnpm test

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 类型检查
pnpm check-types

# 清理所有构建产物
pnpm clean:all
```

### 包特定命令

```bash
# 只运行 aitable 包的开发模式
pnpm --filter @easygrid/aitable dev

# 只构建 sdk 包
pnpm --filter @easygrid/sdk build

# 运行特定包的测试
pnpm --filter @easygrid/aitable test
```

## 包说明

### @easygrid/aitable

Airtable-like 的 React 组件库，提供：

- 数据表格组件
- 字段类型支持
- 实时协作
- 可访问性支持

### @easygrid/sdk

TypeScript SDK，提供：

- 数据操作 API
- 实时同步
- 类型安全
- 错误处理

## 开发流程

1. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **开发**
   ```bash
   pnpm dev
   ```

3. **测试**
   ```bash
   pnpm test
   pnpm lint
   pnpm check-types
   ```

4. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

## 发布流程

```bash
# 创建变更集
pnpm changeset

# 版本更新
pnpm version-packages

# 发布
pnpm release
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
