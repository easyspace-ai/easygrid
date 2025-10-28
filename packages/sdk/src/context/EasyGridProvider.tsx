/**
 * EasyGrid Provider
 * 提供 EasyGrid 客户端上下文，使用 ShareDB 官方客户端
 */

import React, { createContext, useEffect, useState } from 'react'
import { useConnection, UseConnectionConfig } from '../hooks/connection/useConnection.js'
import { initEasyGridSDK } from '../sdk.js'

export interface EasyGridProviderProps {
  config: UseConnectionConfig & {
    baseURL?: string
  }
  children: React.ReactNode
  errorHandler?: (error: Error) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

export const EasyGridConnectionContext = createContext<{
  connection: ReturnType<typeof useConnection>['connection']
  connected: boolean
  error: Error | null
} | null>(null)

export function EasyGridProvider({
  config,
  children,
  errorHandler,
  onConnected,
  onDisconnected
}: EasyGridProviderProps) {
  // 创建正确的配置
  const correctedConfig = {
    baseURL: config.baseURL || 'http://localhost:3000',
    wsUrl: config.wsUrl || 'ws://localhost:3000/socket',
    accessToken: config.accessToken,
    debug: config.debug
  }
  
  const { connection, connected, error } = useConnection(correctedConfig)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 初始化全局 SDK 实例（用于 hooks）
    initEasyGridSDK(correctedConfig)
  }, [correctedConfig])

  useEffect(() => {
    if (connected) {
      setIsReady(true)
      onConnected?.()
    } else {
      setIsReady(false)
      onDisconnected?.()
    }
  }, [connected, onConnected, onDisconnected])

  useEffect(() => {
    if (error) {
      errorHandler?.(error)
    }
  }, [error, errorHandler])

  // 如果连接失败，显示错误
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>连接失败</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    )
  }

  // 如果还在连接中，显示加载状态
  if (!isReady) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>正在连接到 EasyGrid...</p>
      </div>
    )
  }

  return (
    <EasyGridConnectionContext.Provider value={{ connection, connected, error }}>
      {children}
    </EasyGridConnectionContext.Provider>
  )
}
