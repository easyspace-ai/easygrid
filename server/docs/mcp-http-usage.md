# EasyGrid MCP HTTP 使用指南

## 概述

EasyGrid MCP HTTP 是一个基于 HTTP 协议的 MCP（Model Context Protocol）实现，提供对 Base、Table、Field、Record 的完整 CRUD 操作。通过统一的 API Key 鉴权，支持第三方系统安全地访问和管理多维表格数据。

## 快速开始

### 1. 生成 API Key

使用命令行工具生成 API Key（交互式登录）：

```bash
cd server
go run ./cmd/mcp-api-key/main.go -action=create -no-expire
```

按提示输入：
- **Email**: 你的登录邮箱（如 `admin@126.com`）
- **Password**: 你的登录密码

生成的 API Key 会自动保存到 `~/.easygrid/api-key`，格式为：`key_id:secret`

### 2. 配置 Cursor

编辑 `~/.cursor/mcp.json`，添加以下配置：

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

**自动更新配置**（推荐）：
```bash
python3 server/scripts/update_cursor_mcp_config.py
```

### 3. 验证连接

重启 Cursor 后，在 Cursor 中调用 MCP 工具，应该能看到所有可用的工具。

## API 端点

### 基础端点

#### 健康检查
```
GET /api/mcp/v1/health
```

响应：
```json
{
  "status": "ok"
}
```

#### 元信息
```
GET /api/mcp/v1/meta
```

响应：
```json
{
  "mcpVersion": "1.0",
  "serverName": "luckdb-mcp",
  "features": ["tools"]
}
```

#### 工具列表
```
GET /api/mcp/v1/tools
```

响应：
```json
{
  "tools": [
    {
      "name": "base.create",
      "title": "Create Base",
      "description": "Create a base",
      "scopes": ["mcp.base.write"]
    },
    ...
  ]
}
```

### 工具调用

所有工具调用统一使用以下格式：

```
POST /api/mcp/v1/tools/{tool}:invoke
```

**请求头**：
- `X-MCP-API-Key`: `key_id:secret`（必需）
- `Content-Type`: `application/json`
- `X-Idempotency-Key`: `<uuid>`（可选，写操作推荐）

**请求体**：
```json
{
  "id": "request-id",
  "input": {
    // 工具特定参数
  }
}
```

**响应**：
```json
{
  "id": "request-id",
  "status": "ok",
  "output": {
    // 工具特定输出
  }
}
```

## 工具清单

### Base 操作

#### base.create
创建新的 Base。

**输入**：
```json
{
  "id": "req-1",
  "input": {
    "spaceId": "space_id",
    "name": "My Base"
  }
}
```

**输出**：
```json
{
  "id": "...",
  "name": "My Base",
  "spaceId": "space_id",
  ...
}
```

#### base.get
获取 Base 详情。

**输入**：
```json
{
  "id": "req-2",
  "input": {
    "baseId": "base_id"
  }
}
```

#### base.list
列出指定 Space 下的所有 Base。

**输入**：
```json
{
  "id": "req-3",
  "input": {
    "spaceId": "space_id"
  }
}
```

**输出**：
```json
{
  "items": [
    {"id": "...", "name": "...", ...},
    ...
  ]
}
```

#### base.update
更新 Base 信息。

**输入**：
```json
{
  "id": "req-4",
  "input": {
    "baseId": "base_id",
    "name": "New Name"
  }
}
```

#### base.delete
删除 Base。

**输入**：
```json
{
  "id": "req-5",
  "input": {
    "baseId": "base_id"
  }
}
```

### Table 操作

#### table.create
创建新的 Table。

**输入**：
```json
{
  "id": "req-1",
  "input": {
    "baseId": "base_id",
    "name": "My Table"
  }
}
```

#### table.get
获取 Table 详情。

**输入**：
```json
{
  "id": "req-2",
  "input": {
    "tableId": "table_id"
  }
}
```

#### table.list
列出指定 Base 下的所有 Table。

**输入**：
```json
{
  "id": "req-3",
  "input": {
    "baseId": "base_id"
  }
}
```

#### table.update
更新 Table 信息。

**输入**：
```json
{
  "id": "req-4",
  "input": {
    "tableId": "table_id",
    "name": "New Name"
  }
}
```

#### table.delete
删除 Table。

**输入**：
```json
{
  "id": "req-5",
  "input": {
    "tableId": "table_id"
  }
}
```

### Field 操作

#### field.create
创建新的 Field。

**输入**：
```json
{
  "id": "req-1",
  "input": {
    "tableId": "table_id",
    "name": "Field Name",
    "type": "singleLineText",
    "options": {}
  }
}
```

**支持的字段类型**：
- `singleLineText`: 单行文本
- `longText`: 多行文本
- `number`: 数字
- `singleSelect`: 单选
- `multipleSelect`: 多选
- `date`: 日期
- `datetime`: 日期时间
- `formula`: 公式
- `rollup`: 汇总
- `lookup`: 查找
- 等等...

#### field.get
获取 Field 详情。

**输入**：
```json
{
  "id": "req-2",
  "input": {
    "fieldId": "field_id"
  }
}
```

#### field.list
列出指定 Table 下的所有 Field。

**输入**：
```json
{
  "id": "req-3",
  "input": {
    "tableId": "table_id"
  }
}
```

#### field.update
更新 Field 信息。

**输入**：
```json
{
  "id": "req-4",
  "input": {
    "fieldId": "field_id",
    "name": "New Name",
    "options": {}
  }
}
```

#### field.delete
删除 Field。

**输入**：
```json
{
  "id": "req-5",
  "input": {
    "fieldId": "field_id"
  }
}
```

### Record 操作

#### record.create
创建新的 Record。

**输入**：
```json
{
  "id": "req-1",
  "input": {
    "tableId": "table_id",
    "data": {
      "field_id_1": "value1",
      "field_id_2": 123,
      "field_name_3": "value3"
    }
  }
}
```

**注意**：`data` 中可以使用字段 ID 或字段名称作为键。

#### record.get
获取 Record 详情。

**输入**：
```json
{
  "id": "req-2",
  "input": {
    "tableId": "table_id",
    "recordId": "record_id"
  }
}
```

#### record.list
列出指定 Table 下的 Record（支持分页）。

**输入**：
```json
{
  "id": "req-3",
  "input": {
    "tableId": "table_id",
    "page": 0,
    "pageSize": 20
  }
}
```

**输出**：
```json
{
  "items": [
    {"id": "...", "fields": {...}, ...},
    ...
  ],
  "total": 100
}
```

#### record.update
更新 Record。

**输入**：
```json
{
  "id": "req-4",
  "input": {
    "tableId": "table_id",
    "recordId": "record_id",
    "data": {
      "field_id_1": "new_value"
    }
  }
}
```

#### record.delete
删除 Record。

**输入**：
```json
{
  "id": "req-5",
  "input": {
    "tableId": "table_id",
    "recordId": "record_id"
  }
}
```

## 鉴权与权限

### API Key 格式

API Key 格式为：`key_id:secret`

例如：
```
6645e58600ac815983f28ac61bbe1f5dd4944aef6a52f518cf9387eddea61914:4a05a7746b8e8fa18ae199ab605e87d3afaa43453b042201f50b97668384525d...
```

### 请求头

所有请求必须包含以下请求头：

```
X-MCP-API-Key: key_id:secret
```

### 权限范围（Scopes）

API Key 支持以下权限范围：

- `mcp.base.read`: 读取 Base
- `mcp.base.write`: 创建/更新/删除 Base
- `mcp.table.read`: 读取 Table
- `mcp.table.write`: 创建/更新/删除 Table
- `mcp.field.read`: 读取 Field
- `mcp.field.write`: 创建/更新/删除 Field
- `mcp.record.read`: 读取 Record
- `mcp.record.write`: 创建/更新/删除 Record

**默认权限**：生成的 API Key 默认包含所有权限。

### Base 白名单

创建 API Key 时可以指定 Base 白名单，限制只能访问指定的 Base：

```bash
go run ./cmd/mcp-api-key/main.go -action=create -no-expire -bases=base_1,base_2
```

## 限流与幂等

### 限流

- **读操作**：60 请求/分钟
- **写操作**：30 请求/分钟

超过限制会返回 `429 Too Many Requests`。

### 幂等性

写操作（create/update/delete）支持幂等性，使用 `X-Idempotency-Key` 请求头：

```
X-Idempotency-Key: <uuid>
```

相同幂等键的请求在 10 分钟内会返回相同的响应结果。

## 使用示例

### Go 客户端

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os/user"
    "path/filepath"
    "strings"
)

func main() {
    baseURL := "http://localhost:8080/api/mcp/v1"
    apiKey := getAPIKey() // 从 ~/.easygrid/api-key 读取
    
    // 调用 base.list
    req := map[string]interface{}{
        "id": "req-1",
        "input": map[string]interface{}{
            "spaceId": "default",
        },
    }
    
    body, _ := json.Marshal(req)
    httpReq, _ := http.NewRequest("POST", baseURL+"/tools/base.list:invoke", 
        bytes.NewReader(body))
    httpReq.Header.Set("X-MCP-API-Key", apiKey)
    httpReq.Header.Set("Content-Type", "application/json")
    
    resp, _ := http.DefaultClient.Do(httpReq)
    // 处理响应...
}

func getAPIKey() string {
    usr, _ := user.Current()
    filePath := filepath.Join(usr.HomeDir, ".easygrid", "api-key")
    data, _ := os.ReadFile(filePath)
    return strings.TrimSpace(string(data))
}
```

### JavaScript/Node.js 客户端

```javascript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE_URL = 'http://localhost:8080/api/mcp/v1';

function getAPIKey() {
  try {
    const keyPath = join(homedir(), '.easygrid', 'api-key');
    return readFileSync(keyPath, 'utf-8').trim();
  } catch (err) {
    return process.env.MCP_API_KEY || '';
  }
}

async function callTool(tool, input) {
  const response = await fetch(`${BASE_URL}/tools/${tool}:invoke`, {
    method: 'POST',
    headers: {
      'X-MCP-API-Key': getAPIKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: `req-${Date.now()}`,
      input,
    }),
  });
  
  return await response.json();
}

// 使用示例
const result = await callTool('base.list', { spaceId: 'default' });
console.log(result);
```

### curl 示例

```bash
# 设置 API Key
API_KEY=$(cat ~/.easygrid/api-key)

# 列出工具
curl -X GET "http://localhost:8080/api/mcp/v1/tools" \
  -H "X-MCP-API-Key: $API_KEY"

# 调用 base.list
curl -X POST "http://localhost:8080/api/mcp/v1/tools/base.list:invoke" \
  -H "X-MCP-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req-1",
    "input": {
      "spaceId": "default"
    }
  }'

# 创建 Record（带幂等键）
curl -X POST "http://localhost:8080/api/mcp/v1/tools/record.create:invoke" \
  -H "X-MCP-API-Key: $API_KEY" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req-2",
    "input": {
      "tableId": "table_id",
      "data": {
        "field_id": "value"
      }
    }
  }'
```

## 错误处理

### 错误响应格式

```json
{
  "code": 400,
  "message": "error message",
  "requestId": "request-id"
}
```

### 常见错误码

- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: API Key 缺失或无效
- `403 Forbidden`: 权限不足或 Base 不在白名单内
- `404 Not Found`: 资源不存在
- `429 Too Many Requests`: 超过限流
- `500 Internal Server Error`: 服务器内部错误

## API Key 管理

### 创建 API Key

```bash
# 交互式创建（永久有效）
go run ./cmd/mcp-api-key/main.go -action=create -no-expire

# 指定过期时间
go run ./cmd/mcp-api-key/main.go -action=create -ttl=30d

# 指定 Base 白名单
go run ./cmd/mcp-api-key/main.go -action=create -no-expire -bases=base_1,base_2
```

### 列出 API Key

```bash
go run ./cmd/mcp-api-key/main.go -action=list
```

### 吊销 API Key

```bash
go run ./cmd/mcp-api-key/main.go -action=revoke -key-id=ak_xxx
```

## 最佳实践

1. **使用幂等键**：写操作（create/update/delete）建议使用 `X-Idempotency-Key`，避免重复操作
2. **错误重试**：遇到 429 错误时，应该等待后重试
3. **API Key 安全**：
   - 不要将 API Key 提交到版本控制系统
   - 定期轮换 API Key
   - 使用 Base 白名单限制访问范围
4. **分页查询**：使用 `record.list` 时，合理设置 `pageSize`，避免一次性查询过多数据
5. **事务一致性**：相关操作应使用相同的幂等键，确保一致性

## 故障排查

### 连接失败

1. 确认服务是否启动：`curl http://localhost:8080/api/mcp/v1/health`
2. 检查 API Key 是否正确：`cat ~/.easygrid/api-key`
3. 验证 API Key 是否有效：查看日志或使用 `-action=list` 命令

### 权限错误

1. 检查 API Key 的 Scopes 是否包含所需权限
2. 确认 Base 是否在白名单内（如果设置了白名单）

### 限流错误

1. 降低请求频率
2. 使用缓存减少重复请求
3. 批量操作使用单个请求（如果支持）

## 相关文档

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [字段类型说明](../docs/field-types.md)
- [虚拟字段使用](../docs/virtual-fields.md)

## 在 AI 助手中使用：场景范例与 Prompt 模板

下面给出可直接复制到 AI 助手（如 Cursor/Claude/ChatGPT）里的对话指令，AI 会通过 MCP 工具完成建模与数据写入。你只需要把自然语言需求告诉 AI，剩下的由 AI 驱动 MCP 完成。

### 范例一：10 分钟搭好一个「博客系统」

目标：创建一个 Base「Blog」、两张表「Posts」「Tags」，完成字段定义并写入示例数据。

将以下提示粘贴到 AI：

```
你可以使用名为 easygrid-mcp 的 MCP 服务（HTTP）。请按以下步骤帮我搭建一个最小可用的博客系统：

约束：
- 所有写操作使用 X-Idempotency-Key，避免重复创建
- 如果资源已存在，跳过创建并返回已存在的资源
- 每一步都展示你调用的 MCP 工具名称、输入参数与简短结果

步骤：
1) 创建 Base：name=Blog，spaceId=default
   - 工具：base.create
2) 在该 Base 下创建表：
   2.1) 表 Posts（name=Posts）
        字段：
        - title: singleLineText
        - content: longText
        - publishedAt: datetime
   2.2) 表 Tags（name=Tags）
        字段：
        - name: singleLineText
3) 在 Posts 与 Tags 之间创建多选关联（如果当前版本不支持关系型字段，请跳过本步并继续）
4) 写入示例数据：
   - 在 Tags 中插入："Go", "Product", "AI"
   - 在 Posts 中插入 2 篇文章（含 title/content/publishedAt），并在可行时附上 Tags
5) 列出 Posts 表的前 10 条记录，展示 id 与关键字段

最后，输出一个区块：
- Base ID
- Posts 表 ID，Tags 表 ID
- 示例记录数统计
```

AI 执行时会依次调用：
- `base.create` → `table.create` → `field.create*` → `record.create*` → `record.list`

如需重复执行，AI 会复用同一个 `X-Idempotency-Key` 或自行生成新的值，从而保持幂等。

### 范例二：把一组 Markdown 转成结构化文章库

将以下提示粘贴到 AI：

```
我有一组 Markdown 文章片段（会在后续粘贴），请你：
1) 在 Base=KnowledgeBase（spaceId=default）下创建表 Articles
2) 定义字段：title(singleLineText), slug(singleLineText), content(longText), tags(multipleSelect 或用文本数组代替), createdAt(datetime)
3) 读取我随后给出的多段 Markdown 文本，每段：
   - 自动生成 title、slug（kebab-case），tags（从内容自动提取 1-5 个关键词）
   - 将整段 Markdown 写入 content
   - 写入 createdAt=当前时间
4) 全量导入完成后，返回一个列表：id, title, slug, tags

实现要求：
- 使用 MCP `table.create`、`field.create`、`record.create` 完成
- 无需去重，但同一运行过程中的写操作要使用 X-Idempotency-Key
- 如果表或字段已经存在，跳过并继续
```

随后把 Markdown 文本粘贴给 AI 即可。

### 范例三：把表单回答收集为一张反馈表

```
帮我创建 Base=Feedback（spaceId=default），并创建表 Responses：
- fields: name(singleLineText), email(singleLineText), message(longText), rating(number), submittedAt(datetime)
然后我会一条条给你用户反馈，请把它们规范化后写入表中，并在每次写入后返回记录 id。
注意：
- rating 必须在 1-5 之间，超出则纠正或报错
- 对写操作使用 X-Idempotency-Key，避免重复
```

你可以直接将用户反馈逐条粘贴到 AI，AI 会连续调用 `record.create` 完成落库。

### 常用 Prompt 片段（可拼装）

- 「如果资源已存在就跳过」：
  - 查询：`table.list` / `field.list`，判断是否存在
  - 已存在：返回现有 ID 并继续

- 「所有写操作带幂等键」：
  - 每次 `create/update/delete` 都设置 `X-Idempotency-Key: <固定或新生成的 uuid>`

- 「只展示关键输出」：
  - 统一打印：工具名、关键输入、返回 id/数量

- 「失败重试」：
  - 收到 `429` 时按 `Retry-After` 或 1-2 秒退避重试

---

提示：以上模板可以直接放进 AI 对话里使用；若使用 Cursor 的 MCP 集成，确保 `~/.cursor/mcp.json` 中 `easygrid-mcp` 已配置好 `X-MCP-API-Key`。


