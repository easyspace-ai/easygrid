/**
 * ShareDB 文档类型定义
 */

export interface ShareDBDoc<T = any> {
  data: T
  version: number
  subscribe(callback: () => void): void
  unsubscribe(): void
  on(event: string, listener: Function): void
  removeListener(event: string, listener: Function): void
  emit(event: string, ...args: any[]): void
}

export interface OTOperation {
  p: any[] // path
  oi?: any // insert
  od?: any // delete
  na?: number // number add
}

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

export interface ShareDBSnapshot {
  v: number
  data: any
}

