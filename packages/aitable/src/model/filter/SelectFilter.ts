/**
 * Select Field Filter
 * 选择字段过滤器（单选和多选）
 */

import { BaseFilter, type IFilterConfig } from './BaseFilter';
import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';

export class SelectFilter extends BaseFilter {
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
      case 'hasAnyOf':
        return this.matchHasAnyOf(record);
      case 'hasAllOf':
        return this.matchHasAllOf(record);
      case 'hasNoneOf':
        return this.matchHasNoneOf(record);
      case 'isExactly':
        return this.matchIsExactly(record);
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
      case 'hasAnyOf':
        return `${fieldName} 包含任一: ${valueText}`;
      case 'hasAllOf':
        return `${fieldName} 包含全部: ${valueText}`;
      case 'hasNoneOf':
        return `${fieldName} 不包含任一: ${valueText}`;
      case 'isExactly':
        return `${fieldName} 完全匹配: ${valueText}`;
      default:
        return '';
    }
  }

  private getValueArray(record: RecordModel): string[] {
    const value = this.getValue(record);
    
    if (this.isEmpty(value)) {return [];}
    
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    
    return [String(value)];
  }

  private getFilterArray(): string[] {
    const { value } = this.config;
    
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    
    return [String(value)];
  }

  private matchIs(record: RecordModel): boolean {
    const values = this.getValueArray(record);
    const filterValue = String(this.config.value);
    
    if (values.length === 0) {return false;}
    
    return values.length === 1 && values[0] === filterValue;
  }

  private matchIsAnyOf(record: RecordModel): boolean {
    const values = this.getValueArray(record);
    const filterValues = this.getFilterArray();
    
    if (values.length === 0) {return false;}
    
    return values.some(v => filterValues.includes(v));
  }

  private matchIsNoneOf(record: RecordModel): boolean {
    return !this.matchIsAnyOf(record);
  }

  private matchHasAnyOf(record: RecordModel): boolean {
    const values = this.getValueArray(record);
    const filterValues = this.getFilterArray();
    
    if (values.length === 0) {return false;}
    
    return values.some(v => filterValues.includes(v));
  }

  private matchHasAllOf(record: RecordModel): boolean {
    const values = this.getValueArray(record);
    const filterValues = this.getFilterArray();
    
    if (values.length === 0) {return false;}
    
    return filterValues.every(fv => values.includes(fv));
  }

  private matchHasNoneOf(record: RecordModel): boolean {
    const values = this.getValueArray(record);
    const filterValues = this.getFilterArray();
    
    if (values.length === 0) {return true;}
    
    return !values.some(v => filterValues.includes(v));
  }

  private matchIsExactly(record: RecordModel): boolean {
    const values = this.getValueArray(record);
    const filterValues = this.getFilterArray();
    
    if (values.length !== filterValues.length) {return false;}
    
    const sortedValues = [...values].sort();
    const sortedFilterValues = [...filterValues].sort();
    
    return sortedValues.every((v, i) => v === sortedFilterValues[i]);
  }
}


