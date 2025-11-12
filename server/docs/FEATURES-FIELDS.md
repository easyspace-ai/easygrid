# 字段类型说明

## 📋 字段类型分类

### 基础字段

存储用户输入的数据。

### 虚拟字段

通过计算或关联自动生成的数据。

## 📝 基础字段类型

### 1. SingleLineText (单行文本)

**用途**: 存储单行文本数据

**选项**:
```json
{
  "required": false,
  "defaultValue": "",
  "maxLength": 255
}
```

**示例**: 姓名、标题、标签

### 2. LongText (多行文本)

**用途**: 存储多行文本数据

**选项**:
```json
{
  "required": false,
  "defaultValue": "",
  "maxLength": 10000
}
```

**示例**: 描述、备注、内容

### 3. Number (数字)

**用途**: 存储数字数据

**选项**:
```json
{
  "required": false,
  "defaultValue": 0,
  "format": "number",  // number, currency, percent
  "precision": 2,
  "min": null,
  "max": null
}
```

**示例**: 价格、数量、分数

### 4. Rating (评分)

**用途**: 存储评分数据（1-5星）

**选项**:
```json
{
  "required": false,
  "defaultValue": 0,
  "max": 5,
  "icon": "star"
}
```

**示例**: 产品评分、满意度

### 5. Duration (时长)

**用途**: 存储时长数据

**选项**:
```json
{
  "required": false,
  "defaultValue": 0,
  "format": "h:mm"  // h:mm, h:mm:ss, d:h:mm
}
```

**示例**: 工作时长、任务耗时

### 6. Date (日期)

**用途**: 存储日期数据

**选项**:
```json
{
  "required": false,
  "format": "YYYY-MM-DD",
  "timeZone": "UTC"
}
```

**示例**: 生日、截止日期

### 7. DateTime (日期时间)

**用途**: 存储日期时间数据

**选项**:
```json
{
  "required": false,
  "format": "YYYY-MM-DD HH:mm:ss",
  "timeZone": "UTC"
}
```

**示例**: 创建时间、会议时间

### 8. SingleSelect (单选)

**用途**: 从预定义选项中选择一个

**选项**:
```json
{
  "required": false,
  "defaultValue": null,
  "choices": [
    {"id": "opt1", "name": "Option 1", "color": "blue"},
    {"id": "opt2", "name": "Option 2", "color": "green"}
  ]
}
```

**示例**: 状态、优先级、类别

### 9. MultipleSelect (多选)

**用途**: 从预定义选项中选择多个

**选项**:
```json
{
  "required": false,
  "defaultValue": [],
  "choices": [
    {"id": "opt1", "name": "Option 1", "color": "blue"},
    {"id": "opt2", "name": "Option 2", "color": "green"}
  ]
}
```

**示例**: 标签、技能、兴趣

### 10. Checkbox (复选框)

**用途**: 存储布尔值

**选项**:
```json
{
  "required": false,
  "defaultValue": false
}
```

**示例**: 是否完成、是否启用

### 11. User (用户)

**用途**: 关联用户

**选项**:
```json
{
  "required": false,
  "multiple": false,  // 是否支持多选
  "shouldNotify": false  // 是否通知用户
}
```

**示例**: 负责人、创建者、协作者

### 12. Attachment (附件)

**用途**: 存储文件附件

**选项**:
```json
{
  "required": false,
  "maxFileSize": 10485760,  // 10MB
  "allowedTypes": ["image/*", "application/pdf"]
}
```

**示例**: 文档、图片、视频

### 13. Button (按钮)

**用途**: 触发操作（不存储数据）

**选项**:
```json
{
  "action": "openUrl",
  "url": "https://example.com",
  "label": "Open Link"
}
```

**示例**: 外部链接、操作按钮

## 🧮 虚拟字段类型

### 1. Formula (公式字段)

**用途**: 通过公式计算值

**选项**:
```json
{
  "expression": "CONCATENATE({field_1}, ' ', {field_2})",
  "resultType": "text"
}
```

**支持的函数**:
- 数学函数: `SUM`, `AVERAGE`, `MAX`, `MIN`
- 文本函数: `CONCATENATE`, `UPPER`, `LOWER`, `LEN`
- 逻辑函数: `IF`, `AND`, `OR`, `NOT`
- 日期函数: `NOW`, `DATE`, `YEAR`, `MONTH`

**示例**:
```
CONCATENATE({First Name}, ' ', {Last Name})
SUM({Price}, {Tax})
IF({Status} = "Done", "Completed", "In Progress")
```

### 2. Lookup (查找字段)

**用途**: 从关联表中查找数据

**选项**:
```json
{
  "linkFieldId": "field_link_123",
  "lookupFieldId": "field_456",
  "aggregate": null  // sum, average, max, min, count
}
```

**示例**: 从订单表查找客户名称

### 3. Rollup (汇总字段)

**用途**: 汇总关联记录的值

**选项**:
```json
{
  "linkFieldId": "field_link_123",
  "rollupFieldId": "field_456",
  "function": "sum"  // sum, average, max, min, count
}
```

**示例**: 汇总订单总金额

### 4. Count (计数字段)

**用途**: 统计关联记录数量

**选项**:
```json
{
  "linkFieldId": "field_link_123"
}
```

**示例**: 统计订单数量

### 5. Link (关联字段)

**用途**: 建立表之间的关联关系

**选项**:
```json
{
  "relationship": "manyMany",  // manyMany, manyOne, oneMany, oneOne
  "foreignTableId": "table_456",
  "symmetricFieldId": "field_789"  // 对称字段（可选）
}
```

**关系类型**:
- **ManyMany**: 多对多（使用junction table）
- **ManyOne**: 多对一（外键在当前表）
- **OneMany**: 一对多（外键在关联表）
- **OneOne**: 一对一（外键在其中一张表）

**示例**: 订单-商品关联、用户-角色关联

## 🔄 字段操作

### 创建字段

```bash
POST /api/v1/tables/:tableId/fields

{
  "name": "Field Name",
  "type": "singleLineText",
  "options": {}
}
```

### 更新字段

```bash
PATCH /api/v1/fields/:fieldId

{
  "name": "Updated Name",
  "options": {
    "required": true
  }
}
```

### 删除字段

```bash
DELETE /api/v1/fields/:fieldId
```

### 字段类型转换

支持部分字段类型之间的转换：

- 文本字段之间: `singleLineText` ↔ `longText`
- 数字字段: `number` ↔ `rating`
- 选择字段: `singleSelect` ↔ `multipleSelect`

## 📖 相关文档

- [数据模型详解](./FEATURES-DATA-MODEL.md)
- [高级特性](./FEATURES-ADVANCED.md)
- [公式字段使用](./formula-field-usage.md)

---

**最后更新**: 2025-01-XX

