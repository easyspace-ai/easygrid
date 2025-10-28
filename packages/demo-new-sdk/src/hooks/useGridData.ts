/**
 * useGridData Hook
 * 整合新 SDK 和 Canvas 表格的数据管理
 */

import { useMemo, useCallback, useState, useEffect } from 'react'
import { useRecords, useRecordMutation, useConnection } from '@easygrid/sdk'
import { 
  adaptRecordsToGrid, 
  adaptCellChangeToOp,
  validateGridData,
  createDefaultTestData,
  type GridData,
  type CellChangeEvent,
  type SDKRecord,
  type SDKField
} from '../adapters/gridAdapter'

export interface UseGridDataOptions {
  tableId: string
  viewId?: string
  query?: any
  enableRealtime?: boolean
  useTestData?: boolean
}

export interface UseGridDataReturn {
  // 数据
  gridData: GridData
  records: SDKRecord[]
  fields: SDKField[]
  
  // 状态
  loading: boolean
  error: Error | null
  isConnected: boolean
  
  // 操作
  onCellChange: (change: CellChangeEvent) => Promise<void>
  refreshData: () => void
  
  // 统计
  stats: {
    recordCount: number
    fieldCount: number
    lastUpdated: Date | null
  }
}

/**
 * 整合新 SDK 和 Canvas 表格的 Hook
 */
export function useGridData(options: UseGridDataOptions): UseGridDataReturn {
  const { tableId, viewId, query, enableRealtime = true, useTestData = false } = options
  
  // 连接状态
  const { isConnected } = useConnection()
  
  // 使用新 SDK 的 Hooks
  const { 
    records, 
    fields, 
    loading: recordsLoading, 
    error: recordsError 
  } = useRecords(tableId, { 
    viewId, 
    query,
    enabled: !useTestData && enableRealtime
  })
  
  const { 
    updateCell, 
    loading: mutationLoading 
  } = useRecordMutation(tableId)
  
  // 本地状态
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  
  // 使用测试数据还是真实数据
  const actualRecords = useTestData ? createDefaultTestData().rows.map(row => ({
    id: row.id,
    fields: row.cells,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  })) : records
  
  const actualFields = useTestData ? createDefaultTestData().columns.map(col => ({
    id: col.id,
    name: col.name,
    type: col.type,
    description: col.description,
    required: col.required,
    options: col.options
  })) : fields
  
  // 适配数据为 Canvas 表格格式
  const gridData = useMemo(() => {
    try {
      const data = adaptRecordsToGrid(actualRecords, actualFields)
      
      // 验证数据
      if (!validateGridData(data)) {
        throw new Error('GridData 验证失败')
      }
      
      return data
    } catch (err) {
      console.error('数据适配失败:', err)
      setError(err instanceof Error ? err : new Error('数据适配失败'))
      return createDefaultTestData()
    }
  }, [actualRecords, actualFields])
  
  // 处理单元格变更
  const onCellChange = useCallback(async (change: CellChangeEvent) => {
    try {
      setError(null)
      
      // 转换为 SDK 操作
      const op = adaptCellChangeToOp(change)
      
      // 调用 SDK 的更新方法
      await updateCell(op.recordId, op.fieldId, op.newValue)
      
      // 更新本地状态
      setLastUpdated(new Date())
      
      console.log('单元格更新成功:', {
        recordId: op.recordId,
        fieldId: op.fieldId,
        oldValue: op.oldValue,
        newValue: op.newValue
      })
      
    } catch (err) {
      console.error('单元格更新失败:', err)
      setError(err instanceof Error ? err : new Error('单元格更新失败'))
      
      // 可以在这里实现乐观更新的回滚
      // 或者显示错误提示给用户
    }
  }, [updateCell])
  
  // 刷新数据
  const refreshData = useCallback(() => {
    setLastUpdated(new Date())
    setError(null)
    // SDK 的 useRecords Hook 会自动重新获取数据
  }, [])
  
  // 监听数据变化，更新最后更新时间
  useEffect(() => {
    if (actualRecords.length > 0) {
      setLastUpdated(new Date())
    }
  }, [actualRecords])
  
  // 监听错误状态
  useEffect(() => {
    if (recordsError) {
      setError(recordsError)
    }
  }, [recordsError])
  
  // 计算统计信息
  const stats = useMemo(() => ({
    recordCount: actualRecords.length,
    fieldCount: actualFields.length,
    lastUpdated
  }), [actualRecords.length, actualFields.length, lastUpdated])
  
  // 合并加载状态
  const loading = recordsLoading || mutationLoading
  
  return {
    // 数据
    gridData,
    records: actualRecords,
    fields: actualFields,
    
    // 状态
    loading,
    error,
    isConnected,
    
    // 操作
    onCellChange,
    refreshData,
    
    // 统计
    stats
  }
}

/**
 * 简化的 useGridData Hook，用于快速测试
 */
export function useSimpleGridData(tableId: string, useTestData = false) {
  return useGridData({
    tableId,
    enableRealtime: true,
    useTestData
  })
}

/**
 * 只读的 useGridData Hook，不支持编辑
 */
export function useReadOnlyGridData(tableId: string, viewId?: string) {
  const result = useGridData({
    tableId,
    viewId,
    enableRealtime: true
  })
  
  // 返回只读版本
  return {
    ...result,
    onCellChange: async () => {
      console.warn('只读模式，不支持编辑')
    }
  }
}
