/**
 * Attachment Field Model
 * File attachment fields
 */

import { Field } from './Field';

export interface IAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  path?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface IAttachmentFieldOptions {
  // No specific options for now
}

export class AttachmentField extends Field {

  validate(value: unknown): boolean {
    if (this.isEmpty(value)) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          'id' in item &&
          'name' in item &&
          'size' in item &&
          'type' in item
      );
    }

    return false;
  }

  format(value: unknown): string {
    if (this.isEmpty(value)) {
      return '';
    }

    if (Array.isArray(value)) {
      const attachments = value as IAttachment[];
      return attachments.map((att) => att.name).join(', ');
    }

    return '';
  }

  getEmptyValue(): IAttachment[] {
    return [];
  }

  toCellValue(value: unknown): IAttachment[] | null {
    if (this.isEmpty(value)) {
      return null;
    }

    if (Array.isArray(value)) {
      return value as IAttachment[];
    }

    return null;
  }

  fromCellValue(cellValue: any): IAttachment[] {
    if (cellValue === null || cellValue === undefined) {
      return [];
    }

    if (Array.isArray(cellValue)) {
      return cellValue;
    }

    return [];
  }

  /**
   * Get total size of all attachments in bytes
   */
  getTotalSize(value: unknown): number {
    const attachments = this.fromCellValue(value);
    return attachments.reduce((total, att) => total + (att.size || 0), 0);
  }

  /**
   * Get attachment count
   */
  getCount(value: unknown): number {
    const attachments = this.fromCellValue(value);
    return attachments.length;
  }

  /**
   * Check if attachments include images
   */
  hasImages(value: unknown): boolean {
    const attachments = this.fromCellValue(value);
    return attachments.some((att) => att.type.startsWith('image/'));
  }

  /**
   * Get image attachments only
   */
  getImages(value: unknown): IAttachment[] {
    const attachments = this.fromCellValue(value);
    return attachments.filter((att) => att.type.startsWith('image/'));
  }
}


