import React, { useState, useEffect } from 'react'
import { useLuckDB } from '../context/LuckDBContext'
import LoginForm from './LoginForm'
import DataTable from './DataTable'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

const RealtimeTable: React.FC = () => {
  const { isLoggedIn, isConnected, user, error, sdk } = useLuckDB()
  const [isLoading, setIsLoading] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [debugMessages, setDebugMessages] = useState<any[]>([])
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  
  // 真实表配置
  const tableId = 'tbl_oz9EbQgbTZBuF7FSSJvet'
  const testRecordId = 'test_record_001' // 我们将使用第一个已存在的记录
  const [testFieldId, setTestFieldId] = useState<string>('fld_test_001') // 动态设置字段ID

  // 添加调试消息
  const addDebugMessage = (type: 'send' | 'receive', message: any) => {
    const debugMessage = {
      id: Date.now() + Math.random(),
      type,
      timestamp: new Date().toLocaleTimeString(),
      message: JSON.parse(JSON.stringify(message)) // 深拷贝
    }
    setDebugMessages(prev => [debugMessage, ...prev.slice(0, 49)]) // 保留最近50条
  }



  useEffect(() => {
    if (isLoggedIn && sdk) {
      // 不设置初始记录，直接订阅获取真实数据
      subscribeToRecord()
    }
  }, [isLoggedIn, sdk, tableId, testRecordId, testFieldId])

  // 订阅记录
  const subscribeToRecord = async () => {
    if (!sdk || !isLoggedIn) return

    try {
      console.log('开始订阅记录:', testRecordId)
      console.log('tableId:', tableId)
      console.log('testFieldId:', testFieldId)
      
      // 先获取表中的记录列表
      try {
        const recordsList = await sdk.listRecords({ tableId })
        console.log('表中的记录:', recordsList)
        
        if (recordsList.data && recordsList.data.length > 0) {
          const firstRecord = recordsList.data[0]
          console.log('使用第一个记录:', firstRecord.id)
          console.log('记录的真实数据:', firstRecord)
          console.log('记录的字段数据:', (firstRecord as any).fields)
          console.log('记录的 data 字段:', firstRecord.data)
          
          // 更新记录 ID 为第一个已存在的记录
          const actualRecordId = firstRecord.id
          
              // 找到第一个数值类型的字段作为测试字段
              const fields = firstRecord.data || {}
              const numericFieldId = Object.keys(fields).find(fieldId => {
                const value = fields[fieldId]
                // 检查是否是数字类型，或者可以转换为数字的字符串
                return typeof value === 'number' || (!isNaN(parseInt(value)) && !isNaN(parseFloat(value)))
              }) || Object.keys(fields)[0] || 'fld_test_001'
          
          console.log('找到的数值字段:', numericFieldId)
          setTestFieldId(numericFieldId)
          
          // 使用真实的数据库记录数据
          const realRecord = {
            id: actualRecordId,
            name: fields.name || fields.title || '记录 ' + actualRecordId.slice(-4),
            value: fields[numericFieldId], // 直接使用原始值，不转换为数字
            status: 'active',
            fields: fields
          }
          
          console.log('转换后的记录数据:', realRecord)
          setRecords([realRecord])
          
          // 使用 SDK 的实时记录功能
          const recordClient = sdk.realtime.record(tableId, actualRecordId)
          
          // 监听字段变化
          recordClient.on('change', (fieldId: string, newValue: any) => {
            console.log('收到字段变化:', { fieldId, newValue })
            addDebugMessage('receive', { type: 'field_change', fieldId, newValue })
            if (fieldId === testFieldId) {
              setRecords(prev => prev.map(record => 
                record.id === actualRecordId 
                  ? { 
                      ...record, 
                      fields: { 
                        ...record.fields, 
                        [testFieldId]: newValue 
                      },
                      value: newValue // 直接使用新值，不转换为数字
                    }
                  : record
              ))
            }
          })

          setIsSubscribed(true)
          console.log('记录订阅成功')
          return
        }
      } catch (listErr) {
        console.log('获取记录列表失败:', listErr)
      }
      
      // 如果获取记录列表失败，跳过记录创建，直接使用现有记录进行测试
      console.log('跳过记录创建，直接订阅现有记录')
      
      // 使用 SDK 的实时记录功能
      const recordClient = sdk.realtime.record(tableId, testRecordId)
      
      // 监听字段变化
      recordClient.on('change', (fieldId: string, newValue: any) => {
        console.log('收到字段变化:', { fieldId, newValue })
        addDebugMessage('receive', { type: 'field_change', fieldId, newValue })
        if (fieldId === testFieldId) {
          setRecords(prev => prev.map(record => 
            record.id === testRecordId 
              ? { 
                  ...record, 
                  fields: { 
                    ...record.fields, 
                    [testFieldId]: newValue 
                  },
                  value: parseInt(newValue) || 0
                }
              : record
          ))
        }
      })

      setIsSubscribed(true)
      console.log('记录订阅成功')
    } catch (err) {
      console.error('订阅记录失败:', err)
    }
  }

  const handleIncrement = async (recordId: string) => {
    if (!isLoggedIn || !sdk || !isSubscribed) return
    
    setIsLoading(true)
    try {
      console.log('开始更新记录:', recordId)
      
      // 使用 SDK 的实时记录功能更新字段
      const recordClient = sdk.realtime.record(tableId, recordId)
      const currentRecord = records.find(r => r.id === recordId)
      const fieldValue = currentRecord?.fields?.[testFieldId]
      
      // 检查字段类型并生成新值
      let newValue: any;
      
      if (fieldValue && typeof fieldValue === 'string' && fieldValue.includes('T')) {
        // 日期字段：增加一天
        const currentDate = new Date(fieldValue);
        currentDate.setDate(currentDate.getDate() + 1);
        newValue = currentDate.toISOString();
      } else if (typeof fieldValue === 'number' || !isNaN(parseInt(fieldValue))) {
        // 数字字段：增加1
        newValue = (parseInt(fieldValue) + 1).toString();
      } else {
        // 其他类型：转换为数字后增加1
        const currentValue = currentRecord?.value || 0;
        newValue = (currentValue + 1).toString();
      }
      
      console.log('更新字段值:', { fieldId: testFieldId, oldValue: fieldValue, newValue })
      addDebugMessage('send', { type: 'field_update', fieldId: testFieldId, oldValue: fieldValue, newValue })
      
      await recordClient.set(testFieldId, newValue)
      
      console.log('字段更新成功')
    } catch (err) {
      console.error('更新失败:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!sdk || !isLoggedIn) return
    
    try {
      console.log('重置记录值')
      const recordClient = sdk.realtime.record(tableId, records[0]?.id || testRecordId)
      
      // 根据字段类型设置重置值
      const fieldValue = records[0]?.fields?.[testFieldId];
      let resetValue: any;
      
      if (fieldValue && typeof fieldValue === 'string' && fieldValue.includes('T')) {
        // 日期字段：重置为原始日期
        resetValue = fieldValue;
      } else {
        // 数字字段：重置为0
        resetValue = '0';
      }
      
      await recordClient.set(testFieldId, resetValue)
      // 重新获取数据以确保UI与数据库同步
      await subscribeToRecord()
      setDebugMessages([]) // 清空调试信息
      console.log('数据已重置')
    } catch (err) {
      console.error('重置失败:', err)
    }
  }

  if (!isLoggedIn) {
    return <LoginForm />
  }

  return (
    <div className="space-y-6">
      {/* 状态栏 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">实时数据表格</h2>
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="w-4 h-4 mr-1" />
                  <span className="text-sm">已连接</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <WifiOff className="w-4 h-4 mr-1" />
                  <span className="text-sm">未连接</span>
                </div>
              )}
              
              {isSubscribed ? (
                <div className="flex items-center text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-1"></div>
                  <span className="text-sm">已订阅</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                  <span className="text-sm">未订阅</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重置数据
            </button>
            
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                showDebugPanel 
                  ? 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100' 
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              {showDebugPanel ? '隐藏调试' : '显示调试'}
            </button>
            
            <div className="text-sm text-gray-500">
              用户: {user?.name || user?.email}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* 说明卡片 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">实时协作演示</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 使用真实表数据: <code className="bg-blue-100 px-1 rounded">{tableId}</code></li>
          <li>• 点击"增加"按钮更新字段 <code className="bg-blue-100 px-1 rounded">{testFieldId}</code> 的值</li>
          <li>• 数据会保存到数据库并通过 ShareDB 实时广播</li>
          <li>• 打开另一个浏览器标签页查看实时同步效果</li>
          <li>• 所有更改都会实时同步到其他客户端</li>
        </ul>
      </div>

      {/* 数据表格 */}
      <DataTable 
        records={records} 
        onIncrement={handleIncrement}
        isLoading={isLoading}
      />

      {/* 调试面板 */}
      {showDebugPanel && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">ShareDB 调试信息</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {debugMessages.length === 0 ? (
              <p className="text-sm text-gray-500">暂无调试信息</p>
            ) : (
              debugMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-md text-sm ${
                    msg.type === 'send' 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${
                      msg.type === 'send' ? 'text-blue-700' : 'text-green-700'
                    }`}>
                      {msg.type === 'send' ? '📤 发送' : '📥 接收'}
                    </span>
                    <span className="text-xs text-gray-500">{msg.timestamp}</span>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(msg.message, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RealtimeTable
