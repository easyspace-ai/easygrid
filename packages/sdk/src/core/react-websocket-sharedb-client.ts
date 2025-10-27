/**
 * 基于 react-use-websocket 的 ShareDB 客户端
 * 使用浏览器原生 WebSocket API，完全避免 ws 库兼容性问题
 */
import type {
  OTOperation,
  ShareDBError,
  ShareDBSnapshot,
  ShareDBConnection,
  ShareDBPresenceData,
} from '../types/index.js';

export interface ReactWebSocketShareDBClientConfig {
  baseUrl: string;
  accessToken?: string;
  debug?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export type ShareDBConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type ShareDBMessageHandler = (message: any) => void;
export type ShareDBErrorHandler = (error: ShareDBError) => void;
export type ShareDBConnectionHandler = (state: ShareDBConnectionState) => void;

export class ReactWebSocketShareDBClient {
  private config: ReactWebSocketShareDBClientConfig;
  private socket?: WebSocket;
  private connectionState: ShareDBConnectionState = 'disconnected';
  private connectionId?: string;
  private messageHandlers: ShareDBMessageHandler[] = [];
  private errorHandlers: ShareDBErrorHandler[] = [];
  private connectionHandlers: ShareDBConnectionHandler[] = [];
  private subscriptions: Map<string, (snapshot: any) => void> = new Map();
  private presenceData: Map<string, ShareDBPresenceData> = new Map();
  private operationQueue: Array<{ collection: string; docId: string; op: OTOperation[]; version?: number }> = [];
  private pendingFetches: Map<string, { resolve: (data: ShareDBSnapshot) => void; reject: (error: Error) => void }> = new Map();
  private documents: Map<string, any> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  constructor(config: ReactWebSocketShareDBClientConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      debug: false,
      ...config,
    };
  }

  /**
   * 连接到 ShareDB WebSocket
   * 使用浏览器原生 WebSocket API
   */
  public async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.notifyConnectionHandlers();

    try {
      const wsUrl = this.buildWebSocketUrl();
      this.log('Connecting to WebSocket:', wsUrl);
      
      // 使用浏览器原生 WebSocket API
      this.socket = new WebSocket(wsUrl);
      
      // 设置事件监听器
      this.setupWebSocketListeners();
      
      this.log('ShareDB client initialized successfully');
    } catch (error) {
      this.connectionState = 'error';
      this.notifyConnectionHandlers();
      this.log('Connection error:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.connectionState = 'disconnected';
    this.connectionId = undefined;
    this.subscriptions.clear();
    this.presenceData.clear();
    this.operationQueue = [];
    this.pendingFetches.clear();
    this.documents.clear();
    this.notifyConnectionHandlers();
    
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * 获取连接状态
   */
  public getConnectionState(): ShareDBConnectionState {
    return this.connectionState;
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.connectionState === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * 设置 WebSocket 事件监听器
   */
  private setupWebSocketListeners(): void {
    if (!this.socket) {
      return;
    }

    this.socket.onopen = () => {
      this.log('WebSocket connected');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers();
      
      // 开始心跳
      this.startHeartbeat();
      
      // 处理队列中的操作
      this.processOperationQueue();
    };

    this.socket.onclose = (event) => {
      this.log('WebSocket disconnected:', event.code, event.reason);
      this.connectionState = 'disconnected';
      this.notifyConnectionHandlers();
      
      // 停止心跳
      this.stopHeartbeat();
      
      // 尝试重连
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      this.log('WebSocket error:', error);
      this.connectionState = 'error';
      this.notifyConnectionHandlers();
      
      this.notifyErrorHandlers({
        code: 500,
        message: 'WebSocket connection error',
      });
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.log('Received message:', message);
      
      // 处理 ShareDB 消息
      if (message.error) {
        this.notifyErrorHandlers({
          code: message.error.code || 500,
          message: message.error.message || 'Unknown error',
        });
      } else {
        // 处理不同类型的 ShareDB 消息
        this.handleShareDBMessage(message);
        
        // 通知消息处理器
        this.messageHandlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            this.log('Error in message handler:', error);
          }
        });
      }
    } catch (error) {
      this.log('Error parsing message:', error);
    }
  }

  /**
   * 处理 ShareDB 消息 - 基于 Teable 格式
   */
  private handleShareDBMessage(message: any): void {
    try {
      this.log('Processing ShareDB message:', JSON.stringify(message, null, 2));
      
      // 处理错误消息
      if (message.error) {
        this.log('ShareDB error message:', message.error);
        this.notifyErrorHandlers({
          code: message.error.code || 500,
          message: message.error.message || 'Unknown ShareDB error',
        });
        return;
      }
      
      // 处理空消息或无效消息
      if (!message || typeof message !== 'object') {
        this.log('Invalid ShareDB message:', message);
        return;
      }
      
      // 处理 Teable 风格的 ShareDB 消息
      // 基于 Teable 的 useConnection.tsx 实现
      
      // 处理操作消息 (a: 'op')
      if (message.a === 'op' && message.op && Array.isArray(message.op)) {
        this.log('Processing ShareDB operations:', message.op);
        this.handleDocumentOperation({
          c: message.c,
          d: message.d,
          v: message.v,
          op: message.op
        });
      }
      
      // 处理快照消息 (a: 'f' - fetch)
      if (message.a === 'f' && message.data) {
        this.log('Processing ShareDB snapshot:', message.data);
        this.handleDocumentSnapshot(message);
      }
      
      // 处理订阅消息 (a: 'sub')
      if (message.a === 'sub' && message.data) {
        this.log('Processing ShareDB subscription:', message.data);
        this.handleDocumentSnapshot(message);
      }
      
      // 处理存在状态消息 (a: 'p' - presence)
      if (message.a === 'p' && message.presence) {
        this.log('Processing ShareDB presence:', message.presence);
        this.handlePresenceMessage(message);
      }
      
      // 处理查询结果消息 (results: query results)
      if (message.results) {
        this.log('Processing ShareDB query results:', message.results);
        this.handleQueryResults(message);
      }
      
      // 处理连接消息
      if (message.connection) {
        this.log('Processing ShareDB connection message:', message.connection);
        this.handleConnectionMessage(message);
      }
      
    } catch (error) {
      this.log('Error handling ShareDB message:', error);
    }
  }

  /**
   * 处理连接消息
   */
  private handleConnectionMessage(message: any): void {
    try {
      const { connection } = message;
      
      if (connection === 'connected') {
        this.log('ShareDB connection established');
        this.connectionState = 'connected';
        this.notifyConnectionHandlers();
      } else if (connection === 'disconnected') {
        this.log('ShareDB connection lost');
        this.connectionState = 'disconnected';
        this.notifyConnectionHandlers();
      }
    } catch (error) {
      this.log('Error handling connection message:', error);
    }
  }

  /**
   * 处理文档操作
   */
  private handleDocumentOperation(operation: any): void {
    try {
      const { c: collection, d: docId, op: ops } = operation;
      
      if (!collection || !docId || !ops) {
        return;
      }

      this.log(`Processing operation for ${collection}:${docId}`, ops);
      
      // 通知订阅者文档已更新
      const docKey = `${collection}:${docId}`;
      const callback = this.subscriptions.get(docKey);
      
      if (callback) {
        // 获取更新后的文档数据
        this.fetch(collection, docId).then((snapshot) => {
          callback(snapshot);
        }).catch((error) => {
          this.log('Error fetching updated document:', error);
        });
      }
    } catch (error) {
      this.log('Error handling document operation:', error);
    }
  }

  /**
   * 处理文档快照
   */
  private handleDocumentSnapshot(message: any): void {
    try {
      const { c: collection, d: docId, data } = message;
      
      if (!collection || !docId || !data) {
        return;
      }

      this.log(`Processing snapshot for ${collection}:${docId}`, data);
      
      // 通知订阅者文档快照已更新
      const docKey = `${collection}:${docId}`;
      const callback = this.subscriptions.get(docKey);
      
      if (callback) {
        callback(data);
      }
    } catch (error) {
      this.log('Error handling document snapshot:', error);
    }
  }

  /**
   * 处理查询结果
   */
  private handleQueryResults(message: any): void {
    try {
      const { c: collection, results } = message;
      
      if (!collection || !results) {
        return;
      }

      this.log(`Processing query results for ${collection}:`, results);
      
      // 处理查询结果更新
      results.forEach((result: any) => {
        const { d: docId, data } = result;
        if (docId && data) {
          const docKey = `${collection}:${docId}`;
          const callback = this.subscriptions.get(docKey);
          
          if (callback) {
            callback(data);
          }
        }
      });
    } catch (error) {
      this.log('Error handling query results:', error);
    }
  }

  /**
   * 处理存在状态消息
   */
  private handlePresenceMessage(message: any): void {
    try {
      const { c: collection, d: docId, presence } = message;
      
      if (!collection || !docId || !presence) {
        return;
      }

      this.log(`Processing presence for ${collection}:${docId}`, presence);
      
      // 更新存在状态数据
      const docKey = `${collection}:${docId}`;
      this.presenceData.set(docKey, presence);
    } catch (error) {
      this.log('Error handling presence message:', error);
    }
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      this.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${this.config.reconnectInterval}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * 处理操作队列
   */
  private processOperationQueue(): void {
    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      if (operation) {
        this.submitOp(operation.collection, operation.docId, operation.op, operation.version);
      }
    }
  }

  /**
   * 发送消息
   */
  private sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.log('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * 通知连接状态变化
   */
  private notifyConnectionHandlers(): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(this.connectionState);
      } catch (error) {
        this.log('Error in connection handler:', error);
      }
    });
  }

  /**
   * 通知错误处理器
   */
  private notifyErrorHandlers(error: ShareDBError): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        this.log('Error in error handler:', err);
      }
    });
  }

  /**
   * 添加消息处理器
   */
  public onMessage(handler: ShareDBMessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * 移除消息处理器
   */
  public offMessage(handler: ShareDBMessageHandler): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * 添加错误处理器
   */
  public onError(handler: ShareDBErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * 移除错误处理器
   */
  public offError(handler: ShareDBErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  /**
   * 添加连接状态处理器
   */
  public onConnection(handler: ShareDBConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * 移除连接状态处理器
   */
  public offConnection(handler: ShareDBConnectionHandler): void {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  /**
   * 获取文档数据
   */
  public fetch(collection: string, docId: string): Promise<ShareDBSnapshot> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('No connection available'));
        return;
      }

      const docKey = `${collection}:${docId}`;
      this.pendingFetches.set(docKey, { resolve, reject });
      
      this.sendMessage({
        type: 'fetch',
        collection,
        docId,
      });
    });
  }

  /**
   * 订阅文档
   */
  public subscribe(collection: string, docId: string, callback: (snapshot: ShareDBSnapshot) => void): void {
    if (!this.isConnected()) {
      this.log('No connection available for subscription');
      return;
    }

    const docKey = `${collection}:${docId}`;
    this.subscriptions.set(docKey, callback);
    
    this.sendMessage({
      type: 'subscribe',
      collection,
      docId,
    });
  }

  /**
   * 取消订阅文档
   */
  public unsubscribe(collection: string, docId: string): void {
    if (!this.isConnected()) {
      return;
    }

    const docKey = `${collection}:${docId}`;
    this.subscriptions.delete(docKey);
    
    this.sendMessage({
      type: 'unsubscribe',
      collection,
      docId,
    });
  }

  /**
   * 提交操作
   */
  public submitOp(collection: string, docId: string, op: OTOperation[], version?: number): void {
    if (!this.isConnected()) {
      // 将操作加入队列
      this.operationQueue.push({ collection, docId, op, version });
      this.log('Operation queued, connection not available');
      return;
    }

    this.sendMessage({
      type: 'op',
      collection,
      docId,
      op,
      version,
    });
  }

  /**
   * 提交存在状态
   */
  public submitPresence(collection: string, docId: string, presence: any): void {
    if (!this.isConnected()) {
      this.log('No connection available for presence');
      return;
    }

    this.sendMessage({
      type: 'presence',
      collection,
      docId,
      presence,
    });
  }

  /**
   * 获取存在状态
   */
  public getPresence(collection: string, docId: string): any[] {
    const docKey = `${collection}:${docId}`;
    const presence = this.presenceData.get(docKey);
    return Array.isArray(presence) ? presence : [];
  }

  /**
   * 设置访问令牌
   */
  public setAccessToken(token: string): void {
    this.config.accessToken = token;
  }

  /**
   * 构建 WebSocket URL
   */
  private buildWebSocketUrl(): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // 连接到后端服务器端口 2345，而不是前端端口
    const wsHost = window.location.hostname + ':2345';
    const wsPath = '/socket';
    
    // 添加 JWT token 作为查询参数
    const token = this.config.accessToken;
    if (token) {
      return `${wsProtocol}//${wsHost}${wsPath}?token=${encodeURIComponent(token)}`;
    }
    
    return `${wsProtocol}//${wsHost}${wsPath}`;
  }

  /**
   * 日志记录
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[ShareDBClient] ${message}`, ...args);
    }
  }
}
