/**
 * TextField Unit Tests
 * Comprehensive tests for TextField implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextField } from '../TextField';
import { FIELD_TYPES } from '../../../types/core/field-types';
import type { TextFieldConfig } from '../TextField';

describe('TextField', () => {
  let singleLineConfig: TextFieldConfig;
  let longTextConfig: TextFieldConfig;

  beforeEach(() => {
    singleLineConfig = {
      id: 'fld1',
      name: 'Title',
      type: FIELD_TYPES.SingleLineText,
      tableId: 'tbl1',
      options: {
        type: FIELD_TYPES.SingleLineText,
        maxLength: 100,
      },
      isComputed: false,
      isPrimary: false,
    };

    longTextConfig = {
      id: 'fld2',
      name: 'Description',
      type: FIELD_TYPES.LongText,
      tableId: 'tbl1',
      options: {
        type: FIELD_TYPES.LongText,
      },
      isComputed: false,
      isPrimary: false,
    };
  });

  describe('constructor', () => {
    it('should create a single line text field', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.id).toBe('fld1');
      expect(field.name).toBe('Title');
      expect(field.type).toBe(FIELD_TYPES.SingleLineText);
      expect(field.tableId).toBe('tbl1');
      expect(field.isComputed).toBe(false);
      expect(field.isPrimary).toBe(false);
    });

    it('should create a long text field', () => {
      const field = new TextField(longTextConfig);
      
      expect(field.type).toBe(FIELD_TYPES.LongText);
      expect(field.name).toBe('Description');
    });

    it('should store options correctly', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.textOptions.maxLength).toBe(100);
    });
  });

  describe('validate', () => {
    it('should accept valid strings', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.validate('Hello World')).toBe(true);
      expect(field.validate('A')).toBe(true);
      expect(field.validate('')).toBe(true);
    });

    it('should reject non-string values', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.validate(123)).toBe(false);
      expect(field.validate(true)).toBe(false);
      expect(field.validate({})).toBe(false);
      expect(field.validate([])).toBe(false);
    });

    it('should accept null/undefined for optional fields', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.validate(null)).toBe(true);
      expect(field.validate(undefined)).toBe(true);
    });

    it('should reject empty values for required fields', () => {
      const field = new TextField({
        ...singleLineConfig,
        validationRules: { required: true },
      });
      
      expect(field.validate(null)).toBe(false);
      expect(field.validate(undefined)).toBe(false);
      expect(field.validate('')).toBe(false);
    });

    it('should reject strings exceeding maxLength', () => {
      const field = new TextField(singleLineConfig);
      const longString = 'a'.repeat(101);
      
      expect(field.validate(longString)).toBe(false);
    });

    it('should accept strings within maxLength', () => {
      const field = new TextField(singleLineConfig);
      const validString = 'a'.repeat(100);
      
      expect(field.validate(validString)).toBe(true);
    });

    it('should accept any length when maxLength is not set', () => {
      const field = new TextField(longTextConfig);
      const veryLongString = 'a'.repeat(10000);
      
      expect(field.validate(veryLongString)).toBe(true);
    });
  });

  describe('format', () => {
    it('should format valid strings', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.format('Hello')).toBe('Hello');
      expect(field.format('Test 123')).toBe('Test 123');
    });

    it('should return empty string for null/undefined', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.format(null)).toBe('');
      expect(field.format(undefined as any)).toBe('');
    });

    it('should return empty string for empty string', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.format('')).toBe('');
    });

    it('should preserve whitespace', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.format('  Hello  ')).toBe('  Hello  ');
    });

    it('should handle unicode characters', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.format('你好世界')).toBe('你好世界');
      expect(field.format('🎉✨')).toBe('🎉✨');
    });
  });

  describe('toCellValue', () => {
    it('should convert string to cell value', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.toCellValue('Hello')).toBe('Hello');
    });

    it('should convert non-string to string', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.toCellValue(123)).toBe('123');
      expect(field.toCellValue(true)).toBe('true');
    });

    it('should return null for empty values', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.toCellValue(null)).toBe(null);
      expect(field.toCellValue(undefined)).toBe(null);
      expect(field.toCellValue('')).toBe(null);
    });

    it('should remove line breaks for single line text', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.toCellValue('Hello\nWorld')).toBe('Hello World');
      expect(field.toCellValue('Line1\r\nLine2')).toBe('Line1 Line2');
    });

    it('should preserve line breaks for long text', () => {
      const field = new TextField(longTextConfig);
      
      const multiLine = 'Line1\nLine2\nLine3';
      expect(field.toCellValue(multiLine)).toBe(multiLine);
    });

    it('should truncate to maxLength', () => {
      const field = new TextField(singleLineConfig);
      const longString = 'a'.repeat(150);
      
      const result = field.toCellValue(longString);
      expect(result).toHaveLength(100);
    });

    it('should not truncate when maxLength is not set', () => {
      const field = new TextField(longTextConfig);
      const longString = 'a'.repeat(1000);
      
      const result = field.toCellValue(longString);
      expect(result).toBe(longString);
    });
  });

  describe('fromCellValue', () => {
    it('should convert cell value to editable string', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.fromCellValue('Hello')).toBe('Hello');
    });

    it('should return default value for null', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.fromCellValue(null)).toBe('');
    });

    it('should return configured default value', () => {
      const field = new TextField({
        ...singleLineConfig,
        options: {
          ...singleLineConfig.options,
          defaultValue: 'Default Text',
        },
      });
      
      expect(field.fromCellValue(null)).toBe('Default Text');
      expect(field.fromCellValue(undefined as any)).toBe('Default Text');
    });

    it('should preserve all characters', () => {
      const field = new TextField(singleLineConfig);
      
      const specialChars = 'Test <script>alert("XSS")</script>';
      expect(field.fromCellValue(specialChars)).toBe(specialChars);
    });
  });

  describe('getDefaultValue', () => {
    it('should return empty string by default', () => {
      const field = new TextField(singleLineConfig);
      
      expect(field.getDefaultValue()).toBe('');
    });

    it('should return configured default value', () => {
      const field = new TextField({
        ...singleLineConfig,
        options: {
          ...singleLineConfig.options,
          defaultValue: 'My Default',
        },
      });
      
      expect(field.getDefaultValue()).toBe('My Default');
    });
  });

  describe('edge cases', () => {
    it('should handle very long strings', () => {
      const field = new TextField(longTextConfig);
      const veryLong = 'a'.repeat(100000);
      
      expect(field.validate(veryLong)).toBe(true);
      expect(field.toCellValue(veryLong)).toBe(veryLong);
    });

    it('should handle empty maxLength (0)', () => {
      const field = new TextField({
        ...singleLineConfig,
        options: {
          ...singleLineConfig.options,
          maxLength: 0,
        },
      });
      
      expect(field.validate('')).toBe(true);
      expect(field.validate('a')).toBe(false);
      expect(field.toCellValue('Hello')).toBe(null);
    });

    it('should handle special characters', () => {
      const field = new TextField(singleLineConfig);
      
      const special = '\t\n\r\0';
      expect(field.validate(special)).toBe(true);
    });

    it('should handle unicode surrogate pairs', () => {
      const field = new TextField(singleLineConfig);
      
      const emoji = '😀😁😂🤣';
      expect(field.validate(emoji)).toBe(true);
      expect(field.format(emoji)).toBe(emoji);
      expect(field.toCellValue(emoji)).toBe(emoji);
    });
  });

  describe('integration', () => {
    it('should handle full workflow: input -> cell value -> display', () => {
      const field = new TextField(singleLineConfig);
      
      // User input
      const userInput = 'Hello\nWorld  '; // with line break and trailing spaces
      
      // Convert to cell value
      const cellValue = field.toCellValue(userInput);
      expect(cellValue).toBe('Hello World  '); // line break removed, spaces preserved
      
      // Format for display
      const displayed = field.format(cellValue!);
      expect(displayed).toBe('Hello World  ');
      
      // Convert back for editing
      const editable = field.fromCellValue(cellValue!);
      expect(editable).toBe('Hello World  ');
    });

    it('should handle empty value workflow', () => {
      const field = new TextField(singleLineConfig);
      
      const cellValue = field.toCellValue('');
      expect(cellValue).toBe(null);
      
      const displayed = field.format(cellValue!);
      expect(displayed).toBe('');
      
      const editable = field.fromCellValue(cellValue!);
      expect(editable).toBe('');
    });
  });

  describe('type safety', () => {
    it('should enforce correct field type', () => {
      const field = new TextField(singleLineConfig);
      
      // TypeScript should catch this at compile time
      expect(field.type).toBe(FIELD_TYPES.SingleLineText);
    });

    it('should provide typed options', () => {
      const field = new TextField(singleLineConfig);
      
      // TypeScript should provide autocomplete for maxLength
      expect(typeof field.textOptions.maxLength).toBe('number');
    });
  });
});
