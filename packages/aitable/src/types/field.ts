/**
 * Field and cell value types - aligned with @teable/core
 */

/**
 * Cell Value Type - 数据值类型（用于 Formula/Rollup 等计算字段）
 */
export enum CellValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  DateTime = 'dateTime',
}

/**
 * Field Type Enum - 与参考项目对齐的字段类型定义
 */
export enum FieldType {
  Text = 'text',                    // 基础文本类型
  SingleLineText = 'singleLineText',
  LongText = 'longText',
  User = 'user',
  Attachment = 'attachment',
  Checkbox = 'checkbox',
  Select = 'select',                // 通用选择类型
  MultipleSelect = 'multipleSelect',
  SingleSelect = 'singleSelect',
  Date = 'date',
  Number = 'number',
  Rating = 'rating',
  Formula = 'formula',
  Rollup = 'rollup',
  Link = 'link',
  CreatedTime = 'createdTime',
  LastModifiedTime = 'lastModifiedTime',
  CreatedBy = 'createdBy',
  LastModifiedBy = 'lastModifiedBy',
  AutoNumber = 'autoNumber',
  Button = 'button',
  Email = 'email',
  Phone = 'phone',
  URL = 'url',
}

/**
 * Button field options
 */
export interface IButtonFieldOptions {
  label: string;
  color?: string;
}

/**
 * Button field cell value
 */
export interface IButtonFieldCellValue {
  count?: number; // 点击次数
}

/**
 * Date field options
 */
export interface IDateFieldOptions {
  formatting?: {
    date: string;
    time: 'None' | 'HH:mm' | 'HH:mm:ss';
    timeZone?: string;
  };
}

/**
 * Number field options
 */
export interface INumberFieldOptions {
  precision?: number;
  showAs?: {
    type: 'ring' | 'bar';
    color: string;
    maxValue: number;
    showValue: boolean;
  };
}

/**
 * Select field options
 */
export interface ISelectFieldOptions {
  choices: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  preventAutoNewOptions?: boolean;
}

/**
 * User field options
 */
export interface IUserFieldOptions {
  isMultiple?: boolean;
  preventAutoNewOptions?: boolean;
}

/**
 * Link field options
 */
export interface ILinkFieldOptions {
  relationship: 'oneOne' | 'oneMany' | 'manyOne' | 'manyMany';
  foreignTableId: string;
  lookupFieldId?: string;
  symmetricFieldId?: string;
}

/**
 * Rating Icon Types
 */
export enum RatingIcon {
  Star = 'star',
  Moon = 'moon',
  Sun = 'sun',
  Zap = 'zap',
  Flame = 'flame',
  Heart = 'heart',
  Apple = 'apple',
  ThumbUp = 'thumb-up',
}

/**
 * Rating field options
 */
export interface IRatingFieldOptions {
  icon: RatingIcon | string;
  color: string;
  max: number;
}

/**
 * Attachment field options
 */
export interface IAttachmentFieldOptions {
  // 可以扩展
}

/**
 * Formula field options
 */
export interface IFormulaFieldOptions {
  expression: string;
  formatting?: any;
  showAs?: any;
}

/**
 * Rollup field options
 */
export interface IRollupFieldOptions {
  expression: string;
  formatting?: any;
  showAs?: any;
}