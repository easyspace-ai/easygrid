/**
 * ConnectionIndicator 组件
 * 显示连接状态指示器
 */

import React from 'react'
import { useConnection } from '../hooks/connection/useConnection.js'

export interface ConnectionIndicatorProps {
  showRetryButton?: boolean
  showStatusText?: boolean
  className?: string
}

export function ConnectionIndicator({
  showRetryButton = true,
  showStatusText = true,
  className = ''
}: ConnectionIndicatorProps) {
  const { state, isConnected, connect } = useConnection()

  const statusColors: Record<string, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    reconnecting: 'bg-orange-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500'
  }

  const statusLabels: Record<string, string> = {
    connected: '已连接',
    connecting: '连接中...',
    reconnecting: '重连中',
    disconnected: '已断开',
    error: '连接错误'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${statusColors[state] || 'bg-gray-500'}`} />
      
      {showStatusText && (
        <span className="text-sm text-gray-600">
          {statusLabels[state] || '未知状态'}
        </span>
      )}
      
      {showRetryButton && (state === 'error' || state === 'disconnected') && (
        <button
          onClick={() => connect()}
          className="text-sm text-blue-500 hover:underline"
        >
          重新连接
        </button>
      )}
    </div>
  )
}
