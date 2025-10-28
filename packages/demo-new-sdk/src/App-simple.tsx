/**
 * 超级简洁的 Demo - 重新设计
 * 所有复杂逻辑都在 SDK 中处理，Demo 只需要几行代码
 */

import React, { useState } from 'react'
import { EasyGridProvider, useEasyGrid } from '@easygrid/sdk'
import { Grid } from '@easygrid/aitable'

// 超级简洁的登录组件
function SimpleLogin({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [email, setEmail] = useState('admin@126.com')
  const [password, setPassword] = useState('Pmker123')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      // 使用 SDK 的登录功能
      const { token, user } = await window.easyGridSDK.auth.login({ email, password })
      onLogin(token, user)
    } catch (error) {
      console.error('登录失败:', error)
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

// 超级简洁的表格组件
function SimpleTable() {
  const { 
    tableData, 
    loading, 
    error, 
    isConnected,
    updateCell 
  } = useEasyGrid({
    tableId: 'tbl_Pweb3NpbtiUb4Fwbi90WP',
    viewId: 'viw_FXNR0EDAlNxhxOIPylHZy'
  })

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg">加载失败</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 状态栏 */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">EasyGrid Demo</h1>
          <div className={`px-2 py-1 rounded text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? '已连接' : '未连接'}
          </div>
        </div>
      </div>

      {/* Canvas 表格 */}
      <div className="flex-1">
        <Grid
          data={tableData}
          onCellChange={updateCell}
          // 所有配置都在 SDK 中处理
        />
      </div>
    </div>
  )
}

// 超级简洁的主应用
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const handleLogin = (accessToken: string, user: any) => {
    setToken(accessToken)
    setIsLoggedIn(true)
  }

  if (!isLoggedIn) {
    return <SimpleLogin onLogin={handleLogin} />
  }

  return (
    <EasyGridProvider
      config={{
        wsUrl: 'ws://localhost:8080/socket',
        accessToken: token!,
        debug: true
      }}
    >
      <SimpleTable />
    </EasyGridProvider>
  )
}

export default App
