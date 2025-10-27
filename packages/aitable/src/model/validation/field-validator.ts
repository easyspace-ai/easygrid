/**
 * Field Validation Engine
 * Provides comprehensive validation for field values and configurations
 */

import { FieldType, FIELD_TYPES } from '../../types/core/field-types';
import { GetFieldOptions } from '../../types/core/field-options';
import { GetCellValue, CellValueValidators } from '../../types/core/cell-values';
import { isString, isBoolean, isArray, isNullish, safeString, safeNumber } from '../../utils/type-guards';

/**
 * Validation error interface
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}

/**
 * Validation result interface
 */
export interface ValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly value?: T;
  readonly errors: readonly ValidationError[];
}

/**
 * Field validation rules
 */
export interface FieldValidationRules {
  readonly required?: boolean;
  readonly unique?: boolean;
  readonly custom?: (value: unknown) => ValidationError | null;
}

/**
 * Field validator class
 */
export class FieldValidator {
  /**
   * Validate a field value against its type and options
   */
  static validateValue<T extends FieldType>(
    value: unknown,
    fieldType: T,
    options: GetFieldOptions<T>,
    rules?: FieldValidationRules
  ): ValidationResult<GetCellValue<T>> {
    const errors: ValidationError[] = [];

    // Check required validation
    if (rules?.required && isNullish(value)) {
      errors.push({
        code: 'REQUIRED',
        message: 'This field is required',
        value,
      });
      return { isValid: false, errors };
    }

    // If value is empty and not required, it's valid
    if (isNullish(value)) {
      return { isValid: true, value: null as GetCellValue<T>, errors: [] };
    }

    // Validate based on field type
    const typeValidation = this.validateByType(value, fieldType, options);
    if (!typeValidation.isValid) {
      errors.push(...typeValidation.errors);
    }

    // Run custom validation if provided
    if (rules?.custom) {
      const customError = rules.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }

    return {
      isValid: errors.length === 0,
      value: typeValidation.value,
      errors,
    };
  }

  /**
   * Validate value by field type
   */
  private static validateByType<T extends FieldType>(
    value: unknown,
    fieldType: T,
    options: GetFieldOptions<T>
  ): ValidationResult<GetCellValue<T>> {
    switch (fieldType) {
      case FIELD_TYPES.SingleLineText:
      case FIELD_TYPES.LongText:
        return this.validateTextValue(value, options as any) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.Number:
        return this.validateNumberValue(value, options as any) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.SingleSelect:
        return this.validateSingleSelectValue(value, options as any) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.MultipleSelect:
        return this.validateMultipleSelectValue(value, options as any) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.Date:
        return this.validateDateValue(value, options as any) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.Checkbox:
        return this.validateCheckboxValue(value) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.Rating:
        return this.validateRatingValue(value, options as any) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.Email:
        return this.validateEmailValue(value) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.Phone:
        return this.validatePhoneValue(value) as ValidationResult<GetCellValue<T>>;

      case FIELD_TYPES.URL:
        return this.validateURLValue(value) as ValidationResult<GetCellValue<T>>;

      default:
        // For other types, use the generic cell value validator
        if (CellValueValidators.validateForFieldType(value, fieldType)) {
          return { isValid: true, value: value as GetCellValue<T>, errors: [] };
        }
        return {
          isValid: false,
          value: undefined,
          errors: [{
            code: 'INVALID_TYPE',
            message: `Invalid value for field type ${fieldType}`,
            value,
          }],
        };
    }
  }

  /**
   * Validate text field value
   */
  private static validateTextValue(
    value: unknown,
    options: GetFieldOptions<typeof FIELD_TYPES.SingleLineText>
  ): ValidationResult<string | null> {
    const stringValue = safeString(value);
    const errors: ValidationError[] = [];

    // Check max length
    if (options.maxLength && stringValue.length > options.maxLength) {
      errors.push({
        code: 'MAX_LENGTH_EXCEEDED',
        message: `Text exceeds maximum length of ${options.maxLength} characters`,
        value,
      });
    }

    return {
      isValid: errors.length === 0,
      value: stringValue || null,
      errors,
    };
  }

  /**
   * Validate number field value
   */
  private static validateNumberValue(
    value: unknown,
    options: GetFieldOptions<typeof FIELD_TYPES.Number>
  ): ValidationResult<number | null> {
    const numberValue = safeNumber(value);
    const errors: ValidationError[] = [];

    if (numberValue === 0 && value !== 0 && value !== '0') {
      errors.push({
        code: 'INVALID_NUMBER',
        message: 'Value must be a valid number',
        value,
      });
      return { isValid: false, value: null, errors };
    }

    // Check min/max constraints
    if (options.min !== undefined && numberValue < options.min) {
      errors.push({
        code: 'MIN_VALUE_VIOLATION',
        message: `Value must be at least ${options.min}`,
        value,
      });
    }

    if (options.max !== undefined && numberValue > options.max) {
      errors.push({
        code: 'MAX_VALUE_VIOLATION',
        message: `Value must be at most ${options.max}`,
        value,
      });
    }

    // Apply precision
    const precision = options.precision ?? 0;
    const roundedValue = parseFloat(numberValue.toFixed(precision));

    return {
      isValid: errors.length === 0,
      value: roundedValue,
      errors,
    };
  }

  /**
   * Validate single select field value
   */
  private static validateSingleSelectValue(
    value: unknown,
    options: GetFieldOptions<typeof FIELD_TYPES.SingleSelect>
  ): ValidationResult<string | null> {
    if (!isString(value)) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_SELECT_VALUE',
          message: 'Select value must be a string',
          value,
        }],
      };
    }

    // Check if value exists in options
    const validOption = options.options.find(opt => opt.id === value);
    if (!validOption) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_SELECT_OPTION',
          message: 'Selected value is not a valid option',
          value,
        }],
      };
    }

    return { isValid: true, value, errors: [] };
  }

  /**
   * Validate multiple select field value
   */
  private static validateMultipleSelectValue(
    value: unknown,
    options: GetFieldOptions<typeof FIELD_TYPES.MultipleSelect>
  ): ValidationResult<string[] | null> {
    if (!isArray(value) || !value.every(isString)) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_MULTI_SELECT_VALUE',
          message: 'Multi-select value must be an array of strings',
          value,
        }],
      };
    }

    // Check if all values exist in options
    const validOptionIds = new Set(options.options.map(opt => opt.id));
    const invalidValues = value.filter(id => !validOptionIds.has(id));

    if (invalidValues.length > 0) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_MULTI_SELECT_OPTIONS',
          message: `Invalid options: ${invalidValues.join(', ')}`,
          value,
        }],
      };
    }

    return { isValid: true, value, errors: [] };
  }

  /**
   * Validate date field value
   */
  private static validateDateValue(
    value: unknown,
    _options: GetFieldOptions<typeof FIELD_TYPES.Date>
  ): ValidationResult<string | null> {
    let dateValue: Date | null = null;
    
    if (value instanceof Date) {
      dateValue = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        dateValue = parsed;
      }
    }
    
    if (dateValue === null) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_DATE',
          message: 'Value must be a valid date',
          value,
        }],
      };
    }

    return { isValid: true, value: dateValue.toISOString(), errors: [] };
  }

  /**
   * Validate checkbox field value
   */
  private static validateCheckboxValue(value: unknown): ValidationResult<boolean | null> {
    if (!isBoolean(value)) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_BOOLEAN',
          message: 'Checkbox value must be a boolean',
          value,
        }],
      };
    }

    return { isValid: true, value, errors: [] };
  }

  /**
   * Validate rating field value
   */
  private static validateRatingValue(
    value: unknown,
    options: GetFieldOptions<typeof FIELD_TYPES.Rating>
  ): ValidationResult<number | null> {
    const numberValue = safeNumber(value);
    
    if (numberValue === 0 && value !== 0 && value !== '0') {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_RATING',
          message: 'Rating value must be a number',
          value,
        }],
      };
    }

    const max = options.max ?? 5;
    if (numberValue < 0 || numberValue > max) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'RATING_OUT_OF_RANGE',
          message: `Rating must be between 0 and ${max}`,
          value,
        }],
      };
    }

    return { isValid: true, value: Math.round(numberValue), errors: [] };
  }

  /**
   * Validate email field value
   */
  private static validateEmailValue(value: unknown): ValidationResult<string | null> {
    const stringValue = safeString(value);
    
    if (!stringValue) {
      return { isValid: true, value: null, errors: [] };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(stringValue)) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_EMAIL',
          message: 'Value must be a valid email address',
          value,
        }],
      };
    }

    return { isValid: true, value: stringValue, errors: [] };
  }

  /**
   * Validate phone field value
   */
  private static validatePhoneValue(value: unknown): ValidationResult<string | null> {
    const stringValue = safeString(value);
    
    if (!stringValue) {
      return { isValid: true, value: null, errors: [] };
    }

    // Basic phone validation - can be enhanced based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = stringValue.replace(/[\s\-\(\)]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_PHONE',
          message: 'Value must be a valid phone number',
          value,
        }],
      };
    }

    return { isValid: true, value: stringValue, errors: [] };
  }

  /**
   * Validate URL field value
   */
  private static validateURLValue(value: unknown): ValidationResult<string | null> {
    const stringValue = safeString(value);
    
    if (!stringValue) {
      return { isValid: true, value: null, errors: [] };
    }

    try {
      new URL(stringValue);
      return { isValid: true, value: stringValue, errors: [] };
    } catch {
      return {
        isValid: false,
        value: null,
        errors: [{
          code: 'INVALID_URL',
          message: 'Value must be a valid URL',
          value,
        }],
      };
    }
  }
}