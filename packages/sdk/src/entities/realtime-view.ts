/**
 * 实时视图实体类
 * 管理视图中的记录和配置
 */

import type { 
  RealtimeViewInterface,
  ViewChangeEvent,
  RecordEvent,
  FilterExpression,
  SortExpression
} from '../types/realtime.js';
import type { EventBus } from '../types/events.js';
import { RealtimeRecord } from './realtime-record.js';

export class RealtimeView implements RealtimeViewInterface {
  public readonly viewId: string;
  public readonly tableId: string;
  public records: Map<string, RealtimeRecord> = new Map();
  
  private eventBus: EventBus;
  private connection: any; // ShareDBConnection 实例
  private isSubscribed: boolean = false;
  private eventHandlers: Map<string, Function[]> = new Map();
  
  // 视图配置
  private filter?: FilterExpression;
  private sort?: SortExpression[];
  private group?: any;
  private columnMeta?: any;

  constructor(
    viewId: string,
    tableId: string,
    eventBus: EventBus,
    connection: any
  ) {
    this.viewId = viewId;
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
   * 获取过滤后的记录
   */
  getFilteredRecords(): RealtimeRecord[] {
    let records = Array.from(this.records.values());
    
    // 应用过滤器
    if (this.filter) {
      records = records.filter(record => this.evaluateFilter(record, this.filter!));
    }
    
    // 应用排序
    if (this.sort && this.sort.length > 0) {
      records = this.applySorting(records, this.sort);
    }
    
    return records;
  }

  /**
   * 更新过滤器
   */
  async updateFilter(filter: FilterExpression): Promise<void> {
    this.filter = filter;
    
    // 触发视图变更事件
    this.emitViewChange('filter-changed', {
      viewId: this.viewId,
      type: 'filter-changed',
      data: filter,
      timestamp: Date.now()
    } as ViewChangeEvent);
  }

  /**
   * 更新排序
   */
  async updateSort(sort: SortExpression[]): Promise<void> {
    this.sort = sort;
    
    // 触发视图变更事件
    this.emitViewChange('sort-changed', {
      viewId: this.viewId,
      type: 'sort-changed',
      data: sort,
      timestamp: Date.now()
    } as ViewChangeEvent);
  }

  /**
   * 更新分组
   */
  async updateGroup(group: any): Promise<void> {
    this.group = group;
    
    // 触发视图变更事件
    this.emitViewChange('group-changed', {
      viewId: this.viewId,
      type: 'group-changed',
      data: group,
      timestamp: Date.now()
    } as ViewChangeEvent);
  }

  /**
   * 更新列元数据
   */
  async updateColumnMeta(columnMeta: any): Promise<void> {
    this.columnMeta = columnMeta;
    
    // 触发视图变更事件
    this.emitViewChange('column-meta-changed', {
      viewId: this.viewId,
      type: 'column-meta-changed',
      data: columnMeta,
      timestamp: Date.now()
    } as ViewChangeEvent);
  }

  /**
   * 订阅视图
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
      c: `viw_${this.viewId}`,
      d: this.viewId
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
        c: `viw_${this.viewId}`,
        d: this.viewId
      };

      this.connection.send(message);
    }

    this.isSubscribed = false;
  }

  /**
   * 监听事件
   */
  on(event: 'view-changed' | 'record-added' | 'record-removed' | 'record-changed', callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  /**
   * 销毁视图实例
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
    
    // 检查记录是否匹配当前过滤器
    if (this.filter && !this.evaluateFilter(record, this.filter)) {
      return;
    }
    
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
        const record = this.records.get(event.recordId);
        if (record) {
          // 检查记录是否仍然匹配过滤器
          const wasVisible = !this.filter || this.evaluateFilter(record, this.filter);
          const isVisible = !this.filter || this.evaluateFilter(record, this.filter);
          
          if (wasVisible !== isVisible) {
            if (isVisible) {
              this.emitRecordEvent('record-added', {
                tableId: this.tableId,
                recordId: event.recordId,
                data: record.fields,
                timestamp: event.timestamp
              } as RecordEvent);
            } else {
              this.emitRecordEvent('record-removed', {
                tableId: this.tableId,
                recordId: event.recordId,
                data: record.fields,
                timestamp: event.timestamp
              } as RecordEvent);
            }
          } else if (isVisible) {
            // 触发记录变更事件
            this.emitRecordEvent('record-changed', {
              tableId: this.tableId,
              recordId: event.recordId,
              data: { [event.fieldId]: event.newValue },
              timestamp: event.timestamp
            } as RecordEvent);
          }
        }
      }
    });

    // 监听快照事件
    this.eventBus.on('snapshot', (event: any) => {
      if (event.collection === `viw_${this.viewId}`) {
        this.handleViewSnapshot(event.snapshot);
      }
    });

    // 监听操作事件
    this.eventBus.on('operation', (event: any) => {
      if (event.collection === `viw_${this.viewId}`) {
        this.handleViewOperation(event);
      }
    });
  }

  /**
   * 处理视图快照
   */
  private handleViewSnapshot(snapshot: any): void {
    // 更新视图配置
    if (snapshot.data) {
      this.filter = snapshot.data.filter;
      this.sort = snapshot.data.sort;
      this.group = snapshot.data.group;
      this.columnMeta = snapshot.data.columnMeta;
    }

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
   * 处理视图操作
   */
  private handleViewOperation(event: any): void {
    // 根据操作类型处理
    for (const operation of event.operation) {
      const path = operation.p;
      
      if (path.length >= 1) {
        const field = path[0] as string;
        
        switch (field) {
          case 'filter':
            if (operation.oi !== undefined) {
              this.filter = operation.oi;
            }
            break;
          case 'sort':
            if (operation.oi !== undefined) {
              this.sort = operation.oi;
            }
            break;
          case 'group':
            if (operation.oi !== undefined) {
              this.group = operation.oi;
            }
            break;
          case 'columnMeta':
            if (operation.oi !== undefined) {
              this.columnMeta = operation.oi;
            }
            break;
        }
      }
    }
  }

  /**
   * 评估过滤器
   */
  private evaluateFilter(record: RealtimeRecord, filter: FilterExpression): boolean {
    const value = record.get(filter.field);
    
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'not_equals':
        return value !== filter.value;
      case 'contains':
        return typeof value === 'string' && value.includes(filter.value);
      case 'not_contains':
        return typeof value === 'string' && !value.includes(filter.value);
      case 'starts_with':
        return typeof value === 'string' && value.startsWith(filter.value);
      case 'ends_with':
        return typeof value === 'string' && value.endsWith(filter.value);
      case 'greater_than':
        return typeof value === 'number' && value > filter.value;
      case 'greater_than_or_equal':
        return typeof value === 'number' && value >= filter.value;
      case 'less_than':
        return typeof value === 'number' && value < filter.value;
      case 'less_than_or_equal':
        return typeof value === 'number' && value <= filter.value;
      case 'is_empty':
        return value === undefined || value === null || value === '';
      case 'is_not_empty':
        return value !== undefined && value !== null && value !== '';
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'not_in':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      default:
        return true;
    }
  }

  /**
   * 应用排序
   */
  private applySorting(records: RealtimeRecord[], sort: SortExpression[]): RealtimeRecord[] {
    return records.sort((a, b) => {
      for (const sortExpr of sort) {
        const aValue = a.get(sortExpr.field);
        const bValue = b.get(sortExpr.field);
        
        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
        
        if (comparison !== 0) {
          return sortExpr.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
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
          console.error('[RealtimeView] 事件处理器错误:', error);
        }
      }
    }
  }

  /**
   * 触发视图变更事件
   */
  private emitViewChange(type: string, event: ViewChangeEvent): void {
    const handlers = this.eventHandlers.get('view-changed');
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error('[RealtimeView] 事件处理器错误:', error);
        }
      }
    }
    
    this.eventBus.emit('view-change', event);
  }

  /**
   * 获取视图状态
   */
  getStatus(): {
    isSubscribed: boolean;
    recordCount: number;
    filteredRecordCount: number;
    hasFilter: boolean;
    hasSort: boolean;
  } {
    const filteredRecords = this.getFilteredRecords();
    
    return {
      isSubscribed: this.isSubscribed,
      recordCount: this.records.size,
      filteredRecordCount: filteredRecords.length,
      hasFilter: !!this.filter,
      hasSort: !!(this.sort && this.sort.length > 0)
    };
  }

  /**
   * 获取视图配置
   */
  getConfig(): {
    filter?: FilterExpression;
    sort?: SortExpression[];
    group?: any;
    columnMeta?: any;
  } {
    return {
      filter: this.filter,
      sort: this.sort,
      group: this.group,
      columnMeta: this.columnMeta
    };
  }
}
