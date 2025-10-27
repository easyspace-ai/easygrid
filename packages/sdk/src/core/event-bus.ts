/**
 * 简单的事件总线实现
 * 用于在 SDK 内部进行事件通信
 */

import type { EventBus, EventHandler } from '../types/events.js';

export class SimpleEventBus implements EventBus {
  private listeners: Map<string, EventHandler[]> = new Map();

  /**
   * 添加事件监听器
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * 添加连接事件监听器
   */
  onConnection(handler: EventHandler<any>): void {
    this.on('connection', handler);
  }

  /**
   * 添加订阅事件监听器
   */
  onSubscription(handler: EventHandler<any>): void {
    this.on('subscription', handler);
  }

  /**
   * 添加操作事件监听器
   */
  onOperation(handler: EventHandler<any>): void {
    this.on('operation', handler);
  }

  /**
   * 添加快照事件监听器
   */
  onSnapshot(handler: EventHandler<any>): void {
    this.on('snapshot', handler);
  }

  /**
   * 添加在线状态事件监听器
   */
  onPresence(handler: EventHandler<any>): void {
    this.on('presence', handler);
  }

  /**
   * 添加错误事件监听器
   */
  onError(handler: EventHandler<any>): void {
    this.on('error', handler);
  }

  /**
   * 移除事件监听器
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 添加一次性事件监听器
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    const onceHandler = (data: T) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * 触发事件
   */
  emit<T = any>(event: string, data: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EventBus] 事件处理器错误 (${event}):`, error);
        }
      }
    }
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 获取事件监听器数量
   */
  getListenerCount(event: string): number {
    const handlers = this.listeners.get(event);
    return handlers ? handlers.length : 0;
  }

  /**
   * 获取所有事件名称
   */
  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 检查是否有监听器
   */
  hasListeners(event: string): boolean {
    return this.getListenerCount(event) > 0;
  }
}
