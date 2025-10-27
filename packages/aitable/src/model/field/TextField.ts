/**
 * Text Field Model
 * Handles single line text and long text fields with strict typing
 * 
 * @example
 * ```typescript
 * const field = new TextField({
 *   id: 'fld1',
 *   name: 'Description',
 *   type: FIELD_TYPES.SingleLineText,
 *   tableId: 'tbl1',
 *   options: {
 *     type: FIELD_TYPES.SingleLineText,
 *     maxLength: 100,
 *     defaultValue: '',
 *   },
 *   isComputed: false,
 *   isPrimary: false,
 * });
 * ```
 */

import { Field, type StrictFieldConfig } from './Field';
import { FIELD_TYPES } from '../../types/core/field-types';
import type { FieldType } from '../../types/core/field-types';
import type { TextFieldOptions } from '../../types/core/field-options';
import type { GetCellValue, GetDisplayValue } from '../../types/core/cell-values';

/**
 * Text field type union
 */
export type TextFieldType = typeof FIELD_TYPES.SingleLineText | typeof FIELD_TYPES.LongText;

/**
 * Text field configuration
 */
export type TextFieldConfig = StrictFieldConfig<TextFieldType>;

/**
 * TextField implementation with strict typing
 */
export class TextField extends Field<TextFieldType> {
  /**
   * Constructor
   */
  constructor(config: TextFieldConfig) {
    super(config);
  }

  /**
   * Get text field specific options
   */
  get textOptions(): TextFieldOptions {
    return this.options as TextFieldOptions;
  }

  /**
   * Validate text value
   * 
   * @param value - Value to validate
   * @returns true if valid, false otherwise
   */
  validate(value: unknown): boolean {
    // Empty value is valid unless required
    if (this.isEmpty(value)) {
      if (this.validationRules?.required) {
        return false;
      }
      return true;
    }

    // Must be string
    if (typeof value !== 'string') {
      return false;
    }

    // Check max length
    if (this.textOptions.maxLength !== undefined) {
      if (value.length > this.textOptions.maxLength) {
        return false;
      }
    }

    return true;
  }

  /**
   * Format text value for display
   * 
   * @param value - Cell value
   * @returns Formatted string for display
   */
  format(value: GetCellValue<TextFieldType>): GetDisplayValue<TextFieldType> {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    return String(value);
  }

  /**
   * Convert input value to cell value format
   * 
   * @param value - Input value
   * @returns Typed cell value
   */
  toCellValue(value: unknown): GetCellValue<TextFieldType> {
    if (this.isEmpty(value)) {
      return null;
    }

    if (typeof value !== 'string') {
      return String(value);
    }

    // Trim if single line
    let result = value;
    if (this.type === FIELD_TYPES.SingleLineText) {
      // Remove line breaks for single line text
      result = value.replace(/[\r\n]+/g, ' ');
    }

    // Apply max length if specified
    if (this.textOptions.maxLength !== undefined) {
      result = result.slice(0, this.textOptions.maxLength);
    }

    return result || null;
  }

  /**
   * Convert cell value to editable format
   * 
   * @param cellValue - Stored cell value
   * @returns Editable value
   */
  fromCellValue(cellValue: GetCellValue<TextFieldType>): string {
    if (cellValue === null || cellValue === undefined) {
      return this.textOptions.defaultValue ?? '';
    }

    return String(cellValue);
  }

  /**
   * Get default empty value
   * 
   * @returns Empty string
   */
  getDefaultValue(): string {
    return this.textOptions.defaultValue ?? '';
  }

  /**
   * Check if value is empty
   * 
   * @param value - Value to check
   * @returns true if empty
   */
  protected isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }
}

