/**
 * Attachment Field Filter
 * 附件字段过滤器
 */

import { BaseFilter, type IFilterConfig } from './BaseFilter';
import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';

export class AttachmentFilter extends BaseFilter {
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
      default:
        return false;
    }
  }

  getDisplayText(): string {
    const { operator } = this.config;
    const fieldName = this.field.name;

    switch (operator) {
      case 'isEmpty':
        return `${fieldName} 无附件`;
      case 'isNotEmpty':
        return `${fieldName} 有附件`;
      default:
        return '';
    }
  }

  protected override matchIsEmpty(record: RecordModel): boolean {
    const value = this.getValue(record);
    
    if (value === null || value === undefined) {return true;}
    
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    
    return false;
  }
}


