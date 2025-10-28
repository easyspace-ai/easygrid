import { useState, useEffect } from 'react'
import { EasyGridProvider } from '@easygrid/sdk'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginForm } from './components/LoginForm'
import { DataList } from './components/DataList'

interface User {
  id: string
  email: string
  name?: string
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [, setUser] = useState<User | null>(null)

  // 检查本地存储的登录状态
  useEffect(() => {
    const savedToken = localStorage.getItem('easygrid_token')
    const savedUser = localStorage.getItem('easygrid_user')
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(userData)
        setIsLoggedIn(true)
      } catch (error) {
        console.error('恢复登录状态失败:', error)
        localStorage.removeItem('easygrid_token')
        localStorage.removeItem('easygrid_user')
      }
    }
  }, [])

  const handleLoginSuccess = (newToken: string, userData: any) => {
    setToken(newToken)
    setUser(userData)
    setIsLoggedIn(true)
    
    // 保存到本地存储
    localStorage.setItem('easygrid_token', newToken)
    localStorage.setItem('easygrid_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    // 清理状态
    setIsLoggedIn(false)
    setToken(null)
    setUser(null)
    
    // 清理本地存储
    localStorage.removeItem('easygrid_token')
    localStorage.removeItem('easygrid_user')
  }

  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </ErrorBoundary>
    )
  }

  console.log('🔍 App.tsx token:', token)
  
  return (
    <ErrorBoundary>
      <EasyGridProvider 
        config={{
          baseURL: 'http://localhost:8080',
          wsUrl: 'ws://localhost:8080/socket',
          accessToken: token || undefined,
          debug: true
        }}
        onConnected={() => console.log('✅ EasyGrid 连接已建立')}
        onDisconnected={() => console.log('❌ EasyGrid 连接已断开')}
        errorHandler={(error) => console.error('EasyGrid 错误:', error)}
      >
        <DataList onLogout={handleLogout} />
      </EasyGridProvider>
    </ErrorBoundary>
  )
}

export default App
