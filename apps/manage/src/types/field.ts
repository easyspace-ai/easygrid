// 字段类型定义
export const FieldType = {
  SingleLineText: 'singleLineText',
  LongText: 'longText',
  Number: 'number',
  SingleSelect: 'singleSelect',
  MultipleSelect: 'multipleSelect',
  Date: 'date',
  Boolean: 'boolean',
  User: 'user',
  Email: 'email',
  Phone: 'phone',
  Url: 'url',
  Rating: 'rating',
  Attachment: 'attachment',
  Formula: 'formula',
  Link: 'link',
  AutoNumber: 'autoNumber',
  CreatedTime: 'createdTime',
  LastModifiedTime: 'lastModifiedTime',
  CreatedBy: 'createdBy',
  LastModifiedBy: 'lastModifiedBy',
} as const;

export type FieldType = typeof FieldType[keyof typeof FieldType];

// 字段选项接口
export interface FieldOption {
  id: string;
  name: string;
  color?: string;
}

// 字段接口
export interface Field {
  id: string;
  name: string;
  type: FieldType;
  description?: string;
  options?: {
    choices?: FieldOption[];
    defaultValue?: any;
    isUnique?: boolean;
    isRequired?: boolean;
    displayStyle?: 'text' | 'url' | 'email' | 'phone';
  };
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 字段创建请求接口
export interface CreateFieldRequest {
  name: string;
  type: FieldType;
  description?: string;
  options?: {
    choices?: FieldOption[];
    defaultValue?: any;
    isUnique?: boolean;
    isRequired?: boolean;
    displayStyle?: 'text' | 'url' | 'email' | 'phone';
  };
}

// 字段更新请求接口
export interface UpdateFieldRequest {
  name?: string;
  type?: FieldType;
  description?: string;
  options?: {
    choices?: FieldOption[];
    defaultValue?: any;
    isUnique?: boolean;
    isRequired?: boolean;
    displayStyle?: 'text' | 'url' | 'email' | 'phone';
  };
}

// 字段类型信息
export interface FieldTypeInfo {
  type: FieldType;
  name: string;
  description: string;
  icon: string;
  category: 'basic' | 'advanced' | 'system';
}

// 字段类型配置
export const FIELD_TYPES: FieldTypeInfo[] = [
  // 基础类型
  {
    type: FieldType.Formula,
    name: '公式',
    description: '基于其他字段计算的值。',
    icon: '🧮',
    category: 'basic',
  },
  {
    type: FieldType.SingleLineText,
    name: '单行文本',
    description: '可输入单行文本，或为每个新单元格预填充一个默认值。',
    icon: '📝',
    category: 'basic',
  },
  {
    type: FieldType.LongText,
    name: '多行文本',
    description: '可输入多行文本，支持换行和格式化。',
    icon: '📄',
    category: 'basic',
  },
  {
    type: FieldType.Number,
    name: '数字',
    description: '可输入数字，支持整数和小数。',
    icon: '🔢',
    category: 'basic',
  },
  {
    type: FieldType.SingleSelect,
    name: '单选',
    description: '从预定义的选项中选择一个值。',
    icon: '📋',
    category: 'basic',
  },
  {
    type: FieldType.MultipleSelect,
    name: '多选',
    description: '从预定义的选项中选择多个值。',
    icon: '🏷️',
    category: 'basic',
  },
  {
    type: FieldType.Date,
    name: '日期',
    description: '选择日期和时间。',
    icon: '📅',
    category: 'basic',
  },
  {
    type: FieldType.Boolean,
    name: '复选框',
    description: '是或否的选择。',
    icon: '✓',
    category: 'basic',
  },
  {
    type: FieldType.User,
    name: '用户',
    description: '选择系统中的用户。',
    icon: '👤',
    category: 'basic',
  },
  {
    type: FieldType.Email,
    name: '邮箱',
    description: '输入邮箱地址。',
    icon: '📧',
    category: 'basic',
  },
  {
    type: FieldType.Phone,
    name: '电话',
    description: '输入电话号码。',
    icon: '📱',
    category: 'basic',
  },
  {
    type: FieldType.Url,
    name: '网址',
    description: '输入网址链接。',
    icon: '🔗',
    category: 'basic',
  },
  {
    type: FieldType.Rating,
    name: '评分',
    description: '1-5星的评分。',
    icon: '⭐',
    category: 'basic',
  },
  {
    type: FieldType.Attachment,
    name: '附件',
    description: '上传文件附件。',
    icon: '📎',
    category: 'basic',
  },
  // 高级类型
  {
    type: FieldType.Link,
    name: '关联',
    description: '关联到其他表格的记录。',
    icon: '🔗',
    category: 'advanced',
  },
  {
    type: FieldType.AutoNumber,
    name: '自动编号',
    description: '自动递增的数字。',
    icon: '🔢',
    category: 'advanced',
  },
  // 系统类型
  {
    type: FieldType.CreatedTime,
    name: '创建时间',
    description: '记录创建的时间。',
    icon: '⏰',
    category: 'system',
  },
  {
    type: FieldType.LastModifiedTime,
    name: '最后修改时间',
    description: '记录最后修改的时间。',
    icon: '⏰',
    category: 'system',
  },
  {
    type: FieldType.CreatedBy,
    name: '创建者',
    description: '创建记录的用户。',
    icon: '👤',
    category: 'system',
  },
  {
    type: FieldType.LastModifiedBy,
    name: '最后修改者',
    description: '最后修改记录的用户。',
    icon: '👤',
    category: 'system',
  },
];

// 按类别分组的字段类型
export const FIELD_TYPES_BY_CATEGORY = {
  basic: FIELD_TYPES.filter(f => f.category === 'basic'),
  advanced: FIELD_TYPES.filter(f => f.category === 'advanced'),
  system: FIELD_TYPES.filter(f => f.category === 'system'),
};

// 获取字段类型信息
export function getFieldTypeInfo(type: FieldType): FieldTypeInfo | undefined {
  return FIELD_TYPES.find(f => f.type === type);
}

// 获取字段类型描述
export function getFieldTypeDescription(type: FieldType): string {
  const info = getFieldTypeInfo(type);
  return info?.description || '';
}
