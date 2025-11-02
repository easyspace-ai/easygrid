/**
 * ConnectionStatus 组件 - ShareDB连接状态指示器
 */

import React from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface ConnectionStatusProps {
  state: ConnectionState
  retryCount?: number
  onRetry?: () => void
  className?: string
}

export function ConnectionStatus({ 
  state, 
  retryCount = 0, 
  onRetry,
  className = '' 
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (state) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          text: '实时连接',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          dotColor: 'bg-green-500'
        }
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: '连接中...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          dotColor: 'bg-yellow-500'
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: '离线',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          dotColor: 'bg-gray-500'
        }
      case 'error':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: retryCount > 0 ? `连接失败 (${retryCount})` : '连接错误',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          dotColor: 'bg-red-500'
        }
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: '未知状态',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          dotColor: 'bg-gray-500'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Dot */}
      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      
      {/* Status Icon and Text */}
      <div className={`flex items-center space-x-1 ${config.color}`}>
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
      </div>

      {/* Retry Button (only show for error state) */}
      {state === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
        >
          重试
        </button>
      )}
    </div>
  )
}

// 简化版本 - 只显示状态点
export function ConnectionDot({ state }: { state: ConnectionState }) {
  const getDotColor = () => {
    switch (state) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'disconnected': return 'bg-gray-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className={`w-2 h-2 rounded-full ${getDotColor()}`} />
  )
}
