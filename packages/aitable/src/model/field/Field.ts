/**
 * Base Field Model
 * Abstract base class for all field types with strict typing
 */

import { FieldType } from '../../types/core/field-types';
import { GetFieldOptions } from '../../types/core/field-options';
import { GetCellValue, GetDisplayValue } from '../../types/core/cell-values';
import { ValidationResult, FieldValidator, FieldValidationRules } from '../validation/field-validator';

/**
 * Strict field configuration interface
 */
export interface StrictFieldConfig<T extends FieldType = FieldType> {
  readonly id: string;
  readonly name: string;
  readonly type: T;
  readonly tableId: string;
  readonly options: GetFieldOptions<T>;
  readonly description?: string;
  isComputed: boolean;
  readonly isPrimary: boolean;
  readonly createdTime?: string;
  readonly lastModifiedTime?: string;
  readonly validationRules?: FieldValidationRules;
}

/**
 * Field configuration interface for serialization
 */
export interface IFieldConfig {
  readonly id: string;
  readonly name: string;
  readonly type: FieldType;
  readonly tableId: string;
  readonly options: any;
  readonly description?: string;
  isComputed: boolean;
  readonly isPrimary: boolean;
  readonly createdTime?: string;
  readonly lastModifiedTime?: string;
}

/**
 * Abstract base field class with strict typing
 */
export abstract class Field<T extends FieldType = FieldType> {
  public readonly id: string;
  public readonly name: string;
  public readonly type: T;
  public readonly tableId: string;
  public readonly options: GetFieldOptions<T>;
  public readonly description?: string;
  public isComputed: boolean;
  public readonly isPrimary: boolean;
  public readonly createdTime?: string;
  public readonly lastModifiedTime?: string;
  public readonly validationRules?: FieldValidationRules;

  constructor(config: StrictFieldConfig<T>) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.tableId = config.tableId;
    this.options = config.options;
    this.description = config.description;
    this.isComputed = config.isComputed;
    this.isPrimary = config.isPrimary;
    this.createdTime = config.createdTime;
    this.lastModifiedTime = config.lastModifiedTime;
    this.validationRules = config.validationRules;
  }

  /**
   * Check if a value is empty
   */
  protected isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  /**
   * Validate a value for this field (basic validation)
   * Subclasses can override for custom validation logic
   */
  validate(value: unknown): boolean {
    // Default: allow any value
    return true;
  }

  /**
   * Validate with detailed result (advanced validation)
   */
  validateDetailed(value: unknown): ValidationResult<GetCellValue<T>> {
    return FieldValidator.validateValue(value, this.type, this.options, this.validationRules);
  }

  /**
   * Format value for display
   */
  abstract format(value: GetCellValue<T>): GetDisplayValue<T>;

  /**
   * Convert value to cell value format
   */
  abstract toCellValue(value: unknown): GetCellValue<T>;

  /**
   * Convert cell value to display format
   */
  abstract fromCellValue(cellValue: GetCellValue<T>): unknown;

  /**
   * Get field configuration
   */
  toConfig(): IFieldConfig {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      tableId: this.tableId,
      options: this.options,
      description: this.description,
      isComputed: this.isComputed,
      isPrimary: this.isPrimary,
      createdTime: this.createdTime,
      lastModifiedTime: this.lastModifiedTime,
    };
  }

  /**
   * Clone this field
   */
  clone(): Field {
    return Object.create(Object.getPrototypeOf(this), {
      ...Object.getOwnPropertyDescriptors(this),
    });
  }
}


