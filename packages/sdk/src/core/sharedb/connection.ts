/**
 * ShareDBConnection - ShareDB 连接管理器
 * 参考 Teable 的 Connection 实现
 */

import ReconnectingWebSocket from 'reconnecting-websocket'
import { ShareDBDoc, ShareDBMessage, OTOperation } from './document.js'
import { SDKErrorHandler } from '../error-handler.js'

export interface ShareDBConnectionConfig {
  wsUrl: string
  accessToken?: string
  debug?: boolean
  reconnect?: {
    maxRetries?: number
    retryDelay?: number
    exponentialBackoff?: boolean
  }
  heartbeat?: {
    interval?: number
    timeout?: number
  }
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

/**
 * ShareDB 连接管理器
 * 负责 WebSocket 连接、消息分发、文档缓存
 */
export class ShareDBConnection {
  private config: ShareDBConnectionConfig
  private socket: ReconnectingWebSocket | null = null
  private state: ConnectionState = 'disconnected'
  private docs: Map<string, ShareDBDoc> = new Map()
  private messageId = 0
  private heartbeatTimer?: NodeJS.Timeout
  private lastConnectedAt?: Date
  private connectionId?: string

  constructor(config: ShareDBConnectionConfig) {
    this.config = this.normalizeConfig(config)
  }

  /**
   * 连接 ShareDB
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return
    }

    this.setState('connecting')

    try {
      // 构建 WebSocket URL，添加 token 参数
      let wsUrl = this.config.wsUrl
      if (this.config.accessToken) {
        const url = new URL(wsUrl)
        url.searchParams.set('token', this.config.accessToken)
        wsUrl = url.toString()
      }

      // 创建 WebSocket 连接
      this.socket = new ReconnectingWebSocket(wsUrl, [], {
        maxReconnectionAttempts: this.config.reconnect?.maxRetries || 10,
        reconnectionDelayGrowFactor: this.config.reconnect?.exponentialBackoff ? 1.5 : 1,
        minReconnectionDelay: this.config.reconnect?.retryDelay || 1000,
        maxReconnectionDelay: 5000,
        debug: this.config.debug
      } as any)

      // 绑定事件处理器
      this.socket.addEventListener('open', this.handleOpen.bind(this))
      this.socket.addEventListener('message', this.handleMessage.bind(this))
      this.socket.addEventListener('close', this.handleClose.bind(this))
      this.socket.addEventListener('error', this.handleError.bind(this))

      // 等待连接建立
      await this.waitForConnection()

    } catch (error) {
      this.setState('error')
      const sdkError = SDKErrorHandler.handleConnectionError(error)
      throw sdkError
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    
    this.setState('disconnected')
    this.clearHeartbeat()
    this.docs.clear()
  }

  /**
   * 获取文档（自动创建）
   */
  get(collection: string, docId: string): ShareDBDoc {
    const key = `${collection}:${docId}`
    
    if (!this.docs.has(key)) {
      const doc = new ShareDBDoc(this, collection, docId)
      this.docs.set(key, doc)
    }
    
    return this.docs.get(key)!
  }

  /**
   * 发送消息
   */
  sendMessage(message: ShareDBMessage): void {
    if (!this.isConnected()) {
      throw new Error('ShareDB 连接未建立')
    }

    const messageWithId = {
      ...message,
      id: ++this.messageId
    }

    this.socket!.send(JSON.stringify(messageWithId))
    
    if (this.config.debug) {
      console.log('📤 ShareDB 发送消息:', messageWithId)
    }
  }

  /**
   * 订阅文档
   */
  subscribe(collection: string, docId: string, callback?: (snapshot: any) => void): () => void {
    const message: ShareDBMessage = {
      a: 's', // subscribe
      c: collection,
      d: docId
    }
    
    this.sendMessage(message)
    
    // 如果有回调函数，监听消息
    if (callback) {
      const handler = (event: MessageEvent) => {
        try {
          const msg: ShareDBMessage = JSON.parse(event.data)
          if (msg.c === collection && msg.d === docId) {
            if (msg.a === 's' && msg.data) {
              // 订阅确认，包含初始数据
              callback({
                v: msg.v || 0,
                data: msg.data
              })
            } else if (msg.a === 'op' && msg.op) {
              // 操作更新，需要重新获取数据
              this.fetch(collection, docId).then(snapshot => {
                callback(snapshot)
              }).catch(error => {
                console.error('Error fetching updated document:', error)
              })
            }
          }
        } catch (error) {
          console.error('Failed to parse ShareDB message:', error)
        }
      }
      
      this.socket!.addEventListener('message', handler)
      
      // 返回取消订阅函数
      return () => {
        this.socket!.removeEventListener('message', handler)
        this.unsubscribe(collection, docId)
      }
    }
    
    return () => this.unsubscribe(collection, docId)
  }

  /**
   * 取消订阅文档
   */
  unsubscribe(collection: string, docId: string): void {
    const message: ShareDBMessage = {
      a: 'u', // unsubscribe
      c: collection,
      d: docId
    }
    
    this.sendMessage(message)
  }

  /**
   * 获取文档快照
   */
  async fetch(collection: string, docId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const message: ShareDBMessage = {
        a: 'f', // fetch
        c: collection,
        d: docId
      }

      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('获取文档超时'))
      }, 10000)

      // 监听响应
      const handler = (event: MessageEvent) => {
        try {
          const msg: ShareDBMessage = JSON.parse(event.data)
          if (msg.c === collection && msg.d === docId && msg.a === 'f') {
            clearTimeout(timeout)
            this.socket!.removeEventListener('message', handler)
            
            if (msg.error) {
              reject(new Error(msg.error.message))
            } else {
              resolve(msg.data)
            }
          }
        } catch (error) {
          console.error('Failed to parse ShareDB message:', error)
        }
      }

      this.socket!.addEventListener('message', handler)
      this.sendMessage(message)
    })
  }

  /**
   * 提交操作
   */
  async submitOp(collection: string, docId: string, ops: OTOperation[]): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('连接未建立')
    }

    const message: ShareDBMessage = {
      a: 'op', // operation
      c: collection,
      d: docId,
      op: ops
    }

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('提交操作超时'))
      }, 10000)

      // 监听响应
      const handler = (event: MessageEvent) => {
        try {
          const msg: ShareDBMessage = JSON.parse(event.data)
          if (msg.c === collection && msg.d === docId && msg.a === 'op') {
            clearTimeout(timeout)
            this.socket!.removeEventListener('message', handler)
            
            if (msg.error) {
              reject(new Error(msg.error.message))
            } else {
              resolve()
            }
          }
        } catch (error) {
          console.error('Failed to parse ShareDB message:', error)
        }
      }

      this.socket!.addEventListener('message', handler)
      this.sendMessage(message)
    })
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN
  }

  /**
   * 获取连接状态
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): {
    state: ConnectionState
    lastConnectedAt?: Date
    connectionId?: string
    docCount: number
  } {
    return {
      state: this.state,
      lastConnectedAt: this.lastConnectedAt,
      connectionId: this.connectionId,
      docCount: this.docs.size
    }
  }

  /**
   * 处理连接打开
   */
  private handleOpen(): void {
    this.setState('connected')
    this.lastConnectedAt = new Date()
    this.startHeartbeat()
    
    if (this.config.debug) {
      console.log('✅ ShareDB 连接已建立')
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: ShareDBMessage = JSON.parse(event.data)
      
      if (this.config.debug) {
        console.log('📥 ShareDB 收到消息:', message)
      }

      // 分发消息到对应文档
      if (message.c && message.d) {
        const docKey = `${message.c}:${message.d}`
        const doc = this.docs.get(docKey)
        
        if (doc) {
          doc.handleMessage(message)
        }
      }

      // 处理连接相关消息
      if (message.a === 'c') { // connection
        this.connectionId = message.data?.connectionId
      }

    } catch (error) {
      console.error('❌ ShareDB 消息解析失败:', error)
    }
  }

  /**
   * 处理连接关闭
   */
  private handleClose(): void {
    this.setState('disconnected')
    this.clearHeartbeat()
    
    if (this.config.debug) {
      console.log('❌ ShareDB 连接已断开')
    }
  }

  /**
   * 处理连接错误
   */
  private handleError(): void {
    this.setState('error')
    
    const error = new Error('ShareDB 连接错误')
    SDKErrorHandler.handleConnectionError(error)
    
    if (this.config.debug) {
      console.error('❌ ShareDB 连接错误')
    }
  }

  /**
   * 设置连接状态
   */
  private setState(state: ConnectionState): void {
    this.state = state
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    if (!this.config.heartbeat?.interval) return

    this.clearHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({ a: 'ping' })
      }
    }, this.config.heartbeat.interval)
  }

  /**
   * 清除心跳检测
   */
  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  /**
   * 等待连接建立
   */
  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('连接超时'))
      }, 10000)

      const checkConnection = () => {
        if (this.state === 'connected') {
          clearTimeout(timeout)
          resolve()
        } else if (this.state === 'error') {
          clearTimeout(timeout)
          reject(new Error('连接失败'))
        } else {
          setTimeout(checkConnection, 100)
        }
      }

      checkConnection()
    })
  }

  /**
   * 标准化配置
   */
  private normalizeConfig(config: ShareDBConnectionConfig): ShareDBConnectionConfig {
    return {
      ...config,
      reconnect: {
        maxRetries: 10,
        retryDelay: 1000,
        exponentialBackoff: true,
        ...config.reconnect
      },
      heartbeat: {
        interval: 30000,
        timeout: 5000,
        ...config.heartbeat
      }
    }
  }
}