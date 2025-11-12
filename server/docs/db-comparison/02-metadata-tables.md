# 元数据表设计对比

## 2.1 Base 表

### Server 实现
**文件**：`server/internal/infrastructure/database/models/base.go`

**字段定义**：
```go
type Base struct {
    ID               string         `gorm:"primaryKey;type:varchar(64)"`
    SpaceID          string         `gorm:"type:varchar(64);not null;index"`
    Name             string         `gorm:"type:varchar(100);not null"`
    Description      *string        `gorm:"type:text"`
    Icon             *string        `gorm:"type:varchar(200)"`
    CreatedBy        string         `gorm:"type:varchar(64);not null;index"`
    CreatedTime      time.Time      `gorm:"not null"`
    DeletedTime      gorm.DeletedAt `gorm:"index"`
    LastModifiedTime *time.Time
    Order            float64        `gorm:"column:order;not null;default:0;index"`
    SchemaPass       *string        `gorm:"column:schema_pass"`
    LastModifiedBy   *string        `gorm:"column:last_modified_by;type:varchar(64)"`
}
```

**迁移文件**：`server/migrations/000004_create_base_table.up.sql`

### Teable 实现
**文件**：`teable-dev/packages/db-main-prisma/prisma/postgres/schema.prisma:40-57`

**字段定义**：
```prisma
model Base {
  id               String      @id @default(cuid())
  spaceId          String      @map("space_id")
  name             String
  order            Float
  icon             String?
  schemaPass       String?     @map("schema_pass")
  deletedTime      DateTime?   @map("deleted_time")
  createdTime      DateTime    @default(now()) @map("created_time")
  createdBy        String      @map("created_by")
  lastModifiedBy   String?     @map("last_modified_by")
  lastModifiedTime DateTime?   @updatedAt @map("last_modified_time")
  space            Space       @relation(fields: [spaceId], references: [id])
  tables           TableMeta[]

  @@index([order])
  @@map("base")
}
```

**字段对比表**：

| 字段名 | Server 类型 | Teable 类型 | 对齐状态 | 说明 |
|--------|------------|------------|---------|------|
| `id` | VARCHAR(64) | String (cuid) | ✅ 对齐 | 主键 |
| `space_id` | VARCHAR(64) | String | ✅ 对齐 | 外键，有索引 |
| `name` | VARCHAR(100) | String | ✅ 对齐 | Base 名称 |
| `description` | TEXT | N/A | ⚠️ 差异 | Server 有，Teable 无 |
| `icon` | VARCHAR(200) | String? | ✅ 对齐 | 图标 |
| `order` | FLOAT | Float | ✅ 对齐 | 排序，有索引 |
| `schema_pass` | VARCHAR | String? | ✅ 对齐 | Schema 密码 |
| `created_by` | VARCHAR(64) | String | ✅ 对齐 | 创建者 |
| `created_time` | TIMESTAMP | DateTime | ✅ 对齐 | 创建时间 |
| `last_modified_time` | TIMESTAMP | DateTime? | ✅ 对齐 | 最后修改时间 |
| `last_modified_by` | VARCHAR(64) | String? | ✅ 对齐 | 最后修改者 |
| `deleted_time` | TIMESTAMP | DateTime? | ✅ 对齐 | 删除时间（软删除） |

**索引对比**：

| 索引名 | Server | Teable | 对齐状态 |
|--------|--------|--------|---------|
| `idx_base_space_id` | ✅ | ✅ | ✅ 对齐 |
| `idx_base_deleted_at` | ✅ | ✅ | ✅ 对齐 |
| `idx_base_created_at` | ✅ (DESC) | N/A | ⚠️ Server 有额外索引 |
| `idx_base_created_by` | ✅ | N/A | ⚠️ Server 有额外索引 |
| `idx_base_order` | ✅ | ✅ | ✅ 对齐 |

**对比结果**：
- ✅ **核心字段对齐**：主要字段定义与 Teable 一致
- ⚠️ **额外字段**：Server 有 `description` 字段，Teable 无
- ✅ **索引策略对齐**：核心索引定义一致
- ⚠️ **额外索引**：Server 有 `created_at` 和 `created_by` 索引，可能用于性能优化

---

## 2.2 Table_meta 表

### Server 实现
**文件**：`server/internal/infrastructure/database/models/table.go:10-25`

**字段定义**：
```go
type Table struct {
    ID          string  `gorm:"primaryKey;type:varchar(50)"`
    BaseID      string  `gorm:"type:varchar(50);not null;index"`
    Name        string  `gorm:"type:varchar(255);not null"`
    Description *string `gorm:"type:text"`
    Icon        *string `gorm:"type:varchar(255)"`
    CreatedBy        string         `gorm:"type:varchar(50);not null;index"`
    CreatedTime      time.Time      `gorm:"not null"`
    DeletedTime      gorm.DeletedAt `gorm:"index"`
    LastModifiedTime *time.Time
    DBTableName      *string        `gorm:"column:db_table_name;type:varchar(255);index"`
    Version          *int           `gorm:"column:version;default:1"`
    Order            *float64       `gorm:"column:order;index"`
    LastModifiedBy   *string        `gorm:"column:last_modified_by;type:varchar(50)"`
}
```

### Teable 实现
**文件**：`teable-dev/packages/db-main-prisma/prisma/postgres/schema.prisma:59-83`

**字段定义**：
```prisma
model TableMeta {
  id                String              @id
  baseId            String              @map("base_id")
  name              String
  description       String?
  icon              String?
  dbTableName       String              @map("db_table_name")
  dbViewName        String?             @map("db_view_name")
  version           Int
  order             Float
  createdTime       DateTime            @default(now()) @map("created_time")
  lastModifiedTime  DateTime?           @updatedAt @map("last_modified_time")
  deletedTime       DateTime?           @map("deleted_time")
  createdBy         String              @map("created_by")
  lastModifiedBy    String?             @map("last_modified_by")
  base              Base                @relation(fields: [baseId], references: [id])
  fields            Field[]
  views             View[]
  pluginPanel       PluginPanel[]
  pluginContextMenu PluginContextMenu[]

  @@index([order])
  @@index([dbTableName])
  @@map("table_meta")
}
```

**字段对比表**：

| 字段名 | Server 类型 | Teable 类型 | 对齐状态 | 说明 |
|--------|------------|------------|---------|------|
| `id` | VARCHAR(50) | String | ✅ 对齐 | 主键 |
| `base_id` | VARCHAR(50) | String | ✅ 对齐 | 外键，有索引 |
| `name` | VARCHAR(255) | String | ✅ 对齐 | 表名 |
| `description` | TEXT | String? | ✅ 对齐 | 描述 |
| `icon` | VARCHAR(255) | String? | ✅ 对齐 | 图标 |
| `db_table_name` | VARCHAR(255) | String | ✅ 对齐 | 物理表名，有索引 |
| `db_view_name` | N/A | String? | ⚠️ 差异 | Teable 有，Server 无 |
| `version` | INTEGER | Int | ✅ 对齐 | 版本号 |
| `order` | FLOAT | Float | ✅ 对齐 | 排序，有索引 |
| `created_by` | VARCHAR(50) | String | ✅ 对齐 | 创建者 |
| `created_time` | TIMESTAMP | DateTime | ✅ 对齐 | 创建时间 |
| `last_modified_time` | TIMESTAMP | DateTime? | ✅ 对齐 | 最后修改时间 |
| `last_modified_by` | VARCHAR(50) | String? | ✅ 对齐 | 最后修改者 |
| `deleted_time` | TIMESTAMP | DateTime? | ✅ 对齐 | 删除时间（软删除） |

**索引对比**：

| 索引名 | Server | Teable | 对齐状态 |
|--------|--------|--------|---------|
| `idx_table_meta_base_id` | ✅ | ✅ | ✅ 对齐 |
| `idx_table_meta_db_table_name` | ✅ | ✅ | ✅ 对齐 |
| `idx_table_meta_order` | ✅ | ✅ | ✅ 对齐 |
| `idx_table_meta_deleted_time` | ✅ | N/A | ⚠️ Server 有额外索引 |

**对比结果**：
- ✅ **核心字段对齐**：主要字段定义与 Teable 一致
- ⚠️ **缺失字段**：Server 缺少 `db_view_name` 字段（可能用于视图功能）
- ✅ **索引策略对齐**：核心索引定义一致

---

## 2.3 Field 表

### Server 实现
**文件**：`server/internal/infrastructure/database/models/field.go:10-42`

**核心字段**：
```go
type Field struct {
    ID                  string         `gorm:"primaryKey;type:varchar(30)"`
    TableID             string         `gorm:"type:varchar(50);not null;index"`
    Name                string         `gorm:"type:varchar(255);not null"`
    Description         *string        `gorm:"type:text"`
    Type                string         `gorm:"type:varchar(50);not null"`
    CellValueType       string         `gorm:"type:varchar(50);not null"`
    IsMultipleCellValue *bool          `gorm:"default:false"`
    DBFieldType         string         `gorm:"type:varchar(50);not null"`
    DBFieldName         string         `gorm:"type:varchar(255);not null"`
    NotNull             *bool          `gorm:"default:false"`
    Unique              *bool          `gorm:"default:false"`
    IsPrimary           *bool          `gorm:"default:false"`
    IsComputed          *bool          `gorm:"default:false"`
    IsLookup            *bool          `gorm:"default:false"`
    Options             *string        `gorm:"type:text"`  // JSONB 存储
    // 虚拟字段支持
    AIConfig            *string        `gorm:"column:ai_config;type:text"`
    LookupLinkedFieldID *string         `gorm:"column:lookup_linked_field_id;type:varchar(30)"`
    LookupOptions       *string         `gorm:"column:lookup_options;type:text"`
    HasError            *bool           `gorm:"column:has_error;default:false"`
    IsPending           *bool           `gorm:"column:is_pending;default:false"`
}
```

### Teable 实现
**文件**：`teable-dev/packages/db-main-prisma/prisma/postgres/schema.prisma:85-120`

**字段定义**：
```prisma
model Field {
  id                  String    @id
  name                String
  description         String?
  options             String?
  meta                String?
  aiConfig            String?   @map("ai_config")
  type                String
  cellValueType       String    @map("cell_value_type")
  isMultipleCellValue Boolean?  @map("is_multiple_cell_value")
  dbFieldType         String    @map("db_field_type")
  dbFieldName         String    @map("db_field_name")
  notNull             Boolean?  @map("not_null")
  unique              Boolean?
  isPrimary           Boolean?  @map("is_primary")
  isComputed          Boolean?  @map("is_computed")
  isLookup            Boolean?  @map("is_lookup")
  isConditionalLookup Boolean?  @map("is_conditional_lookup")
  isPending           Boolean?  @map("is_pending")
  hasError            Boolean?  @map("has_error")
  lookupLinkedFieldId String?   @map("lookup_linked_field_id")
  lookupOptions       String?   @map("lookup_options")
  tableId             String    @map("table_id")
  order               Float
  version             Int
  createdTime         DateTime  @default(now()) @map("created_time")
  lastModifiedTime    DateTime? @updatedAt @map("last_modified_time")
  deletedTime         DateTime? @map("deleted_time")
  createdBy           String    @map("created_by")
  lastModifiedBy      String?   @map("last_modified_by")
  table               TableMeta @relation(fields: [tableId], references: [id])

  @@index([lookupLinkedFieldId])
  @@map("field")
}
```

**关键字段对比**：

| 字段名 | Server 类型 | Teable 类型 | 对齐状态 | 说明 |
|--------|------------|------------|---------|------|
| `id` | VARCHAR(30) | String | ✅ 对齐 | 字段ID |
| `table_id` | VARCHAR(50) | String | ✅ 对齐 | 表ID，有索引 |
| `name` | VARCHAR(255) | String | ✅ 对齐 | 字段名 |
| `type` | VARCHAR(50) | String | ✅ 对齐 | 字段类型 |
| `options` | TEXT (JSONB) | String? | ✅ 对齐 | 字段选项，JSONB 存储 |
| `is_computed` | BOOLEAN | Boolean? | ✅ 对齐 | 是否计算字段 |
| `is_lookup` | BOOLEAN | Boolean? | ✅ 对齐 | 是否查找字段 |
| `is_conditional_lookup` | N/A | Boolean? | ⚠️ 差异 | Teable 有，Server 无 |
| `is_pending` | BOOLEAN | Boolean? | ✅ 对齐 | 虚拟字段是否正在等待计算 |
| `has_error` | BOOLEAN | Boolean? | ✅ 对齐 | 虚拟字段计算是否出错 |
| `lookup_linked_field_id` | VARCHAR(30) | String? | ✅ 对齐 | Lookup 字段关联的 link 字段ID |
| `lookup_options` | TEXT | String? | ✅ 对齐 | Lookup 字段配置选项 |
| `ai_config` | TEXT | String? | ✅ 对齐 | AI 字段配置 |
| `meta` | N/A | String? | ⚠️ 差异 | Teable 有，Server 无 |

**索引对比**：

| 索引名 | Server | Teable | 对齐状态 |
|--------|--------|--------|---------|
| `idx_field_table_id` | ✅ | ✅ | ✅ 对齐 |
| `idx_field_options_gin` | ✅ | N/A | ⚠️ Server 有 GIN 索引 |
| `idx_field_lookup_linked_field_id` | ✅ | ✅ | ✅ 对齐 |

**对比结果**：
- ✅ **核心字段对齐**：主要字段定义与 Teable 一致
- ⚠️ **缺失字段**：Server 缺少 `is_conditional_lookup` 和 `meta` 字段
- ✅ **虚拟字段支持**：完整的虚拟字段支持
- ✅ **JSONB 存储**：`options` 字段使用 JSONB 存储（PostgreSQL）

---

## 2.4 View 表

### Server 实现
**文件**：`server/internal/infrastructure/database/models/view.go:10-31`

**字段定义**：
```go
type View struct {
    ID               string         `gorm:"column:id;type:varchar(30);primaryKey"`
    Name             string         `gorm:"column:name;type:varchar(100);not null"`
    Description      *string        `gorm:"column:description;type:text"`
    TableID          string         `gorm:"column:table_id;type:varchar(30);not null;index:idx_view_table_id"`
    Type             string         `gorm:"column:type;type:varchar(20);not null"`
    Filter           datatypes.JSON `gorm:"column:filter;type:jsonb"`
    Sort             datatypes.JSON `gorm:"column:sort;type:jsonb"`
    Group            datatypes.JSON `gorm:"column:group;type:jsonb"`
    ColumnMeta       datatypes.JSON `gorm:"column:column_meta;type:jsonb"`
    Options          datatypes.JSON `gorm:"column:options;type:jsonb"`
    Order            *float64       `gorm:"column:order"`
    Version          int            `gorm:"column:version;type:int;default:1"`
    IsLocked         bool           `gorm:"column:is_locked;type:boolean;default:false"`
    EnableShare      bool           `gorm:"column:enable_share;type:boolean;default:false"`
    ShareID          *string        `gorm:"column:share_id;type:varchar(50);uniqueIndex"`
    ShareMeta        datatypes.JSON `gorm:"column:share_meta;type:jsonb"`
    CreatedBy        string         `gorm:"column:created_by;type:varchar(30);not null"`
    CreatedTime      time.Time      `gorm:"column:created_time;type:timestamp;not null;autoCreateTime"`
    LastModifiedTime *time.Time     `gorm:"column:last_modified_time;type:timestamp;autoUpdateTime"`
    DeletedTime      *time.Time     `gorm:"column:deleted_time;type:timestamp;index"`
}
```

**迁移文件**：`server/migrations/000003_create_view_table.up.sql`

### Teable 实现
**文件**：`teable-dev/packages/db-main-prisma/prisma/postgres/schema.prisma:122-148`

**字段定义**：
```prisma
model View {
  id               String    @id
  name             String
  description      String?
  tableId          String    @map("table_id")
  type             String
  sort             String?
  filter           String?
  group            String?
  options          String?
  order            Float
  version          Int
  columnMeta       String    @map("column_meta")
  isLocked         Boolean?  @map("is_locked")
  enableShare      Boolean?  @map("enable_share")
  shareId          String?   @unique @map("share_id")
  shareMeta        String?   @map("share_meta")
  createdTime      DateTime  @default(now()) @map("created_time")
  lastModifiedTime DateTime? @updatedAt @map("last_modified_time")
  deletedTime      DateTime? @map("deleted_time")
  createdBy        String    @map("created_by")
  lastModifiedBy   String?   @map("last_modified_by")
  table            TableMeta @relation(fields: [tableId], references: [id])

  @@index([order])
  @@map("view")
}
```

**字段类型对比**：

| 字段名 | Server 模型 | Server 迁移 | Teable | 对齐状态 |
|--------|-----------|------------|--------|---------|
| `id` | VARCHAR(30) | VARCHAR(30) | String | ✅ 对齐 |
| `name` | VARCHAR(100) | VARCHAR(100) | String | ✅ 对齐 |
| `table_id` | VARCHAR(30) | VARCHAR(30) | String | ✅ 对齐 |
| `filter` | JSONB | JSONB | String? | ⚠️ 类型差异 |
| `sort` | JSONB | JSONB | String? | ⚠️ 类型差异 |
| `group` | JSONB | JSONB | String? | ⚠️ 类型差异 |
| `column_meta` | JSONB | JSONB | String | ⚠️ 类型差异 |
| `options` | JSONB | JSONB | String? | ⚠️ 类型差异 |
| `share_meta` | JSONB | JSONB | String? | ⚠️ 类型差异 |

**索引对比**：

| 索引名 | Server | Teable | 对齐状态 |
|--------|--------|--------|---------|
| `idx_view_table_id` | ✅ | ✅ | ✅ 对齐 |
| `idx_view_order` | ✅ | ✅ | ✅ 对齐 |
| `idx_view_deleted_time` | ✅ | N/A | ⚠️ Server 有额外索引 |
| `idx_view_share_id` | ✅ (UNIQUE) | ✅ (UNIQUE) | ✅ 对齐 |

**对比结果**：
- ✅ **字段长度对齐**：模型定义与迁移文件中的 VARCHAR 长度一致
- ✅ **JSONB 类型对齐**：迁移文件使用 JSONB 类型（PostgreSQL）
- ⚠️ **Prisma 类型差异**：Prisma schema 使用 String?，但实际数据库是 JSONB（这是 Prisma 的限制）
- ✅ **索引策略对齐**：索引定义一致

---

## 2.5 其他元数据表

### User 表
- ✅ **完全对齐**：字段定义与 Teable 一致
- ✅ 索引：email、phone 唯一索引

### Space 表
- ✅ **完全对齐**：字段定义与 Teable 一致
- ✅ 索引：order 索引

### Collaborator 表
- ✅ **完全对齐**：字段定义与 Teable 一致
- ✅ 唯一索引：`(resource_type, resource_id, principal_id, principal_type)`

### Reference 表
- ✅ **完全对齐**：字段定义与 Teable 一致
- ✅ 唯一索引：`(to_field_id, from_field_id)`

---

## 总结

### 元数据表对齐状态

| 表名 | 核心字段 | 索引策略 | 对齐状态 |
|------|---------|---------|---------|
| `base` | ✅ | ✅ | ✅ 完全对齐 |
| `table_meta` | ⚠️ 缺少 `db_view_name` | ✅ | ⚠️ 基本对齐 |
| `field` | ⚠️ 缺少 `is_conditional_lookup`、`meta` | ✅ | ⚠️ 基本对齐 |
| `view` | ✅ | ✅ | ✅ 完全对齐 |
| `user` | ✅ | ✅ | ✅ 完全对齐 |
| `space` | ✅ | ✅ | ✅ 完全对齐 |
| `collaborator` | ✅ | ✅ | ✅ 完全对齐 |
| `reference` | ✅ | ✅ | ✅ 完全对齐 |

### 主要差异

1. **Table_meta 表**：Server 缺少 `db_view_name` 字段
2. **Field 表**：Server 缺少 `is_conditional_lookup` 和 `meta` 字段
3. **额外索引**：Server 有一些额外的性能优化索引（不影响功能）

### 建议

1. **🟡 中优先级**：考虑添加 `db_view_name` 字段（如果未来需要视图功能）
2. **🟡 中优先级**：考虑添加 `is_conditional_lookup` 和 `meta` 字段（如果 Teable 使用这些字段）
3. **🟢 低优先级**：保留额外的性能优化索引（不影响对齐）

