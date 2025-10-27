import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { TableViewV3 } from './components/TableViewV3';
import { useConnection } from './hooks/useConnection';

export default function App() {
  const { sdk, isLoggedIn, user, login, logout, getShareDBConnectionState } = useConnection();
  const [showLogin, setShowLogin] = useState(!isLoggedIn);
  
  // 版本检查 - 确保代码更新
  console.log('🚀 App 启动 (v2.1) - 修复事件监听问题');
  
  // 强制刷新连接状态显示
  const [connectionRefreshTrigger, setConnectionRefreshTrigger] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionRefreshTrigger(prev => prev + 1);
    }, 1000); // 每秒刷新一次连接状态
    
    return () => clearInterval(interval);
  }, []);
  
  // 强制刷新连接状态显示
  const displayConnectionState = () => {
    const currentState = getShareDBConnectionState();
    console.log('🔄 强制刷新连接状态显示:', currentState);
    return currentState;
  };
  
  // 获取 ShareDB 连接状态（依赖刷新触发器）
  const shareDBState = displayConnectionState();
  const isShareDBConnected = shareDBState === 'connected';

  // 同步登录状态
  useEffect(() => {
    console.log('🔄 同步登录状态:', { isLoggedIn, showLogin });
    setShowLogin(!isLoggedIn);
  }, [isLoggedIn]);

  // ShareDB 连接状态调试
  useEffect(() => {
    console.log('📊 ShareDB 连接状态 (v2.1):', {
      shareDBState,
      isShareDBConnected,
      accessToken: !!sdk?.config.accessToken,
      sdkConnectionState: sdk?.getShareDBConnectionState?.(),
      refreshTrigger: connectionRefreshTrigger,
    });
  }, [shareDBState, isShareDBConnected, sdk?.config.accessToken, sdk, connectionRefreshTrigger]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      setShowLogin(false);
      return true;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  };

  const handleLogout = () => {
    logout();
    setShowLogin(true);
  };

  console.log('🎯 App 渲染状态:', { showLogin, isLoggedIn, user: user?.name });

  if (showLogin || !isLoggedIn) {
    console.log('📝 显示登录页面');
    return (
      <LoginForm 
        onLogin={handleLogin}
        isConnecting={false}
        error={null}
        isConnected={isLoggedIn}
      />
    );
  }

  console.log('🏠 显示主界面');
  return (
    <div className="h-screen w-full flex flex-col">
      {/* 顶部导航栏 */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold text-gray-900">EasyGrid Demo - 实时协作表格</h1>
          <span className="text-sm text-gray-500">v3.0</span>
          {/* ShareDB 连接状态指示器 */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isShareDBConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-500">
              {isShareDBConnected ? '实时连接' : '离线'}
            </span>
            <span className="text-xs text-gray-400">
              ({shareDBState})
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            欢迎, {user?.name} ({user?.email})
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 min-h-0">
        <TableViewV3 
          sdk={sdk}
          isShareDBConnected={isShareDBConnected}
        />
      </div>
    </div>
  );
}