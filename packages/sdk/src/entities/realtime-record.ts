/**
 * 实时记录实体类
 * 提供高级 API 隐藏 OT 操作细节
 */

import type { 
  RealtimeRecordInterface,
  FieldChangeEvent,
  RecordChangeEvent 
} from '../types/realtime.js';
import type { OTOperation, ShareDBSnapshot } from '../types/sharedb.js';
import type { EventBus } from '../types/events.js';
import { OperationBuilder } from '../core/sharedb/operation-builder.js';

export class RealtimeRecord implements RealtimeRecordInterface {
  public readonly tableId: string;
  public readonly recordId: string;
  public fields: Record<string, any> = {};
  public version: number = 0;
  
  private eventBus: EventBus;
  private connection: any; // ShareDBConnection 实例
  private isSubscribed: boolean = false;
  private eventHandlers: Map<string, Function[]> = new Map();
  private operationBuilder: OperationBuilder;
  private luckDBInstance: any; // LuckDB 实例，用于调用数据库 API

  constructor(
    tableId: string, 
    recordId: string, 
    eventBus: EventBus,
    connection: any,
    luckDBInstance?: any
  ) {
    this.tableId = tableId;
    this.recordId = recordId;
    this.eventBus = eventBus;
    this.connection = connection;
    this.luckDBInstance = luckDBInstance;
    this.operationBuilder = new OperationBuilder();
    
    this.setupEventHandlers();
  }

  /**
   * 获取字段值
   */
  get(fieldId: string): any {
    return this.fields[fieldId];
  }

  /**
   * 设置字段值
   */
  async set(fieldId: string, value: any): Promise<void> {
    const oldValue = this.fields[fieldId];
    
    // 如果值没有变化，直接返回
    if (oldValue === value) {
      return;
    }

    // 更新本地字段
    this.fields[fieldId] = value;

    // 先保存到数据库
    if (this.luckDBInstance) {
      try {
        console.log('[RealtimeRecord] 保存到数据库:', { tableId: this.tableId, recordId: this.recordId, fieldId, value });
        await this.luckDBInstance.updateRecord(this.tableId, this.recordId, {
          data: {
            [fieldId]: value
          }
        });
        console.log('[RealtimeRecord] 数据库保存成功');
      } catch (error) {
        console.error('[RealtimeRecord] 数据库保存失败:', error);
        // 恢复本地字段值
        this.fields[fieldId] = oldValue;
        throw error;
      }
    }

    // 构建 OT 操作
    const operation = OperationBuilder.replaceField(
      OperationBuilder.createFieldPath(fieldId),
      oldValue,
      value
    );

    // 提交操作
    await this.submitOperation([operation]);

    // 触发字段变更事件
    this.emitFieldChange(fieldId, oldValue, value);
  }

  /**
   * 删除字段
   */
  async delete(fieldId: string): Promise<void> {
    const oldValue = this.fields[fieldId];
    
    if (oldValue === undefined) {
      return;
    }

    // 从本地字段中删除
    delete this.fields[fieldId];

    // 构建 OT 操作
    const operation = OperationBuilder.deleteField(
      OperationBuilder.createFieldPath(fieldId),
      oldValue
    );

    // 提交操作
    await this.submitOperation([operation]);

    // 触发字段变更事件
    this.emitFieldChange(fieldId, oldValue, undefined);
  }

  /**
   * 刷新记录数据
   */
  async refresh(): Promise<void> {
    if (!this.connection || !this.connection.isConnected()) {
      throw new Error('ShareDB connection not established');
    }

    // 发送获取快照消息
    const message = {
      a: 'f',
      c: `rec_${this.tableId}`,
      d: this.recordId
    };

    this.connection.send(message);
  }

  /**
   * 订阅记录变更
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
      c: `rec_${this.tableId}`,
      d: this.recordId
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
        c: `rec_${this.tableId}`,
        d: this.recordId
      };

      this.connection.send(message);
    }

    this.isSubscribed = false;
  }

  /**
   * 监听事件
   */
  on(event: 'change', callback: (field: string, value: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: 'change', callback: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 销毁记录实例
   */
  destroy(): void {
    this.unsubscribe();
    this.eventHandlers.clear();
    this.fields = {};
  }

  /**
   * 更新快照数据
   */
  updateSnapshot(snapshot: ShareDBSnapshot): void {
    this.version = snapshot.v;
    this.fields = snapshot.data?.fields || {};
  }

  /**
   * 应用操作
   */
  applyOperation(operation: OTOperation): void {
    console.log('[RealtimeRecord] 应用操作:', { 
      operation, 
      path: operation.p, 
      oi: operation.oi, 
      od: operation.od 
    });
    
    // 解析操作路径
    const path = operation.p;
    if (path.length < 2 || path[0] !== 'fields') {
      console.log('[RealtimeRecord] 操作路径无效:', path);
      return;
    }

    const fieldId = path[1] as string;
    let newValue: any;

    if (operation.oi !== undefined) {
      // 插入操作
      newValue = operation.oi;
    } else if (operation.od !== undefined) {
      // 删除操作
      newValue = undefined;
    } else {
      console.log('[RealtimeRecord] 操作类型无效:', operation);
      return;
    }

    const oldValue = this.fields[fieldId];
    this.fields[fieldId] = newValue;

    console.log('[RealtimeRecord] 字段值更新:', { fieldId, oldValue, newValue });

    // 触发字段变更事件
    this.emitFieldChange(fieldId, oldValue, newValue);
  }

  /**
   * 设置连接
   */
  setConnection(connection: any): void {
    this.connection = connection;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    console.log('[RealtimeRecord] 设置事件监听器:', { 
      tableId: this.tableId, 
      recordId: this.recordId,
      eventBus: !!this.eventBus,
      eventBusType: typeof this.eventBus,
      eventBusMethods: this.eventBus ? Object.getOwnPropertyNames(this.eventBus) : []
    });
    
    // 监听快照事件
    this.eventBus.on('snapshot', (event: any) => {
      console.log('[RealtimeRecord] 收到快照事件:', { 
        collection: event.collection, 
        docId: event.docId, 
        tableId: this.tableId, 
        recordId: this.recordId 
      });
      if (event.collection === `rec_${this.tableId}` && event.docId === this.recordId) {
        this.updateSnapshot(event.snapshot);
      }
    });

    // 监听操作事件
    this.eventBus.on('operation', (event: any) => {
      console.log('[RealtimeRecord] 收到操作事件:', { 
        collection: event.collection, 
        docId: event.docId, 
        tableId: this.tableId, 
        recordId: this.recordId,
        operationCount: event.operation?.length 
      });
      if (event.collection === `rec_${this.tableId}` && event.docId === this.recordId) {
        for (const operation of event.operation) {
          this.applyOperation(operation);
        }
      }
    });
    
    console.log('[RealtimeRecord] 事件监听器设置完成');
    
    // 测试事件监听器是否正确注册
    console.log('[RealtimeRecord] 测试事件监听器注册...');
    this.eventBus.emit('test', { message: 'test event' });
  }

  /**
   * 提交操作
   */
  private async submitOperation(operations: OTOperation[]): Promise<void> {
    if (!this.connection || !this.connection.isConnected()) {
      throw new Error('ShareDB connection not established');
    }

    // 发送操作消息
    const message = {
      a: 'op',
      c: `rec_${this.tableId}`,
      d: this.recordId,
      v: this.version,
      op: operations
    };

    this.connection.send(message);
    this.version++;
  }

  /**
   * 触发字段变更事件
   */
  private emitFieldChange(fieldId: string, oldValue: any, newValue: any): void {
    console.log('[RealtimeRecord] 触发字段变更事件:', { fieldId, oldValue, newValue });
    
    const handlers = this.eventHandlers.get('change');
    console.log('[RealtimeRecord] 事件处理器数量:', handlers?.length || 0);
    
    if (handlers) {
      for (const handler of handlers) {
        try {
          console.log('[RealtimeRecord] 调用事件处理器:', { fieldId, newValue });
          handler(fieldId, newValue);
        } catch (error) {
          console.error('[RealtimeRecord] 事件处理器错误:', error);
        }
      }
    }

    // 触发全局事件
    this.eventBus.emit('field-change', {
      tableId: this.tableId,
      recordId: this.recordId,
      fieldId,
      oldValue,
      newValue,
      timestamp: Date.now()
    } as FieldChangeEvent);
  }

  /**
   * 获取记录状态
   */
  getStatus(): {
    isSubscribed: boolean;
    version: number;
    fieldCount: number;
  } {
    return {
      isSubscribed: this.isSubscribed,
      version: this.version,
      fieldCount: Object.keys(this.fields).length
    };
  }
}
