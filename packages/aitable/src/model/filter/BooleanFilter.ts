/**
 * Boolean Field Filter
 * 布尔字段过滤器
 */

import { BaseFilter, type IFilterConfig } from './BaseFilter';
import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';

export class BooleanFilter extends BaseFilter {
  constructor(field: Field, config: IFilterConfig) {
    super(field, config);
  }

  match(record: RecordModel): boolean {
    const { operator } = this.config;

    switch (operator) {
      case 'isEmpty':
        return this.matchIsEmpty(record);
      case 'isNotEmpty':
        return this.matchIsNotEmpty(record);
      case 'is':
        return this.matchIs(record);
      case 'isNot':
        return !this.matchIs(record);
      default:
        return false;
    }
  }

  getDisplayText(): string {
    const { operator, value } = this.config;
    const fieldName = this.field.name;

    switch (operator) {
      case 'isEmpty':
        return `${fieldName} 为空`;
      case 'isNotEmpty':
        return `${fieldName} 不为空`;
      case 'is':
        return `${fieldName} 是 ${value ? '是' : '否'}`;
      case 'isNot':
        return `${fieldName} 不是 ${value ? '是' : '否'}`;
      default:
        return '';
    }
  }

  private matchIs(record: RecordModel): boolean {
    const value = this.getValue(record);
    const filterValue = this.config.value;
    
    // 转换为布尔值
    const boolValue = Boolean(value);
    const filterBoolValue = Boolean(filterValue);
    
    return boolValue === filterBoolValue;
  }
}


