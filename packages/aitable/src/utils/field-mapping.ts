/**
 * 字段类型映射工具
 * 用于将 FieldType 映射到 CellType，以及获取字段类型的默认配置
 */

import { FieldType } from '../types/field';
import { CellType } from '../grid/renderers/cell-renderer/interface';

/**
 * FieldType 到 CellType 的映射表
 */
export const FIELD_TYPE_TO_CELL_TYPE_MAP: Record<FieldType, CellType> = {
  [FieldType.Text]: CellType.Text,              // 基础文本类型
  [FieldType.SingleLineText]: CellType.Text,
  [FieldType.LongText]: CellType.Text,
  [FieldType.User]: CellType.User,
  [FieldType.Attachment]: CellType.Attachment,
  [FieldType.Checkbox]: CellType.Boolean,
  [FieldType.Select]: CellType.Select,          // 通用选择类型
  [FieldType.MultipleSelect]: CellType.Select,
  [FieldType.SingleSelect]: CellType.Select,
  [FieldType.Date]: CellType.Date,
  [FieldType.Number]: CellType.Number,
  [FieldType.Rating]: CellType.Rating,
  [FieldType.Formula]: CellType.Text, // 根据计算结果类型动态确定
  [FieldType.Rollup]: CellType.Text,  // 根据汇总结果类型动态确定
  [FieldType.Link]: CellType.Link,
  [FieldType.CreatedTime]: CellType.Date,
  [FieldType.LastModifiedTime]: CellType.Date,
  [FieldType.CreatedBy]: CellType.User,
  [FieldType.LastModifiedBy]: CellType.User,
  [FieldType.AutoNumber]: CellType.Number,
  [FieldType.Button]: CellType.Button,
  [FieldType.Email]: CellType.Text,    // Email 字段显示为文本
  [FieldType.Phone]: CellType.Text,    // Phone 字段显示为文本
  [FieldType.URL]: CellType.Link,      // URL 字段显示为链接
};

/**
 * 获取字段类型对应的 CellType
 */
export function getCellTypeFromFieldType(fieldType: FieldType): CellType {
  return FIELD_TYPE_TO_CELL_TYPE_MAP[fieldType] || CellType.Text;
}

/**
 * 判断字段类型是否支持多选
 */
export function isMultiValueField(fieldType: FieldType): boolean {
  return fieldType === FieldType.MultipleSelect || 
         fieldType === FieldType.Link ||
         fieldType === FieldType.Attachment;
}

/**
 * 判断字段类型是否为只读（系统字段）
 */
export function isReadonlyField(fieldType: FieldType): boolean {
  return [
    FieldType.Formula,
    FieldType.Rollup,
    FieldType.CreatedTime,
    FieldType.LastModifiedTime,
    FieldType.CreatedBy,
    FieldType.LastModifiedBy,
    FieldType.AutoNumber,
  ].includes(fieldType);
}

/**
 * 判断字段类型是否为计算字段
 */
export function isComputedField(fieldType: FieldType): boolean {
  return fieldType === FieldType.Formula || fieldType === FieldType.Rollup;
}

/**
 * 获取字段类型的默认选项
 */
export function getDefaultFieldOptions(fieldType: FieldType): unknown {
  switch (fieldType) {
    case FieldType.SingleSelect:
    case FieldType.MultipleSelect:
      return {
        choices: [
          { id: '1', name: '选项1', color: 'blue' },
          { id: '2', name: '选项2', color: 'green' },
          { id: '3', name: '选项3', color: 'red' },
        ],
      };
    
    case FieldType.User:
    case FieldType.CreatedBy:
    case FieldType.LastModifiedBy:
      return {
        isMultiple: fieldType === FieldType.User,
      };
    
    case FieldType.Date:
    case FieldType.CreatedTime:
    case FieldType.LastModifiedTime:
      return {
        formatting: {
          date: 'YYYY-MM-DD',
          time: 'None',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };
    
    case FieldType.Number:
    case FieldType.AutoNumber:
      return {
        precision: 0,
      };
    
    case FieldType.Rating:
      return {
        icon: '⭐',
        color: '#FFD700',
        max: 5,
      };
    
    case FieldType.Button:
      return {
        label: '点击',
        color: 'blue',
      };
    
    default:
      return {};
  }
}
