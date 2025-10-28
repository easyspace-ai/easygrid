/**
 * 超级简洁的 Demo - 使用增强的 SDK
 * 直接使用 SDK 的 useEasyGrid hook 实现实时表格
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { EasyGridProvider, useEasyGrid, ConnectionProvider, initEasyGridSDK, type LoginRequest } from '@easygrid/sdk'

// 超级简洁的登录组件
function SimpleLogin({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [email, setEmail] = useState('admin@126.com')
  const [password, setPassword] = useState('Pmker123')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      // 初始化 SDK
      const sdk = initEasyGridSDK({
        baseURL: 'http://localhost:8080',
        wsUrl: 'ws://localhost:8080/socket',
        debug: true
      })
      
      // 通过 SDK 登录（自动连接 WebSocket）
      const authResponse = await sdk.login({ email, password })
      
      // 传递 token 和用户信息给父组件
      onLogin(authResponse.accessToken, authResponse.user)
    } catch (error) {
      console.error('登录失败:', error)
      alert('登录失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">EasyGrid Demo</h1>
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg"
            placeholder="邮箱"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg"
            placeholder="密码"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 简单的表格组件
function SimpleTable({ onLogout }: { onLogout: () => void }) {
  const { 
    records, 
    fields, 
    loading, 
    error, 
    isConnected,
    updateRecord,
    stats
  } = useEasyGrid({
    tableId: 'tbl_Pweb3NpbtiUb4Fwbi90WP',
    viewId: 'viw_FXNR0EDAlNxhxOIPylHZy'
  })

  // 处理单元格编辑
  const handleCellEdit = useCallback(async (recordId: string, fieldId: string, newValue: any) => {
    console.log('🔧 准备更新:', { recordId, fieldId, value: newValue })
    
    try {
      await updateRecord(recordId, fieldId, newValue)
      console.log('✅ 单元格更新成功:', { fieldId, value: newValue })
    } catch (error) {
      console.error('❌ 单元格更新失败:', error)
      alert(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [updateRecord])

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">加载表格数据中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div className="text-center">
          <p className="text-lg font-medium">错误</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  // 如果未连接但有数据，显示数据（HTTP 模式）
  if (!isConnected && (!records || records.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">未连接</p>
          <p className="text-sm mt-1">请检查 WebSocket 连接</p>
        </div>
      </div>
    )
  }

  return (
          <div className="h-screen w-full">
            {/* 调试工具栏 */}
            <div className="p-2 flex items-center gap-2 bg-gray-50 border-b">
              <button 
                onClick={() => {
                  if (records && records.length > 0) {
                    const firstRecord = records[0]
                    const firstField = fields?.[0]
                    if (firstField) {
                handleCellEdit(firstRecord.id, firstField.id, `测试 ${Date.now()}`)
                    }
                  }
                }}
                className="px-2 py-1 border rounded text-sm"
                disabled={!records || records.length === 0}
              >
                测试更新第一条记录
              </button>
              <button 
                onClick={() => console.log('当前数据:', { records, fields, isConnected })}
                className="px-2 py-1 border rounded text-sm"
              >
                打印数据到控制台
              </button>
              <button 
                onClick={onLogout}
                className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                登出
              </button>
              <span className="text-sm text-gray-500">
                ShareDB: {isConnected ? '✅ 已连接' : '❌ 未连接'}
              </span>
            </div>
            
      {/* 表格内容 */}
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">实时表格数据</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>连接: 已连接</span>
                  </span>
                  <span>记录: {records?.length || 0}</span>
                  <span>字段: {fields?.length || 0}</span>
                </div>
        </div>

        {/* 字段列表 */}
        {fields && fields.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">字段列表</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {fields.map((field) => (
                <div key={field.id} className="p-2 border rounded bg-gray-50">
                  <div className="font-medium">{field.name}</div>
                  <div className="text-sm text-gray-500">类型: {field.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 记录列表 */}
        {records && records.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">记录列表</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {fields?.map((field) => (
                      <th key={field.id} className="border border-gray-300 px-2 py-1 text-left">
                        {field.name}
                      </th>
                    ))}
                    <th className="border border-gray-300 px-2 py-1 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 10).map((record) => (
                    <tr key={record.id}>
                      {fields?.map((field) => (
                        <td key={field.id} className="border border-gray-300 px-2 py-1">
                          <input
                            type="text"
                            value={record.data[field.id] || ''}
                            onChange={(e) => handleCellEdit(record.id, field.id, e.target.value)}
                            className="w-full border-none bg-transparent focus:outline-none focus:bg-blue-50"
                          />
                        </td>
                      ))}
                      <td className="border border-gray-300 px-2 py-1">
                        <button
                          onClick={() => handleCellEdit(record.id, fields?.[0]?.id || '', `更新 ${Date.now()}`)}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          更新
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                显示前 10 条记录，共 {records.length} 条
              </p>
            )}
          </div>
        )}

        {/* 空状态 */}
        {(!records || records.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <p>暂无数据</p>
          </div>
        )}
      </div>
    </div>
  )
}

// 主应用组件 - 处理登录状态
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  // 检查本地存储的登录状态
  useEffect(() => {
    const savedToken = localStorage.getItem('easygrid_token')
    const savedUser = localStorage.getItem('easygrid_user')
    
    if (savedToken && savedUser) {
      setToken(savedToken)
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogin = (accessToken: string, user: any) => {
    setToken(accessToken)
    setIsLoggedIn(true)
    
    // 保存到本地存储
    localStorage.setItem('easygrid_token', accessToken)
    localStorage.setItem('easygrid_user', JSON.stringify(user))
  }

  const handleLogout = () => {
    setToken(null)
    setIsLoggedIn(false)
    
    // 清除本地存储
    localStorage.removeItem('easygrid_token')
    localStorage.removeItem('easygrid_user')
  }

  // 如果未登录，显示登录表单
  if (!isLoggedIn || !token) {
    return <SimpleLogin onLogin={handleLogin} />
  }

  // 如果已登录，显示表格
  return <LoggedInApp token={token} onLogout={handleLogout} />
}

// 已登录的应用组件
function LoggedInApp({ token, onLogout }: { token: string; onLogout: () => void }) {
  return (
    <EasyGridProvider
      config={{
        wsUrl: 'ws://localhost:8080/socket',
        accessToken: token,
        debug: true
      }}
    >
      <ConnectionProvider
        config={{
          wsUrl: 'ws://localhost:8080/socket',
          accessToken: token,
          debug: true
        }}
      >
        <SimpleTable onLogout={onLogout} />
      </ConnectionProvider>
    </EasyGridProvider>
  )
}

export default App