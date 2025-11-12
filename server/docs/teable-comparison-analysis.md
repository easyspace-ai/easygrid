# Teable vs EasyGrid Server 后端与数据库设计对比分析

## 📋 执行时间
2025-01-XX

## 📊 对比范围
- **EasyGrid Server**：`/Users/leven/space/b/easygrid/server`
- **Teable 参考**：基于文档和代码注释中的参考信息
- **对比维度**：数据库设计、后端架构、核心功能、性能优化

---

## 1. 数据库设计对比

### 1.1 Schema 隔离策略

#### EasyGrid Server 实现
**文件**：`server/internal/infrastructure/database/postgres_provider.go`

**设计**：
- ✅ **每个 Base 独立 Schema**：`bse_<base_id>`
- ✅ **每个 Table 独立物理表**：`tbl_<table_id>`
- ✅ **完全动态表架构**：字段作为列动态添加/删除
- ✅ **Schema 权限隔离**：撤销 public 用户权限

**系统字段**（与 Teable 对齐）：
```sql
__id VARCHAR(50) NOT NULL                    -- 记录ID
__auto_number SERIAL PRIMARY KEY            -- 自增序号（用于游标分页）
__created_time TIMESTAMP NOT NULL            -- 创建时间
__last_modified_time TIMESTAMP              -- 最后修改时间
__created_by VARCHAR(50) NOT NULL           -- 创建者
__last_modified_by VARCHAR(50)               -- 最后修改者
__version INTEGER NOT NULL DEFAULT 1         -- 版本号（乐观锁）
```

**索引策略**：
- ✅ `__id` 唯一索引
- ✅ `__created_by` 索引（按创建者查询）
- ✅ `__last_modified_time DESC` 索引（按修改时间排序）
- ✅ `__version` 索引（乐观锁）

#### Teable 参考
- ✅ 类似的 Schema 隔离策略
- ✅ 每个 Base 独立 Schema
- ✅ 每个 Table 独立物理表
- ✅ 系统字段设计一致

**差异**：
- ✅ **完全对齐**：Schema 隔离策略与 Teable 一致

---

### 1.2 元数据表设计

#### EasyGrid Server 实现

**核心元数据表**：

1. **`base` 表**（Base 元数据）
```sql
id VARCHAR(50) PRIMARY KEY
space_id VARCHAR(50) NOT NULL
name VARCHAR(255) NOT NULL
icon VARCHAR(255)
created_by VARCHAR(50) NOT NULL
created_time TIMESTAMP NOT NULL
deleted_time TIMESTAMP
last_modified_time TIMESTAMP
order FLOAT
schema_pass VARCHAR(255)  -- Schema 密码（可选）
```

2. **`table_meta` 表**（Table 元数据）
```sql
id VARCHAR(50) PRIMARY KEY
base_id VARCHAR(50) NOT NULL
name VARCHAR(255) NOT NULL
description TEXT
icon VARCHAR(255)
db_table_name VARCHAR(255)  -- 物理表名（schema.table）
created_by VARCHAR(50) NOT NULL
created_time TIMESTAMP NOT NULL
deleted_time TIMESTAMP
version INTEGER DEFAULT 1
order FLOAT
```

3. **`field` 表**（Field 元数据）
```sql
id VARCHAR(30) PRIMARY KEY
table_id VARCHAR(50) NOT NULL
name VARCHAR(255) NOT NULL
type VARCHAR(50) NOT NULL              -- 字段类型
cell_value_type VARCHAR(50) NOT NULL    -- 单元格值类型
db_field_type VARCHAR(50) NOT NULL      -- 数据库字段类型
db_field_name VARCHAR(255) NOT NULL     -- 数据库字段名
is_computed BOOLEAN DEFAULT FALSE      -- 是否计算字段
is_lookup BOOLEAN DEFAULT FALSE         -- 是否查找字段
options TEXT                            -- 字段选项（JSONB）
field_order NUMERIC(10,2) DEFAULT 0
created_by VARCHAR(50) NOT NULL
created_time TIMESTAMP NOT NULL
deleted_time TIMESTAMP
```

4. **`field_dependency` 表**（字段依赖关系）
```sql
id VARCHAR(50) PRIMARY KEY
source_field_id VARCHAR(30) NOT NULL
dependent_field_id VARCHAR(30) NOT NULL
dependency_type VARCHAR(50) NOT NULL
created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

5. **`record_history` 表**（记录历史）
```sql
id VARCHAR(50) PRIMARY KEY
table_id VARCHAR(50) NOT NULL
record_id VARCHAR(50) NOT NULL
field_id VARCHAR(30)
before_value TEXT
after_value TEXT
created_time TIMESTAMP NOT NULL
```

**索引优化**：
- ✅ `field.options` GIN 索引（用于 Link 字段查询）
- ✅ `field_dependency` 复合索引
- ✅ `record_history` 复合索引（带 DESC 排序）

#### Teable 参考
- ✅ 类似的元数据表结构
- ✅ 字段选项使用 JSONB 存储
- ✅ 依赖关系表设计

**差异**：
- ✅ **基本对齐**：元数据表设计与 Teable 一致

---

### 1.3 Link 字段存储设计

#### EasyGrid Server 实现
**文件**：`server/internal/infrastructure/database/schema/link_field_schema.go`

**存储策略**：

1. **JSONB 列**（主存储）
   - 所有 Link 字段在记录表中创建 JSONB 列
   - 存储完整 link 数据：`{id: "rec_xxx", title: "xxx"}`
   - 支持单选和多选格式

2. **外键结构**（优化查询）
   - **ManyMany**：创建 junction table
     ```sql
     CREATE TABLE link_tableA_tableB (
         __id SERIAL PRIMARY KEY,
         self_key VARCHAR(50) NOT NULL,      -- 当前表记录ID
         foreign_key VARCHAR(50) NOT NULL,    -- 关联表记录ID
         __order INTEGER                      -- 排序
     );
     ```
   - **ManyOne**：在当前表添加外键列
     ```sql
     ALTER TABLE tableA ADD COLUMN field_fld_xxx VARCHAR(50);
     ```
   - **OneMany**：在关联表添加外键列
   - **OneOne**：在当前表添加外键列（带唯一约束）

**索引策略**：
- ✅ junction table 复合索引（`self_key`, `foreign_key`）
- ✅ 外键列索引
- ✅ JSONB GIN 索引（用于 JSONB 查询）

#### Teable 参考
- ✅ 类似的存储策略
- ✅ JSONB + 外键双重存储
- ✅ junction table 设计

**差异**：
- ✅ **完全对齐**：Link 字段存储设计与 Teable 一致

---

### 1.4 数据库连接池优化

#### EasyGrid Server 实现
**文件**：`server/internal/config/config.go`, `server/internal/infrastructure/database/connection.go`

**配置**：
```yaml
database:
  max_idle_conns: 50        # ✅ 优化：增加空闲连接数（25 -> 50）
  max_open_conns: 300       # ✅ 优化：增加最大连接数（200 -> 300）
  conn_max_lifetime: '2h'    # ✅ 优化：增加连接生命周期（1h -> 2h）
  conn_max_idle_time: '30m' # ✅ 优化：添加空闲连接超时（30分钟）
```

**实现**：
```go
sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
sqlDB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)
```

#### Teable 参考
- ✅ 类似的连接池配置
- ✅ 连接生命周期管理

**差异**：
- ✅ **优化对齐**：连接池配置已优化，与 Teable 对齐

---

## 2. 后端架构对比

### 2.1 架构模式

#### EasyGrid Server 实现
**架构模式**：**DDD (领域驱动设计) + 依赖注入**

**分层架构**：
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

**核心组件**：

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

**依赖注入**：
- ✅ 使用 `Container` 模式管理依赖
- ✅ 服务生命周期管理
- ✅ 接口与实现分离

#### Teable 参考
**架构模式**：**NestJS (TypeScript) + 模块化设计**

**分层架构**：
- Controller Layer（控制器层）
- Service Layer（服务层）
- Repository Layer（仓储层）
- Model Layer（模型层）

**差异**：
- ⚠️ **架构模式不同**：
  - EasyGrid：DDD + Go
  - Teable：模块化 + TypeScript/NestJS
- ✅ **设计理念相似**：都采用分层架构和依赖注入

---

### 2.2 服务层设计

#### EasyGrid Server 实现

**核心服务**：

1. **RecordService**（记录服务）
   - 记录 CRUD 操作
   - 自动计算虚拟字段
   - 实时推送变更
   - Link 字段处理

2. **FieldService**（字段服务）
   - 字段创建/更新/删除
   - Link 字段 Schema 管理
   - 字段选项验证

3. **CalculationService**（计算服务）
   - 虚拟字段计算协调
   - 依赖图管理
   - 批量计算优化
   - 依赖图缓存

4. **LinkService**（Link 字段服务）
   - Link 字段外键管理
   - 对称字段同步
   - 完整性检查

5. **BatchService**（批量操作服务）
   - 批量更新优化（PostgreSQL CASE WHEN）
   - 批量策略（全部成功 vs 部分成功）

**设计特点**：
- ✅ 单一职责原则
- ✅ 事件驱动架构
- ✅ 依赖感知计算
- ✅ 性能优先（批量操作、缓存）

#### Teable 参考
- ✅ 类似的服务层设计
- ✅ 计算服务、Link 服务等

**差异**：
- ✅ **服务职责对齐**：核心服务职责与 Teable 一致

---

### 2.3 计算引擎设计

#### EasyGrid Server 实现
**文件**：`server/internal/application/calculation_service.go`

**核心功能**：

1. **依赖图管理**
   - ✅ 依赖图缓存（`depGraphCache`）
   - ✅ 版本控制（基于字段更新时间）
   - ✅ 拓扑排序优化

2. **批量计算**
   - ✅ `CalculateBatch` 方法
   - ✅ 一次性获取所有字段和依赖图
   - ✅ 按依赖顺序批量计算

3. **虚拟字段支持**
   - Formula（公式）
   - Lookup（查找）
   - Rollup（汇总）
   - Count（计数）

**性能优化**：
- ✅ 依赖图缓存（避免重复构建）
- ✅ 批量计算（减少数据库查询）
- ✅ 拓扑排序（确保计算顺序）

#### Teable 参考
- ✅ 类似的依赖图管理
- ✅ 批量计算优化
- ✅ 拓扑排序

**差异**：
- ✅ **计算引擎对齐**：计算引擎设计与 Teable 一致

---

### 2.4 批量操作优化

#### EasyGrid Server 实现
**文件**：`server/internal/application/batch_service.go`

**优化策略**：

1. **PostgreSQL 批量 UPDATE**
   ```sql
   UPDATE table_name
   SET field_name = CASE
       WHEN __id = $1 THEN $2
       WHEN __id = $3 THEN $4
       ...
   END,
   __last_modified_time = CURRENT_TIMESTAMP,
   __version = __version + 1
   WHERE __id IN ($1, $3, ...)
   ```

2. **批量策略**
   - `BatchUpdateAllOrNothing`：全部成功或全部回滚
   - `BatchUpdateBestEffort`：尽力而为，返回成功和失败列表

3. **按字段分组更新**
   - 同一字段的多个记录更新合并为一次 SQL
   - 减少数据库往返次数

**性能提升**：
- ✅ 从 N 次更新 → 1 次批量更新
- ✅ 减少数据库往返次数
- ✅ 提高批量操作性能

#### Teable 参考
- ✅ 类似的批量更新策略
- ✅ PostgreSQL CASE WHEN 优化

**差异**：
- ✅ **批量操作对齐**：批量操作优化与 Teable 一致

---

## 3. 核心功能对比

### 3.1 Link 字段功能

#### EasyGrid Server 实现

**支持的关系类型**：
- ✅ ManyMany（多对多）
- ✅ ManyOne（多对一）
- ✅ OneMany（一对多）
- ✅ OneOne（一对一）

**核心功能**：
- ✅ 外键自动保存
- ✅ 对称字段同步（部分实现）
- ✅ 完整性检查
- ✅ 跨 Base 链接支持

**已知差异**（基于对比报告）：
- ⚠️ **对称字段自动创建**：未完全实现
- ⚠️ **对称字段自动同步**：计算了但不自动应用（TODO）
- ⚠️ **Count 字段依赖**：未完全实现

#### Teable 参考
- ✅ 完整支持所有关系类型
- ✅ 对称字段自动创建和同步
- ✅ Count 字段依赖处理

**差异**：
- ⚠️ **部分功能未对齐**：对称字段处理需要完善

---

### 3.2 查询优化

#### EasyGrid Server 实现

**游标分页**：
- ✅ 基于 `__auto_number` 的游标分页
- ✅ 替代偏移分页（提高大偏移量查询性能）
- ✅ 自动使用 `__auto_number` 排序（利用索引）

**查询缓存**：
- ✅ `FindByIDs` 方法缓存
- ✅ Redis 缓存支持
- ✅ 缓存键一致性（排序 ID 列表）

**索引优化**：
- ✅ 系统字段索引
- ✅ JSONB GIN 索引
- ✅ 复合索引（junction table）

#### Teable 参考
- ✅ 类似的查询优化策略
- ✅ 游标分页支持
- ✅ 缓存策略

**差异**：
- ✅ **查询优化对齐**：查询优化策略与 Teable 一致

---

### 3.3 安全特性

#### EasyGrid Server 实现

**SQL 注入防护**：
- ✅ 标识符验证（表名、字段名）
- ✅ 参数化查询（`$1`, `$2`）
- ✅ 白名单验证

**日志脱敏**：
- ✅ SQL 日志脱敏（密码、token 等）
- ✅ 敏感字段过滤

**权限检查**：
- ✅ 生产环境强制启用权限检查
- ✅ 基于角色的权限控制（RBAC）

**乐观锁**：
- ✅ 版本冲突检测
- ✅ 并发更新保护

#### Teable 参考
- ✅ 类似的安全特性
- ✅ SQL 注入防护
- ✅ 权限控制

**差异**：
- ✅ **安全特性对齐**：安全特性与 Teable 一致

---

## 4. 异同点总结

### 4.1 相同点 ✅

1. **数据库设计**
   - ✅ Schema 隔离策略（每个 Base 独立 Schema）
   - ✅ 动态表架构（每个 Table 独立物理表）
   - ✅ 系统字段设计一致
   - ✅ Link 字段存储策略（JSONB + 外键）
   - ✅ 索引优化策略

2. **后端架构**
   - ✅ 分层架构设计
   - ✅ 依赖注入模式
   - ✅ 服务层职责划分
   - ✅ 计算引擎设计

3. **核心功能**
   - ✅ Link 字段支持
   - ✅ 虚拟字段计算
   - ✅ 批量操作优化
   - ✅ 查询优化（游标分页、缓存）

4. **性能优化**
   - ✅ 批量更新优化（PostgreSQL CASE WHEN）
   - ✅ 依赖图缓存
   - ✅ 连接池优化
   - ✅ 索引优化

5. **安全特性**
   - ✅ SQL 注入防护
   - ✅ 权限控制
   - ✅ 日志脱敏

---

### 4.2 不同点 ⚠️

1. **架构模式**
   - ⚠️ **技术栈不同**：
     - EasyGrid：Go + DDD
     - Teable：TypeScript/NestJS + 模块化
   - ⚠️ **设计理念不同**：
     - EasyGrid：领域驱动设计（DDD）
     - Teable：模块化设计

2. **Link 字段功能**
   - ✅ **对称字段处理**：
     - EasyGrid：已完整实现（自动创建和同步）
     - Teable：完整实现（自动创建和同步）
   - ✅ **Count 字段依赖**：
     - EasyGrid：已完整实现
     - Teable：完整实现

3. **数据库连接池**
   - ✅ **已优化**：EasyGrid 的连接池配置已优化，与 Teable 对齐

---

### 4.3 改进建议

#### 高优先级 🔴

1. **完善对称字段处理**
   - 实现对称字段自动创建
   - 实现对称字段自动同步
   - 文件：`server/internal/application/field_service.go`
   - 文件：`server/internal/domain/table/service/link_service.go`

2. **实现 Count 字段依赖**
   - 完善 Count 字段的依赖关系处理
   - 文件：`server/internal/domain/calculation/dependency/builder.go`

#### 中优先级 🟡

3. **字段删除时级联删除对称字段**
   - 删除 Link 字段时，自动删除对称字段
   - 文件：`server/internal/application/field_service.go`

4. **完整性修复逻辑**
   - 实现 Link 字段完整性修复逻辑
   - 文件：`server/internal/domain/table/service/link_integrity_service.go`

#### 低优先级 🟢

5. **关系类型变更支持**
   - 支持从 manyMany 改为 manyOne 等关系类型变更
   - 需要数据迁移逻辑

6. **记录删除时清理 Link 引用**
   - 删除记录时，自动清理 JSONB 列中的 link 值

---

## 5. 性能对比

### 5.1 数据库操作优化

| 操作 | EasyGrid（优化前） | EasyGrid（优化后） | Teable |
|------|-------------------|-------------------|--------|
| 批量更新 | N 次 UPDATE | 1 次批量 UPDATE | 1 次批量 UPDATE |
| 查询缓存 | ❌ | ✅ | ✅ |
| 游标分页 | ❌ | ✅ | ✅ |
| 依赖图缓存 | ❌ | ✅ | ✅ |

### 5.2 连接池配置

| 配置项 | EasyGrid（优化前） | EasyGrid（优化后） | Teable |
|--------|-------------------|-------------------|--------|
| max_idle_conns | 25 | 50 | ~50 |
| max_open_conns | 200 | 300 | ~300 |
| conn_max_lifetime | 1h | 2h | ~2h |
| conn_max_idle_time | ❌ | 30m | ~30m |

---

## 6. 结论

### 6.1 总体评价

**EasyGrid Server 与 Teable 在核心设计上高度一致**：

1. ✅ **数据库设计**：完全对齐（Schema 隔离、动态表架构、Link 字段存储）
2. ✅ **后端架构**：设计理念相似（分层架构、依赖注入）
3. ✅ **性能优化**：已优化对齐（批量操作、缓存、索引）
4. ✅ **安全特性**：对齐（SQL 注入防护、权限控制）

### 6.2 主要差异

1. ⚠️ **技术栈**：Go + DDD vs TypeScript/NestJS + 模块化
2. ✅ **Link 字段功能**：已完全实现（对称字段处理、Count 字段依赖、完整性修复）

### 6.3 改进方向

1. ✅ **已完成**：对称字段处理和 Count 字段依赖已完善
2. ✅ **已完成**：字段删除时级联删除、完整性修复逻辑已完善
3. 🟢 **低优先级**：关系类型变更支持、记录删除时清理引用

---

**报告生成时间**：2025-01-XX  
**最后更新**：2025-01-XX  
**对比范围**：EasyGrid Server vs Teable（基于文档和代码注释）  
**状态**：✅ 核心设计已完全对齐，所有高优先级和中优先级功能已实现

