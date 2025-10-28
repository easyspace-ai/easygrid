/**
 * useEasyGrid Hook - 重构版本，使用 useInstances 模式
 * 增强实时同步和乐观更新
 */

import { useCallback, useMemo } from 'react'
import { useConnection } from './connection/useConnection.js'
import { useFields } from './fields/useFields.js'
import { useInstances } from './instances/useInstances.js'
import { Record, IFieldInstance } from '../model/record/index.js'

export interface UseEasyGridOptions {
  tableId: string
  viewId?: string
  query?: any
}

export interface UseEasyGridReturn {
  // 记录实例（支持乐观更新）
  records: Record[]
  fields: any[]
  
  // 状态
  loading: boolean
  error: Error | null
  isConnected: boolean
  
  // 操作（乐观更新）
  updateRecord: (recordId: string, fieldId: string, value: any) => Promise<void>
  createRecord: (data: any) => Promise<any>
  deleteRecord: (recordId: string) => Promise<void>
  refresh: () => void
  
  // 统计
  stats: {
    recordCount: number
    fieldCount: number
  }
}

/**
 * SDK 核心数据管理 Hook
 * 使用 useInstances 模式，支持乐观更新和实时同步
 */
export function useEasyGrid(options: UseEasyGridOptions): UseEasyGridReturn {
  const { tableId, viewId, query } = options
  
  // 连接状态
  const { isConnected } = useConnection()
  
  // 字段数据
  const { fields, loading: fieldsLoading, error: fieldsError } = useFields(tableId)
  
  // 记录实例集合
  const { instances, loading: instancesLoading, error: instancesError, refresh: refreshInstances } = useInstances({
    collection: `rec_${tableId}`,
    factory: (data, doc) => {
      // 创建 Record 实例，使用默认的字段映射和回调
      const fieldMap: { [fieldId: string]: IFieldInstance } = {}
      const onCommitLocal = () => {} // 默认的空回调
      return new Record(data, doc as any, fieldMap, onCommitLocal)
    },
    queryParams: { tableId, viewId, ...query }
  })
  
  // 乐观更新记录
  const updateRecord = useCallback(async (recordId: string, fieldId: string, value: any) => {
    const record = instances.find(r => r.id === recordId)
    if (!record) {
      throw new Error('记录未找到')
    }
    
    // Record.updateCell 内部实现乐观更新
    await record.updateCell(fieldId, value)
  }, [instances])
  
  // 创建记录
  const createRecord = useCallback(async (data: any) => {
    // 这里需要调用 API 创建记录
    // 暂时返回模拟数据
    return { id: 'new-record', ...data }
  }, [])
  
  // 删除记录
  const deleteRecord = useCallback(async (recordId: string) => {
    // 这里需要调用 API 删除记录
    console.log('删除记录:', recordId)
  }, [])
  
  // 刷新数据
  const refresh = useCallback(() => {
    refreshInstances()
  }, [refreshInstances])
  
  // 计算统计信息
  const stats = useMemo(() => ({
    recordCount: instances.length,
    fieldCount: fields.length
  }), [instances.length, fields.length])
  
  // 计算加载状态
  const loading = fieldsLoading || instancesLoading
  const error = fieldsError || instancesError
  
  return {
    records: instances,
    fields,
    loading,
    error,
    isConnected,
    updateRecord,
    createRecord,
    deleteRecord,
    refresh,
    stats
  }
}
