/**
 * User Field Model
 * User/collaborator selection fields
 */

import { Field } from './Field';

export interface IUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface IUserFieldOptions {
  isMultiple?: boolean;
  shouldNotify?: boolean;
}

export class UserField extends Field {

  validate(value: unknown): boolean {
    if (this.isEmpty(value)) {
      return true;
    }

    // Single user
    if (typeof value === 'string') {
      return true;
    }

    // Single user object
    if (value && typeof value === 'object' && 'id' in value) {
      return true;
    }

    // Multiple users
    if (Array.isArray(value)) {
      return value.every((item) => {
        if (typeof item === 'string') {return true;}
        if (item && typeof item === 'object' && 'id' in item) {return true;}
        return false;
      });
    }

    return false;
  }

  format(value: unknown): string {
    if (this.isEmpty(value)) {
      return '';
    }

    // Single user ID
    if (typeof value === 'string') {
      return value;
    }

    // Single user object
    if (value && typeof value === 'object' && 'id' in value) {
      const user = value as IUser;
      return user.name ?? user.email ?? user.id;
    }

    // Multiple users
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === 'string') {return item;}
          if (item && typeof item === 'object' && 'id' in item) {
            const user = item as IUser;
            return user.name ?? user.email ?? user.id;
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

  toCellValue(value: unknown): string | string[] | IUser | IUser[] | null {
    if (this.isEmpty(value)) {
      return null;
    }

    return value as any;
  }

  fromCellValue(cellValue: any): string | string[] | IUser | IUser[] | null {
    if (cellValue === null || cellValue === undefined) {
      return null;
    }

    return cellValue;
  }

  /**
   * Extract user IDs from value
   */
  getUserIds(value: unknown): string[] {
    if (this.isEmpty(value)) {
      return [];
    }

    if (typeof value === 'string') {
      return [value];
    }

    if (value && typeof value === 'object' && 'id' in value) {
      return [(value as IUser).id];
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === 'string') {return item;}
          if (item && typeof item === 'object' && 'id' in item) {
            return (item as IUser).id;
          }
          return '';
        })
        .filter(Boolean);
    }

    return [];
  }

  /**
   * Check if multiple users are allowed
   */
  isMultiple(): boolean {
    return (this.options as any).isMultiple ?? false;
  }
}


