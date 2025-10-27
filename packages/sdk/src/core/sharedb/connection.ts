/**
 * ShareDB 连接管理器
 * 负责 WebSocket 连接、消息路由和状态管理
 */

import ReconnectingWebSocket from 'reconnecting-websocket';
import type { 
  ShareDBConnectionConfig, 
  ShareDBConnectionState, 
  ShareDBMessage,
  DocumentEventHandler,
  OperationEventHandler
} from '../../types/sharedb.js';
import type { EventBus, ConnectionEvent, ErrorEvent } from '../../types/events.js';

export class ShareDBConnection {
  private socket: ReconnectingWebSocket | null = null;
  private config: ShareDBConnectionConfig;
  private state: ShareDBConnectionState = 'disconnected';
  private eventBus: EventBus;
  private messageHandlers: Map<string, (message: ShareDBMessage) => void> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;

  constructor(config: ShareDBConnectionConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
  }

  /**
   * 连接到 ShareDB 服务器
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');

    try {
      // 创建 WebSocket 连接
      this.socket = new ReconnectingWebSocket(this.config.wsUrl, [], {
        maxReconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelayGrowFactor: 1.5,
        minReconnectionDelay: 1000,
        maxReconnectionDelay: 5000,
        connectionTimeout: 10000,
      } as any);

      this.setupEventHandlers();
      this.startHeartbeat();

      // 等待连接建立
      await this.waitForConnection();
      
      // 发送握手消息
      await this.sendHandshake();

      this.setState('connected');
      this.reconnectAttempts = 0;

    } catch (error) {
      this.setState('error');
      this.eventBus.emit('error', {
        type: 'error',
        timestamp: Date.now(),
        error: error as Error,
        context: { action: 'connect' }
      } as ErrorEvent);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.setState('disconnected');
    this.messageHandlers.clear();
  }

  /**
   * 发送消息
   */
  send(message: ShareDBMessage): void {
    if (!this.socket || (this.state !== 'connected' && this.state !== 'connecting')) {
      throw new Error('ShareDB connection not established');
    }

    try {
      this.socket.send(JSON.stringify(message));
      
      if (this.config.debug) {
        console.log('[ShareDB] 发送消息:', message);
      }
    } catch (error) {
      this.eventBus.emit('error', {
        type: 'error',
        timestamp: Date.now(),
        error: error as Error,
        context: { action: 'send', message }
      } as ErrorEvent);
      throw error;
    }
  }

  /**
   * 注册消息处理器
   */
  registerMessageHandler(key: string, handler: (message: ShareDBMessage) => void): void {
    this.messageHandlers.set(key, handler);
  }

  /**
   * 注销消息处理器
   */
  unregisterMessageHandler(key: string): void {
    this.messageHandlers.delete(key);
  }

  /**
   * 获取连接状态
   */
  getState(): ShareDBConnectionState {
    return this.state;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * 设置连接状态
   */
  private setState(state: ShareDBConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      
      this.eventBus.emit('connection', {
        type: state,
        timestamp: Date.now(),
        state
      } as ConnectionEvent);

      if (this.config.debug) {
        console.log('[ShareDB] 连接状态变更:', state);
      }
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.addEventListener('open', () => {
      if (this.config.debug) {
        console.log('[ShareDB] WebSocket 连接已建立');
      }
    });

    this.socket.addEventListener('message', (event) => {
      try {
        // 检查消息是否为空
        if (!event.data || event.data.trim() === '') {
          if (this.config.debug) {
            console.log('[ShareDB] 收到空消息，跳过');
          }
          return;
        }

        const message: ShareDBMessage = JSON.parse(event.data);
        
        if (this.config.debug) {
          console.log('[ShareDB] 收到消息:', message);
        }

        // 发射原始消息事件
        this.eventBus.emit('raw-message', {
          type: 'receive',
          timestamp: Date.now(),
          message: message
        });

        // 分发消息给所有处理器
        this.messageHandlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('[ShareDB] 消息处理器错误:', error);
          }
        });

      } catch (error) {
        console.error('[ShareDB] 消息解析错误:', error);
        if (this.config.debug) {
          console.log('[ShareDB] 原始消息数据:', event.data);
        }
        this.eventBus.emit('error', {
          type: 'error',
          timestamp: Date.now(),
          error: error as Error,
          context: { action: 'parseMessage', data: event.data }
        } as ErrorEvent);
      }
    });

    this.socket.addEventListener('close', (event) => {
      if (this.config.debug) {
        console.log('[ShareDB] WebSocket 连接已关闭:', event.code, event.reason);
      }
      
      this.setState('disconnected');
      this.stopHeartbeat();
    });

    this.socket.addEventListener('error', (event) => {
      console.error('[ShareDB] WebSocket 错误:', event);
      
      this.setState('error');
      this.eventBus.emit('error', {
        type: 'error',
        timestamp: Date.now(),
        error: new Error('WebSocket connection error'),
        context: { event }
      } as ErrorEvent);
    });
  }

  /**
   * 等待连接建立
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      const checkConnection = () => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve();
        } else if (this.socket?.readyState === WebSocket.CLOSED) {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  /**
   * 发送握手消息
   */
  private async sendHandshake(): Promise<void> {
    const handshakeMessage: ShareDBMessage = {
      a: 'hs'
    };

    this.send(handshakeMessage);

    // 等待握手响应
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Handshake timeout'));
      }, 5000);

      const handler = (message: ShareDBMessage) => {
        if (message.a === 'hs') {
          clearTimeout(timeout);
          this.unregisterMessageHandler('handshake');
          resolve();
        }
      };

      this.registerMessageHandler('handshake', handler);
    });
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    const interval = this.config.heartbeatInterval || 30000;
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        // 发送 ping 消息
        this.send({ a: 'hs' });
      }
    }, interval);
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
