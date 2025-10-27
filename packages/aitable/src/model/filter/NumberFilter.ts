/**
 * Number Field Filter
 * 数字字段过滤器
 */

import { BaseFilter, type IFilterConfig } from './BaseFilter';
import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';

export class NumberFilter extends BaseFilter {
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
      case 'equal':
        return this.matchEqual(record);
      case 'notEqual':
        return !this.matchEqual(record);
      case 'greaterThan':
        return this.matchGreaterThan(record);
      case 'greaterThanOrEqual':
        return this.matchGreaterThanOrEqual(record);
      case 'lessThan':
        return this.matchLessThan(record);
      case 'lessThanOrEqual':
        return this.matchLessThanOrEqual(record);
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
      case 'equal':
        return `${fieldName} = ${value}`;
      case 'notEqual':
        return `${fieldName} ≠ ${value}`;
      case 'greaterThan':
        return `${fieldName} > ${value}`;
      case 'greaterThanOrEqual':
        return `${fieldName} ≥ ${value}`;
      case 'lessThan':
        return `${fieldName} < ${value}`;
      case 'lessThanOrEqual':
        return `${fieldName} ≤ ${value}`;
      default:
        return '';
    }
  }

  private getNumericValue(record: RecordModel): number | null {
    const value = this.getValue(record);
    if (this.isEmpty(value)) {return null;}
    
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(num) ? null : num;
  }

  private matchEqual(record: RecordModel): boolean {
    const value = this.getNumericValue(record);
    const filterValue = Number(this.config.value);
    
    if (value === null) {return false;}
    
    return value === filterValue;
  }

  private matchGreaterThan(record: RecordModel): boolean {
    const value = this.getNumericValue(record);
    const filterValue = Number(this.config.value);
    
    if (value === null) {return false;}
    
    return value > filterValue;
  }

  private matchGreaterThanOrEqual(record: RecordModel): boolean {
    const value = this.getNumericValue(record);
    const filterValue = Number(this.config.value);
    
    if (value === null) {return false;}
    
    return value >= filterValue;
  }

  private matchLessThan(record: RecordModel): boolean {
    const value = this.getNumericValue(record);
    const filterValue = Number(this.config.value);
    
    if (value === null) {return false;}
    
    return value < filterValue;
  }

  private matchLessThanOrEqual(record: RecordModel): boolean {
    const value = this.getNumericValue(record);
    const filterValue = Number(this.config.value);
    
    if (value === null) {return false;}
    
    return value <= filterValue;
  }
}


