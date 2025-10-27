/**
 * Text Field Filter
 * 文本字段过滤器
 */

import { BaseFilter, type IFilterConfig } from './BaseFilter';
import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';

export class TextFilter extends BaseFilter {
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
      case 'contains':
        return this.matchContains(record);
      case 'doesNotContain':
        return !this.matchContains(record);
      case 'startsWith':
        return this.matchStartsWith(record);
      case 'endsWith':
        return this.matchEndsWith(record);
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
        return `${fieldName} 是 "${value}"`;
      case 'isNot':
        return `${fieldName} 不是 "${value}"`;
      case 'contains':
        return `${fieldName} 包含 "${value}"`;
      case 'doesNotContain':
        return `${fieldName} 不包含 "${value}"`;
      case 'startsWith':
        return `${fieldName} 以 "${value}" 开头`;
      case 'endsWith':
        return `${fieldName} 以 "${value}" 结尾`;
      default:
        return '';
    }
  }

  private matchIs(record: RecordModel): boolean {
    const value = this.getValue(record);
    const filterValue = this.config.value;
    
    if (this.isEmpty(value)) {return false;}
    
    return String(value).toLowerCase() === String(filterValue).toLowerCase();
  }

  private matchContains(record: RecordModel): boolean {
    const value = this.getValue(record);
    const filterValue = this.config.value;
    
    if (this.isEmpty(value)) {return false;}
    
    return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
  }

  private matchStartsWith(record: RecordModel): boolean {
    const value = this.getValue(record);
    const filterValue = this.config.value;
    
    if (this.isEmpty(value)) {return false;}
    
    return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
  }

  private matchEndsWith(record: RecordModel): boolean {
    const value = this.getValue(record);
    const filterValue = this.config.value;
    
    if (this.isEmpty(value)) {return false;}
    
    return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
  }
}


