/**
 * useRecord Hook - 重构版本，集成 ShareDB 文档订阅
 * 参考 Teable 的 useRecord 实现
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useConnection } from '../connection/useConnection.js'
import { useFields } from '../fields/useFields.js'
import { Record, createRecordInstance, recordInstanceFieldMap, IRecord, IFieldInstance } from '../../model/record/index.js'
import { ShareDBDoc } from '../../core/sharedb/document.js'

export interface UseRecordReturn {
  record: Record | undefined
  loading: boolean
  error: Error | null
  updateCell: (fieldId: string, value: any) => Promise<void>
  refresh: () => void
}

/**
 * 单个记录 Hook
 * 集成 ShareDB 文档订阅，实现实时同步
 */
export function useRecord(tableId: string, recordId: string | undefined): UseRecordReturn {
  const { connection, isConnected } = useConnection()
  const { fields, loading: fieldsLoading } = useFields(tableId)
  const [record, setRecord] = useState<Record | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 乐观更新回调
  const onCommitLocal = useCallback((fieldId: string, value: any, isRollback?: boolean) => {
    console.log(`🔄 乐观更新字段 ${fieldId}:`, { value, isRollback })
    // 这里可以触发 UI 更新通知
  }, [])

  // 加载记录数据
  const loadRecord = useCallback(async () => {
    if (!connection || !recordId || !isConnected) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // 获取 ShareDB 文档
      const doc = connection.get(`rec_${tableId}`, recordId) as ShareDBDoc<IRecord>
      
      // 获取初始数据
      const data = await doc.fetch()
      
      // 创建字段映射
      const fieldMap = fields.reduce((map, field) => {
        map[field.id] = field
        return map
      }, {} as { [fieldId: string]: IFieldInstance })

      // 创建记录实例
      const recordInstance = createRecordInstance(data, doc as any, fieldMap, onCommitLocal)
      setRecord(recordInstance)

      console.log('✅ 记录加载完成:', recordId)

    } catch (err) {
      const error = err as Error
      setError(error)
      console.error('❌ 记录加载失败:', error)
    } finally {
      setLoading(false)
    }
  }, [connection, recordId, tableId, isConnected, fields, onCommitLocal])

  // 订阅文档更新
  useEffect(() => {
    if (!connection || !recordId || !isConnected || !record) {
      return
    }

    const doc = connection.get(`rec_${tableId}`, recordId) as ShareDBDoc<IRecord>
    
    // 订阅更新
    const handleUpdate = () => {
      console.log('📡 收到记录更新:', recordId)
      
      // 重新创建记录实例
      if (doc.data) {
        const fieldMap = fields.reduce((map, field) => {
          map[field.id] = field
          return map
        }, {} as { [fieldId: string]: IFieldInstance })
        
        const updatedRecord = createRecordInstance(doc.data, doc as any, fieldMap, onCommitLocal)
        setRecord(updatedRecord)
      }
    }

    // 订阅文档
    doc.subscribe(handleUpdate)

    // 监听操作事件
    doc.on('op batch', handleUpdate)

    return () => {
      doc.removeListener('op batch', handleUpdate)
      doc.unsubscribe()
    }
  }, [connection, recordId, tableId, isConnected, fields, onCommitLocal, record])

  // 初始加载
  useEffect(() => {
    if (recordId && fields.length > 0) {
      loadRecord()
    }
  }, [loadRecord, recordId, fields.length])

  // 更新单元格
  const updateCell = useCallback(async (fieldId: string, value: any) => {
    if (!record) {
      throw new Error('记录未加载')
    }

    try {
      await record.updateCell(fieldId, value)
      console.log(`✅ 字段 ${fieldId} 更新成功:`, value)
    } catch (err) {
      console.error(`❌ 字段 ${fieldId} 更新失败:`, err)
      throw err
    }
  }, [record])

  // 刷新函数
  const refresh = useCallback(() => {
    loadRecord()
  }, [loadRecord])

  // 计算加载状态
  const isLoading = loading || fieldsLoading

  return {
    record,
    loading: isLoading,
    error,
    updateCell,
    refresh
  }
}

