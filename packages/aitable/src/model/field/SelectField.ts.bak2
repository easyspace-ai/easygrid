/**
 * Select Field Model
 * Single select and multiple select fields
 */

import { Field } from './Field';

export interface ISelectOption {
  id: string;
  name: string;
  color?: string;
}

export interface ISelectFieldOptions {
  options: ISelectOption[];
}

export class SelectField extends Field {

  validate(value: unknown): boolean {
    if (this.isEmpty(value)) {
      return true;
    }

    // For single select
    if (typeof value === 'string') {
      return ((this.options as any).options)?.some((opt) => opt.id === value) ?? false;
    }

    // For multiple select
    if (Array.isArray(value)) {
      return value.every(
        (id) => ((this.options as any).options)?.some((opt) => opt.id === id) ?? false
      );
    }

    return false;
  }

  format(value: unknown): string {
    if (this.isEmpty(value)) {
      return '';
    }

    if (typeof value === 'string') {
      const option = ((this.options as any).options)?.find((opt) => opt.id === value);
      return option?.name ?? '';
    }

    if (Array.isArray(value)) {
      const names = value
        .map((id) => {
          const option = ((this.options as any).options)?.find((opt) => opt.id === id);
          return option?.name;
        })
        .filter(Boolean);
      return names.join(', ');
    }

    return '';
  }

  getEmptyValue(): null {
    return null;
  }

  toCellValue(value: unknown): string | string[] | null {
    if (this.isEmpty(value)) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.filter((id) => typeof id === 'string');
    }

    return null;
  }

  fromCellValue(cellValue: any): string | string[] | null {
    if (cellValue === null || cellValue === undefined) {
      return null;
    }

    if (typeof cellValue === 'string') {
      return cellValue;
    }

    if (Array.isArray(cellValue)) {
      return cellValue;
    }

    return null;
  }

  /**
   * Get option by ID
   */
  getOption(id: string): ISelectOption | undefined {
    return ((this.options as any).options)?.find((opt) => opt.id === id);
  }

  /**
   * Get options by IDs
   */
  getOptions(ids: string[]): ISelectOption[] {
    return ids
      .map((id) => this.getOption(id))
      .filter((opt): opt is ISelectOption => opt !== undefined);
  }
}


