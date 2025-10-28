/**
 * EasyGrid 核心客户端
 * 参考 Teable 的 Connection + useInstances 的综合体
 */

import ReconnectingWebSocket from 'reconnecting-websocket'

// 简单的 EventEmitter 实现，浏览器兼容
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(l => l !== listener)
  }

  removeListener(event: string, listener: Function) {
    this.off(event, listener)
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return
    this.events[event].forEach(listener => listener(...args))
  }
}

export interface EasyGridClientConfig {
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

export interface ShareDBMessage {
  a: string // action
  c?: string // collection
  d?: string // docId
  v?: number // version
  op?: any[] // operations
  data?: any // data
  error?: {
    code: string
    message: string
    details?: string
  }
  presence?: any
}

export interface ShareDBSnapshot {
  v: number
  data: any
}

export interface OTOperation {
  p: any[] // path
  oi?: any // insert
  od?: any // delete
  na?: number // number add
}

export class EasyGridClient extends EventEmitter {
  private config: EasyGridClientConfig
  private socket: ReconnectingWebSocket | null = null
  private state: ConnectionState = 'disconnected'
  private retryCount: number = 0
  private heartbeatTimer?: NodeJS.Timeout
  private lastConnectedAt?: Date
  private connectionId?: string
  private messageId = 0

  constructor(config: EasyGridClientConfig) {
    super()
    this.config = this.normalizeConfig(config)
  }

  // ============ 连接管理 ============
  
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return
    }

    this.setState('connecting')
    
    try {
      // 创建 ReconnectingWebSocket
      this.socket = new ReconnectingWebSocket(this.buildWsUrl(), [], {
        maxRetries: this.config.reconnect?.maxRetries ?? 10,
        reconnectionDelayGrowFactor: this.config.reconnect?.exponentialBackoff ? 1.5 : 1,
        minReconnectionDelay: this.config.reconnect?.retryDelay ?? 1000,
        maxReconnectionDelay: 10000,
      } as any)

      // 设置事件监听
      this.setupEventHandlers()
      
      // 等待连接建立
      await this.waitForConnection()
      
      this.setState('connected')
      this.lastConnectedAt = new Date()
      this.retryCount = 0
      
      // 启动心跳
      this.startHeartbeat()
      
      this.emit('connected')
    } catch (error) {
      this.setState('error')
      this.emit('error', error)
      throw error
    }
  }

  disconnect(): void {
    this.stopHeartbeat()
    
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    
    this.setState('disconnected')
    this.emit('disconnected')
  }

  reconnect(): void {
    this.log('Manual reconnect triggered')
    this.disconnect()
    this.connect()
  }

  // ============ 状态管理 ============
  
  getState(): ConnectionState {
    return this.state
  }

  isConnected(): boolean {
    return this.state === 'connected' && this.socket != null
  }

  getStats() {
    return {
      state: this.state,
      retryCount: this.retryCount,
      lastConnectedAt: this.lastConnectedAt,
      connectionId: this.connectionId,
    }
  }

  // ============ ShareDB 协议实现 ============
  
  /**
   * 发送握手消息
   */
  private sendHandshake(): Promise<void> {
    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId
      
      const message: ShareDBMessage = {
        a: 'hs', // handshake
      }
      
      this.sendMessage(message)
      
      // 等待握手响应
      const timeout = setTimeout(() => {
        reject(new Error('Handshake timeout'))
      }, 5000)
      
      const handler = (msg: ShareDBMessage) => {
        if (msg.a === 'hs') {
          clearTimeout(timeout)
          this.removeListener('message', handler)
          this.connectionId = msg.data?.id
          resolve()
        }
      }
      
      this.on('message', handler)
    })
  }

  /**
   * 获取文档快照
   */
  fetch(collection: string, docId: string): Promise<ShareDBSnapshot> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected'))
        return
      }

      const message: ShareDBMessage = {
        a: 'f', // fetch
        c: collection,
        d: docId,
      }
      
      this.sendMessage(message)
      
      // 等待快照响应
      const timeout = setTimeout(() => {
        reject(new Error('Fetch timeout'))
      }, 10000)
      
      const handler = (msg: ShareDBMessage) => {
        if (msg.c === collection && msg.d === docId && msg.a === 'f') {
          clearTimeout(timeout)
          this.removeListener('message', handler)
          
          if (msg.error) {
            reject(new Error(msg.error.message))
          } else {
            resolve({
              v: msg.v || 0,
              data: msg.data
            })
          }
        }
      }
      
      this.on('message', handler)
    })
  }

  /**
   * 订阅文档
   */
  subscribe(collection: string, docId: string, callback: (snapshot: ShareDBSnapshot) => void): () => void {
    if (!this.isConnected()) {
      this.log('No connection available for subscription')
      return () => {}
    }

    const message: ShareDBMessage = {
      a: 's', // subscribe
      c: collection,
      d: docId,
    }
    
    this.sendMessage(message)
    
    // 监听订阅响应和后续更新
    const handler = (msg: ShareDBMessage) => {
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
            this.log('Error fetching updated document:', error)
          })
        }
      }
    }
    
    this.on('message', handler)
    
    // 返回取消订阅函数
    return () => {
      this.removeListener('message', handler)
      this.unsubscribe(collection, docId)
    }
  }

  /**
   * 取消订阅文档
   */
  unsubscribe(collection: string, docId: string): void {
    if (!this.isConnected()) {
      return
    }

    const message: ShareDBMessage = {
      a: 'us', // unsubscribe
      c: collection,
      d: docId,
    }
    
    this.sendMessage(message)
  }

  /**
   * 提交操作
   */
  submitOp(collection: string, docId: string, op: OTOperation[], version?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected'))
        return
      }

      const message: ShareDBMessage = {
        a: 'op', // operation
        c: collection,
        d: docId,
        v: version,
        op: op,
      }
      
      this.sendMessage(message)
      
      // 等待操作确认
      const timeout = setTimeout(() => {
        reject(new Error('Operation timeout'))
      }, 10000)
      
      const handler = (msg: ShareDBMessage) => {
        if (msg.c === collection && msg.d === docId && msg.a === 'op') {
          clearTimeout(timeout)
          this.removeListener('message', handler)
          
          if (msg.error) {
            reject(new Error(msg.error.message))
          } else {
            resolve()
          }
        }
      }
      
      this.on('message', handler)
    })
  }

  /**
   * 提交在线状态
   */
  submitPresence(collection: string, docId: string, presence: any): void {
    if (!this.isConnected()) {
      this.log('No connection available for presence')
      return
    }

    const message: ShareDBMessage = {
      a: 'p', // presence
      c: collection,
      d: docId,
      presence: presence,
    }
    
    this.sendMessage(message)
  }

  // ============ 私有方法 ============
  
  private setState(state: ConnectionState) {
    if (this.state !== state) {
      this.state = state
      this.emit('stateChange', state)
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.addEventListener('open', () => {
      this.log('WebSocket connected')
      this.sendHandshake().then(() => {
        this.setState('connected')
        this.lastConnectedAt = new Date()
        this.retryCount = 0
        this.emit('connected')
      }).catch((error) => {
        this.log('Handshake failed:', error)
        this.setState('error')
        this.emit('error', error)
      })
    })

    this.socket.addEventListener('close', () => {
      this.log('WebSocket disconnected')
      this.setState('disconnected')
      this.emit('disconnected')
    })

    this.socket.addEventListener('error', (error) => {
      this.log('WebSocket error:', error)
      this.setState('error')
      this.emit('error', error)
    })

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        this.log('Failed to parse message:', error)
      }
    })
  }

  private handleMessage(message: ShareDBMessage) {
    this.log('Received message:', message)
    
    // 处理错误消息
    if (message.error) {
      this.handleShareDBError(message.error)
      return
    }
    
    // 转发消息给监听器
    this.emit('message', message)
  }

  private handleShareDBError(error: any) {
    const errorCode = error.code || error
    
    // 参考 Teable 的错误处理
    if (errorCode === 'UNAUTHORIZED') {
      window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.href)}`
      return
    }
    
    if (errorCode === 'UNAUTHORIZED_SHARE') {
      window.location.reload()
      return
    }
    
    // 忽略特定错误
    const ignoreErrors = ['VIEW_NOT_FOUND', 'DOCUMENT_NOT_FOUND']
    if (ignoreErrors.includes(errorCode)) {
      this.log('Ignoring error:', errorCode)
      return
    }
    
    // 触发错误处理
    this.emit('sharedb-error', error)
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.isConnected()) {
        this.sendMessage({ a: 'ping' })
      }
    }, this.config.heartbeat?.interval ?? 10000)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 10000)

      const handler = () => {
        clearTimeout(timeout)
        this.removeListener('connected', handler)
        resolve()
      }

      this.on('connected', handler)
    })
  }

  private sendMessage(message: ShareDBMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    } else {
      this.log('Cannot send message: WebSocket not connected')
    }
  }

  private buildWsUrl(): string {
    const { wsUrl, accessToken } = this.config
    if (accessToken) {
      return `${wsUrl}?token=${encodeURIComponent(accessToken)}`
    }
    return wsUrl
  }

  private normalizeConfig(config: EasyGridClientConfig): EasyGridClientConfig {
    return {
      ...config,
      reconnect: {
        maxRetries: 10,
        retryDelay: 1000,
        exponentialBackoff: true,
        ...config.reconnect
      },
      heartbeat: {
        interval: 10000,
        timeout: 30000,
        ...config.heartbeat
      }
    }
  }

  private log(message: string, ...args: any[]) {
    if (this.config.debug) {
      console.log(`[EasyGridClient] ${message}`, ...args)
    }
  }
}
