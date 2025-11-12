# 分层架构详解

## 📐 四层架构

LuckDB 采用领域驱动设计（DDD）的四层架构，清晰分离关注点。

```
┌─────────────────────────────────────────┐
│    Interfaces Layer (接口层)            │
│    HTTP, WebSocket, SSE, MCP            │
├─────────────────────────────────────────┤
│    Application Layer (应用层)            │
│    业务逻辑编排、事务管理、DTO转换         │
├─────────────────────────────────────────┤
│    Domain Layer (领域层)                │
│    实体、值对象、领域服务、仓储接口        │
├─────────────────────────────────────────┤
│    Infrastructure Layer (基础设施层)      │
│    数据库、缓存、存储、消息队列            │
└─────────────────────────────────────────┘
```

## 1. Interfaces Layer (接口层)

**职责**: 处理外部请求，协议转换

### 主要组件

#### HTTP API (`internal/interfaces/http/`)

- **路由定义**: `routes.go` - 所有API路由
- **Handler**: 处理HTTP请求，调用Application Service
- **中间件**: 认证、限流、日志、CORS等

**主要路由组**:
- `/api/v1/auth` - 认证相关
- `/api/v1/users` - 用户管理
- `/api/v1/spaces` - 空间管理
- `/api/v1/bases` - Base管理
- `/api/v1/tables` - 表格管理
- `/api/v1/fields` - 字段管理
- `/api/v1/records` - 记录管理
- `/api/v1/views` - 视图管理
- `/api/v1/attachments` - 附件管理

#### WebSocket (`internal/interfaces/websocket/`)

- ShareDB WebSocket连接
- 实时协作同步

#### SSE (`internal/realtime/`)

- 服务器推送事件
- 实时通知

#### MCP (`internal/mcp/`)

- Model Context Protocol支持
- HTTP和SSE传输

### 设计原则

- **薄层**: Handler只负责请求解析和响应构建
- **无业务逻辑**: 所有业务逻辑在Application Layer
- **协议无关**: 业务逻辑不依赖HTTP细节

## 2. Application Layer (应用层)

**职责**: 业务逻辑编排、事务管理、DTO转换

### 主要服务 (`internal/application/`)

#### 核心服务

- **UserService**: 用户管理
- **SpaceService**: 空间管理
- **BaseService**: Base管理
- **TableService**: 表格管理
- **FieldService**: 字段管理
- **RecordService**: 记录管理
- **ViewService**: 视图管理

#### 计算服务

- **CalculationService**: 虚拟字段计算
- **FormulaService**: 公式计算
- **LookupService**: 查找字段
- **RollupService**: 汇总字段
- **CountService**: 计数字段

#### 其他服务

- **AuthService**: 认证服务
- **PermissionService**: 权限服务
- **AttachmentService**: 附件服务
- **HookService**: 钩子服务

### 设计模式

#### 1. Service编排

```go
// 示例：创建记录
func (s *RecordService) CreateRecord(ctx context.Context, req *CreateRecordRequest) (*RecordDTO, error) {
    // 1. 验证权限
    if err := s.checkPermission(ctx, req.TableID, "create"); err != nil {
        return nil, err
    }
    
    // 2. 验证数据
    if err := s.validateRecord(ctx, req); err != nil {
        return nil, err
    }
    
    // 3. 创建记录
    record := s.createRecordEntity(ctx, req)
    
    // 4. 触发计算
    s.triggerCalculation(ctx, record)
    
    // 5. 返回DTO
    return s.toDTO(record), nil
}
```

#### 2. 事务管理

```go
// TransactionManager 管理事务
func (s *RecordService) CreateRecordWithTransaction(ctx context.Context, req *CreateRecordRequest) error {
    return s.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
        // 事务内的操作
        record, err := s.createRecord(txCtx, req)
        if err != nil {
            return err
        }
        
        // 触发相关操作
        return s.triggerRelatedOperations(txCtx, record)
    })
}
```

#### 3. DTO转换

- **Request DTO**: 接收客户端请求
- **Domain Entity**: 领域实体
- **Response DTO**: 返回给客户端

## 3. Domain Layer (领域层)

**职责**: 核心业务模型、业务规则、领域逻辑

### 主要组件 (`internal/domain/`)

#### 实体 (Entity)

- **User**: 用户实体
- **Space**: 空间实体
- **Base**: Base实体
- **Table**: 表格实体
- **Field**: 字段实体
- **Record**: 记录实体
- **View**: 视图实体

#### 值对象 (Value Object)

- **ID**: 各种ID值对象
- **Name**: 名称值对象
- **Options**: 选项值对象
- **FieldType**: 字段类型

#### 领域服务 (Domain Service)

- **LinkService**: 关联字段服务
- **CalculationService**: 计算服务
- **DependencyService**: 依赖解析服务

#### 仓储接口 (Repository Interface)

- **UserRepository**: 用户仓储接口
- **TableRepository**: 表格仓储接口
- **RecordRepository**: 记录仓储接口
- **FieldRepository**: 字段仓储接口

### 设计原则

- **富领域模型**: 业务逻辑在实体中
- **不变性**: 值对象不可变
- **聚合根**: 管理聚合边界

### 示例：Record实体

```go
type Record struct {
    id        RecordID
    tableID   TableID
    data      RecordData
    version   RecordVersion
    createdAt time.Time
    updatedAt time.Time
}

// 业务方法
func (r *Record) UpdateField(fieldID FieldID, value interface{}) error {
    // 业务规则验证
    if r.isLocked() {
        return ErrRecordLocked
    }
    
    // 更新数据
    r.data.Set(fieldID, value)
    r.version.Increment()
    r.updatedAt = time.Now()
    
    return nil
}
```

## 4. Infrastructure Layer (基础设施层)

**职责**: 技术实现、外部系统集成

### 主要组件 (`internal/infrastructure/`)

#### 数据库 (`database/`)

- **Connection**: 数据库连接管理
- **Provider**: 数据库提供者接口（PostgreSQL/SQLite）
- **Repository实现**: 仓储的具体实现

#### 缓存 (`cache/`)

- **RedisClient**: Redis客户端
- **缓存策略**: 查询缓存、计算缓存

#### 存储 (`storage/`)

- **LocalStorage**: 本地存储
- **S3Storage**: S3存储（可选）
- **OSSStorage**: 阿里云OSS（可选）

#### 消息队列 (`pubsub/`)

- **事件发布订阅**: 领域事件分发

### 仓储实现模式

```go
// Repository接口定义在Domain Layer
type RecordRepository interface {
    FindByID(ctx context.Context, id RecordID) (*Record, error)
    Save(ctx context.Context, record *Record) error
}

// Repository实现在Infrastructure Layer
type recordRepository struct {
    db *gorm.DB
}

func (r *recordRepository) FindByID(ctx context.Context, id RecordID) (*Record, error) {
    // 数据库查询实现
    var model RecordModel
    if err := r.db.Where("id = ?", id).First(&model).Error; err != nil {
        return nil, err
    }
    
    // 转换为领域实体
    return r.toEntity(model), nil
}
```

## 🔄 层间交互

### 依赖方向

```
Interfaces → Application → Domain ← Infrastructure
```

- **向下依赖**: 上层依赖下层接口
- **依赖倒置**: Infrastructure实现Domain定义的接口

### 数据流

```
1. HTTP请求 → Handler
2. Handler → Application Service
3. Application Service → Domain Service / Entity
4. Domain Service → Repository Interface
5. Repository Implementation → Database
6. 返回路径相反
```

## 📖 相关文档

- [架构总览](./ARCHITECTURE-OVERVIEW.md)
- [依赖注入容器](./ARCHITECTURE-DI.md)
- [数据库设计](./ARCHITECTURE-DATABASE.md)

---

**最后更新**: 2025-01-XX

