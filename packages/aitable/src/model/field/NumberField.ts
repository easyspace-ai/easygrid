/**
 * Number Field Model
 * Handles numeric fields with precision, formatting, and validation
 * 
 * @example
 * ```typescript
 * const field = new NumberField({
 *   id: 'fld1',
 *   name: 'Price',
 *   type: FIELD_TYPES.Number,
 *   tableId: 'tbl1',
 *   options: {
 *     type: FIELD_TYPES.Number,
 *     precision: 2,
 *     min: 0,
 *     max: 1000000,
 *     formatting: {
 *       type: 'currency',
 *       symbol: '$',
 *       showThousandsSeparator: true,
 *     },
 *   },
 *   isComputed: false,
 *   isPrimary: false,
 * });
 * ```
 */

import { Field, type StrictFieldConfig } from './Field';
import { FIELD_TYPES } from '../../types/core/field-types';
import type { FieldType } from '../../types/core/field-types';
import type { NumberFieldOptions } from '../../types/core/field-options';
import type { GetCellValue, GetDisplayValue } from '../../types/core/cell-values';

/**
 * Number field type
 */
export type NumberFieldType = typeof FIELD_TYPES.Number;

/**
 * Number field configuration
 */
export type NumberFieldConfig = StrictFieldConfig<NumberFieldType>;

/**
 * NumberField implementation with strict typing
 */
export class NumberField extends Field<NumberFieldType> {
  /**
   * Constructor
   */
  constructor(config: NumberFieldConfig) {
    super(config);
  }

  /**
   * Get number field specific options
   */
  get numberOptions(): NumberFieldOptions {
    return this.options as NumberFieldOptions;
  }

  /**
   * Validate number value
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

    // Must be a valid number
    if (typeof value !== 'number') {
      return false;
    }

    if (isNaN(value) || !isFinite(value)) {
      return false;
    }

    // Check min constraint
    if (this.numberOptions.min !== undefined) {
      if (value < this.numberOptions.min) {
        return false;
      }
    }

    // Check max constraint
    if (this.numberOptions.max !== undefined) {
      if (value > this.numberOptions.max) {
        return false;
      }
    }

    return true;
  }

  /**
   * Format number value for display
   * 
   * @param value - Cell value
   * @returns Formatted string for display
   */
  format(value: GetCellValue<NumberFieldType>): GetDisplayValue<NumberFieldType> {
    if (value === null || value === undefined) {
      return '';
    }

    const num = value;
    const precision = this.numberOptions.precision ?? 0;
    const formatting = this.numberOptions.formatting || {};

    // Round to precision
    let formatted = num.toFixed(precision);

    // Apply thousands separator
    if (formatting.showThousandsSeparator) {
      const parts = formatted.split('.');
      parts[0] = (parts[0] ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    // Apply formatting type
    switch (formatting.type) {
      case 'currency':
        return `${formatting.symbol || '$'}${formatted}`;
      case 'percent':
        return `${formatted}%`;
      default:
        return formatted;
    }
  }

  /**
   * Convert input value to cell value format
   * 
   * @param value - Input value
   * @returns Typed cell value
   */
  toCellValue(value: unknown): GetCellValue<NumberFieldType> {
    if (this.isEmpty(value)) {
      return null;
    }

    let num: number;

    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      // Remove common formatting characters
      const cleaned = value
        .replace(/,/g, '') // Remove thousands separators
        .replace(/[^0-9.-]/g, ''); // Remove non-numeric characters except . and -
      
      num = parseFloat(cleaned);
    } else {
      return null;
    }

    // Check if valid number
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    // Apply precision
    const precision = this.numberOptions.precision ?? 0;
    num = parseFloat(num.toFixed(precision));

    // Apply min/max constraints
    if (this.numberOptions.min !== undefined) {
      num = Math.max(num, this.numberOptions.min);
    }

    if (this.numberOptions.max !== undefined) {
      num = Math.min(num, this.numberOptions.max);
    }

    return num;
  }

  /**
   * Convert cell value to editable format
   * 
   * @param cellValue - Stored cell value
   * @returns Editable value
   */
  fromCellValue(cellValue: GetCellValue<NumberFieldType>): number | null {
    if (cellValue === null || cellValue === undefined) {
      return this.numberOptions.defaultValue ?? null;
    }

    return cellValue;
  }

  /**
   * Get default value
   * 
   * @returns Default number value
   */
  getDefaultValue(): number | null {
    return this.numberOptions.defaultValue ?? null;
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

  /**
   * Parse a formatted number string back to number
   * Useful for handling user input with formatting
   * 
   * @param formatted - Formatted string
   * @returns Parsed number or null
   */
  parseFormatted(formatted: string): number | null {
    if (!formatted || formatted.trim() === '') {
      return null;
    }

    // Remove formatting
    const cleaned = formatted
      .replace(/,/g, '') // Remove thousands separators
      .replace(/[$%€£¥]/g, '') // Remove currency symbols
      .replace(/\s/g, '') // Remove spaces
      .trim();

    const num = parseFloat(cleaned);

    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    return num;
  }
}

