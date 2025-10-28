/**
 * useFields Hook - 管理字段数据
 */

import { useState, useEffect, useCallback } from 'react'
import { IFieldInstance } from '../../model/record/record-core.js'
import { getEasyGridSDK } from '../../sdk.js'

export interface UseFieldsReturn {
  fields: IFieldInstance[]
  loading: boolean
  error: Error | null
  refresh: () => void
}

/**
 * 字段数据 Hook
 */
export function useFields(tableId: string): UseFieldsReturn {
  const [fields, setFields] = useState<IFieldInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 加载字段数据
  const loadFields = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const sdk = getEasyGridSDK()
      const fieldsData = await sdk.fields.listFields({ tableId })
      
      setFields(fieldsData)
      
    } catch (err) {
      const error = err as Error
      setError(error)
      console.error('❌ 字段加载失败:', error)
    } finally {
      setLoading(false)
    }
  }, [tableId])

  // 刷新函数
  const refresh = useCallback(() => {
    loadFields()
  }, [loadFields])

  // 初始加载
  useEffect(() => {
    if (tableId) {
      loadFields()
    }
  }, [loadFields, tableId])

  return {
    fields,
    loading,
    error,
    refresh
  }
}

