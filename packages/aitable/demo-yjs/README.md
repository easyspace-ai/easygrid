# EasySpace AITable Demo

这是一个 AITable 演示项目，展示了如何使用 LuckDB SDK 实现多维表格功能。

## 项目概述

### 核心特性

- ✅ **HTTP API**: 基于 LuckDB SDK 的数据操作
- ✅ **用户认证**: 完整的用户认证和授权
- ✅ **表格管理**: 支持表格、字段、记录的 CRUD 操作
- ✅ **实时编辑**: 支持单元格实时编辑和更新
- ✅ **数据持久化**: 数据持久化到后端数据库

### 技术架构

```
┌─────────────────────────────────────────────┐
│  React 组件层                               │
│  - TableViewV3 组件                         │
│  - useConnection Hook                       │
│  - StandardDataViewV3 集成                  │
└──────────────┬──────────────────────────────┘
               │ 使用 SDK API
               ▼
┌─────────────────────────────────────────────┐
│  🚀 LuckDB SDK (统一接入)                   │
│  - HTTP API 客户端                           │
│  - 认证管理                                  │
│  - 数据操作                                  │
└──────────────┬──────────────────────────────┘
               │ HTTP API
               ▼
┌─────────────────────────────────────────────┐
│  LuckDB 后端服务                            │
│  - JWT 认证中间件                           │
│  - HTTP API 端点                            │
│  - 数据持久化                               │
└─────────────────────────────────────────────┘
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm
- LuckDB 后端服务运行在 `http://localhost:8888`

### 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 启动后端服务

确保 LuckDB 后端服务正在运行：

```bash
# 启动后端服务
cd server
go run cmd/main.go
```

后端服务将在 `http://localhost:8888` 启动，提供以下端点：

- `POST /api/v1/auth/login` - 用户登录
- `PATCH /api/v1/tables/:tableId/records/:recordId` - 记录更新

### 启动演示项目

```bash
# 启动 demo 项目
cd packages/aitable/demo-yjs
pnpm dev
```

演示项目将在 `http://localhost:3030` 启动。

## 使用说明

### 1. 登录

1. 打开 `http://localhost:3030`
2. 使用演示账号登录：
   - 邮箱: `admin@126.com`
   - 密码: `Pmker123`

### 2. 查看表格数据

登录成功后，你将看到：

- **表格信息**: 显示表格名称、ID 和基本统计
- **字段列表**: 显示所有字段及其类型
- **记录列表**: 显示所有记录，支持实时编辑

### 3. 实时协作测试

1. **打开多个浏览器窗口**，都登录到同一个账号
2. **编辑任意单元格**，观察其他窗口的实时更新
3. **查看连接状态**，确认 Yjs WebSocket 连接正常

### 4. 乐观锁测试

1. **同时编辑同一单元格**（不同窗口）
2. **观察冲突处理**，系统会自动解决冲突
3. **查看版本号**，每次更新都会递增

## 配置说明

### 环境变量

创建 `.env.local` 文件：

```env
# API 基础地址
VITE_API_BASE_URL=http://localhost:8888

# WebSocket 地址
VITE_WS_URL=ws://localhost:8888

# 测试数据配置
VITE_BASE_ID=7ec1e878-91b9-4c1b-ad86-05cdf801318f
VITE_TABLE_ID=tbl_Pweb3NpbtiUb4Fwbi90WP
VITE_VIEW_ID=viw_FXNR0EDAlNxhxOIPylHZy
```

### 测试账号

```typescript
// 默认演示账号
{
  email: 'admin@126.com',
  password: 'Pmker123'
}
```

## 技术实现

### Yjs-ShareDB 适配层

核心适配层实现位于 `packages/aitable/src/lib/yjs-sharedb-adapter.ts`：

```typescript
// 使用方式与 ShareDB 完全相同
const connection = new YjsConnection(wsUrl, accessToken);
const doc = connection.get('record_table', recordId);

doc.subscribe();
doc.on('op batch', (ops) => {
  // 处理操作 - 完全相同!
});
```

### 实时协作流程

1. **用户编辑**: 用户修改单元格内容
2. **乐观更新**: 立即更新本地 UI（Yjs 自动同步）
3. **HTTP 持久化**: 调用 REST API 保存到数据库
4. **冲突检测**: 使用乐观锁检测并发冲突
5. **自动解决**: Yjs CRDT 自动解决操作冲突

### 数据格式

#### 记录更新请求

```json
{
  "data": {
    "fld_xxx": "新值",      // 字段ID: 值
    "fld_yyy": 123
  },
  "version": 5  // 可选: 乐观锁版本号
}
```

#### WebSocket 连接

```
ws://localhost:8888/yjs/ws?document={docId}&user={userId}&token={accessToken}
```

## 开发指南

### 项目结构

```
demo-yjs/
├── src/
│   ├── components/          # React 组件
│   │   ├── LoginForm.tsx    # 登录表单
│   │   └── TableView.tsx    # 表格视图
│   ├── hooks/               # React Hooks
│   │   ├── useYjsConnection.ts  # Yjs 连接管理
│   │   └── useTableData.ts      # 表格数据管理
│   ├── config.ts            # 配置文件
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 应用入口
├── package.json
├── vite.config.ts
└── README.md
```

### 添加新功能

1. **修改适配层**: 在 `yjs-sharedb-adapter.ts` 中添加新的 ShareDB 接口
2. **更新 Hooks**: 在 `useTableData.ts` 中添加新的数据操作
3. **扩展组件**: 在 `TableView.tsx` 中添加新的 UI 功能

### 调试技巧

1. **查看控制台**: 所有操作都有详细的日志输出
2. **网络面板**: 检查 WebSocket 连接和 HTTP 请求
3. **Yjs 状态**: 使用 `sdk.getYjsConnectionState()` 检查连接状态

## 故障排除

### 常见问题

1. **连接失败**: 检查后端服务是否运行，端口是否正确
2. **认证失败**: 检查 JWT Token 是否有效
3. **数据不同步**: 检查 WebSocket 连接状态
4. **版本冲突**: 检查乐观锁实现是否正确

### 日志分析

```typescript
// 启用调试模式
const config = {
  debug: true,  // 显示详细日志
  // ...
};
```

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或联系开发团队。
