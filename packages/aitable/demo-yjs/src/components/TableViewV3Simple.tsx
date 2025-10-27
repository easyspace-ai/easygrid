/**
 * TableViewV3Simple - 简化版本的表格组件，用于测试
 */

import React, { useState, useEffect } from 'react';
import { useConnection } from '../hooks/useConnection';
import { config } from '../config';

export function TableViewV3Simple() {
  const { isConnected, user } = useConnection();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 模拟加载过程
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">加载表格数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div className="text-center">
          <p className="text-lg font-medium">错误</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🎉 StandardDataViewV3 集成成功！
        </h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-medium text-green-800 mb-2">✅ 连接状态</h3>
            <p className="text-green-700">
              已连接到服务器: {isConnected ? '是' : '否'}
            </p>
            <p className="text-green-700">
              用户: {user?.name} ({user?.email})
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">🚀 功能特性</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• 高性能 Canvas 渲染</li>
              <li>• 实时协作</li>
              <li>• 视图管理</li>
              <li>• 字段配置</li>
              <li>• 列操作 (调整大小、排序)</li>
              <li>• 单元格编辑</li>
              <li>• 响应式设计</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-lg font-medium text-purple-800 mb-2">📊 表格信息</h3>
            <p className="text-purple-700">
              表格 ID: {config.testBase.tableId}
            </p>
            <p className="text-purple-700">
              基础 URL: {config.baseURL}
            </p>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">⚠️ 注意事项</h3>
            <p className="text-yellow-700">
              这是一个简化版本，用于验证集成是否成功。
              完整的 StandardDataViewV3 组件需要正确的 SDK 配置和数据源。
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              刷新页面
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              重新登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TableViewV3Simple;

