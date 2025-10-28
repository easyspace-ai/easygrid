/**
 * ShareDBDoc - ShareDB 文档类
 * 负责订阅管理、操作应用、事件触发
 */

// 浏览器兼容的 EventEmitter
class EventEmitter {
  private listeners: { [event: string]: Function[] } = {}

  on(event: string, listener: Function): this {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(listener)
    return this
  }

  off(event: string, listener: Function): this {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener)
    }
    return this
  }

  emit(event: string, ...args: any[]): boolean {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => {
        try {
          listener(...args)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
      return true
    }
    return false
  }

  removeListener(event: string, listener: Function): this {
    return this.off(event, listener)
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners[event] = []
    } else {
      this.listeners = {}
    }
    return this
  }
}

import { ShareDBConnection } from './connection.js'

// 导出类型定义
export interface ShareDBMessage {
  a: string // action
  c?: string // collection
  d?: string // docId
  v?: number // version
  op?: OTOperation[] // operations
  data?: any // data
  error?: {
    code: string
    message: string
    details?: string
  }
}

export interface OTOperation {
  p: any[] // path
  oi?: any // insert
  od?: any // delete
  na?: number // number add
}

export interface ShareDBSnapshot {
  v: number
  data: any
}

/**
 * ShareDB 文档类
 * 管理单个文档的生命周期、订阅、操作应用
 */
export class ShareDBDoc<T = any> extends EventEmitter {
  private connection: ShareDBConnection
  private collection: string
  private docId: string
  private _data: T | null = null
  private _version: number = 0
  private isSubscribed: boolean = false
  private isFetched: boolean = false

  constructor(connection: ShareDBConnection, collection: string, docId: string) {
    super()
    this.connection = connection
    this.collection = collection
    this.docId = docId
  }

  /**
   * 获取文档数据
   */
  get data(): T | null {
    return this._data
  }

  /**
   * 获取文档版本
   */
  get version(): number {
    return this._version
  }

  /**
   * 检查是否已订阅
   */
  get subscribed(): boolean {
    return this.isSubscribed
  }

  /**
   * 检查是否已获取数据
   */
  get fetched(): boolean {
    return this.isFetched
  }

  /**
   * 获取文档标识
   */
  get key(): string {
    return `${this.collection}:${this.docId}`
  }

  /**
   * 获取初始数据
   */
  async fetch(): Promise<T> {
    if (this.isFetched) {
      return this.data!
    }

    try {
      const data = await this.connection.fetch(this.collection, this.docId)
      this._data = data
      this._version = 0
      this.isFetched = true
      
      this.emit('snapshot', { v: this._version, data: this._data })
      
      return this._data as T
    } catch (error) {
      console.error(`❌ 获取文档失败 ${this.key}:`, error)
      throw error
    }
  }

  /**
   * 订阅文档变更
   */
  subscribe(callback?: (snapshot: ShareDBSnapshot) => void): void {
    if (this.isSubscribed) {
      return
    }

    // 发送订阅消息
    this.connection.subscribe(this.collection, this.docId)
    this.isSubscribed = true

    // 如果有回调函数，立即调用（如果已有数据）
    if (callback && this._data !== null) {
      callback({ v: this._version, data: this._data })
    }

    // 监听快照事件
    if (callback) {
      this.on('snapshot', callback)
    }

    console.log(`📡 订阅文档: ${this.key}`)
  }

  /**
   * 取消订阅文档
   */
  unsubscribe(): void {
    if (!this.isSubscribed) {
      return
    }

    this.connection.unsubscribe(this.collection, this.docId)
    this.isSubscribed = false
    
    console.log(`📡 取消订阅文档: ${this.key}`)
  }

  /**
   * 处理 ShareDB 消息
   */
  handleMessage(message: ShareDBMessage): void {
    try {
      switch (message.a) {
        case 's': // subscribe response
          if (message.data) {
            this.handleSnapshot(message)
          }
          break
          
        case 'op': // operation
          if (message.op) {
            this.handleOperation(message.op)
          }
          break
          
        case 'f': // fetch response
          if (message.data) {
            this.handleSnapshot(message)
          }
          break
          
        case 'error':
          this.handleError(message.error!)
          break
          
        default:
          // 忽略未知消息类型
          break
      }
    } catch (error) {
      console.error(`❌ 处理文档消息失败 ${this.key}:`, error)
    }
  }

  /**
   * 处理快照消息
   */
  private handleSnapshot(message: ShareDBMessage): void {
    this._data = message.data
    this._version = message.v || 0
    this.isFetched = true
    
    this.emit('snapshot', { v: this._version, data: this._data })
  }

  /**
   * 处理操作消息
   */
  private handleOperation(operations: OTOperation[]): void {
    if (!this._data) {
      console.warn(`⚠️ 文档 ${this.key} 没有数据，无法应用操作`)
      return
    }

    // 应用操作到本地数据
    operations.forEach(op => this.applyOperation(op))
    this._version++

    // 触发操作事件
    this.emit('op batch', operations)
    this.emit('snapshot', { v: this._version, data: this._data })
    
    console.log(`📝 应用操作到文档 ${this.key}:`, operations)
  }

  /**
   * 应用单个操作到数据
   */
  private applyOperation(operation: OTOperation): void {
    if (!this._data) return

    const path = operation.p
    if (path.length === 0) return

    try {
      // 根据路径应用操作
      this.applyOperationToPath(this._data, path, operation)
    } catch (error) {
      console.error(`❌ 应用操作失败 ${this.key}:`, error, operation)
    }
  }

  /**
   * 根据路径应用操作
   */
  private applyOperationToPath(obj: any, path: any[], operation: OTOperation): void {
    if (path.length === 1) {
      // 根级操作
      const key = path[0]
      
      if (operation.oi !== undefined) {
        // 插入/更新
        obj[key] = operation.oi
      } else if (operation.od !== undefined) {
        // 删除
        delete obj[key]
      } else if (operation.na !== undefined) {
        // 数字加法
        if (typeof obj[key] === 'number') {
          obj[key] += operation.na
        }
      }
    } else {
      // 嵌套操作
      const key = path[0]
      const remainingPath = path.slice(1)
      
      if (!(key in obj)) {
        obj[key] = {}
      }
      
      this.applyOperationToPath(obj[key], remainingPath, operation)
    }
  }

  /**
   * 处理错误消息
   */
  private handleError(error: { code: string; message: string; details?: string }): void {
    console.error(`❌ 文档 ${this.key} 错误:`, error)
    this.emit('error', error)
  }

  /**
   * 更新文档数据（本地）
   */
  updateData(newData: T): void {
    this._data = newData
    this._version++
    
    this.emit('snapshot', { v: this._version, data: this._data })
  }

  /**
   * 重置文档状态
   */
  reset(): void {
    this._data = null
    this._version = 0
    this.isSubscribed = false
    this.isFetched = false
    
    this.removeAllListeners()
  }

  /**
   * 销毁文档
   */
  destroy(): void {
    this.unsubscribe()
    this.reset()
  }
}
