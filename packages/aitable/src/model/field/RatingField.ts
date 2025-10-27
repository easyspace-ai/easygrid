/**
 * Rating Field Model
 * Handles star rating fields with strict typing
 */

import { Field, type StrictFieldConfig } from './Field';
import { FIELD_TYPES } from '../../types/core/field-types';
import type { RatingFieldOptions } from '../../types/core/field-options';
import type { GetCellValue, GetDisplayValue } from '../../types/core/cell-values';

/**
 * Rating field type
 */
export type RatingFieldType = typeof FIELD_TYPES.Rating;

/**
 * Rating field configuration
 */
export type RatingFieldConfig = StrictFieldConfig<RatingFieldType>;

/**
 * RatingField implementation with strict typing
 */
export class RatingField extends Field<RatingFieldType> {
  constructor(config: RatingFieldConfig) {
    super(config);
  }

  get ratingOptions(): RatingFieldOptions {
    return this.options as RatingFieldOptions;
  }

  validate(value: unknown): boolean {
    if (this.isEmpty(value)) {
      if (this.validationRules?.required) {
        return false;
      }
      return true;
    }

    if (typeof value !== 'number') {
      return false;
    }

    const max = this.ratingOptions.max ?? 5;
    return value >= 0 && value <= max && Number.isInteger(value);
  }

  format(value: GetCellValue<RatingFieldType>): GetDisplayValue<RatingFieldType> {
    if (value === null || value === undefined) {
      return '';
    }

    const max = this.ratingOptions.max ?? 5;
    const icon = this.getIcon();
    const filled = icon.repeat(value);
    const empty = '☆'.repeat(Math.max(0, max - value));
    
    return filled + empty;
  }

  toCellValue(value: unknown): GetCellValue<RatingFieldType> {
    if (this.isEmpty(value)) {
      return null;
    }

    let rating: number;

    if (typeof value === 'number') {
      rating = value;
    } else if (typeof value === 'string') {
      rating = parseInt(value, 10);
    } else {
      return null;
    }

    if (isNaN(rating)) {
      return null;
    }

    const max = this.ratingOptions.max ?? 5;
    return Math.max(0, Math.min(max, Math.floor(rating)));
  }

  fromCellValue(cellValue: GetCellValue<RatingFieldType>): number {
    if (cellValue === null || cellValue === undefined) {
      return this.ratingOptions.defaultValue ?? 0;
    }

    return cellValue;
  }

  getDefaultValue(): number {
    return this.ratingOptions.defaultValue ?? 0;
  }

  protected isEmpty(value: unknown): boolean {
    return value === null || value === undefined;
  }

  /**
   * Get icon character based on icon type
   */
  private getIcon(): string {
    const iconMap = {
      star: '★',
      heart: '♥',
      thumbs: '👍',
      fire: '🔥',
      smile: '😊',
    };

    return iconMap[this.ratingOptions.icon ?? 'star'] ?? '★';
  }
}

