/**
 * Boolean Field Model
 * Handles checkbox fields with strict typing
 */

import { Field, type StrictFieldConfig } from './Field';
import { FIELD_TYPES } from '../../types/core/field-types';
import type { CheckboxFieldOptions } from '../../types/core/field-options';
import type { GetCellValue, GetDisplayValue } from '../../types/core/cell-values';

/**
 * Boolean field type
 */
export type BooleanFieldType = typeof FIELD_TYPES.Checkbox;

/**
 * Boolean field configuration
 */
export type BooleanFieldConfig = StrictFieldConfig<BooleanFieldType>;

/**
 * BooleanField implementation with strict typing
 */
export class BooleanField extends Field<BooleanFieldType> {
  constructor(config: BooleanFieldConfig) {
    super(config);
  }

  get checkboxOptions(): CheckboxFieldOptions {
    return this.options as CheckboxFieldOptions;
  }

  validate(value: unknown): boolean {
    if (this.isEmpty(value)) {
      if (this.validationRules?.required) {
        return false;
      }
      return true;
    }

    return typeof value === 'boolean';
  }

  format(value: GetCellValue<BooleanFieldType>): GetDisplayValue<BooleanFieldType> {
    if (value === null || value === undefined) {
      return '';
    }

    return value ? '✓' : '';
  }

  toCellValue(value: unknown): GetCellValue<BooleanFieldType> {
    if (this.isEmpty(value)) {
      return this.checkboxOptions.defaultValue ?? null;
    }

    // Convert truthy/falsy values
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === 'yes' || lower === '1') {
        return true;
      }
      if (lower === 'false' || lower === 'no' || lower === '0' || lower === '') {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return Boolean(value);
  }

  fromCellValue(cellValue: GetCellValue<BooleanFieldType>): boolean {
    if (cellValue === null || cellValue === undefined) {
      return this.checkboxOptions.defaultValue ?? false;
    }

    return Boolean(cellValue);
  }

  getDefaultValue(): boolean {
    return this.checkboxOptions.defaultValue ?? false;
  }

  protected isEmpty(value: unknown): boolean {
    return value === null || value === undefined;
  }
}

