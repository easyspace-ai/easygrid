/**
 * Connection Context
 * 提供 ShareDB 连接实例的全局共享
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { ShareDBConnection, ShareDBConnectionConfig, ConnectionState } from '../core/sharedb/connection.js'

export interface ConnectionContextValue {
  connection: ShareDBConnection | null
  state: ConnectionState
  isConnected: boolean
  error: Error | null
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

export interface ConnectionProviderProps {
  config: ShareDBConnectionConfig
  children: React.ReactNode
}

/**
 * Connection Provider
 * 管理 ShareDB 连接实例，提供给子组件使用
 */
export function ConnectionProvider({ config, children }: ConnectionProviderProps) {
  const [connection, setConnection] = useState<ShareDBConnection | null>(null)
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const connectionRef = useRef<ShareDBConnection | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeConnection = async () => {
      try {
        setError(null)
        
        // 创建新连接
        const newConnection = new ShareDBConnection(config)
        connectionRef.current = newConnection
        
        // 监听状态变化
        const stateHandler = () => {
          if (mounted) {
            setState(newConnection.getState())
          }
        }
        
        // 连接
        await newConnection.connect()
        
        if (mounted) {
          setConnection(newConnection)
          setState(newConnection.getState())
          console.log('✅ ConnectionProvider: ShareDB 连接已建立')
        }
        
      } catch (err) {
        if (mounted) {
          const error = err as Error
          setError(error)
          console.error('❌ ConnectionProvider: ShareDB 连接失败:', error)
        }
      }
    }

    initializeConnection()

    return () => {
      mounted = false
      if (connectionRef.current) {
        connectionRef.current.disconnect()
        connectionRef.current = null
      }
    }
  }, [config])

  const contextValue: ConnectionContextValue = {
    connection,
    state,
    isConnected: state === 'connected',
    error
  }

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  )
}

/**
 * Hook to use connection from context
 */
export function useConnectionContext(): ConnectionContextValue {
  const context = useContext(ConnectionContext)
  if (!context) {
    throw new Error('useConnectionContext must be used within ConnectionProvider')
  }
  return context
}
