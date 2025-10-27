/**
 * 字段类型映射工具
 * 
 * 负责将 SDK 返回的字段类型和数据值转换为 Grid 组件所需的格式
 * 这个文件将 page.tsx 中的 getCellContent 逻辑内置到组件库中
 */

import { CellType } from '../grid/renderers/cell-renderer/interface';
import type { ICell } from '../grid/renderers/cell-renderer/interface';

/**
 * 字段类型图标映射
 */
export const FIELD_TYPE_ICONS: Record<string, string> = {
  text: '📝',
  singleLineText: '📝',
  longText: '📝',
  string: '📝',
  singleline: '📝',
  multiline: '📝',
  richtext: '📝',
  
  number: '🔢',
  integer: '🔢',
  float: '🔢',
  decimal: '🔢',
  currency: '💰',
  percent: '📊',
  autoNumber: '🔢',
  count: '🔢',
  
  boolean: '✓',
  checkbox: '✓',
  check: '✓',
  
  date: '📅',
  datetime: '📅',
  createdTime: '📅',
  lastModifiedTime: '📅',
  timestamp: '📅',
  time: '📅',
  createDate: '📅',
  modifyDate: '📅',
  createdDatetime: '📅',
  modifiedDatetime: '📅',
  
  select: '📋',
  singleSelect: '📋',
  dropdown: '📋',
  singleChoice: '📋',
  option: '📋',
  choice: '📋',
  
  multiSelect: '🏷️',
  multipleSelect: '🏷️',
  multipleSelects: '🏷️',
  multiChoice: '🏷️',
  multipleChoice: '🏷️',
  tags: '🏷️',
  categories: '🏷️',
  
  user: '👤',
  createdBy: '👤',
  lastModifiedBy: '👤',
  owner: '👤',
  assignee: '👤',
  collaborator: '👤',
  member: '👤',
  
  link: '🔗',
  url: '🔗',
  hyperlink: '🔗',
  website: '🔗',
  webUrl: '🔗',
  
  email: '📧',
  mail: '📧',
  emailAddress: '📧',
  
  phone: '📱',
  telephone: '📱',
  mobile: '📱',
  phoneNumber: '📱',
  contact: '📱',
  
  attachment: '📎',
  file: '📎',
  
  rating: '⭐',
  star: '⭐',
  
  formula: '🧮',
  rollup: '🔄',
  lookup: '🔍',
  reference: '🔗',
  
  button: '🔘',
  barcode: '📱',
  duration: '⏱️',
  progress: '📊',
};

/**
 * 获取字段类型对应的图标
 */
export function getFieldIcon(fieldType: string): string {
  const normalizedType = fieldType?.toLowerCase() || '';
  return FIELD_TYPE_ICONS[normalizedType] || FIELD_TYPE_ICONS[fieldType] || '📄';
}

/**
 * 将字段类型转换为 Grid CellType
 */
export function mapFieldTypeToCellType(fieldType: string): CellType {
  const normalizedType = (fieldType || '').toLowerCase();
  
  // 文本类型
  if (['text', 'singlelinetext', 'longtext', 'string', 'singleline', 'multiline', 'richtext', 'formula', 'email', 'mail', 'emailaddress'].includes(normalizedType)) {
    return CellType.Text;
  }
  
  // 数字类型
  if (['number', 'integer', 'float', 'decimal', 'currency', 'percent', 'autonumber', 'count'].includes(normalizedType)) {
    return CellType.Number;
  }
  
  // 布尔类型
  if (['boolean', 'checkbox', 'check'].includes(normalizedType)) {
    return CellType.Boolean;
  }
  
  // 日期类型
  if (['date', 'datetime', 'createdtime', 'lastmodifiedtime', 'timestamp', 'time', 'createdate', 'modifydate', 'createddatetime', 'modifieddatetime'].includes(normalizedType)) {
    return CellType.Date;
  }
  
  // 选择类型
  if (['select', 'singleselect', 'dropdown', 'singlechoice', 'option', 'choice', 'multiselect', 'multipleselect', 'multipleselects', 'multichoice', 'multiplechoice', 'tags', 'categories'].includes(normalizedType)) {
    return CellType.Select;
  }
  
  // 评分类型
  if (['rating', 'star'].includes(normalizedType)) {
    return CellType.Rating;
  }
  
  // 用户类型
  if (['user', 'createdby', 'lastmodifiedby', 'owner', 'assignee', 'collaborator', 'member'].includes(normalizedType)) {
    return CellType.User;
  }
  
  // 链接类型
  if (['url', 'link', 'hyperlink', 'website', 'weburl', 'attachment', 'phone', 'telephone', 'mobile', 'phonenumber', 'contact'].includes(normalizedType)) {
    return CellType.Link;
  }
  
  // 默认文本类型
  return CellType.Text;
}

/**
 * 判断是否是多选字段
 */
export function isMultiSelectField(fieldType: string): boolean {
  const normalizedType = (fieldType || '').toLowerCase();
  return ['multiselect', 'multipleselect', 'multipleselects', 'multichoice', 'multiplechoice', 'tags', 'categories'].includes(normalizedType);
}

/**
 * 判断是否是单选字段
 */
export function isSingleSelectField(fieldType: string): boolean {
  const normalizedType = (fieldType || '').toLowerCase();
  return ['select', 'singleselect', 'dropdown', 'singlechoice', 'option', 'choice'].includes(normalizedType);
}

/**
 * 将 SDK 字段值转换为 Grid Cell 格式
 */
export function convertFieldValueToCell(
  value: any,
  fieldType: string,
  fieldOptions?: any
): ICell {
  const normalizedType = (fieldType || '').toLowerCase();

  // ===== 文本类型 =====
  if (['text', 'singlelinetext', 'longtext', 'string', 'singleline', 'multiline', 'richtext', 'formula'].includes(normalizedType)) {
    return {
      type: CellType.Text,
      data: value ? String(value) : '',
      displayData: value ? String(value) : '',
    };
  }

  // ===== 数字类型 =====
  if (['number', 'integer', 'float', 'decimal', 'currency', 'percent', 'autonumber', 'count'].includes(normalizedType)) {
    const numValue = value != null ? Number(value) : 0;
    return {
      type: CellType.Number,
      data: numValue,
      displayData: String(numValue),
    };
  }

  // ===== 布尔类型 =====
  if (['boolean', 'checkbox', 'check'].includes(normalizedType)) {
    const boolValue = Boolean(value);
    return {
      type: CellType.Boolean,
      data: boolValue,
      displayData: boolValue ? '✓' : '',
    };
  }

  // ===== 日期类型 =====
  if (['date', 'datetime', 'createdtime', 'lastmodifiedtime', 'timestamp', 'time', 'createdate', 'modifydate', 'createddatetime', 'modifieddatetime'].includes(normalizedType)) {
    const dateStr = value ? String(value) : '';
    let displayStr = '';
    if (dateStr) {
      try {
        displayStr = new Date(dateStr).toLocaleDateString('zh-CN');
      } catch {
        displayStr = dateStr;
      }
    }
    return {
      type: CellType.Date,
      data: dateStr,
      displayData: displayStr,
    };
  }

  // ===== 单选类型 =====
  if (isSingleSelectField(normalizedType)) {
    const options = fieldOptions?.choices || [];
    const choiceMap = new Map<string, any>();
    options.forEach((choice: any) => {
      choiceMap.set(choice.id || choice.name, choice);
    });
    
    const strValue = value ? String(value) : '';
    
    return {
      type: CellType.Select,
      data: strValue ? [strValue] : [],
      displayData: strValue ? [strValue] : [],
      choiceMap,
      choiceSorted: options,
      isMultiple: false,
    } as any;
  }

  // ===== 多选类型 =====
  if (isMultiSelectField(normalizedType)) {
    const options = fieldOptions?.choices || [];
    const choiceMap = new Map<string, any>();
    options.forEach((choice: any) => {
      choiceMap.set(choice.id || choice.name, choice);
    });
    
    // 处理数组值
    let arrValue: string[] = [];
    if (Array.isArray(value)) {
      arrValue = value.map(v => String(v || '')).filter(v => v !== '');
    } else if (value) {
      arrValue = [String(value)];
    }
    
    return {
      type: CellType.Select,
      data: arrValue,
      displayData: arrValue,
      choiceMap,
      choiceSorted: options,
      isMultiple: true,
    } as any;
  }

  // ===== 评分类型 =====
  if (['rating', 'star'].includes(normalizedType)) {
    const ratingValue = value ? Number(value) : 0;
    return {
      type: CellType.Rating,
      data: ratingValue,
      displayData: String(ratingValue),
      icon: '⭐',
      color: '#fbbf24',
      max: 5,
    } as any;
  }

  // ===== 用户类型 =====
  if (['user', 'createdby', 'lastmodifiedby', 'owner', 'assignee', 'collaborator', 'member'].includes(normalizedType)) {
    const userName = value ? String(value) : '';
    return {
      type: CellType.User,
      data: userName ? [{ id: userName, name: userName, avatarUrl: '' }] : [],
      displayData: userName ? `👤 ${userName}` : '',
    };
  }

  // ===== URL 链接类型 =====
  if (['url', 'link', 'hyperlink', 'website', 'weburl', 'attachment'].includes(normalizedType)) {
    const linkValue = value ? String(value) : '';
    return {
      type: CellType.Link,
      data: {
        title: linkValue,
        url: linkValue,
      },
      displayData: linkValue,
    };
  }

  // ===== 邮箱类型 =====
  if (['email', 'mail', 'emailaddress'].includes(normalizedType)) {
    return {
      type: CellType.Text,
      data: value ? String(value) : '',
      displayData: value ? String(value) : '',
    };
  }

  // ===== 电话类型 =====
  if (['phone', 'telephone', 'mobile', 'phonenumber', 'contact'].includes(normalizedType)) {
    const phoneValue = value ? String(value) : '';
    return {
      type: CellType.Link,
      data: {
        title: phoneValue,
        url: phoneValue ? `tel:${phoneValue}` : '',
      },
      displayData: phoneValue,
    };
  }

  // ===== 默认文本类型 =====
  console.log(`⚠️ 未知字段类型 "${fieldType}" (normalized: "${normalizedType}")，使用文本类型. 值:`, value);
  return {
    type: CellType.Text,
    data: value ? String(value) : '',
    displayData: value ? String(value) : '',
  };
}

/**
 * 从 Record 中提取字段值
 * 支持多种数据结构：record.data[fieldId], record.fields[fieldName], record[fieldId]
 */
export function extractFieldValue(
  record: any,
  fieldId: string,
  fieldName?: string
): any {
  if (!record) return null;
  
  // 优先从 record.data 中查找
  if (record.data && typeof record.data === 'object') {
    if (fieldId in record.data) {
      return record.data[fieldId];
    }
    if (fieldName && fieldName in record.data) {
      return record.data[fieldName];
    }
  }
  
  // 其次从 record.fields 中查找
  if (record.fields && typeof record.fields === 'object') {
    if (fieldId in record.fields) {
      return record.fields[fieldId];
    }
    if (fieldName && fieldName in record.fields) {
      return record.fields[fieldName];
    }
  }
  
  // 最后直接从 record 中查找
  if (fieldId in record) {
    return record[fieldId];
  }
  if (fieldName && fieldName in record) {
    return record[fieldName];
  }
  
  return null;
}

/**
 * 创建 Grid 的 getCellContent 函数
 * 这是一个工厂函数，返回适配 Grid 接口的 getCellContent
 */
export function createGetCellContent(
  fields: any[],
  records: any[]
): (cell: [number, number]) => ICell {
  return (cell: [number, number]): ICell => {
    const [colIndex, rowIndex] = cell;
    
    // 边界检查
    if (colIndex < 0 || rowIndex < 0 || !records.length || !fields.length) {
      return {
        type: CellType.Text,
        data: '',
        displayData: '',
      };
    }

    const record = records[rowIndex];
    const field = fields[colIndex];

    if (!record || !field) {
      return {
        type: CellType.Text,
        data: '',
        displayData: '',
      };
    }

    // 提取字段值
    const value = extractFieldValue(record, field.id, field.name);

    // 转换为 Cell 格式
    return convertFieldValueToCell(value, field.type, field.options);
  };
}

/**
 * 将 SDK Fields 转换为 Grid Columns
 */
export function convertFieldsToColumns(fields: any[]): Array<{
  id: string;
  name: string;
  width: number;
  isPrimary: boolean;
  icon: string;
}> {
  return fields.map((field, index) => ({
    id: field.id,
    name: field.name,
    width: 150,
    isPrimary: field.isPrimary || field.primary || index === 0,
    icon: getFieldIcon(field.type),
  }));
}

