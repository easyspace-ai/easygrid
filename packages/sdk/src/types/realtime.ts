/**
 * 实时协作相关类型定义
 * 高级 API 的事件和数据结构
 */

// 字段变更事件
export interface FieldChangeEvent {
  tableId: string
  recordId: string
  fieldId: string
  oldValue: any
  newValue: any
  timestamp: number
  userId?: string
  source?: string
}

// 记录变更事件
export interface RecordChangeEvent {
  tableId: string
  recordId: string
  changes: Record<string, any>
  timestamp: number
  userId?: string
  source?: string
}

// 表格变更事件
export interface TableChangeEvent {
  tableId: string
  type: 'record-added' | 'record-removed' | 'record-changed' | 'field-added' | 'field-removed'
  recordId?: string
  fieldId?: string
  data?: any
  timestamp: number
  userId?: string
  source?: string
}

// 视图变更事件
export interface ViewChangeEvent {
  viewId: string
  type: 'filter-changed' | 'sort-changed' | 'group-changed' | 'column-meta-changed'
  data?: any
  timestamp: number
  userId?: string
  source?: string
}

// 记录事件
export interface RecordEvent {
  tableId: string
  recordId: string
  data: any
  timestamp: number
  userId?: string
  source?: string
}

// 在线状态用户
export interface PresenceUser {
  userId: string
  name: string
  avatar?: string
  cursor?: CursorPosition
  selection?: Selection
  color: string
  lastSeen: number
}

// 光标位置
export interface CursorPosition {
  tableId: string
  recordId?: string
  fieldId?: string
  x: number
  y: number
  timestamp: number
}

// 选区
export interface Selection {
  tableId: string
  recordId?: string
  fieldId?: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  timestamp: number
}

// 光标事件
export interface CursorEvent {
  userId: string
  position: CursorPosition
  timestamp: number
}

// 选区事件
export interface SelectionEvent {
  userId: string
  selection: Selection
  timestamp: number
}

// 字段更新
export interface FieldUpdate {
  recordId: string
  fieldId: string
  value: any
}

// 过滤表达式
export interface FilterExpression {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'is_empty' | 'is_not_empty' | 'in' | 'not_in'
  value: any
  logic?: 'and' | 'or'
  conditions?: FilterExpression[]
}

// 排序表达式
export interface SortExpression {
  field: string
  direction: 'asc' | 'desc'
}

// 批量更新
export interface BatchUpdate {
  tableId: string
  updates: FieldUpdate[]
  timestamp?: number
}

// 实时记录接口
export interface RealtimeRecordInterface {
  readonly tableId: string
  readonly recordId: string
  readonly fields: Record<string, any>
  readonly version: number
  
  get(fieldId: string): any
  set(fieldId: string, value: any): Promise<void>
  delete(fieldId: string): Promise<void>
  refresh(): Promise<void>
  
  on(event: 'change', callback: (field: string, value: any) => void): void
  off(event: 'change', callback: Function): void
  
  destroy(): void
}

// 实时表格接口
export interface RealtimeTableInterface {
  readonly tableId: string
  readonly records: Map<string, RealtimeRecordInterface>
  
  getRecord(recordId: string): RealtimeRecordInterface | undefined
  getAllRecords(): RealtimeRecordInterface[]
  createRecord(data: Record<string, any>): Promise<RealtimeRecordInterface>
  deleteRecord(recordId: string): Promise<void>
  
  on(event: 'record-added' | 'record-removed' | 'record-changed', callback: Function): void
  
  destroy(): void
}

// 实时视图接口
export interface RealtimeViewInterface {
  readonly viewId: string
  readonly tableId: string
  readonly records: Map<string, RealtimeRecordInterface>
  
  getRecord(recordId: string): RealtimeRecordInterface | undefined
  getAllRecords(): RealtimeRecordInterface[]
  
  on(event: 'view-changed' | 'record-added' | 'record-removed' | 'record-changed', callback: Function): void
  
  destroy(): void
}
