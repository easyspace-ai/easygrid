/**
 * ShareDB 文档管理
 * 封装单个文档的操作和状态管理
 */

import type { ReactWebSocketShareDBClient } from './react-websocket-sharedb-client.js';
import type {
  OTOperation,
  ShareDBSnapshot,
  ShareDBPresenceData,
} from '../types/index.js';

export type DocumentEventType = 'snapshot' | 'operation' | 'presence' | 'error' | 'op';

export interface DocumentEvent {
  type: DocumentEventType;
  data: any;
  timestamp: number;
}

export interface OperationEvent {
  op: OTOperation[];
  version: number;
  source?: string;
}

export type DocumentEventHandler = (event: DocumentEvent) => void;
export type OperationEventHandler = (event: OperationEvent) => void;

export class ShareDBDocument {
  private client: ReactWebSocketShareDBClient;
  private collection: string;
  private docId: string;
  private snapshot?: ShareDBSnapshot;
  private version: number = 0;
  private localVersion: number = 0;
  private isSubscribed: boolean = false;
  private eventHandlers: Map<DocumentEventType, DocumentEventHandler[]> = new Map();
  private operationHandlers: OperationEventHandler[] = [];
  private messageHandler?: (message: any) => void;
  private pendingOps: OTOperation[] = [];

  constructor(client: ReactWebSocketShareDBClient, collection: string, docId: string) {
    this.client = client;
    this.collection = collection;
    this.docId = docId;
    this.setupMessageHandler();
  }

  /**
   * 获取文档快照
   */
  public async fetch(): Promise<ShareDBSnapshot> {
    const snapshot = await this.client.fetch(this.collection, this.docId);
    this.snapshot = snapshot;
    this.version = snapshot.v;
    this.emit('snapshot', snapshot);
    return snapshot;
  }

  /**
   * 订阅文档变更
   */
  public subscribe(): void {
    if (this.isSubscribed) {
      return;
    }

    this.client.subscribe(this.collection, this.docId, this.messageHandler as any);
    this.isSubscribed = true;
  }

  /**
   * 取消订阅文档
   */
  public unsubscribe(): void {
    if (!this.isSubscribed) {
      return;
    }

    this.client.unsubscribe(this.collection, this.docId);
    this.isSubscribed = false;
  }

  /**
   * 提交操作
   */
  public submitOp(op: OTOperation[]): void {
    this.localVersion++;
    this.pendingOps.push(...op);
    this.client.submitOp(this.collection, this.docId, op, this.version);
  }

  /**
   * 提交操作（带版本检查）
   */
  public submitOpWithVersion(op: OTOperation[], expectedVersion: number): boolean {
    if (expectedVersion !== this.version) {
      this.emit('error', {
        code: 'VERSION_MISMATCH',
        message: `Expected version ${expectedVersion}, but current version is ${this.version}`
      });
      return false;
    }

    this.submitOp(op);
    return true;
  }

  /**
   * 批量提交操作
   */
  public submitBatchOps(operations: OTOperation[][]): void {
    const allOps: OTOperation[] = [];
    operations.forEach(op => allOps.push(...op));
    this.submitOp(allOps);
  }

  /**
   * 获取当前数据
   */
  public getData(): any {
    return this.snapshot?.data;
  }

  /**
   * 获取当前版本
   */
  public getVersion(): number {
    return this.version;
  }

  /**
   * 获取本地版本
   */
  public getLocalVersion(): number {
    return this.localVersion;
  }

  /**
   * 检查是否有待处理的操作
   */
  public hasPendingOps(): boolean {
    return this.pendingOps.length > 0;
  }

  /**
   * 获取待处理的操作
   */
  public getPendingOps(): OTOperation[] {
    return [...this.pendingOps];
  }

  /**
   * 清空待处理的操作
   */
  public clearPendingOps(): void {
    this.pendingOps = [];
  }

  /**
   * 获取快照
   */
  public getSnapshot(): ShareDBSnapshot | undefined {
    return this.snapshot;
  }

  /**
   * 检查是否已订阅
   */
  public isSubscribedTo(): boolean {
    return this.isSubscribed;
  }

  /**
   * 提交在线状态
   */
  public submitPresence(data: Record<string, any>): void {
    this.client.submitPresence(this.collection, this.docId, data);
  }

  /**
   * 获取在线状态
   */
  public getPresence(): any {
    return this.client.getPresence(this.collection, this.docId);
  }

  /**
   * 监听事件
   */
  public on(event: DocumentEventType, handler: DocumentEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * 监听操作事件
   */
  public onOp(handler: OperationEventHandler): void {
    this.operationHandlers.push(handler);
  }

  /**
   * 移除操作事件监听器
   */
  public offOp(handler: OperationEventHandler): void {
    const index = this.operationHandlers.indexOf(handler);
    if (index > -1) {
      this.operationHandlers.splice(index, 1);
    }
  }

  /**
   * 移除事件监听器
   */
  public off(event: DocumentEventType, handler: DocumentEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 移除所有事件监听器
   */
  public removeAllListeners(event?: DocumentEventType): void {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
      this.operationHandlers = [];
    }
  }

  /**
   * 销毁文档实例
   */
  public destroy(): void {
    this.unsubscribe();
    this.removeAllListeners();
    if (this.messageHandler) {
      this.client.offMessage(this.messageHandler);
    }
  }

  // ==================== 私有方法 ====================

  private setupMessageHandler(): void {
    this.messageHandler = (message: any) => {
      // 处理文档快照更新
      if (message.data && message.c === this.collection && message.d === this.docId) {
        this.snapshot = message.data;
        this.version = this.snapshot?.v || 0;
        this.emit('snapshot', this.snapshot);
        return;
      }

      // 处理文档操作
      if (message.a && Array.isArray(message.a) && message.a.length > 0) {
        message.a.forEach((op: any) => {
          if (op.c === this.collection && op.d === this.docId) {
            this.handleDocumentOperation(op);
          }
        });
      }

      // 处理其他消息类型
      if (message.c === this.collection && message.d === this.docId) {
        switch (message.a) {
          case 'f': // fetch response
            if (message.data) {
              this.snapshot = message.data;
              this.version = this.snapshot?.v || 0;
              this.emit('snapshot', this.snapshot);
            }
            break;

          case 'op': // operation
            if (message.op && message.v !== undefined) {
              this.version = message.v;
              this.emit('operation', {
                op: message.op,
                version: message.v,
              });
              
              // 触发操作事件
              const operationEvent: OperationEvent = {
                op: message.op,
                version: message.v,
                source: 'remote'
              };
              this.operationHandlers.forEach(handler => {
                try {
                  handler(operationEvent);
                } catch (error) {
                  console.error('Error in operation handler:', error);
                }
              });
            }
            break;

          case 'p': // presence
            if (message.presence) {
              this.emit('presence', message.presence);
            }
            break;

          case 'error':
            if (message.error) {
              this.emit('error', message.error);
            }
            break;
        }
      }
    };

    this.client.onMessage(this.messageHandler);
  }

  /**
   * 处理文档操作 - 基于 Teable 的 OT 操作格式
   */
  private handleDocumentOperation(operation: any): void {
    try {
      const { op: ops, v: version } = operation;
      
      if (!ops || version === undefined) {
        return;
      }

      this.log(`Processing document operation for ${this.collection}:${this.docId}`, ops);
      
      // 更新版本
      this.version = version;
      
      // 处理 Teable 风格的 OT 操作
      if (Array.isArray(ops)) {
        ops.forEach((otOp: any) => {
          this.log(`Processing OT operation:`, otOp);
          
          // 处理字段更新操作
          if (otOp.p && otOp.p.length > 0) {
            const fieldId = otOp.p[0];
            const newValue = otOp.oi; // object insert
            const oldValue = otOp.od; // object delete
            
            this.log(`Field update: ${fieldId}`, {
              oldValue,
              newValue,
              operation: otOp
            });

            // 更新本地快照数据
            if (this.snapshot && this.snapshot.data) {
              if (newValue !== undefined) {
                (this.snapshot.data as any)[fieldId] = newValue;
              } else if (oldValue !== undefined) {
                delete (this.snapshot.data as any)[fieldId];
              }
            }
          }
        });
      }
      
      // 触发操作事件
      const operationEvent: OperationEvent = {
        op: ops,
        version: version,
        source: 'remote'
      };
      
      this.operationHandlers.forEach(handler => {
        try {
          handler(operationEvent);
        } catch (error) {
          console.error('Error in operation handler:', error);
        }
      });

      // 触发通用操作事件
      this.emit('operation', {
        op: ops,
        version: version,
      });

      // 触发 op 事件（兼容 Teable 的事件系统）
      this.emit('op', {
        op: ops,
        version: version,
      });

    } catch (error) {
      console.error('Error handling document operation:', error);
    }
  }

  /**
   * 日志记录
   */
  private log(message: string, ...args: any[]): void {
    console.log(`[ShareDBDocument:${this.collection}:${this.docId}] ${message}`, ...args);
  }

  private emit(event: DocumentEventType, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const documentEvent: DocumentEvent = {
        type: event,
        data,
        timestamp: Date.now(),
      };

      handlers.forEach(handler => {
        try {
          handler(documentEvent);
        } catch (error) {
          console.error('Error in document event handler:', error);
        }
      });
    }
  }
}
