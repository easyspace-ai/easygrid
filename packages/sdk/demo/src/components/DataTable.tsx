import React from 'react'
import { Plus, CheckCircle, Clock } from 'lucide-react'

interface Record {
  id: string
  name: string
  value: number
  status: string
}

interface DataTableProps {
  records: Record[]
  onIncrement: (recordId: string) => void
  isLoading: boolean
}

const DataTable: React.FC<DataTableProps> = ({ records, onIncrement, isLoading }) => {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          实时数据表格
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          点击"增加"按钮来测试实时同步功能
        </p>
      </div>
      
      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                记录名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                数值
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record, index) => (
              <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {record.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {record.value}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    {record.status === 'active' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-700">活跃</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="text-yellow-700">等待中</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onIncrement(record.id)}
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {isLoading ? '处理中...' : '增加'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {records.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">暂无数据</div>
        </div>
      )}
    </div>
  )
}

export default DataTable
