# MCP 服务故障排查指南

## "Loading tools" 问题排查

如果看到 "Loading tools" 状态一直显示，可以按以下步骤排查：

### 1. 检查服务是否运行

```bash
# 检查健康状态
curl http://localhost:8080/api/mcp/v1/health

# 应该返回：
# {"status":"ok"}
```

### 2. 检查工具列表端点

```bash
# 使用 API Key 获取工具列表
API_KEY=$(cat ~/.easygrid/api-key)
curl -X GET "http://localhost:8080/api/mcp/v1/tools" \
  -H "X-MCP-API-Key: $API_KEY"

# 应该返回工具列表 JSON
```

### 3. 检查 API Key 是否有效

```bash
# 列出所有 API Key
go run ./cmd/mcp-api-key/main.go -action=list

# 验证 API Key 格式
cat ~/.easygrid/api-key
# 应该是：key_id:secret 格式
```

### 4. 检查 Cursor MCP 配置

检查 `~/.cursor/mcp.json` 配置：

```json
{
  "mcpServers": {
    "easygrid-mcp": {
      "url": "http://localhost:8080/api/mcp/v1",
      "description": "EasyGrid CRUD - MCP HTTP",
      "headers": {
        "X-MCP-API-Key": "your_key_id:your_secret"
      }
    }
  }
}
```

**重要**：
- 确保 `url` 正确
- 确保 `X-MCP-API-Key` 包含完整的 `key_id:secret`
- 确保服务器正在运行

### 5. 测试标准 JSON-RPC 调用

```bash
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

查看服务器日志，查找错误信息：

```bash
# 查看服务器日志（根据你的启动方式）
tail -f logs/server.log
# 或
journalctl -u easygrid-server -f
```

### 7. 常见问题

#### 问题：认证失败

**症状**：401 Unauthorized

**解决方案**：
- 检查 API Key 格式是否正确（`key_id:secret`）
- 检查 API Key 是否已过期
- 检查 API Key 是否被吊销

#### 问题：连接超时

**症状**：请求超时或无法连接

**解决方案**：
- 检查服务器是否运行在正确端口（默认 8080）
- 检查防火墙设置
- 检查 URL 配置是否正确

#### 问题：工具列表为空

**症状**：tools/list 返回空数组

**解决方案**：
- 检查 `registry/registry.go` 中的工具注册
- 确保工具服务正常初始化

### 8. 重新生成 API Key

如果怀疑 API Key 有问题，可以重新生成：

```bash
# 创建新的 API Key
go run ./cmd/mcp-api-key/main.go -action=create -no-expire

# 更新 ~/.cursor/mcp.json 配置
python3 server/scripts/update_cursor_mcp_config.py
```

### 9. 重启服务

如果以上都不行，尝试重启服务：

```bash
# 停止服务
# （根据你的启动方式）

# 重新启动服务
# （根据你的启动方式）
```

### 10. 验证工具数量

确认服务端注册了多少工具：

```bash
# 查看工具注册代码
grep -A 5 "ListTools" server/internal/mcp/registry/registry.go

# 应该看到 20 个工具（base/table/field/record 的 CRUD 操作）
```

---

## 快速诊断脚本

创建一个诊断脚本：

```bash
#!/bin/bash
# mcp-diagnose.sh

echo "=== MCP 服务诊断 ==="
echo ""

echo "1. 检查健康状态..."
curl -s http://localhost:8080/api/mcp/v1/health || echo "❌ 服务未运行"
echo ""

echo "2. 检查 API Key..."
if [ -f ~/.easygrid/api-key ]; then
    echo "✅ API Key 文件存在"
    cat ~/.easygrid/api-key | head -c 50
    echo "..."
else
    echo "❌ API Key 文件不存在"
fi
echo ""

echo "3. 测试工具列表..."
API_KEY=$(cat ~/.easygrid/api-key 2>/dev/null)
if [ -n "$API_KEY" ]; then
    curl -s -X GET "http://localhost:8080/api/mcp/v1/tools" \
      -H "X-MCP-API-Key: $API_KEY" | jq '.tools | length' || echo "❌ 请求失败"
else
    echo "❌ 无法读取 API Key"
fi
echo ""

echo "4. 检查 Cursor 配置..."
if [ -f ~/.cursor/mcp.json ]; then
    echo "✅ Cursor 配置文件存在"
    cat ~/.cursor/mcp.json | jq '.mcpServers["easygrid-mcp"]' || echo "❌ 配置格式错误"
else
    echo "❌ Cursor 配置文件不存在"
fi
```

保存为 `mcp-diagnose.sh`，运行：

```bash
chmod +x mcp-diagnose.sh
./mcp-diagnose.sh
```

---

## 联系支持

如果以上方法都无法解决问题，请提供：
1. 服务器日志
2. 错误信息截图
3. 诊断脚本输出
4. Cursor 版本信息


























