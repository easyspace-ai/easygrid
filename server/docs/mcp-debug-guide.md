# MCP 服务器调试指南

## 问题：Cursor 显示 "Loading tools"

当 Cursor 中显示 "easygrid" MCP 服务器处于 "Loading tools" 状态时，按照以下步骤进行调试。

## 快速诊断

运行诊断脚本快速检查所有配置：

```bash
cd /path/to/easygrid
bash server/scripts/mcp-diagnose.sh
```

## 详细调试步骤

### 1. 检查服务是否运行

```bash
# 健康检查
curl http://localhost:8080/api/mcp/v1/health
# 应该返回: {"status":"ok"}

# 元信息
curl http://localhost:8080/api/mcp/v1/meta
# 应该返回: {"mcpVersion":"1.0","serverName":"luckdb-mcp","features":["tools"]}
```

### 2. 验证 API Key

```bash
# 检查 API Key 文件是否存在
cat ~/.easygrid/api-key
# 应该返回: key_id:secret 格式

# 测试工具列表端点
API_KEY=$(cat ~/.easygrid/api-key)
curl -X GET "http://localhost:8080/api/mcp/v1/tools" \
  -H "X-MCP-API-Key: $API_KEY"
# 应该返回工具列表 JSON
```

### 3. 检查 Cursor 配置

Cursor 可能读取两个位置的配置文件：
- **全局配置**: `~/.cursor/mcp.json`（推荐）
- **项目配置**: `<project>/.cursor/mcp.json`

确保至少有一个配置文件包含 easygrid 服务器配置：

```json
{
  "mcpServers": {
    "easygrid": {
      "url": "http://localhost:8080/api/mcp/v1",
      "description": "EasyGrid CRUD - MCP HTTP",
      "headers": {
        "X-MCP-API-Key": "your_key_id:your_secret"
      }
    }
  }
}
```

**重要提示**：
- 服务器名称可以是 "easygrid" 或 "easygrid-mcp"
- API Key 必须是完整的 `key_id:secret` 格式
- URL 必须正确（默认 `http://localhost:8080/api/mcp/v1`）

### 4. 自动更新配置

使用脚本自动更新全局配置：

```bash
python3 server/scripts/update_cursor_mcp_config.py
```

这个脚本会：
1. 从 `~/.easygrid/api-key` 读取 API Key
2. 更新 `~/.cursor/mcp.json` 中的 easygrid 配置
3. 自动备份原配置文件

### 5. 测试 JSON-RPC 调用

手动测试 MCP 协议调用：

```bash
API_KEY=$(cat ~/.easygrid/api-key)

# 测试 initialize
curl -X POST "http://localhost:8080/api/mcp/v1" \
  -H "X-MCP-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

# 测试 tools/list
curl -X POST "http://localhost:8080/api/mcp/v1" \
  -H "X-MCP-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### 6. 检查服务器日志

查看服务器日志查找错误：

```bash
# 查看服务器日志
tail -f server/logs/server.log

# 或查看系统日志
journalctl -u easygrid-server -f
```

### 7. 验证工具注册

确认工具是否正确注册：

```bash
# 检查工具数量（应该返回 20 个工具）
API_KEY=$(cat ~/.easygrid/api-key)
curl -s -X GET "http://localhost:8080/api/mcp/v1/tools" \
  -H "X-MCP-API-Key: $API_KEY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('tools', [])))"
```

### 8. 检查网络和端口

```bash
# 检查端口是否监听
lsof -i :8080

# 测试连接
curl -v http://localhost:8080/api/mcp/v1/health
```

## 常见问题

### 问题 1: 配置不在全局配置文件中

**症状**: 项目目录下的 `.cursor/mcp.json` 有配置，但 Cursor 仍然显示 "Loading tools"

**解决方案**:
1. 运行 `python3 server/scripts/update_cursor_mcp_config.py` 更新全局配置
2. 重启 Cursor

### 问题 2: API Key 格式错误

**症状**: 工具列表端点返回 401 错误

**解决方案**:
1. 检查 API Key 格式是否为 `key_id:secret`
2. 重新生成 API Key: `go run server/cmd/mcp-api-key/main.go -action=create -no-expire`
3. 更新配置

### 问题 3: 服务器未运行

**症状**: 健康检查返回连接错误

**解决方案**:
1. 启动服务器（根据你的启动方式）
2. 确认端口 8080 正在监听
3. 检查防火墙设置

### 问题 4: Cursor 版本不支持 MCP HTTP

**症状**: 配置正确但 Cursor 无法连接

**解决方案**:
1. 确保 Cursor 版本支持 MCP HTTP 协议
2. 查看 Cursor 的开发者工具或日志
3. 考虑使用 MCP stdio 模式（如果支持）

## 重启 Cursor

完成配置更新后，**必须重启 Cursor** 才能使配置生效。

## 参考文档

- `server/docs/mcp-troubleshooting.md` - 详细的故障排查指南
- `server/docs/mcp-http-usage.md` - MCP HTTP 使用指南
- `server/docs/mcp-compliance-report.md` - MCP 标准合规性报告

