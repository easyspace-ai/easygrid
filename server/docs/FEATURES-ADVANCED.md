# 高级特性

## 🔄 实时协作

### WebSocket连接

LuckDB支持WebSocket实时通信，用于多用户协作编辑。

#### 连接方式

```javascript
const ws = new WebSocket('ws://localhost:8888/socket');

ws.onopen = () => {
  // 发送认证
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // 处理消息
};
```

#### ShareDB协议

LuckDB使用ShareDB协议进行协作编辑：

- **操作同步**: 实时同步编辑操作
- **冲突检测**: 自动检测和解决冲突
- **状态同步**: 同步文档状态

### SSE (Server-Sent Events)

支持SSE用于服务器推送事件：

```javascript
const eventSource = new EventSource('http://localhost:8888/api/realtime', {
  headers: {
    'Authorization': 'Bearer your-token'
  }
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // 处理实时更新
};
```

## 🔐 权限系统

### 权限层次

```
Space (空间权限)
  └── Base (Base权限)
        └── Table (表权限)
              └── Field (字段权限)
```

### 角色类型

- **Owner**: 所有者，拥有所有权限
- **Editor**: 编辑者，可以编辑数据
- **Viewer**: 查看者，只能查看数据
- **Commenter**: 评论者，可以添加评论

### 权限检查

所有API请求都会进行权限检查：

```go
// 检查表权限
if err := s.checkTablePermission(ctx, tableID, "read"); err != nil {
    return nil, err
}
```

### 协作者管理

#### 添加协作者

```bash
POST /api/v1/spaces/:spaceId/collaborators

{
  "userId": "user_123",
  "role": "editor"
}
```

#### 更新协作者

```bash
PATCH /api/v1/spaces/:spaceId/collaborators/:collaboratorId

{
  "role": "viewer"
}
```

#### 删除协作者

```bash
DELETE /api/v1/spaces/:spaceId/collaborators/:collaboratorId
```

## 🔌 扩展系统

### JavaScript插件系统

LuckDB支持JavaScript插件扩展功能。

#### 插件结构

```javascript
// plugin.js
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  init: function(context) {
    // 初始化插件
  },
  hooks: {
    'record:beforeCreate': function(record) {
      // 记录创建前钩子
      return record;
    }
  }
};
```

#### 加载插件

```bash
# 将插件文件放在 plugins/ 目录
plugins/
  └── my-plugin.js
```

### 业务钩子系统

支持在业务操作前后执行自定义逻辑。

#### 可用钩子

- `record:beforeCreate`: 记录创建前
- `record:afterCreate`: 记录创建后
- `record:beforeUpdate`: 记录更新前
- `record:afterUpdate`: 记录更新后
- `record:beforeDelete`: 记录删除前
- `record:afterDelete`: 记录删除后

#### 钩子实现

```javascript
// hooks/user_hooks.js
module.exports = {
  'record:beforeCreate': function(record, context) {
    // 自动设置创建者
    record.fields.created_by = context.userId;
    return record;
  }
};
```

## 🔗 MCP协议支持

### Model Context Protocol

LuckDB支持MCP协议，允许AI工具访问数据库。

#### MCP端点

- **HTTP**: `/api/mcp/v1`
- **SSE**: `/api/mcp/v1/sse`

#### 认证

MCP使用API Key认证：

```bash
# 生成API Key
./bin/luckdb mcp-api-key create --base-id base_123

# 使用API Key
curl -H "X-MCP-API-Key: your-api-key" \
  http://localhost:8888/api/mcp/v1/tools/list
```

#### 可用工具

- `list_bases`: 列出所有Base
- `list_tables`: 列出表格
- `list_records`: 列出记录
- `create_record`: 创建记录
- `update_record`: 更新记录
- `delete_record`: 删除记录

## 📊 计算引擎

### 虚拟字段计算

LuckDB提供强大的计算引擎，支持虚拟字段的实时计算。

#### 计算类型

- **Formula**: 公式计算
- **Lookup**: 查找计算
- **Rollup**: 汇总计算
- **Count**: 计数计算

#### 依赖解析

计算引擎自动解析字段依赖关系：

```
Formula Field A
  └── depends on Field B
        └── depends on Lookup Field C
              └── depends on Link Field D
```

#### 批量计算

支持批量计算优化性能：

```go
// 批量计算所有依赖字段
calculator.BatchCalculate(ctx, recordIDs, fieldIDs)
```

## 🗄️ 缓存策略

### 元数据缓存

- **Base元数据**: 缓存Base信息
- **Table元数据**: 缓存Table信息
- **Field元数据**: 缓存Field信息

### 查询结果缓存

- **记录查询**: 缓存常用查询结果
- **视图查询**: 缓存视图数据

### 计算缓存

- **公式结果**: 缓存公式计算结果
- **查找结果**: 缓存查找字段结果
- **汇总结果**: 缓存汇总字段结果

## 📈 性能优化

### 数据库优化

- **索引策略**: 自动创建必要索引
- **连接池**: 数据库连接池管理
- **批量操作**: 支持批量插入、更新、删除

### 查询优化

- **分页查询**: 所有列表查询支持分页
- **字段选择**: 支持选择特定字段
- **查询缓存**: 缓存常用查询

### 计算优化

- **依赖缓存**: 缓存字段依赖关系
- **批量计算**: 批量计算减少数据库查询
- **增量更新**: 只计算变更的字段

## 🔍 监控和日志

### 健康检查

```bash
GET /health

# 响应
{
  "status": "ok",
  "version": "0.1.0",
  "database": "connected",
  "cache": "connected"
}
```

### 数据库统计

```bash
GET /api/v1/monitoring/db-stats

# 响应
{
  "totalConnections": 10,
  "activeConnections": 5,
  "idleConnections": 5
}
```

### 查询统计

```bash
GET /api/v1/monitoring/query-stats

# 响应
{
  "totalQueries": 1000,
  "slowQueries": 5,
  "averageQueryTime": "10ms"
}
```

### 日志系统

- **应用日志**: 结构化应用日志
- **SQL日志**: 详细的SQL查询日志
- **错误日志**: 错误和异常日志

## 📖 相关文档

- [数据模型详解](./FEATURES-DATA-MODEL.md)
- [字段类型说明](./FEATURES-FIELDS.md)
- [MCP使用指南](./mcp-http-usage.md)

---

**最后更新**: 2025-01-XX

