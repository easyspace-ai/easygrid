/**
 * 实时视图客户端
 * 提供视图操作的高级 API
 */

import type { 
  ViewChangeEvent,
  RecordEvent,
  FilterExpression,
  SortExpression,
  RealtimeViewInterface
} from '../types/realtime.js';
import type { EventBus } from '../types/events.js';
import { RealtimeView } from '../entities/realtime-view.js';

export class RealtimeViewClient {
  private eventBus: EventBus;
  private connection: any; // ShareDBConnection 实例
  private views: Map<string, RealtimeView> = new Map();

  constructor(eventBus: EventBus, connection: any) {
    this.eventBus = eventBus;
    this.connection = connection;
  }

  /**
   * 订阅视图
   */
  subscribe(viewId: string, tableId: string): RealtimeViewInterface {
    if (this.views.has(viewId)) {
      return this.views.get(viewId)!;
    }

    const view = new RealtimeView(viewId, tableId, this.eventBus, this.connection);
    this.views.set(viewId, view);
    
    return view;
  }

  /**
   * 更新过滤器
   */
  async updateFilter(viewId: string, filter: FilterExpression): Promise<void> {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    await view.updateFilter(filter);
  }

  /**
   * 更新排序
   */
  async updateSort(viewId: string, sort: SortExpression[]): Promise<void> {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    await view.updateSort(sort);
  }

  /**
   * 更新分组
   */
  async updateGroup(viewId: string, group: any): Promise<void> {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    await view.updateGroup(group);
  }

  /**
   * 更新列元数据
   */
  async updateColumnMeta(viewId: string, columnMeta: any): Promise<void> {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    await view.updateColumnMeta(columnMeta);
  }

  /**
   * 获取记录
   */
  getRecord(viewId: string, recordId: string): any {
    const view = this.getView(viewId);
    if (!view) {
      return undefined;
    }

    return view.getRecord(recordId);
  }

  /**
   * 获取所有记录
   */
  getAllRecords(viewId: string): any[] {
    const view = this.getView(viewId);
    if (!view) {
      return [];
    }

    return view.getAllRecords();
  }

  /**
   * 获取过滤后的记录
   */
  getFilteredRecords(viewId: string): any[] {
    const view = this.getView(viewId);
    if (!view) {
      return [];
    }

    return view.getFilteredRecords();
  }

  /**
   * 监听视图变更
   */
  onViewChange(callback: (event: ViewChangeEvent) => void): void {
    this.eventBus.on('view-change', callback);
  }

  /**
   * 移除视图变更监听器
   */
  offViewChange(callback: (event: ViewChangeEvent) => void): void {
    this.eventBus.off('view-change', callback);
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
    this.eventBus.off('record-removed', callback);
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
   * 获取视图
   */
  private getView(viewId: string): RealtimeView | undefined {
    return this.views.get(viewId);
  }

  /**
   * 设置连接
   */
  setConnection(connection: any): void {
    this.connection = connection;
    
    // 更新所有视图的连接
    for (const view of this.views.values()) {
      view.setConnection(connection);
    }
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    for (const view of this.views.values()) {
      view.destroy();
    }
    this.views.clear();
  }

  /**
   * 获取所有视图
   */
  getAllViews(): RealtimeView[] {
    return Array.from(this.views.values());
  }

  /**
   * 获取视图统计
   */
  getStats(): {
    totalViews: number;
    activeViews: number;
    totalRecords: number;
  } {
    let totalRecords = 0;
    const activeViews = Array.from(this.views.values()).filter(view => 
      view.getStatus().isSubscribed
    ).length;

    for (const view of this.views.values()) {
      totalRecords += view.getStatus().recordCount;
    }

    return {
      totalViews: this.views.size,
      activeViews,
      totalRecords
    };
  }
}
