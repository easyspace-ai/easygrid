/**
 * ShareDB 协议处理器
 * 处理握手、订阅、操作提交、获取快照、在线状态等协议
 */

import type { 
  ShareDBMessage, 
  OTOperation, 
  ShareDBSnapshot 
} from '../../types/sharedb.js';
import type { EventBus, SubscriptionEvent, OperationEvent, SnapshotEvent } from '../../types/events.js';

export class ShareDBProtocol {
  private eventBus: EventBus;
  private pendingOperations: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private operationCounter = 0;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * 创建握手消息
   */
  createHandshakeMessage(): ShareDBMessage {
    return {
      a: 'hs'
    };
  }

  /**
   * 创建订阅消息
   */
  createSubscribeMessage(collection: string, docId: string): ShareDBMessage {
    return {
      a: 's',
      c: collection,
      d: docId
    };
  }

  /**
   * 创建取消订阅消息
   */
  createUnsubscribeMessage(collection: string, docId: string): ShareDBMessage {
    return {
      a: 'us',
      c: collection,
      d: docId
    };
  }

  /**
   * 创建操作提交消息
   */
  createOperationMessage(collection: string, docId: string, operations: OTOperation[], version: number): ShareDBMessage {
    return {
      a: 'op',
      c: collection,
      d: docId,
      v: version,
      op: operations
    };
  }

  /**
   * 创建获取快照消息
   */
  createFetchMessage(collection: string, docId: string): ShareDBMessage {
    return {
      a: 'f',
      c: collection,
      d: docId
    };
  }

  /**
   * 创建在线状态消息
   */
  createPresenceMessage(collection: string, docId: string, data: any): ShareDBMessage {
    return {
      a: 'p',
      c: collection,
      d: docId,
      data
    };
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(message: ShareDBMessage): void {
    switch (message.a) {
      case 'hs':
        this.handleHandshakeResponse(message);
        break;
      case 's':
        this.handleSubscribeResponse(message);
        break;
      case 'op':
        this.handleOperationMessage(message);
        break;
      case 'f':
        this.handleFetchResponse(message);
        break;
      case 'p':
        this.handlePresenceMessage(message);
        break;
      default:
        console.warn('[ShareDB] 未知消息类型:', message.a);
    }
  }

  /**
   * 处理握手响应
   */
  private handleHandshakeResponse(message: ShareDBMessage): void {
    if (message.error) {
      console.error('[ShareDB] 握手失败:', message.error);
      return;
    }

    // 握手成功，可以开始其他操作
    if (this.eventBus) {
      this.eventBus.emit('connection', {
        type: 'connected',
        timestamp: Date.now(),
        state: 'connected'
      });
    }
  }

  /**
   * 处理订阅响应
   */
  private handleSubscribeResponse(message: ShareDBMessage): void {
    const event: SubscriptionEvent = {
      type: message.error ? 'subscription-error' : 'subscribed',
      timestamp: Date.now(),
      collection: message.c || '',
      docId: message.d || '',
      error: message.error ? new Error(message.error.message) : undefined
    };

    this.eventBus.emit('subscription', event);

    // 如果订阅响应包含文档数据，触发快照事件
    if (!message.error && message.data !== undefined) {
      const snapshot: ShareDBSnapshot = {
        v: message.v || 0,
        data: message.data || {},
        type: message.type,
        m: message.m
      };

      const snapshotEvent: SnapshotEvent = {
        type: 'snapshot-received',
        timestamp: Date.now(),
        collection: message.c || '',
        docId: message.d || '',
        snapshot,
        version: message.v || 0
      };

      this.eventBus.emit('snapshot', snapshotEvent);
    }
  }

  /**
   * 处理操作消息
   */
  private handleOperationMessage(message: ShareDBMessage): void {
    if (!message.c || !message.d || !message.op) {
      return;
    }

    const event: OperationEvent = {
      type: 'operation-received',
      timestamp: Date.now(),
      collection: message.c,
      docId: message.d,
      operation: message.op,
      version: message.v || 0,
      source: message.source
    };

    this.eventBus.emit('operation', event);
  }

  /**
   * 处理获取快照响应
   */
  private handleFetchResponse(message: ShareDBMessage): void {
    if (!message.c || !message.d) {
      return;
    }

    const snapshot: ShareDBSnapshot = {
      v: message.v || 0,
      data: message.data || {},
      type: message.type,
      m: message.m
    };

    const event: SnapshotEvent = {
      type: message.error ? 'snapshot-error' : 'snapshot-received',
      timestamp: Date.now(),
      collection: message.c,
      docId: message.d,
      snapshot,
      version: message.v || 0,
      error: message.error ? new Error(message.error.message) : undefined
    };

    this.eventBus.emit('snapshot', event);
  }

  /**
   * 处理在线状态消息
   */
  private handlePresenceMessage(message: ShareDBMessage): void {
    if (!message.c || !message.d) {
      return;
    }

    // 在线状态消息通常包含用户信息和光标位置
    this.eventBus.emit('presence', {
      type: 'presence-update',
      timestamp: Date.now(),
      collection: message.c,
      docId: message.d,
      data: message.data
    });
  }

  /**
   * 验证消息格式
   */
  validateMessage(message: any): message is ShareDBMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (!message.a || typeof message.a !== 'string') {
      return false;
    }

    const validActions = ['hs', 's', 'us', 'op', 'f', 'p'];
    if (!validActions.includes(message.a)) {
      return false;
    }

    // 对于需要 collection 和 docId 的消息
    if (['s', 'us', 'op', 'f', 'p'].includes(message.a)) {
      if (!message.c || typeof message.c !== 'string') {
        return false;
      }
      if (!message.d || typeof message.d !== 'string') {
        return false;
      }
    }

    // 对于操作消息，需要验证操作格式
    if (message.a === 'op' && message.op) {
      if (!Array.isArray(message.op)) {
        return false;
      }
      for (const op of message.op) {
        if (!this.validateOperation(op)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 验证操作格式
   */
  private validateOperation(op: any): op is OTOperation {
    if (!op || typeof op !== 'object') {
      return false;
    }

    if (!Array.isArray(op.p)) {
      return false;
    }

    // 至少需要有一个操作类型
    const hasOperation = 'oi' in op || 'od' in op || 'li' in op || 'ld' in op || 'lm' in op || 'na' in op;
    if (!hasOperation) {
      return false;
    }

    return true;
  }

  /**
   * 生成操作 ID
   */
  generateOperationId(): string {
    return `op_${Date.now()}_${++this.operationCounter}`;
  }

  /**
   * 创建错误消息
   */
  createErrorMessage(code: number, message: string): ShareDBMessage {
    return {
      a: 'hs', // 使用握手作为错误消息的 action
      error: {
        code,
        message
      }
    };
  }
}
