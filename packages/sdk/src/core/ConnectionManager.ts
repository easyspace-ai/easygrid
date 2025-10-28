/**
 * 连接管理器
 * 负责管理 WebSocket 连接的生命周期和状态
 */

import { EasyGridClient, ConnectionState } from './EasyGridClient.js'
import { SDKErrorHandler } from './error-handler.js'

export interface ConnectionStats {
  state: ConnectionState
  retryCount: number
  lastConnectedAt?: Date
  connectionId?: string
  uptime: number
  totalReconnects: number
  lastError?: Error
  heartbeatMissed: number
  lastHeartbeatAt?: Date
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline'
}

export interface ConnectionConfig {
  autoReconnect: boolean
  maxReconnectAttempts: number
  reconnectDelay: number
  exponentialBackoff: boolean
  heartbeatInterval: number
  heartbeatTimeout: number
  connectionTimeout: number
  maxHeartbeatMissed: number
  networkQualityThreshold: {
    excellent: number
    good: number
    poor: number
  }
}

export class ConnectionManager {
  private client: EasyGridClient
  private config: ConnectionConfig
  private stats: ConnectionStats
  private reconnectTimer?: NodeJS.Timeout
  private connectionTimer?: NodeJS.Timeout
  private heartbeatTimer?: NodeJS.Timeout
  private heartbeatTimeoutTimer?: NodeJS.Timeout
  private startTime: Date
  private listeners: Map<string, Function[]> = new Map()
  private isDestroyed: boolean = false

  constructor(client: EasyGridClient, config: Partial<ConnectionConfig> = {}) {
    this.client = client
    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      exponentialBackoff: true,
      heartbeatInterval: 30000,
      heartbeatTimeout: 10000,
      connectionTimeout: 10000,
      maxHeartbeatMissed: 3,
      networkQualityThreshold: {
        excellent: 100,
        good: 200,
        poor: 500
      },
      ...config
    }
    
    this.startTime = new Date()
    this.stats = {
      state: 'disconnected',
      retryCount: 0,
      uptime: 0,
      totalReconnects: 0,
      heartbeatMissed: 0,
      networkQuality: 'offline'
    }
    
    this.setupEventListeners()
  }

  /**
   * 连接到服务器
   */
  async connect(): Promise<void> {
    if (this.stats.state === 'connected' || this.stats.state === 'connecting') {
      return
    }

    this.updateStats({ state: 'connecting' })
    this.emit('connecting')

    try {
      // 设置连接超时
      this.connectionTimer = setTimeout(() => {
        this.handleConnectionTimeout()
      }, this.config.connectionTimeout)

      await this.client.connect()
      
      // 清除连接超时
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer)
        this.connectionTimer = undefined
      }

      this.updateStats({ 
        state: 'connected',
        retryCount: 0,
        lastConnectedAt: new Date(),
        lastError: undefined,
        heartbeatMissed: 0,
        networkQuality: 'excellent'
      })
      
      this.startHeartbeat()
      this.emit('connected')
    } catch (error) {
      this.handleConnectionError(error as Error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.clearTimers()
    this.client.disconnect()
    
    this.updateStats({ 
      state: 'disconnected',
      networkQuality: 'offline'
    })
    this.emit('disconnected')
  }

  /**
   * 手动重连
   */
  async reconnect(): Promise<void> {
    this.stats.totalReconnects++
    this.disconnect()
    
    if (this.config.autoReconnect) {
      await this.scheduleReconnect()
    } else {
      await this.connect()
    }
  }

  /**
   * 获取连接状态
   */
  getState(): ConnectionState {
    return this.stats.state
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.stats.state === 'connected'
  }

  /**
   * 获取连接统计信息
   */
  getStats(): ConnectionStats {
    this.updateUptime()
    return { ...this.stats }
  }

  /**
   * 获取客户端实例
   */
  getClient(): EasyGridClient {
    return this.client
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 添加事件监听器
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args)
        } catch (error) {
          console.error(`Error in connection manager event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.client.on('connected', () => {
      this.updateStats({ 
        state: 'connected',
        retryCount: 0,
        lastConnectedAt: new Date(),
        lastError: undefined
      })
      this.emit('connected')
    })

    this.client.on('disconnected', () => {
      this.updateStats({ state: 'disconnected' })
      this.emit('disconnected')
      
      if (this.config.autoReconnect) {
        this.scheduleReconnect()
      }
    })

    this.client.on('error', (error: Error) => {
      this.handleConnectionError(error)
    })

    this.client.on('stateChange', (state: ConnectionState) => {
      this.updateStats({ state })
      this.emit('stateChange', state)
    })

    // 监听心跳响应
    this.client.on('pong', (data: any) => {
      if (data.timestamp) {
        this.handleHeartbeatResponse(data.timestamp)
      }
    })
  }

  /**
   * 处理连接超时
   */
  private handleConnectionTimeout(): void {
    const error = new Error('Connection timeout')
    this.handleConnectionError(error)
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.stats.retryCount >= this.config.maxReconnectAttempts) {
      this.updateStats({ state: 'error' })
      this.emit('maxReconnectAttemptsReached')
      return
    }

    this.updateStats({ 
      state: 'reconnecting',
      retryCount: this.stats.retryCount + 1
    })
    
    this.emit('reconnecting', this.stats.retryCount)

    const delay = this.calculateReconnectDelay()
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        // 重连失败，继续尝试
        this.scheduleReconnect()
      }
    }, delay)
  }

  /**
   * 计算重连延迟
   */
  private calculateReconnectDelay(): number {
    if (this.config.exponentialBackoff) {
      return Math.min(
        this.config.reconnectDelay * Math.pow(2, this.stats.retryCount - 1),
        30000 // 最大30秒
      )
    }
    return this.config.reconnectDelay
  }

  /**
   * 更新统计信息
   */
  private updateStats(updates: Partial<ConnectionStats>): void {
    this.stats = { ...this.stats, ...updates }
    this.updateUptime()
  }

  /**
   * 更新运行时间
   */
  private updateUptime(): void {
    if (this.stats.state === 'connected' && this.stats.lastConnectedAt) {
      this.stats.uptime = Date.now() - this.stats.lastConnectedAt.getTime()
    }
  }


  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected() && !this.isDestroyed) {
        this.sendHeartbeat()
      }
    }, this.config.heartbeatInterval)
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
    
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = undefined
    }
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat(): void {
    try {
      const startTime = Date.now()
      
      // 发送 ping 消息
      if (this.client && typeof (this.client as any).sendMessage === 'function') {
        (this.client as any).sendMessage({ a: 'ping', timestamp: startTime })
      }
      
      // 设置心跳超时
      this.heartbeatTimeoutTimer = setTimeout(() => {
        this.handleHeartbeatTimeout()
      }, this.config.heartbeatTimeout)
      
    } catch (error) {
      console.error('❌ 发送心跳失败:', error)
      this.handleConnectionError(error as Error)
    }
  }

  /**
   * 处理心跳响应
   */
  private handleHeartbeatResponse(timestamp: number): void {
    const latency = Date.now() - timestamp
    this.updateNetworkQuality(latency)
    
    // 清除心跳超时
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = undefined
    }
    
    // 重置心跳丢失计数
    this.updateStats({
      heartbeatMissed: 0,
      lastHeartbeatAt: new Date()
    })
    
    this.emit('heartbeat', { latency })
  }

  /**
   * 处理心跳超时
   */
  private handleHeartbeatTimeout(): void {
    const missed = this.stats.heartbeatMissed + 1
    
    this.updateStats({
      heartbeatMissed: missed,
      networkQuality: 'poor'
    })
    
    this.emit('heartbeatTimeout', { missed })
    
    // 如果心跳丢失次数过多，触发重连
    if (missed >= this.config.maxHeartbeatMissed) {
      console.warn(`⚠️ 心跳丢失 ${missed} 次，触发重连`)
      this.handleConnectionError(new Error('Heartbeat timeout'))
    }
  }

  /**
   * 更新网络质量
   */
  private updateNetworkQuality(latency: number): void {
    let quality: 'excellent' | 'good' | 'poor' | 'offline' = 'offline'
    
    if (latency <= this.config.networkQualityThreshold.excellent) {
      quality = 'excellent'
    } else if (latency <= this.config.networkQualityThreshold.good) {
      quality = 'good'
    } else if (latency <= this.config.networkQualityThreshold.poor) {
      quality = 'poor'
    }
    
    if (this.stats.networkQuality !== quality) {
      this.updateStats({ networkQuality: quality })
      this.emit('networkQualityChange', quality)
    }
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: Error): void {
    const sdkError = SDKErrorHandler.handleConnectionError(error)
    
    this.updateStats({ 
      state: 'error',
      lastError: sdkError,
      networkQuality: 'offline'
    })
    
    this.stopHeartbeat()
    this.emit('error', sdkError)
    
    if (this.config.autoReconnect && !this.isDestroyed) {
      this.scheduleReconnect()
    }
  }

  /**
   * 清除定时器
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = undefined
    }
    
    this.stopHeartbeat()
  }

  /**
   * 销毁连接管理器
   */
  destroy(): void {
    this.isDestroyed = true
    this.clearTimers()
    this.client.disconnect()
    this.listeners.clear()
  }
}
