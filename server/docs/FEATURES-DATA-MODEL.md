# 数据模型详解

## 📐 数据模型层次

```
Space (空间)
  ├── Collaborator (协作者)
  └── Base (基础)
        ├── Collaborator (协作者)
        └── Table (表格)
              ├── Field (字段)
              ├── Record (记录)
              │     └── RecordData (记录数据)
              └── View (视图)
                    └── ViewOptions (视图选项)
```

## 🏢 Space (空间)

### 定义

Space是顶层组织单元，用于组织和管理多个Base。

### 属性

- **id**: 唯一标识符
- **name**: 空间名称
- **description**: 空间描述
- **icon**: 空间图标
- **createdAt**: 创建时间
- **updatedAt**: 更新时间

### 功能

- **多租户支持**: 每个Space完全隔离
- **协作者管理**: 支持添加、删除、修改协作者
- **权限控制**: Space级别的权限控制

## 📦 Base (基础)

### 定义

Base是Space内的数据容器，使用独立的PostgreSQL Schema。

### 属性

- **id**: 唯一标识符
- **spaceId**: 所属空间ID
- **name**: Base名称
- **description**: Base描述
- **icon**: Base图标
- **createdAt**: 创建时间
- **updatedAt**: 更新时间

### 功能

- **Schema隔离**: 每个Base使用独立的Schema
- **数据隔离**: 完全的数据隔离
- **性能隔离**: 独立的性能优化

### Schema命名

```
Base ID: abc123
Schema名称: bse_abc123
```

## 📊 Table (表格)

### 定义

Table是Base内的数据表，每个Table对应一个物理表。

### 属性

- **id**: 唯一标识符
- **baseId**: 所属Base ID
- **name**: 表格名称
- **description**: 表格描述
- **icon**: 表格图标
- **dbTableName**: 数据库表名
- **createdAt**: 创建时间
- **updatedAt**: 更新时间

### 功能

- **动态表结构**: 支持运行时创建表
- **物理表映射**: 每个Table对应一个物理表
- **表管理**: 支持重命名、复制、删除

### 表命名

```
Table ID: tbl_xyz789
表名: tbl_xyz789
完整路径: bse_abc123.tbl_xyz789
```

## 📝 Field (字段)

### 定义

Field是Table中的列定义，支持多种字段类型。

### 属性

- **id**: 唯一标识符
- **tableId**: 所属表格ID
- **name**: 字段名称
- **type**: 字段类型
- **dbFieldName**: 数据库字段名
- **options**: 字段选项（JSONB）
- **isVirtual**: 是否为虚拟字段
- **createdAt**: 创建时间
- **updatedAt**: 更新时间

### 字段类型

#### 基础字段

- **singleLineText**: 单行文本
- **longText**: 多行文本
- **number**: 数字
- **rating**: 评分
- **duration**: 时长
- **date**: 日期
- **dateTime**: 日期时间
- **singleSelect**: 单选
- **multipleSelect**: 多选
- **checkbox**: 复选框
- **user**: 用户
- **attachment**: 附件
- **button**: 按钮

#### 虚拟字段

- **formula**: 公式字段
- **lookup**: 查找字段
- **rollup**: 汇总字段
- **count**: 计数字段
- **link**: 关联字段

### 字段选项

不同字段类型有不同的选项：

```json
{
  "required": true,
  "defaultValue": "Default",
  "format": "currency",
  "precision": 2,
  "options": ["Option 1", "Option 2"]
}
```

## 📄 Record (记录)

### 定义

Record是Table中的数据行，包含动态字段值。

### 属性

- **id**: 唯一标识符（`__id`）
- **tableId**: 所属表格ID
- **autoNumber**: 自动编号（`__auto_number`）
- **data**: 记录数据（JSONB）
- **version**: 版本号（乐观锁）
- **createdAt**: 创建时间（`__created_time`）
- **createdBy**: 创建者（`__created_by`）
- **updatedAt**: 更新时间（`__last_modified_time`）
- **updatedBy**: 更新者（`__last_modified_by`）

### 系统字段

每个Record都包含以下系统字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `__id` | VARCHAR(255) | 记录唯一ID |
| `__auto_number` | BIGSERIAL | 自动编号 |
| `__created_time` | TIMESTAMP | 创建时间 |
| `__last_modified_time` | TIMESTAMP | 最后修改时间 |
| `__created_by` | VARCHAR(255) | 创建者ID |
| `__last_modified_by` | VARCHAR(255) | 最后修改者ID |
| `__version` | INTEGER | 版本号 |

### 记录数据

记录数据以JSONB格式存储：

```json
{
  "field_123": "Value 1",
  "field_456": 100,
  "field_789": ["Option 1", "Option 2"]
}
```

## 👁️ View (视图)

### 定义

View是Table的数据展示方式，支持不同的视图类型。

### 属性

- **id**: 唯一标识符
- **tableId**: 所属表格ID
- **name**: 视图名称
- **type**: 视图类型
- **options**: 视图选项（JSONB）
- **createdAt**: 创建时间
- **updatedAt**: 更新时间

### 视图类型

- **grid**: 网格视图（表格形式）
- **kanban**: 看板视图
- **form**: 表单视图
- **gallery**: 画廊视图

### 视图选项

```json
{
  "filter": {
    "conditions": [...]
  },
  "sort": {
    "sortObjs": [...]
  },
  "group": {
    "fieldId": "field_123"
  },
  "columnMeta": {
    "field_123": {
      "width": 200,
      "hidden": false
    }
  }
}
```

## 🔗 关联关系

### Link字段

Link字段用于建立表之间的关联关系。

#### 关系类型

- **ManyMany**: 多对多关系（使用junction table）
- **ManyOne**: 多对一关系（外键在当前表）
- **OneMany**: 一对多关系（外键在关联表）
- **OneOne**: 一对一关系（外键在其中一张表）

#### Junction Table

多对多关系使用junction table：

```sql
CREATE TABLE bse_<base_id>.junc_<link_field_id> (
    id VARCHAR(255) PRIMARY KEY,
    from_record_id VARCHAR(255) NOT NULL,
    to_record_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(from_record_id, to_record_id)
);
```

## 📖 相关文档

- [字段类型说明](./FEATURES-FIELDS.md)
- [高级特性](./FEATURES-ADVANCED.md)
- [数据库设计](./ARCHITECTURE-DATABASE.md)

---

**最后更新**: 2025-01-XX

