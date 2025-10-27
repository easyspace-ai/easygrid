/**
 * 类型映射工具
 * 将后端字段类型映射为 Grid 组件所需的类型
 */

import { CellType } from '@easygrid/aitable';

/**
 * 将后端字段类型映射为 Grid CellType
 */
export function mapFieldTypeToGridType(fieldType: string): CellType {
  const mapping: Record<string, CellType> = {
    // 文本类型
    'text': CellType.Text,
    'singleLineText': CellType.Text,
    'longText': CellType.Text,
    
    // 数字类型
    'number': CellType.Number,
    
    // 选择类型
    'select': CellType.Select,
    'singleSelect': CellType.Select,
    'multipleSelect': CellType.Select,
    
    // 日期时间
    'date': CellType.Date,
    
    // 布尔类型
    'checkbox': CellType.Boolean,
    
    // 其他类型
    'attachment': CellType.Attachment,
    'link': CellType.Link,
    'user': CellType.User,
    'rating': CellType.Rating,
    'formula': CellType.Formula,
    'email': CellType.Text,
    'phone': CellType.Text,
  };
  
  return mapping[fieldType] || CellType.Text;
}

/**
 * 将后端字段选项映射为 Grid 选择选项
 */
export function mapFieldOptionsToGridOptions(fieldOptions: any) {
  if (!fieldOptions) return undefined;
  
  // 处理单选和多选选项
  if (fieldOptions.choices) {
    return fieldOptions.choices.map((choice: any) => ({
      id: choice.id || choice.value,
      name: choice.name || choice.label,
      color: choice.color || '#3b82f6',
    }));
  }
  
  return undefined;
}
