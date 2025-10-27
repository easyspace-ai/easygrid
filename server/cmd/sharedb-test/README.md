# ShareDB 测试客户端

这个测试客户端用于验证 ShareDB 服务器的实时协作功能。

## 功能特性

- ✅ JWT 认证登录
- ✅ WebSocket 连接管理
- ✅ ShareDB 协议实现
- ✅ 双客户端同步测试
- ✅ OT 操作验证

## 测试场景

### 场景 1: 单客户端测试
1. 连接 WebSocket
2. 发送握手消息
3. 订阅记录文档
4. 提交更新操作

### 场景 2: 双客户端同步测试
1. **客户端 A**: 连接并订阅记录
2. **客户端 B**: 连接并提交操作
3. **验证**: 客户端 A 实时接收到客户端 B 的操作

## 快速开始

### 1. 启动服务器

```bash
cd server
go run cmd/server/main.go
```

### 2. 运行测试

```bash
# 使用脚本运行
./scripts/test-sharedb.sh

# 或直接运行
go run cmd/sharedb-test/main.go
```

## 测试数据

- **服务器**: `http://localhost:8080`
- **账号**: `admin@126.com` / `Pmker123`
- **Base ID**: `ece04dea-70bd-43e4-87b8-35af518caa5a`
- **Table ID**: `tbl_oz9EbQgbTZBuF7FSSJvet`
- **测试记录**: `test_record_001`

## 预期输出

```
🚀 启动 ShareDB 测试客户端...
📡 服务器地址: http://localhost:8080
👤 测试账号: admin@126.com

[客户端 A] 🔗 启动监听客户端...
[客户端 A] ✅ WebSocket 连接成功
[客户端 A] ✅ 握手完成
[客户端 A] ✅ 订阅成功: rec_tbl_oz9EbQgbTZBuF7FSSJvet.test_record_001
[客户端 A] 📡 开始监听 rec_tbl_oz9EbQgbTZBuF7FSSJvet.test_record_001...

[客户端 B] 🔗 启动操作客户端...
[客户端 B] ✅ WebSocket 连接成功
[客户端 B] ✅ 握手完成
[客户端 B] ✅ 操作已发送: rec_tbl_oz9EbQgbTZBuF7FSSJvet.test_record_001 (版本: 1)
[客户端 B] ✅ 操作已提交: rec_tbl_oz9EbQgbTZBuF7FSSJvet.test_record_001
[客户端 B] ✅ 第二个操作已提交

[客户端 A] 📬 收到同步操作:
  - Collection: rec_tbl_oz9EbQgbTZBuF7FSSJvet
  - DocID: test_record_001
  - Version: 1
  - Op: [map[p:[fields fld_test_001] oi:新值_15:04:05 od:旧值]]
  ✅ 同步成功!

[客户端 A] 📬 收到同步操作:
  - Collection: rec_tbl_oz9EbQgbTZBuF7FSSJvet
  - DocID: test_record_001
  - Version: 2
  - Op: [map[p:[fields fld_test_002] oi:另一个字段值_15:04:05 od:<nil>]]
  ✅ 同步成功!
```

## 测试验证点

1. **连接测试**: WebSocket 连接成功建立
2. **认证测试**: JWT Token 正确获取和使用
3. **握手测试**: ShareDB 握手协议正常
4. **订阅测试**: 能成功订阅记录文档
5. **操作测试**: 能正确提交 OT 操作
6. **同步测试**: 其他客户端能实时接收操作

## 故障排除

### 1. 连接失败
```
❌ 连接失败: dial tcp [::1]:8080: connect: connection refused
```
**解决**: 确保服务器已启动在 `localhost:8080`

### 2. 认证失败
```
❌ 认证失败: 登录失败 (状态码: 401)
```
**解决**: 检查测试账号密码是否正确

### 3. 订阅失败
```
❌ 订阅失败: 订阅响应错误
```
**解决**: 检查 Table ID 是否存在且有访问权限

## 代码结构

```
cmd/sharedb-test/
├── main.go           # 主测试程序
└── README.md         # 说明文档

scripts/
└── test-sharedb.sh   # 测试运行脚本
```

## 技术实现

- **WebSocket**: 使用 `github.com/gorilla/websocket`
- **HTTP 客户端**: 标准库 `net/http`
- **JSON 处理**: 标准库 `encoding/json`
- **并发控制**: `context.Context` 和 `sync`

## 扩展测试

可以修改测试代码来测试更多场景：

1. **多字段更新**: 同时更新多个字段
2. **批量操作**: 一次提交多个操作
3. **冲突处理**: 模拟并发冲突
4. **断线重连**: 测试网络中断恢复
5. **权限测试**: 测试不同权限用户的访问
