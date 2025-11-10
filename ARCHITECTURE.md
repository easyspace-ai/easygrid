# EasyGrid 架构与功能说明

## 📋 版本概述

EasyGrid 是一个现代化的多维表格数据库系统（类似 Airtable），采用 Go 语言开发，基于 DDD（领域驱动设计）架构模式。

## 🏗️ 架构设计

### 分层架构

```
┌─────────────────────────────────────────┐
│         Interfaces Layer                │  HTTP API, WebSocket, MCP
├─────────────────────────────────────────┤
│         Application Layer               │  业务逻辑、服务编排
├─────────────────────────────────────────┤
│         Domain Layer                    │  实体、值对象、领域服务
├─────────────────────────────────────────┤
│         Infrastructure Layer            │  数据库、缓存、存储
└─────────────────────────────────────────┘
```

### 核心组件

1. **Domain Layer（领域层）**
   - `entity/`: 领域实体（User, Space, Base, Table, Field, Record）
   - `valueobject/`: 值对象（ID, Name, Options 等）
   - `service/`: 领域服务（LinkService, CalculationService 等）
   - `repository/`: 仓储接口定义

2. **Application Layer（应用层）**
   - `application/`: 应用服务（UserService, TableService, RecordService 等）
   - 业务逻辑编排
   - DTO 转换
   - 事务管理

3. **Infrastructure Layer（基础设施层）**
   - `database/`: 数据库连接和提供者
   - `cache/`: Redis 缓存
   - `storage/`: 文件存储
   - `repository/`: 仓储实现

4. **Interfaces Layer（接口层）**
   - `http/`: RESTful API
   - `websocket/`: WebSocket 实时通信
   - `mcp/`: MCP 协议支持

### 依赖注入

使用 `Container` 模式管理所有服务的生命周期和依赖关系：

```go
type Container struct {
    // 基础设施
    db          *database.Connection
    dbProvider  database.DBProvider
    cacheClient *cache.RedisClient
    
    // 仓储层
    userRepository    userRepo.UserRepository
    tableRepository   tableRepo.TableRepository
    recordRepository  recordRepo.RecordRepository
    // ...
    
    // 应用服务层
    userService    *application.UserService
    tableService   *application.TableService
    recordService  *application.RecordService
    // ...
}
```

## ✨ 核心功能

### 1. 数据模型管理

#### Space（空间）
- 多租户支持
- 空间级别的权限控制
- 空间成员管理

#### Base（基础）
- 空间内的数据容器
- Schema 隔离（PostgreSQL Schema）
- Base 级别的权限控制

#### Table（表格）
- 动态表结构
- 表级别的权限控制
- 表元数据管理

#### Field（字段）
- **基础字段类型**：
  - SingleLineText, LongText
  - Number, Rating, Duration
  - Date, DateTime
  - SingleSelect, MultipleSelect
  - Checkbox, User
  - Attachment, Button
  
- **虚拟字段类型**：
  - **Formula**: 公式计算字段
  - **Lookup**: 查找字段（从关联表获取数据）
  - **Rollup**: 汇总字段（聚合计算）
  - **Count**: 计数字段
  - **Link**: 关联字段（**最新实现**）

#### Record（记录）
- 动态字段值存储（JSONB）
- 版本控制（乐观锁）
- 批量操作支持

### 2. Link 字段（关联字段）✨ 最新实现

参考 teable 的实现，完整支持关联字段功能：

#### 支持的关系类型
- **ManyMany（多对多）**: 使用 junction table 存储关系
- **ManyOne（多对一）**: 外键存储在当前表
- **OneMany（一对多）**: 外键存储在关联表
- **OneOne（一对一）**: 外键存储在其中一张表

#### 核心功能
1. **数据库 Schema 自动创建**
   - ManyMany: 自动创建 junction table
   - ManyOne/OneOne: 自动添加外键列
   - 支持排序列（可选）

2. **外键管理**
   - 自动保存外键关系
   - 支持批量更新
   - 支持删除和清空

3. **对称字段同步**
   - 双向关联自动同步
   - 支持单向关联（性能优化）
   - 自动更新关联表的对称字段

4. **完整性检查**
   - 检查 JSON 列与外键表的一致性
   - 自动修复不一致的链接
   - 支持多值和单值关系检查

5. **LinkCellValue 支持**
   - 包含 ID 和 Title（从 lookup field 获取）
   - 支持单个值和数组值
   - 自动提取和转换

#### 实现文件
- `server/internal/domain/table/service/link_service.go`: Link 字段服务
- `server/internal/domain/table/service/link_integrity_service.go`: 完整性检查服务
- `server/internal/domain/table/valueobject/link_options.go`: Link 字段选项
- `server/internal/domain/table/valueobject/link_cell_value.go`: Link 单元格值
- `server/internal/infrastructure/database/schema/link_field_schema.go`: Schema 创建逻辑

### 3. 计算引擎

#### Formula（公式）
- 支持丰富的函数库
- 依赖图管理
- 自动重算受影响的字段
- 循环依赖检测

#### Lookup（查找）
- 从关联表获取数据
- 支持条件过滤
- 支持多值查找

#### Rollup（汇总）
- 支持多种聚合函数（SUM, AVG, COUNT, MAX, MIN 等）
- 支持条件过滤
- 支持分组汇总

#### Count（计数）
- 统计关联记录数量
- 支持条件过滤

### 4. 实时协作

#### ShareDB
- 基于 YJS 的实时协作
- 操作转换（OT）
- 冲突解决

#### WebSocket
- 实时数据同步
- 事件广播
- 多客户端支持

### 5. 视图管理

- 表格视图（Grid View）
- 看板视图（Kanban View）
- 日历视图（Calendar View）
- 视图过滤和排序
- 视图分组

### 6. 权限控制

- 基于角色的权限控制（RBAC）
- 空间级别权限
- Base 级别权限
- Table 级别权限
- 字段级别权限
- Action-based 权限模型

### 7. 事件驱动

- 领域事件发布
- 事件存储
- 事件总线
- 异步事件处理

### 8. 批量操作

- 批量创建记录
- 批量更新记录
- 批量删除记录
- 批量查询优化

## 🔌 MCP 支持

### 概述

EasyGrid **完全支持 MCP（Model Context Protocol）**，提供基于 HTTP 的 MCP 实现。

### MCP 配置

```yaml
mcp:
  enabled: true
  server:
    host: '0.0.0.0'
    port: 8081
    protocol: 'http'
    timeout: '30s'
  
  auth:
    api_key:
      enabled: true
      header: 'X-MCP-API-Key'
      format: 'key_id:key_secret'
    
    jwt:
      enabled: true
      header: 'Authorization'
      prefix: 'Bearer '
```

### MCP 工具

提供完整的 CRUD 工具集：

#### Base 工具
- `base.create`: 创建 Base
- `base.get`: 获取 Base
- `base.list`: 列出 Base
- `base.update`: 更新 Base
- `base.delete`: 删除 Base

#### Table 工具
- `table.create`: 创建 Table
- `table.get`: 获取 Table
- `table.list`: 列出 Table
- `table.update`: 更新 Table
- `table.delete`: 删除 Table

#### Field 工具
- `field.create`: 创建 Field
- `field.get`: 获取 Field
- `field.list`: 列出 Field
- `field.update`: 更新 Field
- `field.delete`: 删除 Field

#### Record 工具
- `record.create`: 创建 Record
- `record.get`: 获取 Record
- `record.query`: 查询 Record
- `record.search`: 搜索 Record
- `record.update`: 更新 Record
- `record.delete`: 删除 Record
- `record.bulk_create`: 批量创建
- `record.bulk_update`: 批量更新
- `record.bulk_delete`: 批量删除
- `record.aggregate`: 聚合查询

### MCP 认证

支持三种认证方式：

1. **API Key 认证**
   ```bash
   # 生成 API Key
   go run ./cmd/mcp-api-key/main.go -action=create
   
   # 使用 API Key
   curl -H "X-MCP-API-Key: key_id:secret" \
        http://localhost:8080/api/mcp/v1/tools
   ```

2. **JWT 认证**
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:8080/api/mcp/v1/tools
   ```

3. **Session 认证**
   - 基于 Cookie 的会话认证

### MCP 集成

#### Cursor 集成

编辑 `~/.cursor/mcp.json`:

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

#### 自动配置脚本

```bash
python3 server/scripts/update_cursor_mcp_config.py
```

### MCP 实现

- **标准库**: 使用 `github.com/mark3labs/mcp-go/server`
- **HTTP 协议**: 基于 HTTP 的 MCP 实现
- **工具注册**: 自动注册所有工具
- **上下文注入**: 支持用户ID、API Key ID、权限范围注入

## 🗄️ 数据库架构

### 动态表结构

- 每个 Base 使用独立的 PostgreSQL Schema
- 表结构完全动态（字段作为列）
- 支持 JSONB 字段存储复杂数据
- 自动创建 GIN 索引（JSONB 字段）

### Link 字段存储

- **ManyMany**: Junction table（`link_xxx_xxx`）
- **ManyOne**: 当前表的外键列
- **OneMany**: 关联表的外键列
- **OneOne**: 其中一张表的外键列

### 索引策略

- 主键索引（`__id`）
- JSONB GIN 索引（JSONB 字段）
- 外键索引（Link 字段）
- 唯一索引（Unique 字段）

## 🔄 数据流

### 记录创建流程

```
1. 接收请求 → 2. 验证权限 → 3. 验证数据
    ↓
4. 创建记录实体 → 5. 计算虚拟字段 → 6. 保存到数据库
    ↓
7. 发布领域事件 → 8. 广播 WebSocket → 9. 返回结果
```

### Link 字段更新流程

```
1. 接收 Link 字段更新 → 2. 提取变更上下文
    ↓
3. 解析外键变更 → 4. 保存外键到数据库
    ↓
5. 更新对称字段 → 6. 发布事件 → 7. 返回结果
```

## 🧪 测试

### 单元测试
- `link_service_test.go`: Link 服务单元测试
- `link_service_integration_test.go`: Link 服务集成测试

### 测试覆盖
- ✅ 外键保存逻辑（ManyMany, ManyOne）
- ✅ 记录 ID 提取
- ✅ Link 单元格值处理
- ✅ 完整性检查

## 📊 性能优化

1. **批量操作**: 支持批量创建、更新、删除
2. **缓存策略**: Redis 缓存热点数据
3. **依赖图优化**: 拓扑排序优化计算顺序
4. **数据库优化**: GIN 索引、连接池、查询优化
5. **异步处理**: 事件异步处理，不阻塞主流程

## 🔐 安全特性

1. **认证**: JWT、API Key、Session
2. **授权**: 基于角色的权限控制
3. **数据隔离**: Schema 级别的数据隔离
4. **API 限流**: 支持 Rate Limiting
5. **审计日志**: 操作审计记录

## 🚀 部署

### 依赖
- PostgreSQL 12+
- Redis 6+
- Go 1.21+

### 启动

```bash
# 开发环境
go run ./cmd/server/main.go serve

# 生产环境
luckdb serve --config production.yaml
```

## 📝 总结

EasyGrid 是一个功能完整的多维表格数据库系统，采用现代化的架构设计，支持：

- ✅ 完整的数据模型（Space, Base, Table, Field, Record）
- ✅ 强大的计算引擎（Formula, Lookup, Rollup, Count）
- ✅ **Link 字段完整实现**（参考 teable）
- ✅ 实时协作（ShareDB + WebSocket）
- ✅ **MCP 协议完整支持**
- ✅ 权限控制和数据安全
- ✅ 高性能和可扩展性

架构清晰、功能完善、易于扩展！

