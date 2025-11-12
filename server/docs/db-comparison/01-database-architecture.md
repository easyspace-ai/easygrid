# 数据库架构对比

## 1.1 Schema 隔离策略

### Server 实现
**文件**：`server/internal/infrastructure/database/postgres_provider.go:34-50`

**实现细节**：
```go
// CreateSchema 创建独立的PostgreSQL Schema
// 参考旧系统：teable-develop/apps/nestjs-backend/src/db-provider/postgres.provider.ts
func (p *PostgresProvider) CreateSchema(ctx context.Context, schemaName string) error {
    // 1. 创建Schema
    createSQL := fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", p.quoteIdentifier(schemaName))
    
    // 2. 撤销public用户的权限（安全隔离）
    revokeSQL := fmt.Sprintf("REVOKE ALL ON SCHEMA %s FROM public", p.quoteIdentifier(schemaName))
}
```

**Schema 命名规则**：
- 格式：`bse_<base_id>`
- 每个 Base 独立 Schema
- 权限隔离：撤销 public 用户权限

### Teable 实现
**文件**：`teable-dev/packages/db-main-prisma/prisma/postgres/schema.prisma`

**Schema 命名规则**：
- 格式：`bse_<base_id>`
- 每个 Base 独立 Schema
- 权限隔离：撤销 public 用户权限

**对比结果**：
- ✅ **完全对齐**：Schema 隔离策略与 Teable 一致
- ✅ 命名规则：`bse_<base_id>` 格式
- ✅ 权限隔离：REVOKE public 权限
- ✅ 创建/删除流程：使用 CASCADE 删除

---

## 1.2 物理表结构

### Server 实现
**文件**：`server/internal/infrastructure/database/postgres_provider.go:66-149`

**系统字段定义**：
```sql
CREATE TABLE schema.table (
    __id VARCHAR(50) NOT NULL,
    __auto_number SERIAL PRIMARY KEY,
    __created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    __last_modified_time TIMESTAMP,
    __created_by VARCHAR(50) NOT NULL,
    __last_modified_by VARCHAR(50),
    __version INTEGER NOT NULL DEFAULT 1
)
```

**字段对比表**：

| 字段名 | Server 类型 | Teable 类型 | 对齐状态 | 说明 |
|--------|------------|------------|---------|------|
| `__id` | VARCHAR(50) | VARCHAR(50) | ✅ 对齐 | 记录唯一标识 |
| `__auto_number` | SERIAL PRIMARY KEY | SERIAL PRIMARY KEY | ✅ 对齐 | 自增序号，用于游标分页 |
| `__created_time` | TIMESTAMP NOT NULL | TIMESTAMP NOT NULL | ✅ 对齐 | 创建时间 |
| `__last_modified_time` | TIMESTAMP | TIMESTAMP | ✅ 对齐 | 最后修改时间 |
| `__created_by` | VARCHAR(50) NOT NULL | VARCHAR(50) NOT NULL | ✅ 对齐 | 创建者 |
| `__last_modified_by` | VARCHAR(50) | VARCHAR(50) | ✅ 对齐 | 最后修改者 |
| `__version` | INTEGER DEFAULT 1 | INTEGER DEFAULT 1 | ✅ 对齐 | 版本号（乐观锁） |

**对比结果**：
- ✅ **完全对齐**：系统字段定义与 Teable 完全一致
- ✅ 数据类型：VARCHAR 长度、TIMESTAMP 类型一致
- ✅ 默认值：`__version` 默认值为 1
- ✅ 约束：NOT NULL 约束一致

---

## 1.3 物理表命名规则

### Server 实现
**文件**：`server/internal/infrastructure/database/postgres_provider.go:338-342`

**命名规则**：
- Schema：`bse_<base_id>`
- 表名：`tbl_<table_id>`
- 完整表名：`"bse_<base_id>"."tbl_<table_id>"`

**代码实现**：
```go
func (p *PostgresProvider) GenerateTableName(schemaName, tableName string) string {
    return fmt.Sprintf("%s.%s", p.quoteIdentifier(schemaName), p.quoteIdentifier(tableName))
}
```

### Teable 实现
**命名规则**：
- Schema：`bse_<base_id>`
- 表名：`tbl_<table_id>`
- 完整表名：`"bse_<base_id>"."tbl_<table_id>"`

**对比结果**：
- ✅ **完全对齐**：命名规则与 Teable 一致
- ✅ 使用双引号标识符（防止关键字冲突）
- ✅ Schema 和表名分离

---

## 1.4 SQLite 支持

### Server 实现
**文件**：`server/internal/infrastructure/database/sqlite_provider.go`

**SQLite 降级方案**：
- SQLite 不支持 Schema，使用表名前缀：`<schema_name>_<table_name>`
- 系统字段类型适配：TEXT、INTEGER、DATETIME
- 索引策略保持一致

**对比结果**：
- ✅ **完全对齐**：SQLite 降级方案合理
- ✅ 系统字段类型适配正确
- ✅ 索引策略保持一致

---

## 总结

### 数据库架构对齐状态

| 项目 | Server | Teable | 对齐状态 |
|------|--------|--------|---------|
| Schema 隔离 | ✅ | ✅ | ✅ 完全对齐 |
| 物理表结构 | ✅ | ✅ | ✅ 完全对齐 |
| 系统字段 | ✅ | ✅ | ✅ 完全对齐 |
| 命名规则 | ✅ | ✅ | ✅ 完全对齐 |
| SQLite 支持 | ✅ | N/A | ✅ 合理降级 |

**结论**：数据库架构设计已完全对齐，无需修改。

