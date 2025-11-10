# 关联字段（Link Field）存储逻辑说明

本文档说明关联字段（Link Field）在数据库中的存储方式和逻辑，参考 teable 的实现。

## 一、数据结构

### 1.1 字段选项（LinkFieldOptions）

关联字段的核心配置存储在字段的 `options` 中，包含以下关键信息：

```go
type LinkFieldOptions struct {
    // 关联表ID（必需）
    ForeignTableID string `json:"foreignTableId"`
    
    // 关系类型（必需）
    // oneOne: 一对一
    // manyMany: 多对多
    // oneMany: 一对多
    // manyOne: 多对一
    Relationship string `json:"relationship"`
    
    // 显示字段ID（必需）
    // 关联表中用于显示的字段ID，如果为空则自动使用关联表的第一个非虚拟字段
    LookupFieldID string `json:"lookupFieldId"`
    
    // 存储外键的表名（必需）
    // ManyMany: junction table 名称
    // ManyOne: 当前表名
    // OneMany: 关联表名
    // OneOne: 其中一个表名
    FkHostTableName string `json:"fkHostTableName"`
    
    // 自身主键字段名（必需，通常为 "__id"）
    SelfKeyName string `json:"selfKeyName"`
    
    // 外键字段名（必需，通常为 "__id"）
    ForeignKeyName string `json:"foreignKeyName"`
    
    // 对称字段ID（可选）
    // 关联表中的对称字段ID，用于双向关联
    SymmetricFieldID string `json:"symmetricFieldId,omitempty"`
    
    // 是否为单向关联（可选）
    IsOneWay bool `json:"isOneWay,omitempty"`
}
```

### 1.2 字段元数据存储

关联字段的元数据存储在 `fields` 表中：

- `id`: 字段ID
- `table_id`: 所属表ID
- `name`: 字段名称
- `type`: 字段类型（值为 `"link"`）
- `options`: JSON 格式的字段选项（包含 `LinkFieldOptions`）

## 二、数据库存储结构

根据关系类型（Relationship），关联字段在数据库中的存储方式不同：

### 2.1 多对多（ManyMany）

**存储方式：** 创建独立的 junction table（中间表）

**表结构：**
```sql
CREATE TABLE junction_table_name (
    __id SERIAL PRIMARY KEY,           -- 主键
    selfKeyName VARCHAR(50) NOT NULL,   -- 当前表记录ID
    foreignKeyName VARCHAR(50) NOT NULL, -- 关联表记录ID
    __order INTEGER                     -- 排序（可选）
);

-- 外键约束
ALTER TABLE junction_table_name
ADD CONSTRAINT fk_selfKeyName
FOREIGN KEY (selfKeyName) REFERENCES current_table(__id)
ON DELETE CASCADE;

ALTER TABLE junction_table_name
ADD CONSTRAINT fk_foreignKeyName
FOREIGN KEY (foreignKeyName) REFERENCES foreign_table(__id)
ON DELETE CASCADE;

-- 索引
CREATE INDEX idx_junction_selfKeyName ON junction_table_name (selfKeyName);
CREATE INDEX idx_junction_foreignKeyName ON junction_table_name (foreignKeyName);
```

**数据示例：**
```
junction_table_name:
__id | selfKeyName | foreignKeyName | __order
-----|-------------|----------------|--------
1    | rec1        | recA           | 0
2    | rec1        | recB           | 1
3    | rec2        | recA           | 0
```

### 2.2 多对一（ManyOne）

**存储方式：** 在当前表添加外键列

**表结构：**
```sql
-- 在当前表添加外键列
ALTER TABLE current_table
ADD COLUMN foreignKeyName VARCHAR(50);

-- 外键约束
ALTER TABLE current_table
ADD CONSTRAINT fk_foreignKeyName
FOREIGN KEY (foreignKeyName) REFERENCES foreign_table(__id)
ON DELETE SET NULL;

-- 索引
CREATE INDEX idx_current_table_foreignKeyName ON current_table (foreignKeyName);
```

**数据示例：**
```
current_table:
__id | name | foreignKeyName
-----|------|---------------
rec1 | A    | recX
rec2 | B    | recX
rec3 | C    | recY
```

### 2.3 一对多（OneMany）

**存储方式：** 在关联表添加外键列

**表结构：**
```sql
-- 在关联表添加外键列
ALTER TABLE foreign_table
ADD COLUMN selfKeyName VARCHAR(50);

-- 外键约束
ALTER TABLE foreign_table
ADD CONSTRAINT fk_selfKeyName
FOREIGN KEY (selfKeyName) REFERENCES current_table(__id)
ON DELETE SET NULL;

-- 索引
CREATE INDEX idx_foreign_table_selfKeyName ON foreign_table (selfKeyName);
```

**数据示例：**
```
foreign_table:
__id | name | selfKeyName
-----|------|------------
recX | X1   | rec1
recY | Y1   | rec1
recZ | Z1   | rec2
```

### 2.4 一对一（OneOne）

**存储方式：** 在其中一个表添加外键列（带唯一约束）

**表结构：**
```sql
-- 在当前表添加外键列（带唯一约束）
ALTER TABLE current_table
ADD COLUMN foreignKeyName VARCHAR(50) UNIQUE;

-- 外键约束
ALTER TABLE current_table
ADD CONSTRAINT fk_foreignKeyName
FOREIGN KEY (foreignKeyName) REFERENCES foreign_table(__id)
ON DELETE SET NULL;
```

**数据示例：**
```
current_table:
__id | name | foreignKeyName
-----|------|---------------
rec1 | A    | recX
rec2 | B    | recY
```

## 三、数据操作逻辑

### 3.1 创建关联字段

1. **创建字段元数据**
   - 在 `fields` 表中创建字段记录
   - `type` 设置为 `"link"`
   - `options` 包含 `LinkFieldOptions`

2. **创建数据库 Schema**
   - 根据 `Relationship` 类型创建相应的数据库结构
   - ManyMany: 创建 junction table
   - ManyOne: 在当前表添加外键列
   - OneMany: 在关联表添加外键列
   - OneOne: 在当前表添加外键列（带唯一约束）

3. **自动获取 LookupFieldID**
   - 如果前端未提供 `lookupFieldID`，后端自动从关联表获取第一个非虚拟字段作为 `lookupFieldID`
   - 虚拟字段类型：`formula`, `rollup`, `lookup`, `ai`

### 3.2 保存关联数据

#### 多对多（ManyMany）

```go
// 保存逻辑
for recordID, linkedRecordIDs := range linkData {
    // 删除旧关联
    DELETE FROM junction_table 
    WHERE selfKeyName = recordID AND foreignKeyName IN (oldLinkedRecordIDs)
    
    // 添加新关联
    for _, linkedRecordID := range linkedRecordIDs {
        INSERT INTO junction_table (selfKeyName, foreignKeyName) 
        VALUES (recordID, linkedRecordID)
    }
}
```

#### 多对一（ManyOne）

```go
// 保存逻辑
UPDATE current_table 
SET foreignKeyName = linkedRecordID 
WHERE __id = recordID
```

#### 一对多（OneMany）

```go
// 保存逻辑
UPDATE foreign_table 
SET selfKeyName = recordID 
WHERE __id IN (linkedRecordIDs)
```

#### 一对一（OneOne）

```go
// 保存逻辑
UPDATE current_table 
SET foreignKeyName = linkedRecordID 
WHERE __id = recordID
```

### 3.3 读取关联数据

#### 多对多（ManyMany）

```sql
-- 获取记录的所有关联记录
SELECT foreignKeyName 
FROM junction_table 
WHERE selfKeyName = recordID
ORDER BY __order
```

#### 多对一（ManyOne）

```sql
-- 获取记录的关联记录
SELECT foreignKeyName 
FROM current_table 
WHERE __id = recordID
```

#### 一对多（OneMany）

```sql
-- 获取记录的所有关联记录
SELECT __id 
FROM foreign_table 
WHERE selfKeyName = recordID
```

#### 一对一（OneOne）

```sql
-- 获取记录的关联记录
SELECT foreignKeyName 
FROM current_table 
WHERE __id = recordID
```

### 3.4 显示关联记录

关联记录在 UI 中显示时，使用 `LookupFieldID` 指定的字段值作为显示文本：

```go
// 获取关联记录的显示文本
linkedRecord := getRecord(foreignTableID, linkedRecordID)
lookupValue := linkedRecord.Data[lookupFieldID]
displayText := String(lookupValue)
```

## 四、双向关联（Symmetric Field）

当 `IsOneWay = false` 时，系统会自动创建对称字段：

1. **创建对称字段**
   - 在关联表中创建对应的 link 字段
   - `SymmetricFieldID` 指向关联表中的对称字段ID

2. **同步数据**
   - 当在一端添加/删除关联时，自动同步到另一端
   - 确保双向关联的一致性

## 五、参考实现

本实现参考了 teable 的关联字段设计：

- **前端实现：** `packages/grid/src/components/data-grid/link-field-editor.tsx`
- **后端实现：** `server/internal/domain/table/service/link_service.go`
- **Schema 创建：** `server/internal/infrastructure/database/schema/link_field_schema.go`
- **字段选项：** `server/internal/domain/table/valueobject/link_options.go`

## 六、关键代码位置

1. **字段创建：** `server/internal/application/field_service.go::CreateField`
2. **Schema 创建：** `server/internal/infrastructure/database/schema/link_field_schema.go::CreateLinkFieldSchema`
3. **数据保存：** `server/internal/domain/table/service/link_service.go::saveForeignKeyToDb`
4. **自动获取 LookupFieldID：** `server/internal/application/field_service.go::getPrimaryFieldID`

