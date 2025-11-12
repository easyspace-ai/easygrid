# API使用指南

## 🔑 认证

### 注册用户

```bash
POST /api/v1/auth/register

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

### 登录

```bash
POST /api/v1/auth/login

{
  "email": "user@example.com",
  "password": "password123"
}

# 响应
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

### 使用Token

在请求头中添加Token：

```bash
Authorization: Bearer <token>
```

### 刷新Token

```bash
POST /api/v1/auth/refresh

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## 📦 核心资源

### 1. 空间 (Spaces)

#### 创建空间

```bash
POST /api/v1/spaces
Authorization: Bearer <token>

{
  "name": "My Workspace",
  "description": "Workspace description",
  "icon": "📁"
}
```

#### 获取空间列表

```bash
GET /api/v1/spaces
Authorization: Bearer <token>
```

#### 获取空间详情

```bash
GET /api/v1/spaces/:spaceId
Authorization: Bearer <token>
```

#### 更新空间

```bash
PATCH /api/v1/spaces/:spaceId
Authorization: Bearer <token>

{
  "name": "Updated Name"
}
```

#### 删除空间

```bash
DELETE /api/v1/spaces/:spaceId
Authorization: Bearer <token>
```

### 2. Base

#### 创建Base

```bash
POST /api/v1/spaces/:spaceId/bases
Authorization: Bearer <token>

{
  "name": "My Base",
  "description": "Base description",
  "icon": "📊"
}
```

#### 获取Base列表

```bash
GET /api/v1/spaces/:spaceId/bases
Authorization: Bearer <token>
```

#### 获取Base详情

```bash
GET /api/v1/bases/:baseId
Authorization: Bearer <token>
```

#### 复制Base

```bash
POST /api/v1/bases/:baseId/duplicate
Authorization: Bearer <token>

{
  "name": "Copied Base"
}
```

### 3. 表格 (Tables)

#### 创建表格

```bash
POST /api/v1/bases/:baseId/tables
Authorization: Bearer <token>

{
  "name": "My Table",
  "description": "Table description"
}
```

#### 获取表格列表

```bash
GET /api/v1/bases/:baseId/tables
Authorization: Bearer <token>
```

#### 获取表格详情

```bash
GET /api/v1/tables/:tableId
Authorization: Bearer <token>
```

#### 更新表格

```bash
PATCH /api/v1/tables/:tableId
Authorization: Bearer <token>

{
  "name": "Updated Table Name"
}
```

#### 重命名表格

```bash
PUT /api/v1/tables/:tableId/rename
Authorization: Bearer <token>

{
  "name": "New Name"
}
```

#### 复制表格

```bash
POST /api/v1/tables/:tableId/duplicate
Authorization: Bearer <token>

{
  "name": "Copied Table"
}
```

### 4. 字段 (Fields)

#### 创建字段

```bash
POST /api/v1/tables/:tableId/fields
Authorization: Bearer <token>

{
  "name": "Name",
  "type": "singleLineText",
  "options": {}
}
```

#### 获取字段列表

```bash
GET /api/v1/tables/:tableId/fields
Authorization: Bearer <token>
```

#### 获取字段详情

```bash
GET /api/v1/fields/:fieldId
Authorization: Bearer <token>
```

#### 更新字段

```bash
PATCH /api/v1/fields/:fieldId
Authorization: Bearer <token>

{
  "name": "Updated Field Name",
  "options": {
    "required": true
  }
}
```

#### 删除字段

```bash
DELETE /api/v1/fields/:fieldId
Authorization: Bearer <token>
```

### 5. 记录 (Records)

#### 创建记录

```bash
POST /api/v1/tables/:tableId/records
Authorization: Bearer <token>

{
  "fields": {
    "field_123": "Value 1",
    "field_456": 100
  }
}
```

#### 批量创建记录

```bash
POST /api/v1/tables/:tableId/records/batch
Authorization: Bearer <token>

{
  "records": [
    {
      "fields": {
        "field_123": "Value 1"
      }
    },
    {
      "fields": {
        "field_123": "Value 2"
      }
    }
  ]
}
```

#### 获取记录列表

```bash
GET /api/v1/tables/:tableId/records?page=1&pageSize=20
Authorization: Bearer <token>
```

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `viewId`: 视图ID（可选）
- `filter`: 过滤条件（JSON字符串）
- `sort`: 排序条件（JSON字符串）

#### 获取记录详情

```bash
GET /api/v1/tables/:tableId/records/:recordId
Authorization: Bearer <token>
```

#### 更新记录

```bash
PATCH /api/v1/tables/:tableId/records/:recordId
Authorization: Bearer <token>

{
  "fields": {
    "field_123": "Updated Value"
  }
}
```

#### 批量更新记录

```bash
PATCH /api/v1/tables/:tableId/records/batch
Authorization: Bearer <token>

{
  "records": [
    {
      "id": "record_123",
      "fields": {
        "field_123": "Updated Value 1"
      }
    },
    {
      "id": "record_456",
      "fields": {
        "field_123": "Updated Value 2"
      }
    }
  ]
}
```

#### 删除记录

```bash
DELETE /api/v1/tables/:tableId/records/:recordId
Authorization: Bearer <token>
```

#### 批量删除记录

```bash
DELETE /api/v1/tables/:tableId/records/batch
Authorization: Bearer <token>

{
  "recordIds": ["record_123", "record_456"]
}
```

### 6. 视图 (Views)

#### 创建视图

```bash
POST /api/v1/tables/:tableId/views
Authorization: Bearer <token>

{
  "name": "My View",
  "type": "grid",
  "options": {
    "filter": {},
    "sort": []
  }
}
```

#### 获取视图列表

```bash
GET /api/v1/tables/:tableId/views
Authorization: Bearer <token>
```

#### 获取视图详情

```bash
GET /api/v1/views/:viewId
Authorization: Bearer <token>
```

#### 更新视图

```bash
PATCH /api/v1/views/:viewId
Authorization: Bearer <token>

{
  "name": "Updated View Name",
  "options": {
    "filter": {
      "conditions": [...]
    }
  }
}
```

#### 更新视图过滤器

```bash
PATCH /api/v1/views/:viewId/filter
Authorization: Bearer <token>

{
  "conditions": [
    {
      "fieldId": "field_123",
      "operator": "equals",
      "value": "Value"
    }
  ]
}
```

#### 更新视图排序

```bash
PATCH /api/v1/views/:viewId/sort
Authorization: Bearer <token>

{
  "sortObjs": [
    {
      "fieldId": "field_123",
      "order": "asc"
    }
  ]
}
```

### 7. 附件 (Attachments)

#### 生成上传签名

```bash
POST /api/v1/attachments/signature
Authorization: Bearer <token>

{
  "fileName": "image.jpg",
  "fileSize": 1024000,
  "mimeType": "image/jpeg"
}

# 响应
{
  "code": 200,
  "data": {
    "token": "upload_token_123",
    "expiresAt": "2025-01-01T12:00:00Z"
  }
}
```

#### 上传文件

```bash
POST /api/v1/attachments/upload/:token
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

#### 读取文件

```bash
GET /api/v1/attachments/read/:path
Authorization: Bearer <token>
```

#### 删除文件

```bash
DELETE /api/v1/attachments/:id
Authorization: Bearer <token>
```

## 🔍 查询和过滤

### 过滤条件

```json
{
  "filter": {
    "conditions": [
      {
        "fieldId": "field_123",
        "operator": "equals",
        "value": "Value"
      },
      {
        "operator": "and",
        "conditions": [
          {
            "fieldId": "field_456",
            "operator": "greaterThan",
            "value": 100
          }
        ]
      }
    ]
  }
}
```

**支持的运算符**:
- `equals`: 等于
- `notEquals`: 不等于
- `contains`: 包含
- `notContains`: 不包含
- `greaterThan`: 大于
- `lessThan`: 小于
- `greaterThanOrEqual`: 大于等于
- `lessThanOrEqual`: 小于等于
- `isEmpty`: 为空
- `isNotEmpty`: 不为空

### 排序条件

```json
{
  "sort": {
    "sortObjs": [
      {
        "fieldId": "field_123",
        "order": "asc"
      },
      {
        "fieldId": "field_456",
        "order": "desc"
      }
    ]
  }
}
```

## 📊 响应格式

### 成功响应

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    // 响应数据
  }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "Error message",
  "data": null
}
```

**HTTP状态码**:
- `200`: 成功
- `400`: 请求错误
- `401`: 未授权
- `403`: 禁止访问
- `404`: 未找到
- `500`: 服务器错误

## 🔗 实时通信

### WebSocket连接

```javascript
const ws = new WebSocket('ws://localhost:8888/socket');
ws.onopen = () => {
  // 发送认证
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-token'
  }));
};
```

### SSE连接

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

## 📖 相关文档

- [快速开始](./USAGE-QUICKSTART.md)
- [配置说明](./USAGE-CONFIGURATION.md)
- [功能特性](./FEATURES.md)

---

**最后更新**: 2025-01-XX

