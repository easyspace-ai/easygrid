/**
 * Canvas 表格视图组件
 * 使用新 SDK Hooks + @easygrid/aitable 的 Canvas 表格
 */

import React, { useMemo, useCallback, useState } from 'react'
import { Grid, type IGridRef } from '@easygrid/aitable'
import { useGridData } from '../hooks/useGridData'
import { config } from '../config'

export interface TableViewProps {
  tableId: string
  viewId?: string
}

export default function TableView({ tableId, viewId }: TableViewProps) {
  const [gridRef, setGridRef] = useState<IGridRef | null>(null)
  
  // 使用新 SDK 的 Hooks 获取数据
  const {
    gridData,
    loading,
    error,
    isConnected,
    onCellChange,
    refreshData,
    stats
  } = useGridData({
    tableId,
    viewId,
    enableRealtime: true,
    useTestData: false // 使用真实数据
  })

  // 处理单元格变更
  const handleCellChange = useCallback(async (change: any) => {
    console.log('Canvas 表格单元格变更:', change)
    
    try {
      await onCellChange({
        rowId: change.rowId || change.recordId,
        columnId: change.columnId || change.fieldId,
        oldValue: change.oldValue,
        newValue: change.newValue
      })
    } catch (err) {
      console.error('单元格变更处理失败:', err)
    }
  }, [onCellChange])

  // 处理行添加
  const handleAddRow = useCallback(() => {
    console.log('添加新行')
    // 这里可以调用 SDK 的添加记录方法
  }, [])

  // 处理列添加
  const handleAddColumn = useCallback(() => {
    console.log('添加新列')
    // 这里可以调用 SDK 的添加字段方法
  }, [])

  // 处理行删除
  const handleDeleteRow = useCallback((rowId: string) => {
    console.log('删除行:', rowId)
    // 这里可以调用 SDK 的删除记录方法
  }, [])

  // 处理列删除
  const handleDeleteColumn = useCallback((columnId: string) => {
    console.log('删除列:', columnId)
    // 这里可以调用 SDK 的删除字段方法
  }, [])

  // 处理列配置
  const handleColumnConfig = useCallback((columnId: string) => {
    console.log('配置列:', columnId)
    // 这里可以打开列配置对话框
  }, [])

  // 处理搜索
  const handleSearch = useCallback((query: string) => {
    console.log('搜索:', query)
    // 这里可以实现搜索功能
  }, [])

  // 处理排序
  const handleSort = useCallback((columnId: string, direction: 'asc' | 'desc') => {
    console.log('排序:', columnId, direction)
    // 这里可以实现排序功能
  }, [])

  // 处理筛选
  const handleFilter = useCallback((columnId: string, filter: any) => {
    console.log('筛选:', columnId, filter)
    // 这里可以实现筛选功能
  }, [])

  // 处理选择
  const handleSelection = useCallback((selection: any) => {
    console.log('选择变更:', selection)
  }, [])

  // 处理滚动
  const handleScroll = useCallback((scrollState: any) => {
    // console.log('滚动:', scrollState)
  }, [])

  // 处理协作
  const handleCollaboration = useCallback((collaboration: any) => {
    console.log('协作事件:', collaboration)
  }, [])

  // 处理错误
  const handleError = useCallback((error: Error) => {
    console.error('Canvas 表格错误:', error)
  }, [])

  // 处理加载状态
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">加载表格数据中...</p>
          <p className="text-sm text-gray-500 mt-1">
            记录数: {stats.recordCount} | 字段数: {stats.fieldCount}
          </p>
        </div>
      </div>
    )
  }

  // 处理错误状态
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
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

  // 处理空数据
  if (stats.recordCount === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无数据</h3>
          <p className="text-gray-600 mb-4">表格中没有记录，请添加一些数据</p>
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            添加记录
          </button>
        </div>
      </div>
    )
  }

  // 渲染 Canvas 表格
  return (
    <div className="h-full w-full bg-white">
      {/* 表格工具栏 */}
      <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              记录: {stats.recordCount} | 字段: {stats.fieldCount}
            </span>
            {stats.lastUpdated && (
              <span className="text-xs text-gray-500">
                最后更新: {stats.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              添加行
            </button>
            <button
              onClick={handleAddColumn}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              添加列
            </button>
            <button
              onClick={refreshData}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* Canvas 表格 */}
      <div className="h-full">
        <Grid
          ref={setGridRef}
          data={gridData}
          theme={config.gridConfig}
          onCellChange={handleCellChange}
          onAddRow={handleAddRow}
          onAddColumn={handleAddColumn}
          onDeleteRow={handleDeleteRow}
          onDeleteColumn={handleDeleteColumn}
          onColumnConfig={handleColumnConfig}
          onSearch={handleSearch}
          onSort={handleSort}
          onFilter={handleFilter}
          onSelection={handleSelection}
          onScroll={handleScroll}
          onCollaboration={handleCollaboration}
          onError={handleError}
          // Canvas 表格配置
          rowControls={[
            {
              type: 'drag',
              visible: true
            },
            {
              type: 'menu',
              visible: true
            }
          ]}
          collaborators={isConnected ? {
            users: [],
            cursors: []
          } : undefined}
          smoothScrollX={true}
          smoothScrollY={true}
          scrollBarVisible={true}
          rowIndexVisible={true}
          // 搜索配置
          searchCursor={null}
          searchHitIndex={[]}
          // 拖拽配置
          draggableType="all"
          selectableType="all"
          // 性能配置
          scrollBufferX={100}
          scrollBufferY={100}
        />
      </div>

      {/* 调试信息 */}
      {config.debug && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>连接状态: {isConnected ? '✅' : '❌'}</div>
          <div>记录数: {stats.recordCount}</div>
          <div>字段数: {stats.fieldCount}</div>
          <div>表格ID: {tableId}</div>
          {viewId && <div>视图ID: {viewId}</div>}
        </div>
      )}
    </div>
  )
}
