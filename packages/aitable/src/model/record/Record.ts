/**
 * Record Model
 * Represents a single record in a table
 */

import type { IRecord } from '../../api/types';
import type { IFieldInstance } from '../field';

export interface IRecordConfig {
  id: string;
  fields: { [key: string]: any };
  createdTime?: string;
  lastModifiedTime?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export class RecordModel {
  public id: string;
  public fields: { [key: string]: any };
  public createdTime?: string;
  public lastModifiedTime?: string;
  public createdBy?: string;
  public lastModifiedBy?: string;

  constructor(config: IRecordConfig) {
    this.id = config.id;
    this.fields = config.fields;
    this.createdTime = config.createdTime;
    this.lastModifiedTime = config.lastModifiedTime;
    this.createdBy = config.createdBy;
    this.lastModifiedBy = config.lastModifiedBy;
  }

  /**
   * Get cell value for a field
   */
  getCellValue(fieldId: string): any {
    return this.fields[fieldId];
  }

  /**
   * Set cell value for a field
   */
  setCellValue(fieldId: string, value: any): void {
    this.fields[fieldId] = value;
  }

  /**
   * Check if a field is locked (computed field)
   */
  isLocked(fieldId: string): boolean {
    // This would typically check field metadata
    // For now, return false as a placeholder
    return false;
  }

  /**
   * Update cell value (with validation)
   */
  updateCell(fieldId: string, value: any, field?: IFieldInstance): boolean {
    if (field && !field.validate(value)) {
      console.warn(`Invalid value for field ${fieldId}`);
      return false;
    }

    this.setCellValue(fieldId, value);
    this.lastModifiedTime = new Date().toISOString();
    return true;
  }

  /**
   * Get record as API format
   */
  toApiFormat(): IRecord {
    return {
      id: this.id,
      fields: this.fields,
      createdTime: this.createdTime,
      lastModifiedTime: this.lastModifiedTime,
      createdBy: this.createdBy,
      lastModifiedBy: this.lastModifiedBy,
    };
  }

  /**
   * Clone this record
   */
  clone(): RecordModel {
    return new RecordModel({
      id: this.id,
      fields: { ...this.fields },
      createdTime: this.createdTime,
      lastModifiedTime: this.lastModifiedTime,
      createdBy: this.createdBy,
      lastModifiedBy: this.lastModifiedBy,
    });
  }
}

export type IRecordInstance = RecordModel;

/**
 * Create a record instance from API data
 */
export function createRecordInstance(record: IRecord): IRecordInstance {
  return new RecordModel({
    id: record.id,
    fields: record.fields,
    createdTime: record.createdTime,
    lastModifiedTime: record.lastModifiedTime,
    createdBy: record.createdBy,
    lastModifiedBy: record.lastModifiedBy,
  });
}

/**
 * Create multiple record instances
 */
export function createRecordInstances(records: IRecord[]): IRecordInstance[] {
  return records.map(createRecordInstance);
}


