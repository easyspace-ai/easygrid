/**
 * 实时状态组件
 * 显示 WebSocket 连接状态、订阅的文档数、操作日志
 */

import React, { useState, useEffect } from 'react';
import { LuckDB } from '@easygrid/sdk';
import type { ShareDBConnection } from '@easygrid/sdk';

export interface RealtimeStatusProps {
  connection: LuckDB | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectionInfo: ShareDBConnection | null;
  className?: string;
}

export interface OperationLog {
  id: string;
  type: 'connect' | 'disconnect' | 'operation' | 'error';
  message: string;
  timestamp: number;
  data?: any;
}

export function RealtimeStatus({
  connection,
  isConnected,
  isConnecting,
  error,
  connectionInfo,
  className = '',
}: RealtimeStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [maxLogs] = useState(50);

  // 添加操作日志
  const addLog = (type: OperationLog['type'], message: string, data?: any) => {
    const log: OperationLog = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now(),
      data,
    };

    setOperationLogs(prev => {
      const newLogs = [log, ...prev].slice(0, maxLogs);
      return newLogs;
    });
  };

  // 监听连接状态变化
  useEffect(() => {
    if (isConnected) {
      addLog('connect', 'ShareDB 连接已建立');
    } else if (isConnecting) {
      addLog('connect', '正在连接 ShareDB...');
    } else {
      addLog('disconnect', 'ShareDB 连接已断开');
    }
  }, [isConnected, isConnecting]);

  // 监听错误
  useEffect(() => {
    if (error) {
      addLog('error', `连接错误: ${error}`);
    }
  }, [error]);

  // 获取连接状态颜色
  const getStatusColor = () => {
    if (isConnected) return 'text-green-600';
    if (isConnecting) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 获取连接状态文本
  const getStatusText = () => {
    if (isConnected) return '已连接';
    if (isConnecting) return '连接中...';
    return '离线';
  };

  // 获取日志类型颜色
  const getLogTypeColor = (type: OperationLog['type']) => {
    switch (type) {
      case 'connect': return 'text-green-600';
      case 'disconnect': return 'text-red-600';
      case 'operation': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* 状态头部 */}
      <div 
        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 
              isConnecting ? 'bg-yellow-500' : 
              'bg-red-500'
            }`} />
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {connectionInfo && (
              <span className="text-xs text-gray-500">
                ID: {connectionInfo.id}
              </span>
            )}
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 展开的详细信息 */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* 连接信息 */}
          <div className="p-3 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-2">连接信息</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>状态: {getStatusText()}</div>
              {connectionInfo && (
                <>
                  <div>连接ID: {connectionInfo.id}</div>
                  <div>用户ID: {connectionInfo.userId}</div>
                  <div>最后活跃: {new Date(connectionInfo.lastSeen).toLocaleString()}</div>
                </>
              )}
              {error && (
                <div className="text-red-600">错误: {error}</div>
              )}
            </div>
          </div>

          {/* 操作日志 */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">操作日志</h4>
              <button
                onClick={() => setOperationLogs([])}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                清空
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {operationLogs.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-2">
                  暂无操作日志
                </div>
              ) : (
                operationLogs.map(log => (
                  <div key={log.id} className="flex items-start space-x-2 text-xs">
                    <span className="text-gray-400 flex-shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={`flex-shrink-0 ${getLogTypeColor(log.type)}`}>
                      [{log.type}]
                    </span>
                    <span className="text-gray-700 flex-1">
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
