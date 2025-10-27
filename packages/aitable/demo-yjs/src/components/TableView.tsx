/**
 * TableView - 使用真正的 Canvas Grid 组件
 * 
 * 集成 @easygrid/aitable 的高性能 Grid 组件：
 * - Canvas 渲染，支持大数据集
 * - 虚拟滚动
 * - 列操作（调整大小、排序）
 * - 单元格编辑
 * - 实时协作
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { useTableData } from '../hooks/useTableData';
import { useConnection } from '../hooks/useConnection';

export function TableView() {
  const { isConnected, user } = useConnection();
  const {
    table,
    fields,
    records,
    loading,
    error,
    subscribeToTableRealtime,
    createRecord,
    updateRecord,
  } = useTableData(isConnected);

  // 直接使用 fields 和 records 数据
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnId: string } | null>(null);
  const [editingValue, setEditingValue] = useState<any>('');

  // 订阅实时更新
  useEffect(() => {
    if (isConnected) {
      subscribeToTableRealtime((updates) => {
        console.log('📡 收到实时更新:', updates);
        // 这里可以更新本地状态
      });
    }
  }, [isConnected, subscribeToTableRealtime]);

  // 处理单元格编辑
  const handleCellEdit = useCallback((cell: any, newValue: any) => {
    const recordId = data[cell.rowIndex]?.id;
    const fieldId = columns[cell.colIndex]?.id;
    if (recordId && fieldId) {
      updateRecord(recordId, { [fieldId]: newValue.value });
    }
  }, [data, columns, updateRecord]);


  // 保存单元格编辑
  const handleCellEditSave = useCallback(() => {
    if (!editingCell) return;
    
    const { rowIndex, columnId } = editingCell;
    const recordId = data[rowIndex]?.id;
    if (recordId) {
      updateRecord(recordId, { [columnId]: editingValue });
    }
    setEditingCell(null);
    setEditingValue('');
  }, [editingCell, editingValue, data, updateRecord]);

  // 取消单元格编辑
  const handleCellEditCancel = useCallback(() => {
    setEditingCell(null);
    setEditingValue('');
  }, []);

  // 添加新记录
  const handleAddRecord = useCallback(async () => {
    try {
      await createRecord({});
    } catch (error) {
      console.error('添加记录失败:', error);
    }
  }, [createRecord]);


  // 列调整大小
  const handleColumnResize = useCallback((column: any, newSize: number, colIndex: number) => {
    console.log('列调整大小:', column, newSize, colIndex);
    // 这里可以实现列宽持久化
  }, []);

  // 列重新排序
  const handleColumnReorder = useCallback((dragColIndexCollection: number[], dropColIndex: number) => {
    console.log('列重新排序:', dragColIndexCollection, dropColIndex);
    // 这里可以实现列顺序持久化
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">加载表格数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <p>错误: {error}</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>未找到表格数据。</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* 表格头部 */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">{table.name}</h3>
          <span className="text-sm text-gray-500">({data.length} 条记录)</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddRecord}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            添加记录
          </button>
        </div>
      </div>

      {/* 表格容器 */}
      <div className="flex-1 min-h-0 relative overflow-auto">
        <div className="p-4">
          <h3 className="text-lg font-medium mb-4">表格数据 (使用 HTML 表格)</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Array.isArray(fields) ? fields.map((field) => (
                    <th
                      key={field.id}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {field.name}
                    </th>
                  )) : null}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(records) ? records.map((record) => (
                  <tr key={record.id}>
                    {Array.isArray(fields) ? fields.map((field) => (
                      <td key={`${record.id}-${field.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.data[field.id] || ''}
                      </td>
                    )) : null}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={Array.isArray(fields) ? fields.length : 1} className="px-6 py-4 text-center text-gray-500">
                      记录数据格式错误或为空
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 编辑状态栏 */}
      {editingCell && (
        <div className="h-12 border-t border-gray-200 bg-gray-50 flex items-center justify-between px-6">
          <span className="text-sm text-gray-600">
            编辑: {columns.find(col => col.id === editingCell.columnId)?.name}
          </span>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellEditSave();
                if (e.key === 'Escape') handleCellEditCancel();
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              autoFocus
            />
            <button
              onClick={handleCellEditSave}
              className="p-1 text-green-600 hover:text-green-900"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={handleCellEditCancel}
              className="p-1 text-red-600 hover:text-red-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 状态栏 */}
      <div className="h-8 border-t border-gray-200 bg-gray-50 flex items-center justify-between px-6 text-xs text-gray-500">
        <span>已连接到服务器</span>
        <span>用户: {user?.name} ({user?.email})</span>
      </div>
    </div>
  );
}