/**
 * 事件系统类型定义
 * 统一的事件处理和分发机制
 */

// 基础事件接口
export interface BaseEvent {
  type: string
  timestamp: number
  source?: string
  userId?: string
}

// 事件处理器类型
export type EventHandler<T = any> = (event: T) => void

// 事件监听器接口
export interface EventListener<T = any> {
  event: string
  handler: EventHandler<T>
  once?: boolean
}

// 事件发射器接口
export interface EventEmitter {
  on<T = any>(event: string, handler: EventHandler<T>): void
  off<T = any>(event: string, handler: EventHandler<T>): void
  once<T = any>(event: string, handler: EventHandler<T>): void
  emit<T = any>(event: string, data: T): void
  removeAllListeners(event?: string): void
}

// 连接事件
export interface ConnectionEvent extends BaseEvent {
  type: 'connecting' | 'connected' | 'disconnected' | 'error'
  state: 'connecting' | 'connected' | 'disconnected' | 'error'
  error?: Error
}

// 订阅事件
export interface SubscriptionEvent extends BaseEvent {
  type: 'subscribed' | 'unsubscribed' | 'subscription-error'
  collection: string
  docId: string
  error?: Error
}

// 操作事件
export interface OperationEvent extends BaseEvent {
  type: 'operation-submitted' | 'operation-received' | 'operation-error'
  collection: string
  docId: string
  operation: any
  version: number
  error?: Error
}

// 快照事件
export interface SnapshotEvent extends BaseEvent {
  type: 'snapshot-received' | 'snapshot-error'
  collection: string
  docId: string
  snapshot: any
  version: number
  error?: Error
}

// 在线状态事件
export interface PresenceEvent extends BaseEvent {
  type: 'user-joined' | 'user-left' | 'cursor-moved' | 'selection-changed'
  userId: string
  data: any
}

// 错误事件
export interface ErrorEvent extends BaseEvent {
  type: 'error'
  error: Error
  context?: any
}

// 事件总线接口
export interface EventBus extends EventEmitter {
  // 添加类型化的事件监听
  onConnection(handler: EventHandler<ConnectionEvent>): void
  onSubscription(handler: EventHandler<SubscriptionEvent>): void
  onOperation(handler: EventHandler<OperationEvent>): void
  onSnapshot(handler: EventHandler<SnapshotEvent>): void
  onPresence(handler: EventHandler<PresenceEvent>): void
  onError(handler: EventHandler<ErrorEvent>): void
}
