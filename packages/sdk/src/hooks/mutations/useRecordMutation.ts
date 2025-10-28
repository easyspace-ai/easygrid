/**
 * useRecordMutation Hook
 * 提供记录变更操作
 */

import { useState, useCallback } from 'react'
import { useConnection } from '../connection/useConnection.js'
import { getEasyGridSDK } from '../../sdk.js'
import type { OTOperation } from '../../core/EasyGridClient.js'

export interface UseRecordMutationOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
  showToast?: boolean
}

export interface UseRecordMutationReturn {
  updateRecord: (recordId: string, fieldId: string, value: any) => Promise<void>
  createRecord: (data: any) => Promise<any>
  deleteRecord: (recordId: string) => Promise<void>
  loading: boolean
  error: Error | null
}

export function useRecordMutation(
  tableId: string,
  options?: UseRecordMutationOptions
): UseRecordMutationReturn {
  const { connection } = useConnection()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateRecord = useCallback(
    async (recordId: string, fieldId: string, value: any) => {
      setIsUpdating(true)
      setError(null)

      try {
        const collection = `rec_${tableId}`
        
        // 构建操作
        const op: OTOperation = {
          p: ['fields', fieldId],
          oi: value,
          od: undefined // 这里需要获取旧值
        }

        await connection!.submitOp(collection, recordId, [op])
        
        options?.onSuccess?.()
        
        if (options?.showToast !== false) {
          console.log('更新成功')
        }
      } catch (err) {
        const error = err as Error
        setError(error)
        options?.onError?.(error)
        
        if (options?.showToast !== false) {
          console.error('更新失败:', error)
        }
      } finally {
        setIsUpdating(false)
      }
    },
    [connection, tableId, options]
  )

  const createRecord = useCallback(
    async (data: any) => {
      setIsUpdating(true)
      setError(null)

      try {
        // 通过全局 SDK 的 HTTP 客户端创建记录
        const sdk = getEasyGridSDK()
        const response = await sdk.http.post(`/api/v1/tables/${tableId}/records`, data)
        
        options?.onSuccess?.()
        
        if (options?.showToast !== false) {
          console.log('创建成功')
        }
        
        return response.data
      } catch (err) {
        const error = err as Error
        setError(error)
        options?.onError?.(error)
        
        if (options?.showToast !== false) {
          console.error('创建失败:', error)
        }
        throw error
      } finally {
        setIsUpdating(false)
      }
    },
    [tableId, options]
  )

  const deleteRecord = useCallback(
    async (recordId: string) => {
      setIsUpdating(true)
      setError(null)

      try {
        // 通过全局 SDK 的 HTTP 客户端删除记录
        const sdk = getEasyGridSDK()
        await sdk.http.delete(`/api/v1/tables/${tableId}/records/${recordId}`)
        
        options?.onSuccess?.()
        
        if (options?.showToast !== false) {
          console.log('删除成功')
        }
      } catch (err) {
        const error = err as Error
        setError(error)
        options?.onError?.(error)
        
        if (options?.showToast !== false) {
          console.error('删除失败:', error)
        }
        throw error
      } finally {
        setIsUpdating(false)
      }
    },
    [tableId, options]
  )

  return {
    updateRecord,
    createRecord,
    deleteRecord,
    loading: isUpdating,
    error
  }
}
