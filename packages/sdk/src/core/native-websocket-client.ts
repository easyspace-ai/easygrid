/**
 * 原生 WebSocket 客户端
 * 完全使用浏览器原生 WebSocket API，不依赖任何第三方库
 */
export interface NativeWebSocketClientConfig {
  baseUrl: string;
  accessToken?: string;
  debug?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export type NativeWebSocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type NativeWebSocketMessageHandler = (message: any) => void;
export type NativeWebSocketErrorHandler = (error: any) => void;
export type NativeWebSocketConnectionHandler = (state: NativeWebSocketConnectionState) => void;

export class NativeWebSocketClient {
  private config: NativeWebSocketClientConfig;
  private socket?: WebSocket;
  private connectionState: NativeWebSocketConnectionState = 'disconnected';
  private connectionId?: string;
  private reconnectAttempts = 0;
  private reconnectTimer?: any;
  private heartbeatTimer?: any;
  private messageHandlers: NativeWebSocketMessageHandler[] = [];
  private errorHandlers: NativeWebSocketErrorHandler[] = [];
  private connectionHandlers: NativeWebSocketConnectionHandler[] = [];

  constructor(config: NativeWebSocketClientConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      debug: false,
      ...config,
    };
  }

  /**
   * 连接到 WebSocket
   */
  public async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.notifyConnectionHandlers();

    try {
      const wsUrl = this.buildWebSocketUrl();
      console.log('[NativeWebSocketClient] About to create WebSocket with URL:', wsUrl);
      console.log('[NativeWebSocketClient] typeof WebSocket:', typeof WebSocket);
      console.log('[NativeWebSocketClient] WebSocket constructor:', WebSocket);
      this.log('Connecting to WebSocket:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);
      console.log('[NativeWebSocketClient] WebSocket created successfully');

      this.socket.onopen = () => {
        this.log('WebSocket connected');
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers();
        this.startHeartbeat();
      };

      this.socket.onclose = (event) => {
        const code = event.code;
        const reason = event.reason;
        this.connectionState = 'disconnected';
        this.notifyConnectionHandlers();
        this.log(`WebSocket closed: ${code} ${reason}`);
        this.scheduleReconnect();
      };

      this.socket.onerror = (event) => {
        const error = new Error('WebSocket error');
        this.connectionState = 'error';
        this.notifyConnectionHandlers();
        this.log('WebSocket error:', error);
        this.notifyErrorHandlers(error);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }

    this.connectionState = 'disconnected';
    this.connectionId = undefined;
    this.notifyConnectionHandlers();
  }

  /**
   * 获取连接状态
   */
  public getConnectionState(): NativeWebSocketConnectionState {
    return this.connectionState;
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.connectionState === 'connected' && this.socket !== undefined && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * 构建 WebSocket URL
   */
  private buildWebSocketUrl(): string {
    const protocol = this.config.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = this.config.baseUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${protocol}://${baseUrl}/socket`;
    
    if (this.config.accessToken) {
      return `${wsUrl}?token=${encodeURIComponent(this.config.accessToken)}`;
    }
    
    return wsUrl;
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.isConnected()) {
        this.sendMessage({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
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
   * 发送消息
   */
  public sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.log('Received message:', message);

      // 处理不同类型的消息
      switch (message.type) {
        case 'connected':
          this.connectionId = message.id;
          this.connectionState = 'connected';
          this.notifyConnectionHandlers();
          break;
        case 'disconnected':
          this.connectionState = 'disconnected';
          this.notifyConnectionHandlers();
          break;
        case 'error':
          this.notifyErrorHandlers(message);
          break;
        case 'pong':
          // 心跳响应
          break;
        default:
          this.log('Unknown message type:', message.type);
      }

      // 通知消息处理器
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          this.log('Error in message handler:', error);
        }
      });

    } catch (error) {
      this.log('Error parsing message:', error);
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
  private notifyErrorHandlers(error: any): void {
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
  public onMessage(handler: NativeWebSocketMessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * 移除消息处理器
   */
  public offMessage(handler: NativeWebSocketMessageHandler): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * 添加错误处理器
   */
  public onError(handler: NativeWebSocketErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * 移除错误处理器
   */
  public offError(handler: NativeWebSocketErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  /**
   * 添加连接状态处理器
   */
  public onConnection(handler: NativeWebSocketConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * 移除连接状态处理器
   */
  public offConnection(handler: NativeWebSocketConnectionHandler): void {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  /**
   * 设置访问令牌
   */
  public setAccessToken(token: string): void {
    this.config.accessToken = token;
  }

  /**
   * 日志记录
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[NativeWebSocketClient] ${message}`, ...args);
    }
  }
}
