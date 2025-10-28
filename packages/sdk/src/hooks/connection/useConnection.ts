/**
 * useConnection Hook - 管理 ShareDB 连接
 * 使用 ShareDB 官方客户端库，参考 Teable 实现
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ReconnectingWebSocket from 'reconnecting-websocket'
import { Connection } from 'sharedb/lib/client'
import type { ConnectionReceiveRequest, Socket } from 'sharedb/lib/sharedb'
import { getEasyGridSDK } from '../../sdk.js'

export interface UseConnectionReturn {
  connection: Connection | null
  connected: boolean
  error: Error | null
}

export interface UseConnectionConfig {
  wsUrl?: string
  accessToken?: string
  debug?: boolean
}

// 检查 WebSocket 连接状态
const isConnected = (socket: ReconnectingWebSocket) => {
  return [socket.OPEN, socket.CONNECTING].includes(socket.readyState)
}

// 获取 WebSocket 路径
const getWsPath = (wsUrl?: string, accessToken?: string) => {
  console.log('🔍 getWsPath 调试:', { wsUrl, accessToken })
  
  if (wsUrl) {
    // 如果有 accessToken，添加到 URL 参数中
    if (accessToken) {
      const url = new URL(wsUrl)
      url.searchParams.set('token', accessToken)
      console.log('🔍 WebSocket URL with token:', url.toString())
      return url.toString()
    }
    return wsUrl
  }
  
  // 默认路径
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const path = `${wsProtocol}//${window.location.host}/socket`
  
  if (accessToken) {
    const fullPath = `${path}?token=${accessToken}`
    console.log('🔍 WebSocket URL with token:', fullPath)
    return fullPath
  }
  
  console.log('🔍 WebSocket URL without token:', path)
  return path
}

// ShareDB 错误处理
const shareDbErrorHandler = (error: unknown) => {
  console.error('ShareDB Error:', error)
  // 可以在这里添加更复杂的错误处理逻辑
}

/**
 * ShareDB 连接 Hook
 * 使用 ShareDB 官方客户端库
 */
export function useConnection(config?: UseConnectionConfig): UseConnectionReturn {
  const [connected, setConnected] = useState(false)
  const [connection, setConnection] = useState<Connection | null>(null)
  const [socket, setSocket] = useState<ReconnectingWebSocket | null>(null)
  const [refreshTime, setRefreshTime] = useState(Date.now())
  const [error, setError] = useState<Error | null>(null)

  // 获取 WebSocket 路径
  const wsPath = useMemo(() => {
    return getWsPath(config?.wsUrl, config?.accessToken)
  }, [config?.wsUrl, config?.accessToken])

  // 初始化 WebSocket
  useEffect(() => {
    setSocket((prev) => {
      if (prev) {
        return prev
      }
      return new ReconnectingWebSocket(wsPath)
    })
  }, [wsPath])

  // 更新刷新时间（防抖）
  const updateRefreshTime = useMemo(() => {
    return (() => {
      let timeoutId: NodeJS.Timeout
      return () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => setRefreshTime(Date.now()), 1000)
      }
    })()
  }, [])

  // 更新 ShareDB 连接
  const updateShareDb = useCallback(() => {
    if (socket && isConnected(socket)) {
      socket.close()
    }
    setConnection(null)
    updateRefreshTime()
  }, [socket, updateRefreshTime])

  // 自动管理连接（简化版）
  useEffect(() => {
    if (!socket) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected(socket)) {
        setTimeout(() => {
          if (!isConnected(socket)) {
            updateShareDb()
          }
        }, 2000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [socket, updateShareDb])

  // 建立 ShareDB 连接
  useEffect(() => {
    if (!socket) {
      return
    }

    if (socket && !isConnected(socket)) {
      socket.reconnect()
    }

    const shareDbConnection = new Connection(socket as Socket)
    setConnection(shareDbConnection)

    let pingInterval: ReturnType<typeof setInterval>
    
    const onConnected = () => {
      setConnected(true)
      setError(null)
      // 使用 ShareDB 官方的 ping 方法
      pingInterval = setInterval(() => shareDbConnection.ping(), 1000 * 10)
      if (config?.debug) {
        console.log('✅ ShareDB 连接已建立')
      }
    }
    
    const onDisconnected = () => {
      setConnected(false)
      pingInterval && clearInterval(pingInterval)
      if (config?.debug) {
        console.log('❌ ShareDB 连接已断开')
      }
    }
    
    const onReceive = (request: ConnectionReceiveRequest) => {
      if (request.data.error) {
        setError(new Error(request.data.error))
        shareDbErrorHandler(request.data.error)
      }
    }

    const onError = (err: any) => {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      shareDbErrorHandler(error)
    }

    // 绑定事件监听器
    shareDbConnection.on('connected', onConnected)
    shareDbConnection.on('disconnected', onDisconnected)
    shareDbConnection.on('closed', onDisconnected)
    shareDbConnection.on('error', onError)
    shareDbConnection.on('receive', onReceive)

    return () => {
      pingInterval && clearInterval(pingInterval)
      shareDbConnection.removeListener('connected', onConnected)
      shareDbConnection.removeListener('disconnected', onDisconnected)
      shareDbConnection.removeListener('closed', onDisconnected)
      shareDbConnection.removeListener('error', onError)
      shareDbConnection.removeListener('receive', onReceive)
      
      if (shareDbConnection) {
        isConnected(socket) && shareDbConnection.close()
        // 清理绑定
        ;(shareDbConnection as any).bindToSocket({})
      }
    }
  }, [wsPath, socket, refreshTime, config?.debug])

  return useMemo(() => {
    return { connection, connected, error }
  }, [connected, connection, error])
}