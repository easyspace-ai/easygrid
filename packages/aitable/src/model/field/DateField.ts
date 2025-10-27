/**
 * Date Field Model
 * Handles date and datetime fields with strict typing
 */

import { Field, type StrictFieldConfig } from './Field';
import { FIELD_TYPES } from '../../types/core/field-types';
import type { DateFieldOptions } from '../../types/core/field-options';
import type { GetCellValue, GetDisplayValue } from '../../types/core/cell-values';
import { format as formatDate, parseISO, isValid } from 'date-fns';

/**
 * Date field type
 */
export type DateFieldType = typeof FIELD_TYPES.Date;

/**
 * Date field configuration
 */
export type DateFieldConfig = StrictFieldConfig<DateFieldType>;

/**
 * DateField implementation with strict typing
 */
export class DateField extends Field<DateFieldType> {
  constructor(config: DateFieldConfig) {
    super(config);
  }

  get dateOptions(): DateFieldOptions {
    return this.options as DateFieldOptions;
  }

  validate(value: unknown): boolean {
    if (this.isEmpty(value)) {
      if (this.validationRules?.required) {
        return false;
      }
      return true;
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      return isValid(date);
    }

    if (value instanceof Date) {
      return isValid(value);
    }

    return false;
  }

  format(value: GetCellValue<DateFieldType>): GetDisplayValue<DateFieldType> {
    if (value === null || value === undefined) {
      return '';
    }

    try {
      const date = parseISO(value);
      
      if (!isValid(date)) {
        return '';
      }

      const dateFormat = this.dateOptions.dateFormat ?? 'YYYY-MM-DD';
      const timeFormat = this.dateOptions.timeFormat === '12' ? 'hh:mm a' : 'HH:mm';

      if (this.dateOptions.includeTime) {
        return formatDate(date, `${dateFormat} ${timeFormat}`);
      }

      return formatDate(date, dateFormat);
    } catch (error) {
      return '';
    }
  }

  toCellValue(value: unknown): GetCellValue<DateFieldType> {
    if (this.isEmpty(value)) {
      return null;
    }

    try {
      let date: Date;
      
      if (typeof value === 'string') {
        date = new Date(value);
      } else if (value instanceof Date) {
        date = value;
      } else {
        return null;
      }

      if (!isValid(date)) {
        return null;
      }

      return date.toISOString();
    } catch (error) {
      return null;
    }
  }

  fromCellValue(cellValue: GetCellValue<DateFieldType>): Date | null {
    if (cellValue === null || cellValue === undefined) {
      return this.dateOptions.defaultValue ? new Date(this.dateOptions.defaultValue) : null;
    }

    try {
      const date = parseISO(cellValue);
      return isValid(date) ? date : null;
    } catch (error) {
      return null;
    }
  }

  getDefaultValue(): string | null {
    return this.dateOptions.defaultValue ?? null;
  }

  protected isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }
}

