/**
 * ShareDB 相关类型定义
 * 基于服务端 ShareDB 实现的类型系统
 */

// ShareDB 消息类型
export interface ShareDBMessage {
  a: 'hs' | 's' | 'us' | 'op' | 'f' | 'p'  // action
  c?: string  // collection
  d?: string  // docId
  v?: number  // version
  op?: OTOperation[]
  data?: any
  error?: ShareDBError
  source?: string
  type?: string
  m?: any
}

// OT 操作类型
export interface OTOperation {
  p: (string | number)[]  // path
  oi?: any     // insert value
  od?: any     // delete value
  li?: any     // list insert
  ld?: any     // list delete
  lm?: number  // list move
  na?: number  // number add
}

// ShareDB 错误类型
export interface ShareDBError {
  code: number
  message: string
}

// 文档快照类型
export interface ShareDBSnapshot {
  v: number    // version
  data: any    // document data
  type?: string
  m?: any      // metadata
}

// 连接状态类型
export type ShareDBConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

// 文档事件类型
export type DocumentEventType = 'snapshot' | 'operation' | 'presence' | 'error' | 'op'

// 文档事件
export interface DocumentEvent {
  type: DocumentEventType
  data: any
  timestamp: number
  source?: string
}

// 操作事件
export interface OperationEvent {
  op: OTOperation[]
  version: number
  source?: string
  timestamp: number
}

// 文档事件处理器
export type DocumentEventHandler = (event: DocumentEvent) => void
export type OperationEventHandler = (event: OperationEvent) => void

// 连接配置
export interface ShareDBConnectionConfig {
  wsUrl: string
  token: string
  debug?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

// 文档配置
export interface DocumentConfig {
  collection: string
  docId: string
  autoSubscribe?: boolean
  autoFetch?: boolean
}

// 操作构建器配置
export interface OperationBuilderConfig {
  enableCompression?: boolean
  enableBatching?: boolean
  batchSize?: number
  batchTimeout?: number
}
