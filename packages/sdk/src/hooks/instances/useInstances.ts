/**
 * useInstances Hook - 管理记录集合
 * 参考 Teable 的 useInstances 模式，使用 ShareDB 官方客户端
 */

import { useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext } from 'react'
import { Record as EasyGridRecord, IRecord, IFieldInstance } from '../../model/record/index.js'
import { getEasyGridSDK } from '../../sdk.js'
import { EasyGridConnectionContext } from '../../context/EasyGridProvider.js'
import type { Doc, Query } from 'sharedb/lib/client'

export interface UseInstancesOptions<T> {
  collection: string
  factory: (data: T, doc?: Doc<T>) => EasyGridRecord
  queryParams?: any
  initData?: T[]
}

export interface UseInstancesReturn<T> {
  instances: EasyGridRecord[]
  loading: boolean
  error: Error | null
  refresh: () => void
}

// 查询销毁函数
const queryDestroy = (query: Query | undefined, cb?: () => void) => {
  if (!query) {
    return
  }
  if (!query.sent || query.ready) {
    query?.destroy(cb)
    return
  }
  query.once('ready', () => {
    query.destroy(() => {
      query.removeAllListeners()
      query.results?.forEach((doc) => doc.listenerCount('op batch') === 0 && doc.destroy())
      cb?.()
    })
  })
}

// 全局缓存，用于去重相同的订阅查询
type CachedQuery = { query: Query; refCount: number }
const subscribeQueryCache = new Map<string, CachedQuery>()

// 标准化查询参数为稳定的、可比较的字符串键
const normalizeForKey = (value: any): any => {
  if (value == null) return value
  if (Array.isArray(value)) return value.map(normalizeForKey)
  if (value instanceof Set) return Array.from(value).sort()
  if (value instanceof Map)
    return Array.from(value.entries())
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
      .map(([k, v]) => [k, normalizeForKey(v)])
  if (typeof value === 'object' && value.constructor === Object) {
    const sortedKeys = Object.keys(value).sort()
    const res: Record<string, unknown> = {}
    for (const k of sortedKeys) res[k] = normalizeForKey(value[k])
    return res
  }
  return value
}

const makeQueryKey = (collection: string, queryParams: unknown) =>
  `${collection}|${JSON.stringify(normalizeForKey(queryParams))}`

const acquireQuery = <T>(
  collection: string,
  connection: any,
  queryParams: unknown
) => {
  const key = makeQueryKey(collection, queryParams)
  const cached = subscribeQueryCache.get(key)
  if (cached) {
    cached.refCount += 1
    return { key, query: cached.query }
  }
  const query = connection!.createSubscribeQuery(collection, queryParams)
  subscribeQueryCache.set(key, { query, refCount: 1 })
  return { key, query }
}

const releaseQuery = (key?: string, cb?: () => void) => {
  if (!key) return
  const cached = subscribeQueryCache.get(key)
  if (!cached) return
  cached.refCount -= 1
  if (cached.refCount <= 0) {
    subscribeQueryCache.delete(key)
    queryDestroy(cached.query, cb)
    return
  }
  cb?.()
}

// 实例状态管理
interface IInstanceState<T> {
  instances: EasyGridRecord[]
  extra?: unknown
}

interface IInstanceAction<T> {
  type: 'ready' | 'insert' | 'remove' | 'move' | 'update'
  results?: Doc<T>[]
  docs?: Doc<T>[]
  index?: number
  doc?: Doc<T>
  extra?: unknown
}

const instanceReducer = <T>(
  state: IInstanceState<T>,
  action: IInstanceAction<T>,
  factory: (data: T, doc?: Doc<T>) => EasyGridRecord
): IInstanceState<T> => {
  switch (action.type) {
    case 'ready':
      if (!action.results) return state
      return {
        instances: action.results.map((doc) => factory(doc.data, doc)),
        extra: action.extra
      }
    case 'insert':
      if (!action.docs || action.index === undefined) return state
      const newInstances = [...state.instances]
      const insertedInstances = action.docs.map((doc) => factory(doc.data, doc))
      newInstances.splice(action.index, 0, ...insertedInstances)
      return { instances: newInstances, extra: state.extra }
    case 'remove':
      if (!action.docs || action.index === undefined) return state
      const removedInstances = [...state.instances]
      removedInstances.splice(action.index, action.docs.length)
      return { instances: removedInstances, extra: state.extra }
    case 'move':
      // 简化实现，重新排序
      return state
    case 'update':
      if (!action.doc) return state
      const updatedInstances = state.instances.map((instance) => {
        if (instance.id === action.doc!.id) {
          return factory(action.doc!.data, action.doc!)
        }
        return instance
      })
      return { instances: updatedInstances, extra: state.extra }
    default:
      return state
  }
}

/**
 * 管理记录集合实例，自动订阅更新和变更事件，自动创建实例，
 * 保持每个实例的最新数据
 */
export function useInstances<T extends IRecord>({
  collection,
  factory,
  queryParams,
  initData,
}: UseInstancesOptions<T>): UseInstancesReturn<T> {
  const context = useContext(EasyGridConnectionContext)
  const connection = context?.connection || null
  const connected = context?.connected || false
  const [query, setQuery] = useState<Query<T>>()
  const [forceUpdate, setForceUpdate] = useState(0)
  const currentKeyRef = useRef<string>()
  const [instances, dispatch] = useReducer(
    (state: IInstanceState<T>, action: IInstanceAction<T>) =>
      instanceReducer(state, action, factory),
    {
      instances: initData && !connected ? initData.map((data) => factory(data)) : [],
      extra: undefined,
    }
  )

  const preQueryRef = useRef<Query<T>>()
  const lastConnectionRef = useRef<typeof connection>()

  const handleReady = useCallback((query: Query<T>) => {
    console.log(
      `${query.collection}:ready:`,
      query.query,
      query.results.map((doc) => doc.data)
    )
    console.log('extra ready ->', query.extra)
    if (!query.results) {
      return
    }
    dispatch({ type: 'ready', results: query.results, extra: query.extra })
    query.results.forEach((doc) => {
      doc.on('op batch', (op) => {
        console.log(`${query.collection} on op:`, op, doc)
        dispatch({ type: 'update', doc })
      })
    })
  }, [])

  const handleInsert = useCallback((docs: Doc<T>[], index: number) => {
    console.log(
      `${docs[0]?.collection}:insert:`,
      docs.map((doc) => doc.id),
      index
    )
    dispatch({ type: 'insert', docs, index })

    docs.forEach((doc) => {
      doc.on('op batch', (op) => {
        console.log(`${docs[0]?.collection} on op:`, op)
        dispatch({ type: 'update', doc })
      })
    })
  }, [])

  const handleRemove = useCallback((docs: Doc<T>[], index: number) => {
    console.log(
      `${docs[0]?.collection}:remove:`,
      docs.map((doc) => doc.id),
      index
    )
    dispatch({ type: 'remove', docs, index })
  }, [])

  const handleMove = useCallback((docs: Doc<T>[], from: number, to: number) => {
    console.log(
      `${docs[0]?.collection}:move:`,
      docs.map((doc) => doc.id),
      from,
      to
    )
    dispatch({ type: 'move', docs, index: from })
  }, [])

  // 稳定化查询参数
  const stableQueryParams = useMemo(() => queryParams, [
    queryParams?.tableId,
    queryParams?.viewId
  ])

  // 当连接或查询参数变化时，重新建立查询
  useEffect(() => {
    // 使用 ShareDB 模式
    console.log('✅ 使用 ShareDB 模式')
    
    if (!connection || !connected) {
      console.log('⚠️ ShareDB 未连接，使用 HTTP 模式')
      
      // HTTP 模式：直接获取数据
      const loadData = async () => {
        try {
          const sdk = getEasyGridSDK()
          const tableId = stableQueryParams?.tableId || 'table1'
          
          const [fieldsResponse, recordsResponse] = await Promise.all([
            sdk.fields.listFields({ tableId }),
            sdk.records.list({ tableId })
          ])
          
          // 创建字段映射
          const fieldMap: { [fieldId: string]: IFieldInstance } = {}
          if (Array.isArray(fieldsResponse)) {
            fieldsResponse.forEach((field: any) => {
              fieldMap[field.id] = {
                id: field.id,
                name: field.name || field.id,
                type: field.type || 'text',
                options: field.options || {}
              }
            })
          }
          
          const recordsData: T[] = (recordsResponse.data || []).map((record: any) => ({
            id: record.id,
            tableId: tableId,
            fields: record.data || {},
            computedFields: record.computedFields || {}
          })) as unknown as T[]
          
          // 直接作为 Doc<T> 的 data 传入 reducer，由 factory 创建 Record
          const docs = recordsData.map((data) => ({ data } as any))
          dispatch({ type: 'ready', results: docs })
        } catch (error) {
          console.error('HTTP 模式加载失败:', error)
        }
      }
      
      loadData()
      return
    }
    
    // ShareDB 模式：使用 HTTP 获取初始数据，WebSocket 用于实时更新
    const loadData = async () => {
      try {
        const sdk = getEasyGridSDK()
        const tableId = stableQueryParams?.tableId || 'table1'
        
        const [fieldsResponse, recordsResponse] = await Promise.all([
          sdk.fields.listFields({ tableId }),
          sdk.records.list({ tableId })
        ])
        
        // 创建字段映射
        const fieldMap: { [fieldId: string]: IFieldInstance } = {}
        if (Array.isArray(fieldsResponse)) {
          fieldsResponse.forEach((field: any) => {
            fieldMap[field.id] = {
              id: field.id,
              name: field.name || field.id,
              type: field.type || 'text',
              options: field.options || {}
            }
          })
        }
        
        const recordsData: T[] = (recordsResponse.data || []).map((record: any) => ({
          id: record.id,
          tableId: tableId,
          fields: record.data || {},
          computedFields: record.computedFields || {}
        })) as unknown as T[]
        
        // 直接作为 Doc<T> 的 data 传入 reducer，由 factory 创建 Record
        const docs = recordsData.map((data) => ({ data } as any))
        dispatch({ type: 'ready', results: docs })
        
        
      } catch (error) {
        console.error('ShareDB 模式加载失败:', error)
      }
    }
    
    loadData()
  }, [stableQueryParams?.tableId])

  // 设置WebSocket消息监听器
  useEffect(() => {
    if (!connection || !connected) return

    const tableId = stableQueryParams?.tableId || 'table1'
    const collection = `rec_${tableId}`
    
    // 监听WebSocket消息
    const handleMessage = (msg: any) => {
      console.log('📡 收到WebSocket消息:', msg)
      
      try {
        if (msg.a === 'op' && msg.c === collection) {
          console.log('🔍 匹配到操作消息:', { collection, msgCollection: msg.c })
          
          // 找到对应的记录实例（优先使用顶层 id，兼容回退 data.id）
          const record = instances.instances.find((r: any) => {
            const rid = r?.id ?? r?.data?.id
            return rid === msg.d
          })
          console.log('🔍 查找记录2222:', { recordId: msg.d, found: !!record })
          console.log('🔍 leven:', msg.op)
          console.log('🔍 leven222:', record && msg.op )
          console.log('🔍 leven222:', instances.instances )

          if (!record) {
            console.log('⚠️ 未找到本地记录实例，可能尚未ready或ID不匹配', { msgId: msg.d })
            return
          }

          if (msg.op && msg.op.length > 0) {
            const operation = msg.op[0]
            console.log('🔄 处理操作:', { recordId: msg.d, operation })
            
            // 更新记录的字段值
            if (operation.p && operation.p.length > 0) {
              const path = operation.p
              console.log('🔍 操作路径:', path)
              
              if (path[0] === 'data') {
                // 检查是否是字段对象更新
                if (path.length === 2 && typeof path[1] === 'object') {
                  // 整个字段对象被替换
                  const newFields = path[1]
                  console.log('✏️ 更新整个字段对象:', newFields)
                  
                  // 更新本地记录实例的 fields（Record 顶层字段）
                  if (!(record as any).fields) {
                    (record as any).fields = {}
                  }
                  ;(record as any).fields = newFields
                  
                  // 触发React重新渲染 - 使用forceUpdate机制
                  console.log('🔄 触发React重新渲染')
                  // 通过修改一个状态来强制重新渲染
                  setForceUpdate(prev => prev + 1)
                } else if (path.length === 2 && typeof path[1] === 'string') {
                  // 单个字段更新
                  const fieldId = path[1]
                  const newValue: any = operation.oi
                  
                  console.log('✏️ 更新单个字段:', { fieldId, newValue })
                  
                  // 更新本地记录实例的 fields（Record 顶层字段）
                  const currentFields = (record as any).fields || {}
                  const updatedFields = { ...currentFields, [fieldId]: newValue }
                  ;(record as any).fields = updatedFields
                  
                  // 触发React重新渲染 - 使用forceUpdate机制
                  console.log('🔄 触发React重新渲染')
                  // 通过修改一个状态来强制重新渲染
                  setForceUpdate(prev => prev + 1)
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('handleMessage内部错误:', err)
        console.error('错误堆栈:', (err as Error).stack)
        console.error('消息内容:', msg)
        console.error('instances.instances:', instances.instances)
        console.error('instances.instances长度:', instances.instances.length)
        console.error('instances.instances第一个元素:', instances.instances[0])
        console.error('instances.instances第一个元素的data:', (instances.instances[0] as any)?.data)
        console.error('instances.instances第一个元素的data.id:', (instances.instances[0] as any)?.data?.id)
      }
    }
    
    // 直接从WebSocket连接监听消息
    // ShareDB Connection对象可能没有直接的ws属性，需要从socket获取
    const socket = (connection as any).socket || (connection as any).ws
    if (socket) {
      console.log('🔍 找到WebSocket连接:', socket.readyState)
      
      const messageHandler = (event: MessageEvent) => {
        try {
          console.log('🔍 原始WebSocket消息:', event.data)
          const msg = JSON.parse(event.data)
          console.log('📡 解析后的WebSocket消息:', msg)
          handleMessage(msg)
        } catch (err) {
          console.error('解析WebSocket消息失败:', err)
          console.error('原始消息数据:', event.data)
        }
      }
      
      socket.addEventListener('message', messageHandler)
      console.log('✅ WebSocket消息监听已设置')
      
      // 清理函数
      return () => {
        socket.removeEventListener('message', messageHandler)
        console.log('🧹 WebSocket消息监听已清理')
      }
    } else {
      console.log('❌ 未找到WebSocket连接')
    }
  }, [connection, connected, stableQueryParams?.tableId, instances.instances])

  // 刷新函数
  const refresh = useCallback(() => {
    if (query) {
      // ShareDB Query 没有 refresh 方法，重新创建查询
      console.log('刷新查询...')
    }
  }, [query])

  return {
    instances: instances.instances,
    loading: query ? !query.ready : false, // HTTP 模式下 query 为 undefined，loading 为 false
    error: null,
    refresh
  }
}

