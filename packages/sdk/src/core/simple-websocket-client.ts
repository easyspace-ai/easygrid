/**
 * 简化的 WebSocket 客户端
 * 用于实时同步，不依赖于 ShareDB 的复杂模块系统
 */

import ReconnectingWebSocket from 'reconnecting-websocket';

export interface SimpleWebSocketClientConfig {
  wsUrl: string;
  debug?: boolean;
}

export interface WebSocketMessage {
  type: 'record_created' | 'record_updated' | 'record_deleted' | 'field_updated';
  data: any;
  timestamp: number;
}

export class SimpleWebSocketClient {
  private socket: ReconnectingWebSocket;
  private config: SimpleWebSocketClientConfig;
  private messageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();
  private isConnected: boolean = false;

  constructor(config: SimpleWebSocketClientConfig) {
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
      this.isConnected = true;
      if (this.config.debug) {
        console.log('[SimpleWebSocketClient] Connected to WebSocket');
      }
    });

    this.socket.addEventListener('close', () => {
      this.isConnected = false;
      if (this.config.debug) {
        console.log('[SimpleWebSocketClient] Disconnected from WebSocket');
      }
    });

    this.socket.addEventListener('error', (error) => {
      if (this.config.debug) {
        console.error('[SimpleWebSocketClient] WebSocket error:', error);
      }
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        if (this.config.debug) {
          console.error('[SimpleWebSocketClient] Failed to parse message:', error);
        }
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    if (this.config.debug) {
      console.log('[SimpleWebSocketClient] Received message:', message);
    }

    // 通知所有注册的处理器
    this.messageHandlers.forEach((handler, key) => {
      try {
        handler(message);
      } catch (error) {
        console.error(`[SimpleWebSocketClient] Error in handler ${key}:`, error);
      }
    });
  }

  /**
   * 订阅消息
   */
  subscribe(key: string, handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.set(key, handler);
    
    if (this.config.debug) {
      console.log(`[SimpleWebSocketClient] Subscribed handler: ${key}`);
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(key: string) {
    this.messageHandlers.delete(key);
    
    if (this.config.debug) {
      console.log(`[SimpleWebSocketClient] Unsubscribed handler: ${key}`);
    }
  }

  /**
   * 发送消息
   */
  send(message: WebSocketMessage) {
    if (!this.isConnected) {
      console.warn('[SimpleWebSocketClient] Not connected, cannot send message');
      return;
    }

    this.socket.send(JSON.stringify(message));
    
    if (this.config.debug) {
      console.log('[SimpleWebSocketClient] Sent message:', message);
    }
  }

  /**
   * 检查连接状态
   */
  getConnectionState() {
    return this.isConnected ? 'connected' : 'disconnected';
  }

  /**
   * 关闭连接
   */
  close() {
    this.socket.close();
    this.messageHandlers.clear();
  }

  private setupDebugLogging() {
    // 设置调试日志
    console.log('[SimpleWebSocketClient] Debug logging enabled');
  }
}

export default SimpleWebSocketClient;

