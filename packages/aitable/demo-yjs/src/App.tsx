/**
 * App 组件 - 主应用组件
 * 整合登录、表格视图、工具栏等组件
 */

import React from 'react'
import { LogOut, User } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'
import { TableDemo } from './components/TableDemo'
import { config } from './config'

export default function App() {
  const { isLoggedIn, isLoading, user, login, logout, error, clearError, sdk } = useAuth()

  // 处理登录
  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    const success = await login(email, password)
    if (success) {
      clearError()
    }
    return success
  }

  // 处理登出
  const handleLogout = () => {
    logout()
  }

  // 显示登录页面
  if (!isLoggedIn) {
    return (
      <LoginForm 
        onLogin={handleLogin}
        isLoading={isLoading}
        error={error}
      />
    )
  }

  // 显示主应用
  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">EG</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">EasyGrid Demo</h1>
            <p className="text-xs text-gray-500">实时协作表格演示</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* 用户信息 */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{user?.name}</span>
            <span className="text-gray-400">({user?.email})</span>
          </div>

          {/* 登出按钮 */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>登出</span>
          </button>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="flex-1 min-h-0">
        {sdk && (
          <TableDemo
          sdk={sdk}
            tableId={config.testTable.tableId}
          />
        )}
      </main>

      {/* 底部状态栏 */}
      <footer className="h-8 bg-gray-100 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>API: {config.baseURL}</span>
          <span>表格: {config.testTable.tableId}</span>
        </div>
        <div>
          <span>EasyGrid Demo v2.0.0</span>
      </div>
      </footer>
    </div>
  )
}