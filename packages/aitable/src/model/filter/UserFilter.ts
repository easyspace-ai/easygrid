/**
 * User Field Filter
 * 用户字段过滤器
 */

import { BaseFilter, type IFilterConfig } from './BaseFilter';
import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';

export class UserFilter extends BaseFilter {
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
      case 'isAnyOf':
        return this.matchIsAnyOf(record);
      case 'isNoneOf':
        return this.matchIsNoneOf(record);
      default:
        return false;
    }
  }

  getDisplayText(): string {
    const { operator, value } = this.config;
    const fieldName = this.field.name;
    const valueArray = Array.isArray(value) ? value : [value];
    const valueText = valueArray.join(', ');

    switch (operator) {
      case 'isEmpty':
        return `${fieldName} 为空`;
      case 'isNotEmpty':
        return `${fieldName} 不为空`;
      case 'is':
        return `${fieldName} 是 "${valueText}"`;
      case 'isNot':
        return `${fieldName} 不是 "${valueText}"`;
      case 'isAnyOf':
        return `${fieldName} 是以下任一: ${valueText}`;
      case 'isNoneOf':
        return `${fieldName} 不是以下任一: ${valueText}`;
      default:
        return '';
    }
  }

  private getUserIds(record: RecordModel): string[] {
    const value = this.getValue(record);
    
    if (this.isEmpty(value)) {return [];}
    
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    
    return [String(value)];
  }

  private getFilterUserIds(): string[] {
    const { value } = this.config;
    
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    
    return [String(value)];
  }

  private matchIs(record: RecordModel): boolean {
    const userIds = this.getUserIds(record);
    const filterUserId = String(this.config.value);
    
    if (userIds.length === 0) {return false;}
    
    return userIds.length === 1 && userIds[0] === filterUserId;
  }

  private matchIsAnyOf(record: RecordModel): boolean {
    const userIds = this.getUserIds(record);
    const filterUserIds = this.getFilterUserIds();
    
    if (userIds.length === 0) {return false;}
    
    return userIds.some(id => filterUserIds.includes(id));
  }

  private matchIsNoneOf(record: RecordModel): boolean {
    return !this.matchIsAnyOf(record);
  }
}


