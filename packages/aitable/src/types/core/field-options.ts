/**
 * Field Options Type Definitions
 * Provides strict typing for all field option configurations
 */

import { FieldType, FIELD_TYPES } from './field-types';

/**
 * Base field options interface
 */
export interface BaseFieldOptions {
  readonly type: FieldType;
}

/**
 * Text field options
 */
export interface TextFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.SingleLineText | typeof FIELD_TYPES.LongText;
  readonly maxLength?: number;
  readonly defaultValue?: string;
}

/**
 * Number field options
 */
export interface NumberFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Number;
  readonly precision?: number;
  readonly formatting?: {
    readonly type?: 'number' | 'currency' | 'percent';
    readonly symbol?: string;
    readonly showThousandsSeparator?: boolean;
  };
  readonly defaultValue?: number;
  readonly min?: number;
  readonly max?: number;
}

/**
 * Select option interface
 */
export interface SelectOption {
  readonly id: string;
  readonly name: string;
  readonly color?: string;
}

/**
 * Single select field options
 */
export interface SingleSelectFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.SingleSelect;
  readonly options: SelectOption[];
  readonly defaultValue?: string;
}

/**
 * Multiple select field options
 */
export interface MultipleSelectFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.MultipleSelect;
  readonly options: SelectOption[];
  readonly defaultValue?: string[];
}

/**
 * Date field options
 */
export interface DateFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Date;
  readonly includeTime?: boolean;
  readonly dateFormat?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  readonly timeFormat?: '12' | '24';
  readonly defaultValue?: string; // ISO string
}

/**
 * Checkbox field options
 */
export interface CheckboxFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Checkbox;
  readonly defaultValue?: boolean;
}

/**
 * Rating field options
 */
export interface RatingFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Rating;
  readonly max?: number;
  readonly icon?: 'star' | 'heart' | 'thumbs' | 'fire' | 'smile';
  readonly color?: string;
  readonly defaultValue?: number;
}

/**
 * Link field options
 */
export interface LinkFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Link;
  readonly linkedTableId: string;
  readonly linkedFieldId?: string;
  readonly isOneWay?: boolean;
}

/**
 * User field options
 */
export interface UserFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.User | typeof FIELD_TYPES.CreatedBy | typeof FIELD_TYPES.LastModifiedBy;
  readonly isMultiple?: boolean;
  readonly shouldNotify?: boolean;
}

/**
 * Attachment field options
 */
export interface AttachmentFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Attachment;
  readonly allowedTypes?: string[];
  readonly maxSize?: number; // in bytes
  readonly maxCount?: number;
}

/**
 * Formula field options
 */
export interface FormulaFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Formula;
  readonly expression: string;
  readonly referencedFieldIds?: string[];
  readonly formatting?: NumberFieldOptions['formatting'];
}

/**
 * Rollup field options
 */
export interface RollupFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Rollup | typeof FIELD_TYPES.Count;
  readonly linkedFieldId: string;
  readonly rollupFieldId?: string;
  readonly aggregation: 'sum' | 'average' | 'min' | 'max' | 'count' | 'countA' | 'countAll';
  readonly formatting?: NumberFieldOptions['formatting'];
}

/**
 * Auto number field options
 */
export interface AutoNumberFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.AutoNumber;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly digits?: number;
}

/**
 * Button field options
 */
export interface ButtonFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Button;
  readonly label: string;
  readonly url?: string;
  readonly openMode?: 'currentTab' | 'newTab' | 'popup';
}

/**
 * Email field options
 */
export interface EmailFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Email;
  readonly defaultValue?: string;
}

/**
 * Phone field options
 */
export interface PhoneFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.Phone;
  readonly defaultValue?: string;
  readonly format?: string;
}

/**
 * URL field options
 */
export interface URLFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.URL;
  readonly defaultValue?: string;
}

/**
 * System field options (read-only fields)
 */
export interface SystemFieldOptions extends BaseFieldOptions {
  readonly type: typeof FIELD_TYPES.CreatedTime | typeof FIELD_TYPES.LastModifiedTime;
  readonly dateFormat?: DateFieldOptions['dateFormat'];
  readonly includeTime?: boolean;
}

/**
 * Union type for all field options
 */
export type FieldOptions =
  | TextFieldOptions
  | NumberFieldOptions
  | SingleSelectFieldOptions
  | MultipleSelectFieldOptions
  | DateFieldOptions
  | CheckboxFieldOptions
  | RatingFieldOptions
  | LinkFieldOptions
  | UserFieldOptions
  | AttachmentFieldOptions
  | FormulaFieldOptions
  | RollupFieldOptions
  | AutoNumberFieldOptions
  | ButtonFieldOptions
  | EmailFieldOptions
  | PhoneFieldOptions
  | URLFieldOptions
  | SystemFieldOptions;

/**
 * Type mapping from field type to options
 */
export type FieldOptionsMap = {
  [FIELD_TYPES.SingleLineText]: TextFieldOptions;
  [FIELD_TYPES.LongText]: TextFieldOptions;
  [FIELD_TYPES.Number]: NumberFieldOptions;
  [FIELD_TYPES.SingleSelect]: SingleSelectFieldOptions;
  [FIELD_TYPES.MultipleSelect]: MultipleSelectFieldOptions;
  [FIELD_TYPES.Date]: DateFieldOptions;
  [FIELD_TYPES.Checkbox]: CheckboxFieldOptions;
  [FIELD_TYPES.Rating]: RatingFieldOptions;
  [FIELD_TYPES.Link]: LinkFieldOptions;
  [FIELD_TYPES.User]: UserFieldOptions;
  [FIELD_TYPES.CreatedBy]: UserFieldOptions;
  [FIELD_TYPES.LastModifiedBy]: UserFieldOptions;
  [FIELD_TYPES.Attachment]: AttachmentFieldOptions;
  [FIELD_TYPES.Formula]: FormulaFieldOptions;
  [FIELD_TYPES.Rollup]: RollupFieldOptions;
  [FIELD_TYPES.Count]: RollupFieldOptions;
  [FIELD_TYPES.AutoNumber]: AutoNumberFieldOptions;
  [FIELD_TYPES.Button]: ButtonFieldOptions;
  [FIELD_TYPES.Email]: EmailFieldOptions;
  [FIELD_TYPES.Phone]: PhoneFieldOptions;
  [FIELD_TYPES.URL]: URLFieldOptions;
  [FIELD_TYPES.CreatedTime]: SystemFieldOptions;
  [FIELD_TYPES.LastModifiedTime]: SystemFieldOptions;
};

/**
 * Get field options type for a specific field type
 */
export type GetFieldOptions<T extends FieldType> = T extends keyof FieldOptionsMap
  ? FieldOptionsMap[T]
  : BaseFieldOptions;

/**
 * Type guard to check if options match a specific field type
 */
export function isFieldOptionsForType<T extends FieldType>(
  options: FieldOptions,
  fieldType: T
): options is GetFieldOptions<T> {
  return options.type === fieldType;
}

/**
 * Default options factory
 */
export const DefaultFieldOptions = {
  [FIELD_TYPES.SingleLineText]: (): TextFieldOptions => ({
    type: FIELD_TYPES.SingleLineText,
  }),
  
  [FIELD_TYPES.LongText]: (): TextFieldOptions => ({
    type: FIELD_TYPES.LongText,
  }),
  
  [FIELD_TYPES.Number]: (): NumberFieldOptions => ({
    type: FIELD_TYPES.Number,
    precision: 0,
    formatting: {
      type: 'number',
      showThousandsSeparator: false,
    },
  }),
  
  [FIELD_TYPES.SingleSelect]: (): SingleSelectFieldOptions => ({
    type: FIELD_TYPES.SingleSelect,
    options: [],
  }),
  
  [FIELD_TYPES.MultipleSelect]: (): MultipleSelectFieldOptions => ({
    type: FIELD_TYPES.MultipleSelect,
    options: [],
  }),
  
  [FIELD_TYPES.Date]: (): DateFieldOptions => ({
    type: FIELD_TYPES.Date,
    includeTime: false,
    dateFormat: 'YYYY-MM-DD',
  }),
  
  [FIELD_TYPES.Checkbox]: (): CheckboxFieldOptions => ({
    type: FIELD_TYPES.Checkbox,
    defaultValue: false,
  }),
  
  [FIELD_TYPES.Rating]: (): RatingFieldOptions => ({
    type: FIELD_TYPES.Rating,
    max: 5,
    icon: 'star',
  }),
  
  // Add other default options as needed...
} as const;