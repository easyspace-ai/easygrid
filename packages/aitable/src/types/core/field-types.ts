/**
 * Core Field Types - 核心字段类型定义
 * 这是整个系统的"单一真相来源" (Single Source of Truth)
 * 
 * 设计原则：
 * 1. 使用 const assertion 而非 enum，更灵活
 * 2. 所有层都从这里导入，保证一致性
 * 3. 类型安全 + 运行时可用
 */

/**
 * 字段类型常量
 * 使用 const assertion 确保类型安全
 */
export const FIELD_TYPES = {
  // 文本类型
  SingleLineText: 'singleLineText',
  LongText: 'longText',
  
  // 数字类型
  Number: 'number',
  
  // 选择类型
  SingleSelect: 'singleSelect',
  MultipleSelect: 'multipleSelect',
  
  // 日期时间
  Date: 'date',
  CreatedTime: 'createdTime',
  LastModifiedTime: 'lastModifiedTime',
  
  // 关系类型
  Link: 'link',
  User: 'user',
  CreatedBy: 'createdBy',
  LastModifiedBy: 'lastModifiedBy',
  
  // 特殊类型
  Checkbox: 'checkbox',
  Rating: 'rating',
  Attachment: 'attachment',
  Button: 'button',
  
  // 计算类型
  Formula: 'formula',
  Rollup: 'rollup',
  Count: 'count',
  AutoNumber: 'autoNumber',
  
  // 联系方式
  Email: 'email',
  Phone: 'phone',
  URL: 'url',
} as const;

/**
 * 字段类型 - 从常量中提取类型
 */
export type FieldType = typeof FIELD_TYPES[keyof typeof FIELD_TYPES];

/**
 * 单元格值类型
 */
export const CELL_VALUE_TYPES = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  DateTime: 'dateTime',
} as const;

export type CellValueType = typeof CELL_VALUE_TYPES[keyof typeof CELL_VALUE_TYPES];

/**
 * 字段类型分类
 */
export const FIELD_TYPE_CATEGORIES = {
  // 文本类
  Text: [FIELD_TYPES.SingleLineText, FIELD_TYPES.LongText, FIELD_TYPES.Email, FIELD_TYPES.Phone, FIELD_TYPES.URL],
  
  // 数字类
  Numeric: [FIELD_TYPES.Number, FIELD_TYPES.Rating, FIELD_TYPES.AutoNumber, FIELD_TYPES.Count],
  
  // 选择类
  Select: [FIELD_TYPES.SingleSelect, FIELD_TYPES.MultipleSelect],
  
  // 日期类
  DateTime: [FIELD_TYPES.Date, FIELD_TYPES.CreatedTime, FIELD_TYPES.LastModifiedTime],
  
  // 关系类
  Relation: [FIELD_TYPES.Link, FIELD_TYPES.User, FIELD_TYPES.CreatedBy, FIELD_TYPES.LastModifiedBy],
  
  // 计算类
  Computed: [FIELD_TYPES.Formula, FIELD_TYPES.Rollup],
  
  // 只读类
  ReadOnly: [FIELD_TYPES.CreatedTime, FIELD_TYPES.LastModifiedTime, FIELD_TYPES.CreatedBy, FIELD_TYPES.LastModifiedBy, FIELD_TYPES.AutoNumber],
} as const;

/**
 * 类型工具函数
 */
export const FieldTypeUtils = {
  /**
   * 检查字段类型是否为计算字段
   */
  isComputed(type: FieldType): boolean {
    return FIELD_TYPE_CATEGORIES.Computed.includes(type as any);
  },
  
  /**
   * 检查字段类型是否为只读
   */
  isReadOnly(type: FieldType): boolean {
    return FIELD_TYPE_CATEGORIES.ReadOnly.includes(type as any);
  },
  
  /**
   * 检查字段类型是否为文本类
   */
  isTextType(type: FieldType): boolean {
    return FIELD_TYPE_CATEGORIES.Text.includes(type as any);
  },
  
  /**
   * 检查字段类型是否为数字类
   */
  isNumericType(type: FieldType): boolean {
    return FIELD_TYPE_CATEGORIES.Numeric.includes(type as any);
  },
  
  /**
   * 检查字段类型是否为选择类
   */
  isSelectType(type: FieldType): boolean {
    return FIELD_TYPE_CATEGORIES.Select.includes(type as any);
  },
  
  /**
   * 检查字段类型是否为日期类
   */
  isDateTimeType(type: FieldType): boolean {
    return FIELD_TYPE_CATEGORIES.DateTime.includes(type as any);
  },
  
  /**
   * 检查字段类型是否为关系类
   */
  isRelationType(type: FieldType): boolean {
    return FIELD_TYPE_CATEGORIES.Relation.includes(type as any);
  },
  
  /**
   * 获取字段类型的显示名称
   */
  getDisplayName(type: FieldType): string {
    const nameMap: Record<FieldType, string> = {
      [FIELD_TYPES.SingleLineText]: '单行文本',
      [FIELD_TYPES.LongText]: '多行文本',
      [FIELD_TYPES.Number]: '数字',
      [FIELD_TYPES.SingleSelect]: '单选',
      [FIELD_TYPES.MultipleSelect]: '多选',
      [FIELD_TYPES.Date]: '日期',
      [FIELD_TYPES.Checkbox]: '复选框',
      [FIELD_TYPES.Rating]: '评分',
      [FIELD_TYPES.Link]: '关联',
      [FIELD_TYPES.User]: '成员',
      [FIELD_TYPES.Attachment]: '附件',
      [FIELD_TYPES.Formula]: '公式',
      [FIELD_TYPES.Rollup]: '汇总',
      [FIELD_TYPES.Count]: '计数',
      [FIELD_TYPES.CreatedTime]: '创建时间',
      [FIELD_TYPES.LastModifiedTime]: '最后修改时间',
      [FIELD_TYPES.CreatedBy]: '创建人',
      [FIELD_TYPES.LastModifiedBy]: '最后修改人',
      [FIELD_TYPES.AutoNumber]: '自动编号',
      [FIELD_TYPES.Button]: '按钮',
      [FIELD_TYPES.Email]: '邮箱',
      [FIELD_TYPES.Phone]: '电话',
      [FIELD_TYPES.URL]: '链接',
    };
    return nameMap[type] || type;
  },
};

