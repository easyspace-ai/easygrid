# EasyGrid Demo - 实时协作表格演示

基于新版SDK和Grid组件重构的实时协作表格演示应用。

## ✨ 特性

- 🚀 **高性能表格**: 基于Canvas渲染的Grid组件
- 🔄 **实时协作**: ShareDB协议实现多用户实时同步
- 🎣 **现代架构**: React Hooks + TypeScript
- 🎨 **优雅UI**: Tailwind CSS响应式设计
- 🛡️ **错误处理**: 完善的错误处理和重连机制
- 📱 **响应式**: 支持桌面端和移动端

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│  React 应用层                               │
│  - App.tsx (主应用)                         │
│  - LoginForm (登录表单)                     │
│  - TableDemo (表格演示)                     │
│  - ConnectionStatus (连接状态)              │
└──────────────┬──────────────────────────────┘
               │ React Hooks
               ▼
┌─────────────────────────────────────────────┐
│  业务逻辑层                                 │
│  - useAuth (认证管理)                       │
│  - useTableData (数据管理)                  │
│  - useRealtimeSync (实时同步)               │
└──────────────┬──────────────────────────────┘
               │ EasyGridSDK
               ▼
┌─────────────────────────────────────────────┐
│  SDK 层                                     │
│  - EasyGridSDK (统一客户端)                 │
│  - HTTP API 客户端                           │
│  - ShareDB 连接管理                          │
└──────────────┬──────────────────────────────┘
               │ HTTP + WebSocket
               ▼
┌─────────────────────────────────────────────┐
│  后端服务                                    │
│  - Go 服务器 (端口 2345)                     │
│  - ShareDB 实时同步                          │
│  - JWT 认证                                  │
└─────────────────────────────────────────────┘
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm
- Go 1.23+ (后端服务)

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 2. 启动后端服务

```bash
# 启动后端服务
cd server
go run cmd/server/main.go serve
```

后端服务将在 `http://localhost:2345` 启动。

### 3. 启动演示项目

```bash
# 启动 demo 项目
cd packages/aitable/demo-yjs
pnpm dev
```

演示项目将在 `http://localhost:3030` 启动。

## 📖 使用说明

### 1. 登录

1. 打开 `http://localhost:3030`
2. 使用演示账号登录：
   - 邮箱: `admin@126.com`
   - 密码: `Pmker123`

### 2. 表格操作

登录成功后，你将看到：

- **表格视图**: 高性能Canvas渲染的表格
- **工具栏**: 添加记录、添加字段、刷新等操作
- **连接状态**: 实时显示ShareDB连接状态
- **状态栏**: 显示字段和记录数量

### 3. 实时协作测试

1. **打开多个浏览器窗口**，都登录到同一个账号
2. **编辑任意单元格**，观察其他窗口的实时更新
3. **添加记录/字段**，验证实时同步
4. **查看连接状态**，确认ShareDB连接正常

## 🔧 配置说明

### 环境配置

在 `src/config.ts` 中配置：

```typescript
export const config = {
  // API 配置
  baseURL: 'http://localhost:2345',
  wsUrl: 'ws://localhost:2345/socket',
  
  // 测试账户
  testCredentials: {
  email: 'admin@126.com',
  password: 'Pmker123'
  },
  
  // 测试表格
  testTable: {
    spaceId: 'spc_rtpLk96gJHLeYTv7JJMlo',
    baseId: '7ec1e878-91b9-4c1b-ad86-05cdf801318f',
    tableId: 'tbl_Pweb3NpbtiUb4Fwbi90WP'
  }
}
```

### Grid 配置

```typescript
grid: {
  rowHeight: 32,        // 行高
  columnWidth: 150,     // 列宽
  freezeColumnCount: 1  // 冻结列数
}
```

### ShareDB 配置

```typescript
sharedb: {
  reconnect: {
    maxRetries: 10,           // 最大重试次数
    retryDelay: 1000,         // 重试延迟
    exponentialBackoff: true  // 指数退避
  },
  heartbeat: {
    interval: 30000,  // 心跳间隔
    timeout: 10000    // 心跳超时
  }
}
```

## 🎯 核心功能

### 认证管理

```typescript
const { isLoggedIn, user, login, logout, sdk } = useAuth()

// 登录
await login(email, password)

// 登出
logout()
```

### 数据管理

```typescript
const { fields, records, addRecord, updateRecord, addField } = useTableData(sdk, tableId)

// 添加记录
await addRecord({ name: 'New Record', value: 123 })

// 更新记录
await updateRecord(recordId, { name: 'Updated' })

// 添加字段
await addField({ name: 'New Field', type: 'text' })
```

### 实时同步

```typescript
const { state, subscribeToRecord, updateRecordField } = useRealtimeSync(sdk)

// 订阅记录更新
subscribeToRecord(recordId, (data) => {
  console.log('记录更新:', data)
})

// 更新字段
await updateRecordField(recordId, fieldId, newValue)
```

## 🧪 测试

### 单用户测试

1. 登录并查看表格数据
2. 编辑单元格内容
3. 添加新记录
4. 添加新字段
5. 验证数据持久化

### 多用户测试

参考 [MULTI_USER_TEST.md](./MULTI_USER_TEST.md) 进行多用户实时协作测试。

## 🐛 故障排除

### 常见问题

1. **登录失败**
   - 检查 `config.baseURL` 是否正确
   - 确认后端服务是否运行
   - 验证用户凭据

2. **数据加载失败**
   - 检查 `config.testTable.tableId` 是否正确
   - 确认表格是否存在
   - 检查网络连接

3. **实时协作不工作**
   - 检查WebSocket连接状态
   - 确认ShareDB配置正确
   - 查看浏览器控制台错误

4. **构建失败**
   - 运行 `pnpm install` 重新安装依赖
   - 检查Node.js版本是否兼容
   - 确认TypeScript配置正确

### 调试技巧

1. **启用调试模式**
```typescript
const config = {
     debug: true  // 启用详细日志
   }
   ```

2. **查看控制台日志**
   - 所有操作都有详细的日志输出
   - 错误信息会显示在控制台

3. **网络面板**
   - 检查API请求是否成功
   - 确认WebSocket连接状态

## 📊 性能指标

- **构建时间**: ~3.7秒
- **包大小**: 
  - 总大小: ~1.2MB
  - Gzip后: ~300KB
- **运行时性能**:
  - 连接建立: < 2秒
  - 同步延迟: < 1秒
  - 内存使用: 合理范围内

## 🔄 版本历史

### v2.0.0 (当前版本)
- ✅ 完全重构基于新版SDK
- ✅ 集成Grid组件
- ✅ ShareDB实时协作
- ✅ 现代化UI设计
- ✅ 完善的错误处理

### v1.0.0 (旧版本)
- ❌ 基于旧版SDK
- ❌ 自定义WebSocket实现
- ❌ HTML表格渲染

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题，请提交Issue或联系开发团队。

---

**EasyGrid Demo v2.0.0** - 现代化的实时协作表格演示应用 🚀