# 实时同步测试说明

## 概述

这个测试验证 LuckDB SDK 的实时协作功能，模拟两个客户端之间的数据同步。

## 测试文件

### 1. 客户端 A (监听者) - `client-a-listener.ts`
- 先启动，订阅记录变更
- 监听来自客户端 B 的字段更新
- 显示接收到的实时更新

### 2. 客户端 B (操作者) - `client-b-operator.ts`
- 后启动，执行字段更新操作
- 发送更新到服务器
- 验证更新是否被客户端 A 接收

### 3. 完整测试 - `realtime-sync-test.ts`
- 同时运行两个客户端
- 自动化的完整测试流程

## 运行测试

### 方法 1: 分别运行两个客户端（推荐）

**终端 1 - 启动客户端 A (监听者):**
```bash
cd sdk
npm run test:client-a
```

**终端 2 - 启动客户端 B (操作者):**
```bash
cd sdk
npm run test:client-b
```

### 方法 2: 运行完整测试
```bash
cd sdk
npm run test:realtime-sync
```

### 方法 3: 运行简单示例
```bash
cd sdk
npm run test:realtime-simple
```

## 测试步骤

1. **确保服务器运行**
   ```bash
   cd server
   go run cmd/server/main.go serve
   ```

2. **启动客户端 A**
   - 登录并连接 ShareDB
   - 订阅测试记录
   - 等待来自客户端 B 的更新

3. **启动客户端 B**
   - 登录并连接 ShareDB
   - 等待 10 秒让客户端 A 先订阅
   - 执行一系列字段更新操作
   - 观察客户端 A 是否收到实时更新

## 预期结果

### 客户端 A 应该看到：
```
🔵 📝 收到字段变化: name = First Update
🔵 📝 收到字段变化: name = Second Update
🔵 📝 收到字段变化: age = 25
🔵 📝 收到字段变化: email = test@example.com
🔵 📝 收到字段变化: name = Final Update
```

### 客户端 B 应该看到：
```
🟢 ✅ 更新 1 成功
🟢 ✅ 更新 2 成功
🟢 ✅ 更新 3 成功
🟢 ✅ 更新 4 成功
🟢 ✅ 更新 5 成功
```

## 测试数据

- **表格ID**: `tbl_test_sync`
- **记录ID**: `rec_test_001`
- **测试字段**: `name`, `age`, `email`

## 故障排除

### 1. 连接失败
- 确保服务器正在运行 (端口 8080)
- 检查网络连接
- 验证 JWT 令牌是否有效

### 2. 没有收到更新
- 检查 ShareDB 连接状态
- 验证订阅是否成功
- 查看服务器日志

### 3. 编译错误
- 运行 `npm run build` 检查编译错误
- 确保所有依赖已安装

## 调试模式

设置 `debug: true` 在配置中可以看到详细的日志信息：

```typescript
const config = {
  baseUrl: 'http://localhost:8080',
  debug: true,  // 启用调试模式
};
```

## 性能测试

测试脚本包含性能统计信息：

```typescript
const stats = sdk.getRealtimeStats();
console.log('实时统计:', stats);
```

这将显示：
- 连接状态
- 记录数量
- 表格数量
- 视图数量
- 在线用户数量
