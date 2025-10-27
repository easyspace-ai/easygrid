/**
 * FieldValidator 单元测试
 * 测试字段验证器的核心功能
 */
import { describe, it, expect } from 'vitest';
import { FieldValidator } from '../field-validator';
import { FIELD_TYPES } from '../../../types/core/field-types';

describe('FieldValidator', () => {
  describe('文本字段验证', () => {
    it('应该接受有效的文本值', () => {
      const result = FieldValidator.validateValue('Hello', FIELD_TYPES.SingleLineText, {});
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('Hello');
    });

    it('应该接受空字符串', () => {
      const result = FieldValidator.validateValue('', FIELD_TYPES.SingleLineText as any, {});
      expect(result.isValid).toBe(true);
    });
  });

  describe('数字字段验证', () => {
    it('应该接受有效的数字', () => {
      const result = FieldValidator.validateValue(42, FIELD_TYPES.Number as any, {});
      expect(result.isValid).toBe(true);
    });

    it('应该拒绝无效的数字字符串', () => {
      const result = FieldValidator.validateValue('abc', FIELD_TYPES.Number as any, {});
      expect(result.isValid).toBe(false);
    });
  });

  describe('布尔字段验证', () => {
    it('应该接受布尔值', () => {
      const result = FieldValidator.validateValue(true, FIELD_TYPES.Checkbox as any, {});
      expect(result.isValid).toBe(true);
    });

    it('应该拒绝非布尔值', () => {
      const result = FieldValidator.validateValue('true', FIELD_TYPES.Checkbox as any, {});
      expect(result.isValid).toBe(false);
    });
  });

  describe('日期字段验证', () => {
    it('应该接受有效的日期字符串', () => {
      const result = FieldValidator.validateValue('2024-01-01', FIELD_TYPES.Date as any, {});
      expect(result.isValid).toBe(true);
    });

    it('应该接受Date对象', () => {
      const date = new Date('2024-01-01');
      const result = FieldValidator.validateValue(date, FIELD_TYPES.Date as any, {});
      expect(result.isValid).toBe(true);
    });

    it('应该拒绝无效的日期字符串', () => {
      const result = FieldValidator.validateValue('invalid-date', FIELD_TYPES.Date as any, {});
      expect(result.isValid).toBe(false);
    });
  });

  describe('必填字段验证', () => {
    it('必填字段应该拒绝null值', () => {
      const result = FieldValidator.validateValue(null, FIELD_TYPES.SingleLineText as any, {}, {
        required: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.code === 'REQUIRED')).toBe(true);
    });

    it('必填字段应该接受非空值', () => {
      const result = FieldValidator.validateValue('value', FIELD_TYPES.SingleLineText as any, {}, {
        required: true,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理null值', () => {
      const result = FieldValidator.validateValue(null, FIELD_TYPES.SingleLineText as any, {});
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(null);
    });

    it('应该处理undefined值', () => {
      const result = FieldValidator.validateValue(undefined, FIELD_TYPES.SingleLineText as any, {});
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(null);
    });
  });
});

