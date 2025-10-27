/**
 * Link Field Model
 * Record link/relationship fields
 */

import { Field } from './Field';

export interface ILinkFieldOptions {
  foreignTableId?: string;
  relationship?: 'manyOne' | 'manyMany' | 'oneOne';
  isOneWay?: boolean;
  symmetricFieldId?: string;
}

export interface ILinkedRecord {
  id: string;
  title?: string;
}

export class LinkField extends Field {

  validate(value: unknown): boolean {
    if (this.isEmpty(value)) {
      return true;
    }

    // Single link
    if (typeof value === 'string') {
      return true;
    }

    // Multiple links
    if (Array.isArray(value)) {
      return value.every((item) => {
        if (typeof item === 'string') {return true;}
        if (item && typeof item === 'object' && 'id' in item) {return true;}
        return false;
      });
    }

    // Single link object
    if (value && typeof value === 'object' && 'id' in value) {
      return true;
    }

    return false;
  }

  format(value: unknown): string {
    if (this.isEmpty(value)) {
      return '';
    }

    // Single link ID
    if (typeof value === 'string') {
      return value;
    }

    // Single link object
    if (value && typeof value === 'object' && 'id' in value) {
      const record = value as ILinkedRecord;
      return record.title ?? record.id;
    }

    // Multiple links
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === 'string') {return item;}
          if (item && typeof item === 'object' && 'id' in item) {
            return (item as ILinkedRecord).title ?? item.id;
          }
          return '';
        })
        .filter(Boolean)
        .join(', ');
    }

    return '';
  }

  getEmptyValue(): null {
    return null;
  }

  toCellValue(value: unknown): any {
    if (this.isEmpty(value)) {
      return null;
    }

    // Already in correct format
    if (
      typeof value === 'string' ||
      Array.isArray(value) ||
      (value && typeof value === 'object')
    ) {
      return value as any;
    }

    return null;
  }

  fromCellValue(cellValue: any): string | string[] | ILinkedRecord | ILinkedRecord[] | null {
    if (cellValue === null || cellValue === undefined) {
      return null;
    }

    return cellValue;
  }

  /**
   * Check if this is a many relationship
   */
  isManyRelationship(): boolean {
    return (
      (this.options as any).relationship === 'manyMany' ||
      (this.options as any).relationship === 'manyOne'
    );
  }

  /**
   * Extract linked record IDs
   */
  getLinkedIds(value: unknown): string[] {
    if (this.isEmpty(value)) {
      return [];
    }

    if (typeof value === 'string') {
      return [value];
    }

    if (value && typeof value === 'object' && 'id' in value) {
      return [(value as ILinkedRecord).id];
    }

    if (Array.isArray(value)) {
      return value.map((item) => {
        if (typeof item === 'string') {return item;}
        if (item && typeof item === 'object' && 'id' in item) {
          return (item as ILinkedRecord).id;
        }
        return '';
      }).filter(Boolean);
    }

    return [];
  }
}


