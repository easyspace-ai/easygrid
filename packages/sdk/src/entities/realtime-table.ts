/**
 * 实时表格实体类
 * 管理表格中的所有记录
 */

import type { 
  RealtimeTableInterface,
  TableChangeEvent,
  RecordEvent,
  FieldUpdate,
  BatchUpdate
} from '../types/realtime.js';
import type { EventBus } from '../types/events.js';
import { RealtimeRecord } from './realtime-record.js';

export class RealtimeTable implements RealtimeTableInterface {
  public readonly tableId: string;
  public records: Map<string, RealtimeRecord> = new Map();
  
  private eventBus: EventBus;
  private connection: any; // ShareDBConnection 实例
  private isSubscribed: boolean = false;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(
    tableId: string,
    eventBus: EventBus,
    connection: any
  ) {
    this.tableId = tableId;
    this.eventBus = eventBus;
    this.connection = connection;
    
    this.setupEventHandlers();
  }

  /**
   * 获取记录
   */
  getRecord(recordId: string): RealtimeRecord | undefined {
    return this.records.get(recordId);
  }

  /**
   * 获取所有记录
   */
  getAllRecords(): RealtimeRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * 创建记录
   */
  async createRecord(data: Record<string, any>): Promise<RealtimeRecord> {
    // 生成记录 ID（实际应用中应该由服务器生成）
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建记录实例
    const record = new RealtimeRecord(this.tableId, recordId, this.eventBus, this.connection);
    
    // 设置初始数据
    for (const [fieldId, value] of Object.entries(data)) {
      record.fields[fieldId] = value;
    }

    // 添加到记录映射
    this.records.set(recordId, record);

    // 触发记录添加事件
    this.emitRecordEvent('record-added', {
      tableId: this.tableId,
      recordId,
      data,
      timestamp: Date.now()
    } as RecordEvent);

    return record;
  }

  /**
   * 删除记录
   */
  async deleteRecord(recordId: string): Promise<void> {
    const record = this.records.get(recordId);
    if (!record) {
      return;
    }

    // 销毁记录实例
    record.destroy();
    this.records.delete(recordId);

    // 触发记录删除事件
    this.emitRecordEvent('record-removed', {
      tableId: this.tableId,
      recordId,
      data: record.fields,
      timestamp: Date.now()
    } as RecordEvent);
  }

  /**
   * 批量更新字段
   */
  async batchUpdate(updates: FieldUpdate[]): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    // 按记录分组更新
    const updatesByRecord = new Map<string, FieldUpdate[]>();
    for (const update of updates) {
      if (!updatesByRecord.has(update.recordId)) {
        updatesByRecord.set(update.recordId, []);
      }
      updatesByRecord.get(update.recordId)!.push(update);
    }

    // 并行更新每个记录
    const promises = Array.from(updatesByRecord.entries()).map(async ([recordId, recordUpdates]) => {
      const record = this.records.get(recordId);
      if (!record) {
        console.warn(`[RealtimeTable] 记录不存在: ${recordId}`);
        return;
      }

      // 批量更新记录字段
      for (const update of recordUpdates) {
        await record.set(update.fieldId, update.value);
      }
    });

    await Promise.all(promises);

    // 触发批量更新事件
    this.emitTableChange('record-changed', {
      tableId: this.tableId,
      type: 'record-changed',
      data: updates,
      timestamp: Date.now()
    } as TableChangeEvent);
  }

  /**
   * 订阅表格
   */
  subscribe(): void {
    if (this.isSubscribed) {
      return;
    }

    if (!this.connection || !this.connection.isConnected()) {
      throw new Error('ShareDB connection not established');
    }

    // 发送订阅消息
    const message = {
      a: 's',
      c: `tbl_${this.tableId}`,
      d: this.tableId
    };

    this.connection.send(message);
    this.isSubscribed = true;
  }

  /**
   * 取消订阅
   */
  unsubscribe(): void {
    if (!this.isSubscribed) {
      return;
    }

    if (this.connection && this.connection.isConnected()) {
      // 发送取消订阅消息
      const message = {
        a: 'us',
        c: `tbl_${this.tableId}`,
        d: this.tableId
      };

      this.connection.send(message);
    }

    this.isSubscribed = false;
  }

  /**
   * 监听事件
   */
  on(event: 'record-added' | 'record-removed' | 'record-changed', callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  /**
   * 销毁表格实例
   */
  destroy(): void {
    this.unsubscribe();
    
    // 销毁所有记录实例
    for (const record of this.records.values()) {
      record.destroy();
    }
    this.records.clear();
    
    this.eventHandlers.clear();
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
   * 添加记录实例
   */
  addRecord(record: RealtimeRecord): void {
    this.records.set(record.recordId, record);
    
    // 触发记录添加事件
    this.emitRecordEvent('record-added', {
      tableId: this.tableId,
      recordId: record.recordId,
      data: record.fields,
      timestamp: Date.now()
    } as RecordEvent);
  }

  /**
   * 移除记录实例
   */
  removeRecord(recordId: string): void {
    const record = this.records.get(recordId);
    if (record) {
      record.destroy();
      this.records.delete(recordId);
      
      // 触发记录删除事件
      this.emitRecordEvent('record-removed', {
        tableId: this.tableId,
        recordId,
        data: record.fields,
        timestamp: Date.now()
      } as RecordEvent);
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 监听记录变更事件
    this.eventBus.on('field-change', (event: any) => {
      if (event.tableId === this.tableId) {
        // 触发记录变更事件
        this.emitRecordEvent('record-changed', {
          tableId: this.tableId,
          recordId: event.recordId,
          data: { [event.fieldId]: event.newValue },
          timestamp: event.timestamp
        } as RecordEvent);
      }
    });

    // 监听快照事件
    this.eventBus.on('snapshot', (event: any) => {
      if (event.collection === `tbl_${this.tableId}`) {
        this.handleTableSnapshot(event.snapshot);
      }
    });

    // 监听操作事件
    this.eventBus.on('operation', (event: any) => {
      if (event.collection === `tbl_${this.tableId}`) {
        this.handleTableOperation(event);
      }
    });
  }

  /**
   * 处理表格快照
   */
  private handleTableSnapshot(snapshot: any): void {
    // 解析快照中的记录数据
    if (snapshot.data && snapshot.data.records) {
      for (const [recordId, recordData] of Object.entries(snapshot.data.records)) {
        let record = this.records.get(recordId);
        if (!record) {
          record = new RealtimeRecord(this.tableId, recordId, this.eventBus, this.connection);
          this.records.set(recordId, record);
        }
        record.updateSnapshot({
          v: snapshot.v,
          data: { fields: recordData },
          type: 'record'
        });
      }
    }
  }

  /**
   * 处理表格操作
   */
  private handleTableOperation(event: any): void {
    // 根据操作类型处理
    for (const operation of event.operation) {
      const path = operation.p;
      if (path.length >= 2 && path[0] === 'records') {
        const recordId = path[1] as string;
        let record = this.records.get(recordId);
        
        if (operation.oi !== undefined) {
          // 记录添加操作
          if (!record) {
            record = new RealtimeRecord(this.tableId, recordId, this.eventBus, this.connection);
            this.records.set(recordId, record);
          }
          record.applyOperation(operation);
        } else if (operation.od !== undefined) {
          // 记录删除操作
          if (record) {
            this.removeRecord(recordId);
          }
        }
      }
    }
  }

  /**
   * 触发记录事件
   */
  private emitRecordEvent(type: string, event: RecordEvent): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error('[RealtimeTable] 事件处理器错误:', error);
        }
      }
    }
  }

  /**
   * 触发表格变更事件
   */
  private emitTableChange(type: string, event: TableChangeEvent): void {
    this.eventBus.emit('table-change', event);
  }

  /**
   * 获取表格状态
   */
  getStatus(): {
    isSubscribed: boolean;
    recordCount: number;
    activeRecords: number;
  } {
    const activeRecords = Array.from(this.records.values()).filter(record => 
      record.getStatus().isSubscribed
    ).length;

    return {
      isSubscribed: this.isSubscribed,
      recordCount: this.records.size,
      activeRecords
    };
  }

  /**
   * 搜索记录
   */
  searchRecords(predicate: (record: RealtimeRecord) => boolean): RealtimeRecord[] {
    return Array.from(this.records.values()).filter(predicate);
  }

  /**
   * 获取字段值统计
   */
  getFieldStats(fieldId: string): {
    total: number;
    nonNull: number;
    unique: number;
    values: any[];
  } {
    const values = Array.from(this.records.values())
      .map(record => record.get(fieldId))
      .filter(value => value !== undefined);

    const uniqueValues = new Set(values);
    
    return {
      total: this.records.size,
      nonNull: values.length,
      unique: uniqueValues.size,
      values: Array.from(uniqueValues)
    };
  }
}
