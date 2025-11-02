/**
 * TableDemo 组件 - 主表格演示组件
 * 集成Grid组件,处理单元格编辑、字段/记录操作
 */

import React, { useMemo, useCallback, useRef } from 'react'
import { Grid, type IGridColumn, type ICell, type ICellItem } from '@easygrid/aitable/grid'
import { Plus, Settings, RefreshCw } from 'lucide-react'
import { useTableData, type Field, type Record } from '../hooks/useTableData'
import { useRealtimeSync } from '../hooks/useRealtimeSync'
import { ConnectionStatus } from './ConnectionStatus'
import { config } from '../config'

export interface TableDemoProps {
  sdk: any
  tableId: string
}

export function TableDemo({ sdk, tableId }: TableDemoProps) {
  const gridRef = useRef<any>(null)
  
  // 表格数据管理
  const {
    fields,
    records,
    isLoading,
    error,
    refreshData,
    addRecord,
    updateRecord,
    addField
  } = useTableData(sdk, tableId)

  // 实时同步
  const { state: connectionState, subscribeToRecord, updateRecordField } = useRealtimeSync(sdk)

  // 将字段转换为Grid列定义
  const columns: IGridColumn[] = useMemo(() => {
    return fields.map(field => ({
      id: field.id,
      name: field.name,
      type: field.type,
      width: config.grid.columnWidth
    }))
  }, [fields])

  // 获取单元格内容
  const getCellContent = useCallback((cell: ICellItem): ICell => {
    const [colIndex, rowIndex] = cell
    
    console.log('🔍 getCellContent 调试:', {
      cell,
      colIndex,
      rowIndex,
      recordsLength: records.length,
      columnsLength: columns.length,
      record: records[rowIndex],
      field: columns[colIndex]
    })
    
    if (rowIndex >= records.length || colIndex >= columns.length) {
      return {
        type: 'text',
        data: '',
        displayData: ''
      }
    }

    const field = columns[colIndex]
    const record = records[rowIndex]
    
    // 安全检查：确保record和record.fields存在
    if (!record || !record.fields) {
      console.log('⚠️ 记录或字段为空:', { record, field })
      return {
        type: 'text',
        data: '',
        displayData: ''
      }
    }
    
    const value = record.fields[field.id] || ''
    console.log('📊 单元格值:', { fieldId: field.id, fieldName: field.name, value })

    return {
      type: field.type as any || 'text',
      data: value,
      displayData: String(value)
    }
  }, [records, columns])

  // 处理单元格编辑
  const handleCellEdited = useCallback(async (cell: ICellItem, value: any) => {
    const [colIndex, rowIndex] = cell
    
    if (rowIndex >= records.length || colIndex >= columns.length) return

    const field = columns[colIndex]
    const record = records[rowIndex]
    
    // 安全检查
    if (!field || !record || !record.fields) {
      console.warn('⚠️ 无效的单元格编辑:', { field, record })
      return
    }

    // 乐观更新 - 先更新UI
    console.log('📝 单元格编辑:', field.name, value)

    // 通过ShareDB更新
    const success = await updateRecordField(record.id, field.id, value)
    
    if (!success) {
      // 如果ShareDB更新失败，回退到HTTP API
      await updateRecord(record.id, { [field.id]: value })
    }
  }, [records, columns, updateRecordField, updateRecord])

  // 添加新记录
  const handleAddRecord = useCallback(async () => {
    const newFields: Record<string, any> = {}
    
    // 为每个字段设置默认值
    fields.forEach(field => {
      switch (field.type) {
        case 'text':
          newFields[field.id] = ''
          break
        case 'number':
          newFields[field.id] = 0
          break
        case 'checkbox':
          newFields[field.id] = false
          break
        default:
          newFields[field.id] = ''
      }
    })

    await addRecord(newFields)
  }, [fields, addRecord])

  // 添加新字段
  const handleAddField = useCallback(async () => {
    const fieldName = prompt('请输入字段名称:')
    if (!fieldName) return

    await addField({
      name: fieldName,
      type: 'text'
    })
  }, [addField])

  // 订阅记录实时更新
  React.useEffect(() => {
    if (connectionState === 'connected') {
      records.forEach(record => {
        subscribeToRecord(record.id, (data) => {
          console.log('📡 收到记录实时更新:', record.id, data)
          // 这里可以触发数据刷新
          refreshData()
        })
      })
    }
  }, [connectionState, records, subscribeToRecord, refreshData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600">加载表格数据中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-2">❌ 加载失败</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            表格演示 - {records.length} 条记录
          </h2>
          <ConnectionStatus state={connectionState} />
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddRecord}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            <span>添加记录</span>
          </button>
          
          <button
            onClick={handleAddField}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>添加字段</span>
          </button>
          
          <button
            onClick={refreshData}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* Grid 表格 */}
      <div className="flex-1 min-h-0">
        <Grid
          ref={gridRef}
          columns={columns}
          rowCount={records.length}
          rowHeight={config.grid.rowHeight}
          freezeColumnCount={config.grid.freezeColumnCount}
          getCellContent={getCellContent}
          onCellEdited={handleCellEdited}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
        <div>
          字段: {fields.length} | 记录: {records.length}
        </div>
        <div>
          连接状态: {connectionState}
        </div>
      </div>
    </div>
  )
}
