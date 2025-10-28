/**
 * useReconnect Hook
 * 提供重连控制功能
 */

import { useCallback, useState, useEffect } from 'react'
import { useConnection } from './useConnection.js'

export interface UseReconnectReturn {
  reconnect: () => void
  isReconnecting: boolean
  retryCount: number
  canReconnect: boolean
  lastReconnectAt?: Date
}

export function useReconnect(): UseReconnectReturn {
  const { connection, state, connect } = useConnection()
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [lastReconnectAt, setLastReconnectAt] = useState<Date>()
  const [retryCount, setRetryCount] = useState(0)

  const reconnect = useCallback(async () => {
    if (isReconnecting || state === 'connected') {
      return
    }

    setIsReconnecting(true)
    setLastReconnectAt(new Date())
    setRetryCount(prev => prev + 1)

    try {
      await connect()
    } catch (error) {
      console.error('Reconnect failed:', error)
    } finally {
      setIsReconnecting(false)
    }
  }, [connection, state, isReconnecting, connect])

  const canReconnect = state !== 'connected' && state !== 'connecting' && !isReconnecting

  useEffect(() => {
    if (state === 'reconnecting') {
      setIsReconnecting(true)
    } else {
      setIsReconnecting(false)
    }
  }, [state])

  return {
    reconnect,
    isReconnecting,
    retryCount,
    canReconnect,
    lastReconnectAt
  }
}
