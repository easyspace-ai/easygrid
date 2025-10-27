/**
 * Cell Value Type Definitions
 * Provides strict typing for cell values based on field types
 */

import { FieldType, FIELD_TYPES } from './field-types';

/**
 * User reference interface
 */
export interface UserReference {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

/**
 * Attachment interface
 */
export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  thumbnailUrl?: string;
}

/**
 * Link record reference
 */
export interface LinkRecord {
  id: string;
  title?: string;
}

/**
 * Cell value type mapping for each field type
 */
export type CellValueMap = {
  [FIELD_TYPES.SingleLineText]: string | null;
  [FIELD_TYPES.LongText]: string | null;
  [FIELD_TYPES.Number]: number | null;
  [FIELD_TYPES.SingleSelect]: string | null;
  [FIELD_TYPES.MultipleSelect]: string[] | null;
  [FIELD_TYPES.Date]: string | null; // ISO date string
  [FIELD_TYPES.Checkbox]: boolean | null;
  [FIELD_TYPES.Rating]: number | null;
  [FIELD_TYPES.Link]: LinkRecord[] | null;
  [FIELD_TYPES.User]: UserReference[] | null;
  [FIELD_TYPES.CreatedBy]: UserReference | null;
  [FIELD_TYPES.LastModifiedBy]: UserReference | null;
  [FIELD_TYPES.Attachment]: Attachment[] | null;
  [FIELD_TYPES.Formula]: string | number | boolean | null;
  [FIELD_TYPES.Rollup]: number | null;
  [FIELD_TYPES.Count]: number | null;
  [FIELD_TYPES.AutoNumber]: number | null;
  [FIELD_TYPES.Button]: null; // Buttons don't store values
  [FIELD_TYPES.Email]: string | null;
  [FIELD_TYPES.Phone]: string | null;
  [FIELD_TYPES.URL]: string | null;
  [FIELD_TYPES.CreatedTime]: string | null; // ISO date string
  [FIELD_TYPES.LastModifiedTime]: string | null; // ISO date string
};

/**
 * Get cell value type for a specific field type
 */
export type GetCellValue<T extends FieldType> = T extends keyof CellValueMap
  ? CellValueMap[T]
  : unknown;

/**
 * Union type of all possible cell values
 */
export type CellValue = CellValueMap[keyof CellValueMap];

/**
 * Display value type mapping (for formatted display)
 */
export type DisplayValueMap = {
  [K in keyof CellValueMap]: string;
};

/**
 * Get display value type (always string)
 */
export type GetDisplayValue<T extends FieldType> = string;

/**
 * Input value type mapping (for user input)
 */
export type InputValueMap = {
  [FIELD_TYPES.SingleLineText]: string;
  [FIELD_TYPES.LongText]: string;
  [FIELD_TYPES.Number]: string | number;
  [FIELD_TYPES.SingleSelect]: string;
  [FIELD_TYPES.MultipleSelect]: string[];
  [FIELD_TYPES.Date]: string | Date;
  [FIELD_TYPES.Checkbox]: boolean;
  [FIELD_TYPES.Rating]: number;
  [FIELD_TYPES.Link]: string[]; // Record IDs
  [FIELD_TYPES.User]: string[]; // User IDs
  [FIELD_TYPES.CreatedBy]: string; // User ID
  [FIELD_TYPES.LastModifiedBy]: string; // User ID
  [FIELD_TYPES.Attachment]: File[] | Attachment[];
  [FIELD_TYPES.Formula]: never; // Formulas are computed, not input
  [FIELD_TYPES.Rollup]: never; // Rollups are computed, not input
  [FIELD_TYPES.Count]: never; // Counts are computed, not input
  [FIELD_TYPES.AutoNumber]: never; // Auto numbers are generated, not input
  [FIELD_TYPES.Button]: never; // Buttons don't accept input
  [FIELD_TYPES.Email]: string;
  [FIELD_TYPES.Phone]: string;
  [FIELD_TYPES.URL]: string;
  [FIELD_TYPES.CreatedTime]: never; // System field, not input
  [FIELD_TYPES.LastModifiedTime]: never; // System field, not input
};

/**
 * Get input value type for a specific field type
 */
export type GetInputValue<T extends FieldType> = T extends keyof InputValueMap
  ? InputValueMap[T]
  : never;

/**
 * Type guard functions for cell values
 */
export const CellValueGuards = {
  /**
   * Check if value is a valid text cell value
   */
  isTextValue(value: unknown): value is string | null {
    return typeof value === 'string' || value === null;
  },

  /**
   * Check if value is a valid number cell value
   */
  isNumberValue(value: unknown): value is number | null {
    return typeof value === 'number' || value === null;
  },

  /**
   * Check if value is a valid boolean cell value
   */
  isBooleanValue(value: unknown): value is boolean | null {
    return typeof value === 'boolean' || value === null;
  },

  /**
   * Check if value is a valid string array cell value
   */
  isStringArrayValue(value: unknown): value is string[] | null {
    return Array.isArray(value) && value.every(item => typeof item === 'string') || value === null;
  },

  /**
   * Check if value is a valid user reference
   */
  isUserReference(value: unknown): value is UserReference {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'name' in value &&
      typeof (value as any).id === 'string' &&
      typeof (value as any).name === 'string'
    );
  },

  /**
   * Check if value is a valid user reference array
   */
  isUserReferenceArray(value: unknown): value is UserReference[] | null {
    return Array.isArray(value) && value.every(CellValueGuards.isUserReference) || value === null;
  },

  /**
   * Check if value is a valid attachment
   */
  isAttachment(value: unknown): value is Attachment {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'name' in value &&
      'url' in value &&
      'size' in value &&
      'type' in value &&
      typeof (value as any).id === 'string' &&
      typeof (value as any).name === 'string' &&
      typeof (value as any).url === 'string' &&
      typeof (value as any).size === 'number' &&
      typeof (value as any).type === 'string'
    );
  },

  /**
   * Check if value is a valid attachment array
   */
  isAttachmentArray(value: unknown): value is Attachment[] | null {
    return Array.isArray(value) && value.every(CellValueGuards.isAttachment) || value === null;
  },

  /**
   * Check if value is a valid link record
   */
  isLinkRecord(value: unknown): value is LinkRecord {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof (value as any).id === 'string'
    );
  },

  /**
   * Check if value is a valid link record array
   */
  isLinkRecordArray(value: unknown): value is LinkRecord[] | null {
    return Array.isArray(value) && value.every(CellValueGuards.isLinkRecord) || value === null;
  },
};

/**
 * Cell value validation functions
 */
export const CellValueValidators = {
  /**
   * Validate cell value for a specific field type
   */
  validateForFieldType<T extends FieldType>(
    value: unknown,
    fieldType: T
  ): value is GetCellValue<T> {
    switch (fieldType) {
      case FIELD_TYPES.SingleLineText:
      case FIELD_TYPES.LongText:
      case FIELD_TYPES.Email:
      case FIELD_TYPES.Phone:
      case FIELD_TYPES.URL:
      case FIELD_TYPES.Date:
      case FIELD_TYPES.CreatedTime:
      case FIELD_TYPES.LastModifiedTime:
        return CellValueGuards.isTextValue(value);

      case FIELD_TYPES.Number:
      case FIELD_TYPES.Rating:
      case FIELD_TYPES.AutoNumber:
      case FIELD_TYPES.Count:
      case FIELD_TYPES.Rollup:
        return CellValueGuards.isNumberValue(value);

      case FIELD_TYPES.Checkbox:
        return CellValueGuards.isBooleanValue(value);

      case FIELD_TYPES.SingleSelect:
        return CellValueGuards.isTextValue(value);

      case FIELD_TYPES.MultipleSelect:
        return CellValueGuards.isStringArrayValue(value);

      case FIELD_TYPES.User:
        return CellValueGuards.isUserReferenceArray(value);

      case FIELD_TYPES.CreatedBy:
      case FIELD_TYPES.LastModifiedBy:
        return CellValueGuards.isUserReference(value) || value === null;

      case FIELD_TYPES.Attachment:
        return CellValueGuards.isAttachmentArray(value);

      case FIELD_TYPES.Link:
        return CellValueGuards.isLinkRecordArray(value);

      case FIELD_TYPES.Formula:
        return (
          CellValueGuards.isTextValue(value) ||
          CellValueGuards.isNumberValue(value) ||
          CellValueGuards.isBooleanValue(value)
        );

      case FIELD_TYPES.Button:
        return value === null;

      default:
        return false;
    }
  },
};