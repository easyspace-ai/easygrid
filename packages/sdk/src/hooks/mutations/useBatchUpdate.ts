/**
 * useBatchUpdate Hook
 * 提供批量更新功能
 */

import { useState, useCallback } from 'react'
import { useConnection } from '../connection/useConnection.js'
import type { OTOperation } from '../../core/EasyGridClient.js'

export interface BatchUpdateItem {
  recordId: string
  changes: Record<string, any>
}

export interface UseBatchUpdateReturn {
  batchUpdate: (updates: BatchUpdateItem[]) => Promise<void>
  isUpdating: boolean
  progress: number
  error: Error | null
}

export function useBatchUpdate(tableId: string): UseBatchUpdateReturn {
  const { connection } = useConnection()
  const [isUpdating, setIsUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const batchUpdate = useCallback(
    async (updates: BatchUpdateItem[]) => {
      setIsUpdating(true)
      setProgress(0)
      setError(null)

      try {
        const collection = `rec_${tableId}`
        const totalUpdates = updates.length
        let completedUpdates = 0

        // 批量处理更新
        for (const update of updates) {
          try {
            // 构建操作
            const ops: OTOperation[] = Object.entries(update.changes).map(([fieldId, value]) => ({
              p: ['fields', fieldId],
              oi: value,
              od: undefined // 这里需要获取旧值
            }))

            await connection!.submitOp(collection, update.recordId, ops)
            
            completedUpdates++
            setProgress((completedUpdates / totalUpdates) * 100)
          } catch (err) {
            console.error(`Failed to update record ${update.recordId}:`, err)
            // 继续处理其他更新
          }
        }

        setProgress(100)
      } catch (err) {
        const error = err as Error
        setError(error)
        console.error('批量更新失败:', error)
        throw error
      } finally {
        setIsUpdating(false)
      }
    },
    [connection, tableId]
  )

  return {
    batchUpdate,
    isUpdating,
    progress,
    error
  }
}
