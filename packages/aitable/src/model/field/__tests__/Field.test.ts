/**
 * Field 基类测试
 */
import { describe, it, expect } from 'vitest';
import { TextField } from '../TextField';
import { FIELD_TYPES } from '../../../types/core/field-types';

describe('Field Base Class', () => {
  describe('基础功能', () => {
    it('应该正确创建字段实例', () => {
      const field = new TextField({
        id: 'fld1',
        name: 'Test Field',
        type: FIELD_TYPES.SingleLineText,
        tableId: 'tbl1',
        options: {},
        isComputed: false,
        isPrimary: false,
      });

      expect(field.id).toBe('fld1');
      expect(field.name).toBe('Test Field');
      expect(field.tableId).toBe('tbl1');
    });

    it('应该导出字段配置', () => {
      const field = new TextField({
        id: 'fld1',
        name: 'Test',
        type: FIELD_TYPES.SingleLineText,
        tableId: 'tbl1',
        options: {},
        isComputed: false,
        isPrimary: false,
      });

      const config = field.toConfig();
      expect(config.id).toBe('fld1');
      expect(config.name).toBe('Test');
    });
  });
});

