# EasyGrid SDK

一个基于 React + TypeScript 的实时协同数据库 SDK，参考 Teable 架构设计，提供优雅的 Hooks API 和强大的实时同步能力。

## ✨ 特性

- 🚀 **实时同步**: 基于 ShareDB 的实时协同编辑
- 🎣 **Hooks 优先**: 40+ React Hooks，声明式 API
- 🔄 **自动重连**: 智能重连机制，指数退避策略
- 📦 **类型安全**: 完整的 TypeScript 类型定义
- 🎨 **易于集成**: 一个 Provider 搞定所有配置
- ⚡ **性能优化**: 查询缓存、文档复用、自动清理
- 🛡️ **错误处理**: 细粒度错误分类，自动恢复机制

## 📦 安装

```bash
npm install @easygrid/sdk
# 或
yarn add @easygrid/sdk
# 或
pnpm add @easygrid/sdk
```

## 🚀 快速开始

### 1. 基础用法

```tsx
import React from 'react'
import { EasyGridProvider, useRecords, useRecordMutation } from '@easygrid/sdk'

function App() {
  return (
    <EasyGridProvider
      config={{
        wsUrl: 'ws://localhost:2345/socket',
        accessToken: 'your-token',
        debug: true
      }}
    >
      <RecordList tableId="tbl_123" />
    </EasyGridProvider>
  )
}

function RecordList({ tableId }: { tableId: string }) {
  const { records, loading, error } = useRecords(tableId)
  const { updateCell, isUpdating } = useRecordMutation(tableId, 'rec_1')

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {records.map(record => (
        <div key={record.id}>
          <input
            value={record.fields?.name || ''}
            onChange={(e) => updateCell('name', e.target.value)}
            disabled={isUpdating}
          />
        </div>
      ))}
    </div>
  )
}
```

### 2. 连接状态管理

```tsx
import { useConnection, ConnectionIndicator } from '@easygrid/sdk'

function ConnectionStatus() {
  const { state, retryCount, reconnect } = useConnection()

  return (
    <div>
      <ConnectionIndicator />
      <p>状态: {state}</p>
      <p>重试次数: {retryCount}</p>
      <button onClick={reconnect}>手动重连</button>
    </div>
  )
}
```

### 3. 批量操作

```tsx
import { useBatchUpdate } from '@easygrid/sdk'

function BatchEditor({ tableId, recordIds }: { tableId: string; recordIds: string[] }) {
  const { batchUpdate, isUpdating, progress } = useBatchUpdate(tableId)

  const handleBatchUpdate = async () => {
    const updates = recordIds.map(recordId => ({
      recordId,
      changes: { status: 'completed' }
    }))

    await batchUpdate(updates)
  }

  return (
    <div>
      <button onClick={handleBatchUpdate} disabled={isUpdating}>
        批量更新 ({recordIds.length} 条记录)
      </button>
      
      {isUpdating && (
        <div>更新进度: {progress.toFixed(1)}%</div>
      )}
    </div>
  )
}
```

## 🎣 Hooks API

### 连接相关

- `useConnection()` - 连接状态和操作
- `useConnectionState()` - 简化的连接状态
- `useReconnect()` - 重连控制

### 文档相关

- `useRecord(tableId, recordId)` - 单条记录
- `useRecords(tableId, query?)` - 多条记录
- `useField(tableId, fieldId)` - 单个字段
- `useFields(tableId)` - 多个字段
- `useView(tableId, viewId)` - 单个视图
- `useViews(tableId)` - 多个视图
- `useTable(tableId)` - 单个表格
- `useTables()` - 多个表格

### 变更操作

- `useRecordMutation(tableId, recordId)` - 记录变更
- `useFieldMutation(tableId, fieldId)` - 字段变更
- `useBatchUpdate(tableId)` - 批量更新

### 高级查询

- `useTableData(tableId)` - 表格全量数据
- `useInfiniteRecords(tableId, query)` - 无限滚动
- `useSearch(tableId, query)` - 搜索功能

### 在线状态

- `usePresence(tableId)` - 在线状态
- `useCollaborators(tableId)` - 协作者列表

## 🔧 配置选项

```tsx
<EasyGridProvider
  config={{
    wsUrl: 'ws://localhost:2345/socket',
    accessToken: 'your-token',
    debug: true,
    reconnect: {
      maxRetries: 10,
      retryDelay: 1000,
      exponentialBackoff: true
    },
    heartbeat: {
      interval: 10000,
      timeout: 30000
    }
  }}
  errorHandler={(error) => console.error(error)}
  onConnected={() => console.log('Connected!')}
  onDisconnected={() => console.log('Disconnected!')}
  onStateChange={(state) => console.log('State:', state)}
>
  {children}
</EasyGridProvider>
```

## 🎨 组件

### ConnectionIndicator

连接状态指示器组件：

```tsx
<ConnectionIndicator 
  showRetryButton={true}
  showStatusText={true}
  className="my-connection-indicator"
/>
```

## 🔄 状态管理

SDK 内部使用状态机管理连接状态：

- `idle` - 空闲状态
- `connecting` - 连接中
- `connected` - 已连接
- `reconnecting` - 重连中
- `error` - 错误状态
- `disconnected` - 已断开

## 🛡️ 错误处理

SDK 提供细粒度的错误分类：

- **认证错误**: `UNAUTHORIZED`, `TOKEN_EXPIRED`
- **权限错误**: `PERMISSION_DENIED`, `ACCESS_DENIED`
- **网络错误**: `NETWORK_ERROR`, `CONNECTION_LOST`
- **操作错误**: `OPERATION_TIMEOUT`, `VERSION_MISMATCH`
- **服务器错误**: `SERVER_ERROR`, `SERVER_OVERLOADED`

## ⚡ 性能优化

- **查询缓存**: 自动缓存查询结果，避免重复请求
- **文档复用**: 智能管理文档生命周期，自动清理
- **批量操作**: 支持批量更新，减少网络请求
- **连接池**: 复用 WebSocket 连接，提高效率

## 🔍 调试

启用调试模式：

```tsx
<EasyGridProvider
  config={{
    wsUrl: 'ws://localhost:2345/socket',
    debug: true // 启用调试日志
  }}
>
  {children}
</EasyGridProvider>
```

## 📚 示例

查看 `src/examples/usage.tsx` 获取更多使用示例。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License