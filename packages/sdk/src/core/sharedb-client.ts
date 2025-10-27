/**
 * ShareDB 标准客户端
 * 基于 WebSocket 的简化实现，不依赖 sharedb 库
 */

import ReconnectingWebSocket from 'reconnecting-websocket';

// 简化的 ShareDB 文档类
class SimpleShareDBDoc {
  private collection: string;
  private docId: string;
  private socket: ReconnectingWebSocket;
  private listeners: Map<string, Function[]> = new Map();
  public data: any = null;
  private version: number = 0;

  constructor(collection: string, docId: string, socket: ReconnectingWebSocket) {
    this.collection = collection;
    this.docId = docId;
    this.socket = socket;
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  subscribe() {
    // 发送订阅消息
    this.socket.send(JSON.stringify({
      a: 's', // subscribe
      c: this.collection,
      d: this.docId
    }));
  }

  submitOp(ops: any[], callback?: (err?: any) => void) {
    // 发送操作消息
    this.socket.send(JSON.stringify({
      a: 'op', // operation
      c: this.collection,
      d: this.docId,
      v: this.version,
      op: ops
    }));
    
    if (callback) {
      // 模拟异步操作
      setTimeout(() => callback(), 100);
    }
  }

  fetch(callback: (err?: any, snapshot?: any) => void) {
    // 发送获取快照消息
    this.socket.send(JSON.stringify({
      a: 'f', // fetch
      c: this.collection,
      d: this.docId
    }));
    
    if (callback) {
      // 模拟异步操作
      setTimeout(() => callback(null, { v: this.version, data: this.data }), 100);
    }
  }

  destroy() {
    // 发送取消订阅消息
    this.socket.send(JSON.stringify({
      a: 'us', // unsubscribe
      c: this.collection,
      d: this.docId
    }));
  }

  // 处理接收到的消息
  handleMessage(message: any) {
    if (message.c === this.collection && message.d === this.docId) {
      if (message.a === 'op' && message.op) {
        // 处理操作
        this.listeners.get('op')?.forEach(callback => callback(message.op, false));
      } else if (message.a === 'f' && message.data) {
        // 处理快照
        this.data = message.data;
        this.version = message.v || 0;
        this.listeners.get('snapshot')?.forEach(callback => callback({ v: this.version, data: this.data }));
      }
    }
  }
}

export interface ShareDBClientConfig {
  wsUrl: string;
  debug?: boolean;
}

export class ShareDBClient {
  private socket: ReconnectingWebSocket;
  private config: ShareDBClientConfig;
  private documents: Map<string, SimpleShareDBDoc> = new Map();
  private connected: boolean = false;

  constructor(config: ShareDBClientConfig) {
    this.config = config;
    this.socket = new ReconnectingWebSocket(config.wsUrl, [], {
      maxReconnectionAttempts: 10,
      reconnectionDelayGrowFactor: 1.5,
      minReconnectionDelay: 1000,
      maxReconnectionDelay: 5000,
    } as any);
    
    this.setupEventHandlers();
    
    if (config.debug) {
      this.setupDebugLogging();
    }
  }

  private setupEventHandlers() {
    this.socket.addEventListener('open', () => {
      this.connected = true;
      if (this.config.debug) {
        console.log('[ShareDBClient] WebSocket connected');
      }
    });

    this.socket.addEventListener('close', () => {
      this.connected = false;
      if (this.config.debug) {
        console.log('[ShareDBClient] WebSocket disconnected');
      }
    });

    this.socket.addEventListener('error', (error) => {
      if (this.config.debug) {
        console.error('[ShareDBClient] WebSocket error:', error);
      }
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        if (this.config.debug) {
          console.error('[ShareDBClient] Failed to parse message:', error);
        }
      }
    });
  }

  private handleMessage(message: any) {
    if (this.config.debug) {
      console.log('[ShareDBClient] Received message:', message);
    }

    // 将消息转发给相关的文档
    if (message.c && message.d) {
      const docKey = `${message.c}:${message.d}`;
      const doc = this.documents.get(docKey);
      if (doc) {
        doc.handleMessage(message);
      }
    }
  }

  /**
   * 获取 ShareDB 文档
   */
  getDoc(collection: string, docId: string) {
    const docKey = `${collection}:${docId}`;
    
    if (!this.documents.has(docKey)) {
      const doc = new SimpleShareDBDoc(collection, docId, this.socket);
      this.documents.set(docKey, doc);
    }
    
    return this.documents.get(docKey)!;
  }

  /**
   * 获取连接状态
   */
  getConnectionState() {
    return this.connected ? 'connected' : 'disconnected';
  }

  /**
   * 检查是否已连接
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 监听连接状态变化
   */
  onConnection(callback: (state: string) => void) {
    // 简化实现，直接调用回调
    callback(this.getConnectionState());
  }

  /**
   * 监听错误
   */
  onError(callback: (error: any) => void) {
    // 简化实现，WebSocket 错误已在 setupEventHandlers 中处理
  }

  /**
   * 监听消息
   */
  onMessage(callback: (message: any) => void) {
    // 简化实现，消息已在 setupEventHandlers 中处理
  }

  /**
   * 关闭连接
   */
  close() {
    this.documents.forEach(doc => doc.destroy());
    this.documents.clear();
    this.socket.close();
  }

  /**
   * 设置调试日志
   */
  private setupDebugLogging() {
    console.log('[ShareDBClient] Debug logging enabled');
  }
}

export default ShareDBClient;
