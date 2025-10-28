/**
 * useConnectionState Hook
 * 提供连接状态的简化访问
 */

import { useConnection } from './useConnection.js'
import type { ConnectionState } from '../../core/EasyGridClient.js'

export interface UseConnectionStateReturn {
  state: ConnectionState
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  hasError: boolean
  isDisconnected: boolean
}

export function useConnectionState(): UseConnectionStateReturn {
  const { state } = useConnection()

  return {
    state,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
    isReconnecting: state === 'reconnecting',
    hasError: state === 'error',
    isDisconnected: state === 'disconnected'
  }
}
