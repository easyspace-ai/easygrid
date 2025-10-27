/**
 * 实时记录客户端
 * 提供记录操作的高级 API
 */

import type { 
  FieldChangeEvent,
  RecordChangeEvent,
  RealtimeRecordInterface
} from '../types/realtime.js';
import type { EventBus } from '../types/events.js';
import { RealtimeRecord } from '../entities/realtime-record.js';

export class RealtimeRecordClient {
  private eventBus: EventBus;
  private connection: any; // ShareDBConnection 实例
  private records: Map<string, RealtimeRecord> = new Map();
  private luckDBInstance: any; // LuckDB 实例

  constructor(eventBus: EventBus, connection: any, luckDBInstance?: any) {
    this.eventBus = eventBus;
    this.connection = connection;
    this.luckDBInstance = luckDBInstance;
  }

  /**
   * 订阅记录
   */
  subscribe(tableId: string, recordId: string): RealtimeRecordInterface {
    const key = `${tableId}:${recordId}`;
    
    if (this.records.has(key)) {
      return this.records.get(key)!;
    }

    const record = new RealtimeRecord(tableId, recordId, this.eventBus, this.connection, this.luckDBInstance);
    this.records.set(key, record);
    
    return record;
  }

  /**
   * 更新字段
   */
  async updateField(tableId: string, recordId: string, fieldId: string, value: any): Promise<void> {
    const record = this.getRecord(tableId, recordId);
    if (!record) {
      throw new Error(`记录不存在: ${tableId}/${recordId}`);
    }

    await record.set(fieldId, value);
  }

  /**
   * 删除字段
   */
  async deleteField(tableId: string, recordId: string, fieldId: string): Promise<void> {
    const record = this.getRecord(tableId, recordId);
    if (!record) {
      throw new Error(`记录不存在: ${tableId}/${recordId}`);
    }

    await record.delete(fieldId);
  }

  /**
   * 获取字段值
   */
  getField(tableId: string, recordId: string, fieldId: string): any {
    const record = this.getRecord(tableId, recordId);
    if (!record) {
      return undefined;
    }

    return record.get(fieldId);
  }

  /**
   * 监听字段变更
   */
  onFieldChange(callback: (event: FieldChangeEvent) => void): void {
    this.eventBus.on('field-change', callback);
  }

  /**
   * 移除字段变更监听器
   */
  offFieldChange(callback: (event: FieldChangeEvent) => void): void {
    this.eventBus.off('field-change', callback);
  }

  /**
   * 监听记录变更
   */
  onRecordChange(callback: (event: RecordChangeEvent) => void): void {
    this.eventBus.on('record-change', callback);
  }

  /**
   * 移除记录变更监听器
   */
  offRecordChange(callback: (event: RecordChangeEvent) => void): void {
    this.eventBus.off('record-change', callback);
  }

  /**
   * 获取记录
   */
  private getRecord(tableId: string, recordId: string): RealtimeRecord | undefined {
    const key = `${tableId}:${recordId}`;
    return this.records.get(key);
  }

  /**
   * 设置连接
   */
  setConnection(connection: any): void {
    this.connection = connection;
    
    // 更新所有记录的连接
    for (const record of this.records.values()) {
      record.setConnection(connection);
    }
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    for (const record of this.records.values()) {
      record.destroy();
    }
    this.records.clear();
  }

  /**
   * 获取所有记录
   */
  getAllRecords(): RealtimeRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * 获取记录统计
   */
  getStats(): {
    totalRecords: number;
    activeRecords: number;
  } {
    const activeRecords = Array.from(this.records.values()).filter(record => 
      record.getStatus().isSubscribed
    ).length;

    return {
      totalRecords: this.records.size,
      activeRecords
    };
  }
}
