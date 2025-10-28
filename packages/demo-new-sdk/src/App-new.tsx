/**
 * 重构后的 Demo - 使用新的 SDK API
 * 展示乐观更新、实时同步、错误处理等功能
 */

import React, { useState, useEffect, useCallback } from 'react'
import { initEasyGridSDK, useEasyGrid, SDKErrorHandler } from '@easygrid/sdk'
import { StandardDataViewV3 } from '@easygrid/aitable'

// 初始化 SDK
const sdk = initEasyGridSDK({
  baseURL: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080/socket',
  debug: true
})

// 设置错误处理器
SDKErrorHandler.setToastHandler((message: string, type: 'error' | 'warning' | 'info') => {
  console.log(`[${type.toUpperCase()}] ${message}`)
})

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [tableId] = useState('your-table-id') // 替换为实际的表格 ID

  // 使用新的 useEasyGrid Hook
  const { 
    records, 
    fields, 
    loading, 
    error, 
    isConnected, 
    updateRecord, 
    createRecord, 
    deleteRecord,
    stats 
  } = useEasyGrid({ 
    tableId,
    viewId: 'default-view' // 可选
  })

  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem('easygrid_token')
    const userInfo = localStorage.getItem('easygrid_user')
    
    if (token && userInfo) {
      try {
        const user = JSON.parse(userInfo)
        setUser(user)
        setIsLoggedIn(true)
        
        // 更新 SDK 配置
        sdk.updateConfig({ accessToken: token })
        
        // 连接 ShareDB
        sdk.connectShareDB().catch(console.error)
      } catch (error) {
        console.error('登录状态恢复失败:', error)
        localStorage.removeItem('easygrid_token')
        localStorage.removeItem('easygrid_user')
      }
    }
  }, [])

  // 登录处理
  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const response = await sdk.auth.login({ email, password })
      
      if (response.accessToken) {
        // 保存登录状态
        localStorage.setItem('easygrid_token', response.accessToken)
        localStorage.setItem('easygrid_user', JSON.stringify(response.user))
        
        setUser(response.user)
        setIsLoggedIn(true)
        
        // 更新 SDK 配置
        sdk.updateConfig({ accessToken: response.accessToken })
        
        // 连接 ShareDB
        await sdk.connectShareDB()
        
        console.log('✅ 登录成功，ShareDB 已连接')
      }
    } catch (error) {
      console.error('❌ 登录失败:', error)
      SDKErrorHandler.handleConnectionError(error)
    }
  }, [])

  // 登出处理
  const handleLogout = useCallback(() => {
    sdk.logout()
    localStorage.removeItem('easygrid_token')
    localStorage.removeItem('easygrid_user')
    setUser(null)
    setIsLoggedIn(false)
  }, [])

  // 单元格编辑处理（乐观更新）
  const handleCellEdit = useCallback(async (recordId: string, fieldId: string, value: any) => {
    try {
      // 使用新的乐观更新 API
      await updateRecord(recordId, fieldId, value)
      console.log(`✅ 字段 ${fieldId} 更新成功:`, value)
    } catch (error) {
      console.error(`❌ 字段 ${fieldId} 更新失败:`, error)
      // 错误处理器会自动显示错误提示和回滚
    }
  }, [updateRecord])

  // 创建记录
  const handleCreateRecord = useCallback(async () => {
    try {
      const newRecord = await createRecord({
        // 添加默认字段值
        name: '新记录',
        description: '这是一个新创建的记录'
      })
      console.log('✅ 记录创建成功:', newRecord)
    } catch (error) {
      console.error('❌ 记录创建失败:', error)
    }
  }, [createRecord])

  // 删除记录
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    try {
      await deleteRecord(recordId)
      console.log('✅ 记录删除成功:', recordId)
    } catch (error) {
      console.error('❌ 记录删除失败:', error)
    }
  }, [deleteRecord])

  // 登录表单
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">EasyGrid Demo</h2>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部工具栏 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">EasyGrid Demo</h1>
              <ConnectionStatus isConnected={isConnected} />
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {stats.recordCount} 条记录, {stats.fieldCount} 个字段
              </div>
              <button
                onClick={handleCreateRecord}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                新建记录
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-600">加载中...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">
              错误: {error.message}
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow">
            <CanvasTable
              records={records}
              fields={fields}
              onCellEdit={handleCellEdit}
              onDeleteRecord={handleDeleteRecord}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// 登录表单组件
function LoginForm({ onLogin }: { onLogin: (email: string, password: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await onLogin(email, password)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  )
}

// 连接状态组件
function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm text-gray-600">
        {isConnected ? '已连接' : '未连接'}
      </span>
    </div>
  )
}

// Canvas 表格组件
function CanvasTable({ 
  records, 
  fields, 
  onCellEdit, 
  onDeleteRecord 
}: {
  records: any[]
  fields: any[]
  onCellEdit: (recordId: string, fieldId: string, value: any) => void
  onDeleteRecord: (recordId: string) => void
}) {
  // 转换数据格式
  const gridData = {
    columns: fields.map(field => ({
      id: field.id,
      name: field.name,
      type: field.type,
      width: 150
    })),
    rows: records.map(record => ({
      id: record.id,
      cells: fields.reduce((cells, field) => {
        cells[field.id] = record.getFieldValue ? record.getFieldValue(field.id) : record.fields?.[field.id]
        return cells
      }, {} as any)
    }))
  }

  return (
    <div className="h-96">
      <StandardDataViewV3
        data={gridData}
        onCellEdit={(recordId: string, fieldId: string, value: any) => {
          onCellEdit(recordId, fieldId, value)
        }}
        onDeleteRecord={onDeleteRecord}
      />
    </div>
  )
}

export default App

