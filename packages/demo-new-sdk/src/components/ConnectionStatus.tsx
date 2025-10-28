/**
 * 连接状态显示组件
 * 使用新 SDK 的连接状态和 ConnectionIndicator
 */

import React from 'react'
import { useConnection, ConnectionIndicator } from '@easygrid/sdk'

export default function ConnectionStatus() {
  const { 
    state, 
    isConnected, 
    error, 
    retryCount, 
    lastConnectedAt,
    reconnect 
  } = useConnection()

  // 获取状态显示文本
  const getStatusText = () => {
    switch (state) {
      case 'connected':
        return '已连接'
      case 'connecting':
        return '连接中...'
      case 'reconnecting':
        return `重连中... (${retryCount})`
      case 'disconnected':
        return '已断开'
      case 'error':
        return '连接错误'
      default:
        return '未知状态'
    }
  }

  // 获取状态颜色
  const getStatusColor = () => {
    switch (state) {
      case 'connected':
        return 'text-green-600'
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-600'
      case 'disconnected':
        return 'text-gray-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // 获取状态背景色
  const getStatusBgColor = () => {
    switch (state) {
      case 'connected':
        return 'bg-green-50 border-green-200'
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-50 border-yellow-200'
      case 'disconnected':
        return 'bg-gray-50 border-gray-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`connection-indicator ${getStatusBgColor()} border rounded-lg px-3 py-2`}>
      <div className="flex items-center gap-2">
        {/* 使用新 SDK 的 ConnectionIndicator */}
        <ConnectionIndicator />
        
        {/* 状态文本 */}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        
        {/* 重试按钮 */}
        {(state === 'error' || state === 'disconnected') && (
          <button
            onClick={reconnect}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重连
          </button>
        )}
        
        {/* 最后连接时间 */}
        {lastConnectedAt && state === 'connected' && (
          <span className="text-xs text-gray-500">
            {lastConnectedAt.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      {/* 错误信息 */}
      {error && (
        <div className="mt-1 text-xs text-red-600">
          {error.message}
        </div>
      )}
      
      {/* 重试次数 */}
      {retryCount > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          重试次数: {retryCount}
        </div>
      )}
    </div>
  )
}

/**
 * 简化版连接状态组件
 */
export function SimpleConnectionStatus() {
  const { state, isConnected } = useConnection()
  
  return (
    <div className="flex items-center gap-2">
      <ConnectionIndicator />
      <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
        {isConnected ? '已连接' : '未连接'}
      </span>
    </div>
  )
}

/**
 * 详细版连接状态组件
 */
export function DetailedConnectionStatus() {
  const { 
    state, 
    isConnected, 
    error, 
    retryCount, 
    lastConnectedAt,
    reconnect,
    stats 
  } = useConnection()

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">连接状态</h3>
        <ConnectionIndicator />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">状态:</span>
          <span className={`text-sm font-medium ${
            isConnected ? 'text-green-600' : 'text-red-600'
          }`}>
            {state}
          </span>
        </div>
        
        {lastConnectedAt && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">最后连接:</span>
            <span className="text-sm text-gray-900">
              {lastConnectedAt.toLocaleString()}
            </span>
          </div>
        )}
        
        {retryCount > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">重试次数:</span>
            <span className="text-sm text-gray-900">{retryCount}</span>
          </div>
        )}
        
        {stats && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">统计:</span>
            <span className="text-sm text-gray-900">
              {JSON.stringify(stats)}
            </span>
          </div>
        )}
        
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <div className="text-sm text-red-800 font-medium">错误信息:</div>
            <div className="text-sm text-red-700">{error.message}</div>
          </div>
        )}
        
        {(state === 'error' || state === 'disconnected') && (
          <button
            onClick={reconnect}
            className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            重新连接
          </button>
        )}
      </div>
    </div>
  )
}
