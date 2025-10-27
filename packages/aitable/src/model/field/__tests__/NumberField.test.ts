/**
 * NumberField Unit Tests
 * Comprehensive tests for NumberField implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NumberField } from '../NumberField';
import { FIELD_TYPES } from '../../../types/core/field-types';
import type { NumberFieldConfig } from '../NumberField';

describe('NumberField', () => {
  let basicConfig: NumberFieldConfig;
  let precisionConfig: NumberFieldConfig;
  let currencyConfig: NumberFieldConfig;
  let percentConfig: NumberFieldConfig;
  let constrainedConfig: NumberFieldConfig;

  beforeEach(() => {
    basicConfig = {
      id: 'fld1',
      name: 'Count',
      type: FIELD_TYPES.Number,
      tableId: 'tbl1',
      options: {
        type: FIELD_TYPES.Number,
      },
      isComputed: false,
      isPrimary: false,
    };

    precisionConfig = {
      id: 'fld2',
      name: 'Price',
      type: FIELD_TYPES.Number,
      tableId: 'tbl1',
      options: {
        type: FIELD_TYPES.Number,
        precision: 2,
      },
      isComputed: false,
      isPrimary: false,
    };

    currencyConfig = {
      id: 'fld3',
      name: 'Amount',
      type: FIELD_TYPES.Number,
      tableId: 'tbl1',
      options: {
        type: FIELD_TYPES.Number,
        precision: 2,
        formatting: {
          type: 'currency',
          symbol: '$',
          showThousandsSeparator: true,
        },
      },
      isComputed: false,
      isPrimary: false,
    };

    percentConfig = {
      id: 'fld4',
      name: 'Rate',
      type: FIELD_TYPES.Number,
      tableId: 'tbl1',
      options: {
        type: FIELD_TYPES.Number,
        precision: 1,
        formatting: {
          type: 'percent',
        },
      },
      isComputed: false,
      isPrimary: false,
    };

    constrainedConfig = {
      id: 'fld5',
      name: 'Score',
      type: FIELD_TYPES.Number,
      tableId: 'tbl1',
      options: {
        type: FIELD_TYPES.Number,
        min: 0,
        max: 100,
      },
      isComputed: false,
      isPrimary: false,
    };
  });

  describe('constructor', () => {
    it('should create a number field', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.id).toBe('fld1');
      expect(field.name).toBe('Count');
      expect(field.type).toBe(FIELD_TYPES.Number);
      expect(field.tableId).toBe('tbl1');
      expect(field.isComputed).toBe(false);
      expect(field.isPrimary).toBe(false);
    });

    it('should store options correctly', () => {
      const field = new NumberField(precisionConfig);
      
      expect(field.numberOptions.precision).toBe(2);
    });
  });

  describe('validate', () => {
    it('should accept valid numbers', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.validate(0)).toBe(true);
      expect(field.validate(123)).toBe(true);
      expect(field.validate(-456)).toBe(true);
      expect(field.validate(3.14159)).toBe(true);
      expect(field.validate(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(field.validate(Number.MIN_SAFE_INTEGER)).toBe(true);
    });

    it('should reject non-number values', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.validate('123')).toBe(false);
      expect(field.validate('abc')).toBe(false);
      expect(field.validate(true)).toBe(false);
      expect(field.validate({})).toBe(false);
      expect(field.validate([])).toBe(false);
    });

    it('should reject NaN and Infinity', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.validate(NaN)).toBe(false);
      expect(field.validate(Infinity)).toBe(false);
      expect(field.validate(-Infinity)).toBe(false);
    });

    it('should accept null/undefined for optional fields', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.validate(null)).toBe(true);
      expect(field.validate(undefined)).toBe(true);
    });

    it('should reject empty values for required fields', () => {
      const field = new NumberField({
        ...basicConfig,
        validationRules: { required: true },
      });
      
      expect(field.validate(null)).toBe(false);
      expect(field.validate(undefined)).toBe(false);
      expect(field.validate('')).toBe(false);
    });

    it('should enforce min constraint', () => {
      const field = new NumberField(constrainedConfig);
      
      expect(field.validate(-1)).toBe(false);
      expect(field.validate(0)).toBe(true);
      expect(field.validate(50)).toBe(true);
    });

    it('should enforce max constraint', () => {
      const field = new NumberField(constrainedConfig);
      
      expect(field.validate(50)).toBe(true);
      expect(field.validate(100)).toBe(true);
      expect(field.validate(101)).toBe(false);
    });

    it('should enforce both min and max constraints', () => {
      const field = new NumberField(constrainedConfig);
      
      expect(field.validate(-1)).toBe(false);
      expect(field.validate(0)).toBe(true);
      expect(field.validate(50)).toBe(true);
      expect(field.validate(100)).toBe(true);
      expect(field.validate(101)).toBe(false);
    });
  });

  describe('format', () => {
    it('should format basic numbers', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.format(123)).toBe('123');
      expect(field.format(0)).toBe('0');
      expect(field.format(-456)).toBe('-456');
    });

    it('should return empty string for null/undefined', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.format(null)).toBe('');
      expect(field.format(undefined as any)).toBe('');
    });

    it('should format with precision', () => {
      const field = new NumberField(precisionConfig);
      
      expect(field.format(123)).toBe('123.00');
      expect(field.format(3.14159)).toBe('3.14');
      expect(field.format(99.999)).toBe('100.00');
    });

    it('should format currency', () => {
      const field = new NumberField(currencyConfig);
      
      expect(field.format(1234.56)).toBe('$1,234.56');
      expect(field.format(1000000)).toBe('$1,000,000.00');
      expect(field.format(0)).toBe('$0.00');
    });

    it('should format percentage', () => {
      const field = new NumberField(percentConfig);
      
      expect(field.format(0.5)).toBe('0.5%');
      expect(field.format(99.95)).toBe('100.0%');
      expect(field.format(0)).toBe('0.0%');
    });

    it('should apply thousands separator', () => {
      const field = new NumberField({
        ...basicConfig,
        options: {
          ...basicConfig.options,
          formatting: {
            showThousandsSeparator: true,
          },
        },
      });
      
      expect(field.format(1000)).toBe('1,000');
      expect(field.format(1000000)).toBe('1,000,000');
      expect(field.format(123456789)).toBe('123,456,789');
    });

    it('should handle negative numbers', () => {
      const field = new NumberField(currencyConfig);
      
      expect(field.format(-123.45)).toBe('$-123.45');
    });

    it('should preserve precision in thousands separator', () => {
      const field = new NumberField(currencyConfig);
      
      expect(field.format(1234.567)).toBe('$1,234.57');
      expect(field.format(999999.999)).toBe('$1,000,000.00');
    });
  });

  describe('toCellValue', () => {
    it('should convert number to cell value', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.toCellValue(123)).toBe(123);
      expect(field.toCellValue(0)).toBe(0);
      expect(field.toCellValue(-456)).toBe(-456);
    });

    it('should parse string to number', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.toCellValue('123')).toBe(123);
      expect(field.toCellValue('3.14')).toBe(3);
      expect(field.toCellValue('-456')).toBe(-456);
    });

    it('should handle formatted strings', () => {
      const field = new NumberField(precisionConfig);
      
      expect(field.toCellValue('1,234.56')).toBe(1234.56);
      expect(field.toCellValue('$1,000')).toBe(1000);
      expect(field.toCellValue('99.5%')).toBe(99.5);
    });

    it('should return null for invalid strings', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.toCellValue('abc')).toBe(null);
      expect(field.toCellValue('not a number')).toBe(null);
    });

    it('should return null for empty values', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.toCellValue(null)).toBe(null);
      expect(field.toCellValue(undefined)).toBe(null);
      expect(field.toCellValue('')).toBe(null);
    });

    it('should apply precision', () => {
      const field = new NumberField(precisionConfig);
      
      expect(field.toCellValue(3.14159)).toBe(3.14);
      expect(field.toCellValue(99.999)).toBe(100);
    });

    it('should clamp to min value', () => {
      const field = new NumberField(constrainedConfig);
      
      expect(field.toCellValue(-10)).toBe(0);
      expect(field.toCellValue(-0.5)).toBe(0);
    });

    it('should clamp to max value', () => {
      const field = new NumberField(constrainedConfig);
      
      expect(field.toCellValue(150)).toBe(100);
      expect(field.toCellValue(100.5)).toBe(100);
    });

    it('should handle NaN and Infinity in strings', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.toCellValue('NaN')).toBe(null);
      expect(field.toCellValue('Infinity')).toBe(null);
      expect(field.toCellValue('-Infinity')).toBe(null);
    });
  });

  describe('fromCellValue', () => {
    it('should convert cell value to editable number', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.fromCellValue(123)).toBe(123);
      expect(field.fromCellValue(3.14159)).toBe(3.14159);
    });

    it('should return default value for null', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.fromCellValue(null)).toBe(null);
    });

    it('should return configured default value', () => {
      const field = new NumberField({
        ...basicConfig,
        options: {
          ...basicConfig.options,
          defaultValue: 100,
        },
      });
      
      expect(field.fromCellValue(null)).toBe(100);
      expect(field.fromCellValue(undefined as any)).toBe(100);
    });

    it('should preserve precision', () => {
      const field = new NumberField(precisionConfig);
      
      expect(field.fromCellValue(123.45)).toBe(123.45);
    });
  });

  describe('getDefaultValue', () => {
    it('should return null by default', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.getDefaultValue()).toBe(null);
    });

    it('should return configured default value', () => {
      const field = new NumberField({
        ...basicConfig,
        options: {
          ...basicConfig.options,
          defaultValue: 42,
        },
      });
      
      expect(field.getDefaultValue()).toBe(42);
    });
  });

  describe('parseFormatted', () => {
    it('should parse clean numbers', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.parseFormatted('123')).toBe(123);
      expect(field.parseFormatted('3.14')).toBe(3.14);
      expect(field.parseFormatted('-456')).toBe(-456);
    });

    it('should parse formatted numbers', () => {
      const field = new NumberField(currencyConfig);
      
      expect(field.parseFormatted('$1,234.56')).toBe(1234.56);
      expect(field.parseFormatted('€999.99')).toBe(999.99);
      expect(field.parseFormatted('99.5%')).toBe(99.5);
    });

    it('should handle various currency symbols', () => {
      const field = new NumberField(currencyConfig);
      
      expect(field.parseFormatted('$123')).toBe(123);
      expect(field.parseFormatted('€123')).toBe(123);
      expect(field.parseFormatted('£123')).toBe(123);
      expect(field.parseFormatted('¥123')).toBe(123);
    });

    it('should return null for empty strings', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.parseFormatted('')).toBe(null);
      expect(field.parseFormatted('   ')).toBe(null);
    });

    it('should return null for invalid strings', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.parseFormatted('abc')).toBe(null);
      expect(field.parseFormatted('not a number')).toBe(null);
    });

    it('should handle whitespace', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.parseFormatted('  123  ')).toBe(123);
      expect(field.parseFormatted('$ 1,234.56')).toBe(1234.56);
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const field = new NumberField(basicConfig);
      
      const large = Number.MAX_SAFE_INTEGER;
      expect(field.validate(large)).toBe(true);
      expect(field.toCellValue(large)).toBe(large);
    });

    it('should handle very small numbers', () => {
      const field = new NumberField(precisionConfig);
      
      const small = 0.0000001;
      expect(field.validate(small)).toBe(true);
      expect(field.format(small)).toBe('0.00');
    });

    it('should handle zero with different formats', () => {
      const currField = new NumberField(currencyConfig);
      const pctField = new NumberField(percentConfig);
      
      expect(currField.format(0)).toBe('$0.00');
      expect(pctField.format(0)).toBe('0.0%');
    });

    it('should handle negative zero', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.validate(-0)).toBe(true);
      expect(field.format(-0)).toBe('0');
    });

    it('should handle precision of 0', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.format(3.14159)).toBe('3');
      expect(field.format(99.9)).toBe('100');
    });

    it('should handle high precision', () => {
      const field = new NumberField({
        ...basicConfig,
        options: {
          ...basicConfig.options,
          precision: 10,
        },
      });
      
      expect(field.format(Math.PI)).toBe('3.1415926536');
    });
  });

  describe('integration', () => {
    it('should handle full workflow: input -> cell value -> display', () => {
      const field = new NumberField(currencyConfig);
      
      // User input (formatted string)
      const userInput = '$1,234.567';
      
      // Convert to cell value
      const cellValue = field.toCellValue(userInput);
      expect(cellValue).toBe(1234.57); // rounded to precision
      
      // Format for display
      const displayed = field.format(cellValue!);
      expect(displayed).toBe('$1,234.57');
      
      // Convert back for editing
      const editable = field.fromCellValue(cellValue!);
      expect(editable).toBe(1234.57);
    });

    it('should handle constraint workflow', () => {
      const field = new NumberField(constrainedConfig);
      
      // Input exceeds max
      const tooHigh = field.toCellValue(150);
      expect(tooHigh).toBe(100); // clamped
      
      // Input below min
      const tooLow = field.toCellValue(-10);
      expect(tooLow).toBe(0); // clamped
      
      // Valid input
      const valid = field.toCellValue(50);
      expect(valid).toBe(50);
    });
  });

  describe('type safety', () => {
    it('should enforce correct field type', () => {
      const field = new NumberField(basicConfig);
      
      expect(field.type).toBe(FIELD_TYPES.Number);
    });

    it('should provide typed options', () => {
      const field = new NumberField(precisionConfig);
      
      expect(typeof field.numberOptions.precision).toBe('number');
    });
  });
});

