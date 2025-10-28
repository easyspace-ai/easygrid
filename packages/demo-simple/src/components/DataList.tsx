import React, { useState } from 'react'
import { useInstances, Record, IRecord } from '@easygrid/sdk'

interface DataListProps {
  onLogout: () => void
}

export const DataList: React.FC<DataListProps> = ({ onLogout }) => {
  // 使用新的 useInstances hook
  const { instances, loading, error } = useInstances<IRecord>({
    collection: 'records_tbl_oz9EbQgbTZBuF7FSSJvet',
    factory: (data: IRecord) => new Record(data, undefined as any, {}, () => {}),
    queryParams: { tableId: 'tbl_oz9EbQgbTZBuF7FSSJvet' }
  })

  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldId: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleCellClick = (recordId: string, fieldId: string, currentValue: string) => {
    setEditingCell({ recordId, fieldId })
    setEditValue(currentValue)
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    try {
      // 找到对应的记录实例
      const record = instances.find(r => r.id === editingCell.recordId)
      if (record) {
        await record.updateFields({ [editingCell.fieldId]: editValue }, { skipValidation: true })
        setEditingCell(null)
        setEditValue('')
      }
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave()
    } else if (e.key === 'Escape') {
      handleCellCancel()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">加载失败</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  // 直接使用API返回的字段数据，不依赖getFieldMap
  const fields = instances.length > 0 ? 
    [
      { id: 'fld_3cyqXpvTvDAxJLgXbhZVz', name: '单选', type: 'select' },
      { id: 'fld_4WTVpmyB0poMV85GGMVSr', name: 'abc', type: 'text' },
      { id: 'fld_6nZpw5SheOU6k4joX4VH4', name: '日期', type: 'date' },
      { id: 'fld_Z6W8SAQs2ZKrCcmVi0Qys', name: '文本', type: 'text' }
    ] : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">EasyGrid Demo</h1>
              <div className="ml-4 flex items-center">
                <div className="w-3 h-3 rounded-full mr-2 bg-green-500"></div>
                <span className="text-sm text-gray-600">已连接</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              登出
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 字段信息卡片 */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">字段信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields?.map((field) => (
              <div key={field.id} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-medium text-gray-900">{field.name}</h3>
                <p className="text-sm text-gray-500 mt-1">ID: {field.id}</p>
                <p className="text-sm text-gray-500">类型: {field.type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 记录列表 */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            数据记录 ({instances?.length || 0} 条)
          </h2>
          
          {!instances || instances.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">暂无数据</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        记录ID
                      </th>
                      {fields?.map((field) => (
                        <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {instances.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.id}
                        </td>
                        {fields?.map((field) => {
                          const value = record?.fields?.[field.id] || ''
                          const isEditing = editingCell?.recordId === record.id && editingCell?.fieldId === field.id
                          
                          return (
                            <td key={field.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyDown}
                                  className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellClick(record.id, field.id, value)}
                                  className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                                  title="点击编辑"
                                >
                                  {value || <span className="text-gray-400 italic">空</span>}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 点击任意字段值进行编辑</li>
            <li>• 按 Enter 保存，按 Escape 取消</li>
            <li>• 失焦自动保存</li>
            <li>• 使用 ShareDB 官方客户端实现实时同步</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
