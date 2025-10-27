# ShareDB 测试演示

## 🎯 测试目标

验证 ShareDB 服务器的实时协作功能，确保多个客户端能够实时同步数据变更。

## 🚀 快速演示

### 步骤 1: 启动服务器

```bash
# 在第一个终端窗口
cd server
go run cmd/server/main.go
```

等待看到：
```
✅ ShareDB 服务初始化完成
🚀 服务器启动在 :8080
```

### 步骤 2: 运行测试客户端

```bash
# 在第二个终端窗口
cd server
go run cmd/sharedb-test/main.go
```

## 📊 预期结果

测试将自动运行以下场景：

1. **客户端 A** (监听者):
   - 连接到 WebSocket
   - 进行握手
   - 订阅记录 `rec_tbl_oz9EbQgbTZBuF7FSSJvet.test_record_001`
   - 等待接收同步消息

2. **客户端 B** (操作者):
   - 连接到 WebSocket
   - 进行握手
   - 提交两个字段更新操作
   - 操作会自动同步到客户端 A

## 🔍 验证要点

### ✅ 成功指标

1. **连接成功**: 两个客户端都能成功连接 WebSocket
2. **认证通过**: JWT Token 正确获取和使用
3. **握手完成**: ShareDB 握手协议正常
4. **订阅成功**: 能成功订阅记录文档
5. **操作提交**: 能正确提交 OT 操作
6. **实时同步**: 客户端 A 实时接收到客户端 B 的操作

### 📝 关键输出

```
[客户端 A] 📬 收到同步操作:
  - Collection: rec_tbl_oz9EbQgbTZBuF7FSSJvet
  - DocID: test_record_001
  - Version: 1
  - Op: [{"p":["fields","fld_test_001"],"oi":"新值_15:04:05","od":"旧值"}]
  ✅ 同步成功!
```

## 🛠️ 故障排除

### 问题 1: 服务器连接失败
```
❌ 连接失败: dial tcp [::1]:8080: connect: connection refused
```
**解决**: 确保服务器已启动，检查端口 8080 是否被占用

### 问题 2: 认证失败
```
❌ 认证失败: 登录失败 (状态码: 401)
```
**解决**: 检查测试账号 `admin@126.com` / `Pmker123` 是否正确

### 问题 3: 订阅失败
```
❌ 订阅失败: 订阅响应错误
```
**解决**: 检查 Table ID `tbl_oz9EbQgbTZBuF7FSSJvet` 是否存在

## 🔧 自定义测试

### 修改测试记录 ID

在 `main.go` 中修改：
```go
recordID := "your_custom_record_id"
```

### 修改测试字段

在 `main.go` 中修改操作：
```go
op := []OTOperation{
    {
        "p":  []interface{}{"fields", "your_field_id"},
        "oi": "你的新值",
        "od": "你的旧值",
    },
}
```

### 添加更多操作

可以添加更多测试操作：
```go
// 添加更多字段更新
op3 := []OTOperation{
    {
        "p":  []interface{}{"fields", "fld_test_003"},
        "oi": "第三个字段值",
        "od": nil,
    },
}
```

## 📈 性能测试

### 并发客户端测试

可以修改代码启动多个客户端：
```go
// 启动 5 个监听客户端
for i := 0; i < 5; i++ {
    go runClientA(ctx, config)
}
```

### 批量操作测试

可以修改代码发送更多操作：
```go
// 发送 100 个操作
for i := 0; i < 100; i++ {
    op := createTestOperation(i)
    client.SubmitOp(collection, recordID, op, int64(i+1))
}
```

## 🎉 成功标志

如果看到以下输出，说明 ShareDB 实时协作功能正常工作：

1. ✅ 两个客户端都成功连接
2. ✅ 客户端 A 成功订阅记录
3. ✅ 客户端 B 成功提交操作
4. ✅ 客户端 A 实时接收到同步消息
5. ✅ OT 操作格式正确

这表明 ShareDB 服务器能够：
- 正确处理 WebSocket 连接
- 实现 JWT 认证
- 支持 ShareDB 协议
- 进行实时数据同步
- 处理 OT 操作转换
