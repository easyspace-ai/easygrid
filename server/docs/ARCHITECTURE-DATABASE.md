# 数据库设计

## 🗄️ 架构概述

LuckDB 采用 **Schema隔离**策略，每个 Base 使用独立的 PostgreSQL Schema，实现数据、权限和性能的完全隔离。

## 📐 Schema隔离策略

### 设计原则

- **每个Base一个Schema**: `bse_<base_id>`
- **每个Table一个物理表**: `tbl_<table_id>`
- **完全隔离**: 数据、权限、性能隔离

### Schema命名规则

```
Base ID: abc123
Schema名称: bse_abc123
```

### 表命名规则

```
Table ID: tbl_xyz789
表名: tbl_xyz789
完整路径: bse_abc123.tbl_xyz789
```

## 🏗️ 系统表结构

### 元数据表（公共Schema）

所有Base共享的元数据表：

#### 1. spaces - 空间表

```sql
CREATE TABLE spaces (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

#### 2. bases - Base表

```sql
CREATE TABLE bases (
    id VARCHAR(255) PRIMARY KEY,
    space_id VARCHAR(255) NOT NULL REFERENCES spaces(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

#### 3. table_meta - 表格元数据

```sql
CREATE TABLE table_meta (
    id VARCHAR(255) PRIMARY KEY,
    base_id VARCHAR(255) NOT NULL REFERENCES bases(id),
    name VARCHAR(255) NOT NULL,
    db_table_name VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

#### 4. fields - 字段元数据

```sql
CREATE TABLE fields (
    id VARCHAR(255) PRIMARY KEY,
    table_id VARCHAR(255) NOT NULL REFERENCES table_meta(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    db_field_name VARCHAR(255) NOT NULL,
    options JSONB,
    is_virtual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

#### 5. views - 视图元数据

```sql
CREATE TABLE views (
    id VARCHAR(255) PRIMARY KEY,
    table_id VARCHAR(255) NOT NULL REFERENCES table_meta(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    options JSONB,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

## 📊 物理表结构

### 系统字段

每个Table的物理表都包含以下系统字段：

```sql
CREATE TABLE bse_<base_id>.tbl_<table_id> (
    __id VARCHAR(255) PRIMARY KEY,
    __auto_number BIGSERIAL,
    __created_time TIMESTAMP NOT NULL DEFAULT NOW(),
    __last_modified_time TIMESTAMP NOT NULL DEFAULT NOW(),
    __created_by VARCHAR(255),
    __last_modified_by VARCHAR(255),
    __version INTEGER NOT NULL DEFAULT 1,
    
    -- 动态字段（根据Field定义添加）
    -- field_<field_id> <field_type>
);
```

### 系统字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `__id` | VARCHAR(255) | 记录唯一ID |
| `__auto_number` | BIGSERIAL | 自动编号 |
| `__created_time` | TIMESTAMP | 创建时间 |
| `__last_modified_time` | TIMESTAMP | 最后修改时间 |
| `__created_by` | VARCHAR(255) | 创建者ID |
| `__last_modified_by` | VARCHAR(255) | 最后修改者ID |
| `__version` | INTEGER | 版本号（乐观锁） |

## 🔗 Link字段实现

### ManyMany（多对多）

使用junction table存储关系：

```sql
-- Junction表
CREATE TABLE bse_<base_id>.junc_<link_field_id> (
    id VARCHAR(255) PRIMARY KEY,
    from_record_id VARCHAR(255) NOT NULL,
    to_record_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(from_record_id, to_record_id)
);

-- 索引
CREATE INDEX idx_junc_from ON bse_<base_id>.junc_<link_field_id>(from_record_id);
CREATE INDEX idx_junc_to ON bse_<base_id>.junc_<link_field_id>(to_record_id);
```

### ManyOne（多对一）

外键存储在当前表：

```sql
-- 在当前表添加列
ALTER TABLE bse_<base_id>.tbl_<table_id> 
ADD COLUMN field_<link_field_id> VARCHAR(255);

-- 索引
CREATE INDEX idx_field_link ON bse_<base_id>.tbl_<table_id>(field_<link_field_id>);
```

### OneMany（一对多）

外键存储在关联表（同ManyOne，但方向相反）。

### OneOne（一对一）

外键存储在其中一张表（同ManyOne）。

## 📑 索引策略

### 系统字段索引

每个物理表自动创建：

```sql
-- 主键索引（自动）
CREATE UNIQUE INDEX ON bse_<base_id>.tbl_<table_id>(__id);

-- 自动编号索引
CREATE UNIQUE INDEX ON bse_<base_id>.tbl_<table_id>(__auto_number);

-- 时间索引（用于排序和过滤）
CREATE INDEX ON bse_<base_id>.tbl_<table_id>(__created_time);
CREATE INDEX ON bse_<base_id>.tbl_<table_id>(__last_modified_time);

-- 用户索引
CREATE INDEX ON bse_<base_id>.tbl_<table_id>(__created_by);
CREATE INDEX ON bse_<base_id>.tbl_<table_id>(__last_modified_by);
```

### 字段索引

根据字段类型和选项自动创建：

```sql
-- 文本字段（如果启用索引）
CREATE INDEX ON bse_<base_id>.tbl_<table_id>(field_<field_id>);

-- JSONB字段（GIN索引）
CREATE INDEX USING GIN ON bse_<base_id>.tbl_<table_id>(field_<field_id>);
```

### 元数据表索引

```sql
-- Base查询
CREATE INDEX ON bases(space_id);
CREATE INDEX ON bases(created_at);

-- Table查询
CREATE INDEX ON table_meta(base_id);
CREATE INDEX ON table_meta(created_at);

-- Field查询
CREATE INDEX ON fields(table_id);
CREATE INDEX ON fields(type);
CREATE INDEX USING GIN ON fields(options); -- GIN索引用于JSONB

-- View查询
CREATE INDEX ON views(table_id);
CREATE INDEX ON views(type);
```

## 🔄 数据库操作

### Schema创建

```go
// 创建Base时创建Schema
func (p *PostgreSQLProvider) CreateSchema(ctx context.Context, schemaName string) error {
    query := fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", schemaName)
    return p.db.Exec(query).Error
}
```

### 物理表创建

```go
// 创建Table时创建物理表
func (p *PostgreSQLProvider) CreatePhysicalTable(ctx context.Context, schemaName, tableName string) error {
    query := fmt.Sprintf(`
        CREATE TABLE %s.%s (
            __id VARCHAR(255) PRIMARY KEY,
            __auto_number BIGSERIAL,
            __created_time TIMESTAMP NOT NULL DEFAULT NOW(),
            __last_modified_time TIMESTAMP NOT NULL DEFAULT NOW(),
            __created_by VARCHAR(255),
            __last_modified_by VARCHAR(255),
            __version INTEGER NOT NULL DEFAULT 1
        )
    `, schemaName, tableName)
    return p.db.Exec(query).Error
}
```

### 动态字段添加

```go
// 创建Field时添加列
func (p *PostgreSQLProvider) AddColumn(ctx context.Context, schemaName, tableName string, colDef ColumnDefinition) error {
    query := fmt.Sprintf(
        "ALTER TABLE %s.%s ADD COLUMN %s %s",
        schemaName, tableName, colDef.Name, colDef.Type,
    )
    return p.db.Exec(query).Error
}
```

## 🗃️ SQLite降级方案

当使用SQLite时，不支持Schema，使用表名前缀：

```
Base ID: abc123
表名前缀: bse_abc123_
表名: bse_abc123_tbl_xyz789
```

## 📊 性能优化

### 1. 连接池配置

```yaml
database:
  maxIdleConns: 10
  maxOpenConns: 100
  connMaxLifetime: 1h
```

### 2. 查询优化

- **使用索引**: 所有常用查询字段都有索引
- **批量操作**: 支持批量插入、更新、删除
- **分页查询**: 所有列表查询都支持分页

### 3. 缓存策略

- **元数据缓存**: Base、Table、Field元数据缓存
- **查询结果缓存**: 常用查询结果缓存
- **计算缓存**: 虚拟字段计算结果缓存

## 📖 相关文档

- [数据库迁移](../migrations/README.md)
- [数据库对比分析](./db-comparison/00-overview.md)
- [架构总览](./ARCHITECTURE-OVERVIEW.md)

---

**最后更新**: 2025-01-XX

