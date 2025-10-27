import React, { createContext, useContext, useEffect, useState } from 'react'
import { LuckDB } from '@easygrid/sdk'

interface LuckDBContextType {
  sdk: LuckDB | null
  isConnected: boolean
  isLoggedIn: boolean
  user: any | null
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const LuckDBContext = createContext<LuckDBContextType | undefined>(undefined)

export const useLuckDB = () => {
  const context = useContext(LuckDBContext)
  if (context === undefined) {
    throw new Error('useLuckDB must be used within a LuckDBProvider')
  }
  return context
}

interface LuckDBProviderProps {
  children: React.ReactNode
}

export const LuckDBProvider: React.FC<LuckDBProviderProps> = ({ children }) => {
  const [sdk, setSdk] = useState<LuckDB | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 初始化 SDK
    const initializeSDK = async () => {
      try {
        const luckDB = new LuckDB({
          baseUrl: 'http://localhost:8080',
          debug: true
        })
        
        setSdk(luckDB)
        
        // 尝试自动登录
        const savedToken = localStorage.getItem('easyspace_token')
        if (savedToken) {
          try {
            // 使用保存的令牌重新初始化 SDK
            const newSdk = new LuckDB({
              baseUrl: 'http://localhost:8080',
              debug: true,
              accessToken: savedToken
            })
            setSdk(newSdk)
            setIsLoggedIn(true)
            
            // 尝试连接 ShareDB
            newSdk.connectShareDB().then(() => {
              setIsConnected(true)
            }).catch((err) => {
              console.warn('自动连接 ShareDB 失败:', err)
            })
          } catch (err) {
            localStorage.removeItem('easyspace_token')
          }
        }
      } catch (err) {
        setError('SDK 初始化失败: ' + (err as Error).message)
      }
    }

    initializeSDK()
  }, [])

  const login = async (email: string, password: string) => {
    if (!sdk) {
      throw new Error('SDK 未初始化')
    }

    try {
      setError(null)
      const response = await sdk.login({ email, password })
      
      setUser(response.user)
      setIsLoggedIn(true)
      localStorage.setItem('easyspace_token', response.accessToken)
      
      // 重新初始化 SDK 以使用新的访问令牌
      const newSdk = new LuckDB({
        baseUrl: 'http://localhost:8080',
        debug: true,
        accessToken: response.accessToken
      })
      setSdk(newSdk)
      
      // 连接 ShareDB
      await newSdk.connectShareDB()
      setIsConnected(true)
      
    } catch (err) {
      const errorMessage = '登录失败: ' + (err as Error).message
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    if (sdk) {
      sdk.disconnectShareDB()
    }
    
    setUser(null)
    setIsLoggedIn(false)
    setIsConnected(false)
    localStorage.removeItem('easyspace_token')
  }

  const value: LuckDBContextType = {
    sdk,
    isConnected,
    isLoggedIn,
    user,
    error,
    login,
    logout
  }

  return (
    <LuckDBContext.Provider value={value}>
      {children}
    </LuckDBContext.Provider>
  )
}
