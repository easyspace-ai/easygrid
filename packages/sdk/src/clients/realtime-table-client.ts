/**
 * 实时表格客户端
 * 提供表格操作的高级 API
 */

import type { 
  TableChangeEvent,
  RecordEvent,
  FieldUpdate,
  RealtimeTableInterface
} from '../types/realtime.js';
import type { EventBus } from '../types/events.js';
import { RealtimeTable } from '../entities/realtime-table.js';

export class RealtimeTableClient {
  private eventBus: EventBus;
  private connection: any; // ShareDBConnection 实例
  private tables: Map<string, RealtimeTable> = new Map();

  constructor(eventBus: EventBus, connection: any) {
    this.eventBus = eventBus;
    this.connection = connection;
  }

  /**
   * 订阅表格
   */
  subscribe(tableId: string): RealtimeTableInterface {
    if (this.tables.has(tableId)) {
      return this.tables.get(tableId)!;
    }

    const table = new RealtimeTable(tableId, this.eventBus, this.connection);
    this.tables.set(tableId, table);
    
    return table;
  }

  /**
   * 批量更新字段
   */
  async batchUpdate(tableId: string, updates: FieldUpdate[]): Promise<void> {
    const table = this.getTable(tableId);
    if (!table) {
      throw new Error(`表格不存在: ${tableId}`);
    }

    await table.batchUpdate(updates);
  }

  /**
   * 创建记录
   */
  async createRecord(tableId: string, data: Record<string, any>): Promise<any> {
    const table = this.getTable(tableId);
    if (!table) {
      throw new Error(`表格不存在: ${tableId}`);
    }

    return await table.createRecord(data);
  }

  /**
   * 删除记录
   */
  async deleteRecord(tableId: string, recordId: string): Promise<void> {
    const table = this.getTable(tableId);
    if (!table) {
      throw new Error(`表格不存在: ${tableId}`);
    }

    await table.deleteRecord(recordId);
  }

  /**
   * 获取记录
   */
  getRecord(tableId: string, recordId: string): any {
    const table = this.getTable(tableId);
    if (!table) {
      return undefined;
    }

    return table.getRecord(recordId);
  }

  /**
   * 获取所有记录
   */
  getAllRecords(tableId: string): any[] {
    const table = this.getTable(tableId);
    if (!table) {
      return [];
    }

    return table.getAllRecords();
  }

  /**
   * 监听表格变更
   */
  onTableChange(callback: (event: TableChangeEvent) => void): void {
    this.eventBus.on('table-change', callback);
  }

  /**
   * 移除表格变更监听器
   */
  offTableChange(callback: (event: TableChangeEvent) => void): void {
    this.eventBus.off('table-change', callback);
  }

  /**
   * 监听记录添加
   */
  onRecordAdded(callback: (event: RecordEvent) => void): void {
    this.eventBus.on('record-added', callback);
  }

  /**
   * 移除记录添加监听器
   */
  offRecordAdded(callback: (event: RecordEvent) => void): void {
    this.eventBus.off('record-added', callback);
  }

  /**
   * 监听记录删除
   */
  onRecordRemoved(callback: (event: RecordEvent) => void): void {
    this.eventBus.on('record-removed', callback);
  }

  /**
   * 移除记录删除监听器
   */
  offRecordRemoved(callback: (event: RecordEvent) => void): void {
    this.eventBus.off('record-removed', callback);
  }

  /**
   * 监听记录变更
   */
  onRecordChanged(callback: (event: RecordEvent) => void): void {
    this.eventBus.on('record-changed', callback);
  }

  /**
   * 移除记录变更监听器
   */
  offRecordChanged(callback: (event: RecordEvent) => void): void {
    this.eventBus.off('record-changed', callback);
  }

  /**
   * 获取表格
   */
  private getTable(tableId: string): RealtimeTable | undefined {
    return this.tables.get(tableId);
  }

  /**
   * 设置连接
   */
  setConnection(connection: any): void {
    this.connection = connection;
    
    // 更新所有表格的连接
    for (const table of this.tables.values()) {
      table.setConnection(connection);
    }
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    for (const table of this.tables.values()) {
      table.destroy();
    }
    this.tables.clear();
  }

  /**
   * 获取所有表格
   */
  getAllTables(): RealtimeTable[] {
    return Array.from(this.tables.values());
  }

  /**
   * 获取表格统计
   */
  getStats(): {
    totalTables: number;
    activeTables: number;
    totalRecords: number;
  } {
    let totalRecords = 0;
    const activeTables = Array.from(this.tables.values()).filter(table => 
      table.getStatus().isSubscribed
    ).length;

    for (const table of this.tables.values()) {
      totalRecords += table.getStatus().recordCount;
    }

    return {
      totalTables: this.tables.size,
      activeTables,
      totalRecords
    };
  }
}
