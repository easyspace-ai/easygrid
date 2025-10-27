# @easyspace/sdk

一个功能强大的 TypeScript SDK，用于与 EasySpace 协作数据库平台进行交互。该 SDK 提供了类似 Airtable SDK 的 API 设计，支持完整的 CRUD 操作、实时协作、高级查询等功能。

## 特性

- 🚀 **完整的 API 覆盖** - 支持所有 EasySpace 平台功能
- 🔄 **实时协作** - 基于 ShareDB 的 WebSocket 实时数据同步
- 👥 **协作者管理** - 完整的 Space 和 Base 协作者管理功能
- ⚙️ **用户配置** - 用户个性化设置和偏好管理
- 📊 **多种视图类型** - 网格、表单、看板、日历、画廊视图
- 🔍 **高级查询** - 复杂查询、聚合、搜索功能
- 🛡️ **类型安全** - 完整的 TypeScript 类型定义
- 🔧 **易于使用** - 类似 Airtable SDK 的 API 设计
- 📦 **模块化** - 按功能模块组织，按需使用
- 🎯 **错误处理** - 完善的错误处理和重试机制
- ⚡ **ShareDB 集成** - 内置 ShareDB 客户端，支持实时协作和在线状态

## 安装

```bash
bun add @easyspace/sdk
# 或
npm install @easyspace/sdk
```

## 快速开始

### 前置条件

1. 启动 EasySpace 服务器
   ```bash
   cd server
   ./bin/easyspace serve
   ```

2. 初始化测试用户（首次使用）
   ```bash
   cd packages/sdk
   bun test:setup
   ```

### 基本使用

```typescript
import LuckDB from '@easyspace/sdk';

// 初始化 SDK
const sdk = new LuckDB({
  baseUrl: 'http://localhost:2345',  // 本地开发
  debug: true
});

// 用户登录
const authResponse = await sdk.auth.login({
  email: 'test@example.com',
  password: 'password123'
});

// 获取空间列表
const spaces = await sdk.spaces.list();

// 获取基础数据
const bases = await sdk.bases.list({ spaceId: spaces[0].id });

// 获取表数据
const tables = await sdk.tables.list({ baseId: bases[0].id });

// 获取记录
const records = await sdk.records.list({ 
  tableId: tables[0].id,
  pageSize: 10 
});

console.log('Records:', records);
```

### 实时协作

```typescript
// 连接 ShareDB 实时协作
await sdk.connectShareDB();

// 创建文档并订阅变更
const document = sdk.createDocument('table_123', 'record_456');
document.subscribe((event) => {
  console.log('Document changed:', event.type, event.data);
});

// 提交操作
document.submitOp([
  {
    p: ['name'],
    oi: 'New Record Name',
  },
]);

// 在线状态管理
const presence = sdk.createPresence('table_123', 'record_456');
presence.subscribe((presences) => {
  console.log('Online users:', presences);
});

// 更新光标位置
presence.updateCursor({ x: 100, y: 200 });
```

## API 参考

### 认证客户端

```typescript
// 用户登录
await sdk.auth.login({ email, password });

// 用户注册
await sdk.auth.register({ email, password, name });

// 获取当前用户
const user = await sdk.auth.getCurrentUser();

// 登出
await sdk.auth.logout();
```

### 空间管理

```typescript
// 创建空间
const space = await sdk.spaces.create({
  name: 'My Workspace',
  description: 'A collaborative workspace'
});

// 获取空间列表
const spaces = await sdk.spaces.list();

// 更新空间
await sdk.spaces.update(spaceId, { name: 'Updated Name' });

// 删除空间
await sdk.spaces.delete(spaceId);
```

### 基础数据管理

```typescript
// 创建基础数据
const base = await easyspace.bases.create({
  name: 'Project Database',
  spaceId: spaceId
});

// 获取基础数据列表
const bases = await easyspace.bases.list({ spaceId });

// 更新基础数据
await easyspace.bases.update(baseId, { name: 'Updated Base' });

// 删除基础数据
await sdk.bases.delete(baseId);
```

### 协作者管理

```typescript
// 空间协作者管理
// 添加空间协作者
const spaceCollaborator = await sdk.addSpaceCollaborator(spaceId, {
  userId: 'user123',
  role: 'editor'
});

// 列出空间协作者
const spaceCollaborators = await sdk.listSpaceCollaborators(spaceId);

// 更新空间协作者
await sdk.updateSpaceCollaborator(spaceId, collaboratorId, {
  role: 'viewer'
});

// 移除空间协作者
await sdk.removeSpaceCollaborator(spaceId, collaboratorId);

// 基础协作者管理
// 添加基础协作者
const baseCollaborator = await sdk.addBaseCollaborator(baseId, {
  userId: 'user456',
  role: 'editor'
});

// 列出基础协作者
const baseCollaborators = await sdk.listBaseCollaborators(baseId);

// 更新基础协作者
await sdk.updateBaseCollaborator(baseId, collaboratorId, {
  role: 'viewer'
});

// 移除基础协作者
await sdk.removeBaseCollaborator(baseId, collaboratorId);
```

### 用户配置

```typescript
// 获取用户配置
const userConfig = await sdk.getUserConfig();

// 更新用户配置
const updatedConfig = await sdk.updateUserConfig({
  theme: 'dark',
  language: 'zh-CN',
  notifications: {
    email: true,
    push: false
  },
  preferences: {
    autoSave: true,
    showGridlines: true
  }
});
```

### 表管理

```typescript
// 创建表
const table = await sdk.tables.create({
  name: 'Tasks',
  baseId: baseId
});

// 获取表列表
const tables = await sdk.tables.list({ baseId });

// 更新表
await sdk.tables.update(tableId, { name: 'Updated Table' });

// 重命名表
await sdk.tables.renameTable(tableId, { name: 'New Table Name' });

// 复制表
const duplicatedTable = await sdk.tables.duplicateTable(tableId, {
  name: 'Copied Table'
});

// 获取表统计
const tableStats = await sdk.tables.getTableStats(tableId);

// 删除表
await sdk.tables.delete(tableId);
```

### 字段管理

```typescript
// 创建字段
const field = await easyspace.fields.create({
  name: 'Status',
  type: 'select',
  tableId: tableId,
  options: {
    choices: [
      { name: 'Todo', color: 'blue' },
      { name: 'In Progress', color: 'yellow' },
      { name: 'Done', color: 'green' }
    ]
  }
});

// 获取字段列表
const fields = await easyspace.fields.list({ tableId });

// 更新字段
await easyspace.fields.update(fieldId, { name: 'Updated Field' });

// 删除字段
await easyspace.fields.delete(fieldId);
```

### 记录操作

```typescript
// 创建记录
const record = await easyspace.records.create({
  tableId: tableId,
  data: {
    'Name': 'Task 1',
    'Status': 'Todo',
    'Due Date': new Date()
  }
});

// 获取记录列表
const records = await easyspace.records.list({ 
  tableId,
  pageSize: 50,
  sort: [{ field: 'Created Time', direction: 'desc' }]
});

// 更新记录
await easyspace.records.update(recordId, {
  data: { 'Status': 'In Progress' }
});

// 删除记录
await easyspace.records.delete(recordId);
```

### 视图管理

```typescript
// 创建视图
const view = await easyspace.views.create({
  name: 'Kanban View',
  type: 'kanban',
  tableId: tableId,
  config: {
    groupBy: 'Status',
    groupOrder: ['Todo', 'In Progress', 'Done']
  }
});

// 获取视图列表
const views = await easyspace.views.list({ tableId });

// 更新视图
await easyspace.views.update(viewId, { name: 'Updated View' });

// 删除视图
await easyspace.views.delete(viewId);
```

## YJS 实时协作

SDK 内置了强大的 YJS 实时协作功能，支持多用户实时编辑、冲突解决和离线同步。

### 基本概念

- **YjsClient**: 管理 WebSocket 连接和文档同步
- **YjsRecord**: 封装单个记录的实时操作
- **DocumentManager**: 管理多个文档的生命周期

### 连接 YJS

```typescript
// 登录后自动连接 YJS
await easyspace.login({ email, password });

// 手动连接 YJS（可选）
await easyspace.connectYJS();

// 检查连接状态
const isConnected = easyspace.isYJSConnected();
console.log('YJS 连接状态:', isConnected);
```

### 实时记录操作

```typescript
// 获取记录实例
const record = easyspace.getYjsRecord(tableId, recordId);

// 读取字段值
const value = record.getCellValue('Name');

// 更新字段值（乐观更新）
await record.updateCell('Name', 'New Value');

// 批量更新
await record.batchUpdateCells({
  'Name': 'Task 1',
  'Status': 'In Progress',
  'Priority': 'High'
});

// 订阅字段变化
const unsubscribe = record.subscribeField('Name', (newValue) => {
  console.log('Name 字段更新为:', newValue);
});

// 订阅记录变化
const unsubscribeRecord = record.subscribe((changes) => {
  console.log('记录变化:', changes);
});

// 清理订阅
unsubscribe();
unsubscribeRecord();
```

### 高级功能

```typescript
// 获取记录统计信息
const stats = record.getStats();
console.log('待同步变更:', stats.pendingChanges);

// 手动同步到服务器
await record.sync();

// 检查是否有待同步的变更
if (record.hasPendingChanges()) {
  console.log('有未同步的变更');
}

// 获取连接统计
const connectionStats = easyspace.getYJSConnectionStats();
console.log('连接状态:', connectionStats);
```

### 错误处理和重连

```typescript
// 监听连接状态变化
easyspace.on('yjs:connected', () => {
  console.log('YJS 已连接');
});

easyspace.on('yjs:disconnected', () => {
  console.log('YJS 连接断开');
});

easyspace.on('yjs:error', (error) => {
  console.error('YJS 错误:', error);
});

// 强制重连
await easyspace.forceReconnectYJS();
```

### 最佳实践

1. **统一接入**: 所有客户端必须通过 SDK 使用 YJS，不要直接使用 y-websocket
2. **错误处理**: 监听连接状态变化，处理断线重连
3. **性能优化**: 使用批量更新减少网络请求
4. **内存管理**: 及时清理不需要的订阅和记录实例

## 高级功能

### 查询和过滤

```typescript
// 复杂查询
const records = await easyspace.records.list({
  tableId,
  filter: {
    and: [
      { field: 'Status', operator: 'equals', value: 'Todo' },
      { field: 'Priority', operator: 'greater_than', value: 3 }
    ]
  },
  sort: [
    { field: 'Priority', direction: 'desc' },
    { field: 'Created Time', direction: 'asc' }
  ]
});
```

### 批量操作

```typescript
// 批量创建记录
const records = await easyspace.records.batchCreate({
  tableId,
  records: [
    { data: { 'Name': 'Task 1', 'Status': 'Todo' } },
    { data: { 'Name': 'Task 2', 'Status': 'Todo' } },
    { data: { 'Name': 'Task 3', 'Status': 'Todo' } }
  ]
});

// 批量更新记录
await easyspace.records.batchUpdate({
  tableId,
  updates: [
    { recordId: 'rec1', data: { 'Status': 'Done' } },
    { recordId: 'rec2', data: { 'Status': 'Done' } }
  ]
});
```

## 开发

### 运行测试

```bash
# 运行所有测试
bun test:all

# 运行特定测试
bun test:auth
bun test:space
bun test:record
bun test:view
```

### 构建

```bash
# 构建 SDK
bun build

# 开发模式（监听文件变化）
bun dev
```

### 代码检查

```bash
# 运行 ESLint
bun lint

# 修复 ESLint 错误
bun lint:fix
```

## 贡献

我们欢迎贡献！请查看我们的 [CONTRIBUTING.md](../../CONTRIBUTING.md) 文件了解如何参与开发。

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如果您遇到任何问题或有任何问题，请：

1. 查看 [文档](https://github.com/easyspace-ai/easyspace/tree/main/packages/sdk#readme)
2. 在 [GitHub Issues](https://github.com/easyspace-ai/easyspace/issues) 中报告问题
3. 加入我们的社区讨论

---

**EasySpace SDK** - 让协作数据库开发变得简单而强大。