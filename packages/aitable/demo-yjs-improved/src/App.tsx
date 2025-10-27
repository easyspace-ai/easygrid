/**
 * 改进版 YJS Demo 应用
 * 使用基于官方源码学习的改进实现
 */

import React, { useState, useEffect } from 'react';
import { ImprovedYjsClient } from '../../../packages/sdk/src/core/yjs-client-improved';
import { ImprovedDocumentManager } from '../../../packages/sdk/src/core/document-manager-improved';
import { LuckDB } from '../../../packages/sdk/src/index';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface ConnectionState {
  isConnected: boolean;
  showLogin: boolean;
  user?: User;
}

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    showLogin: true,
  });

  const [yjsClient, setYjsClient] = useState<ImprovedYjsClient | null>(null);
  const [docManager, setDocManager] = useState<ImprovedDocumentManager | null>(null);
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  // 初始化 SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        const luckDB = new LuckDB({
          baseUrl: 'http://localhost:2345',
          debug: true,
        });

        // 尝试从 localStorage 恢复登录状态
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          luckDB.setAccessToken(user.accessToken);
          setConnectionState(prev => ({
            ...prev,
            isConnected: true,
            showLogin: false,
            user,
          }));
          addLog(`从 localStorage 恢复登录状态: ${user.name}`);
        }

        setSdk(luckDB);
        addLog('✅ SDK 初始化成功');
      } catch (error) {
        addLog(`❌ SDK 初始化失败: ${error}`);
      }
    };

    initSDK();
  }, []);

  // 初始化改进版 YJS 客户端
  useEffect(() => {
    if (!sdk) return;

    const initYjsClient = async () => {
      try {
        const client = new ImprovedYjsClient({
          baseUrl: 'http://localhost:2345',
          accessToken: sdk.getAccessToken() || '',
          userId: 'user-123',
        }, {
          debug: true,
          reconnectInterval: 1000,
          maxReconnectAttempts: 10,
          heartbeatInterval: 30000,
          resyncInterval: 5000,
          maxBackoffTime: 2500,
        });

        // 事件监听
        client.on('connected', (event) => {
          addLog(`🔗 YJS 连接成功: ${JSON.stringify(event)}`);
          setConnectionState(prev => ({ ...prev, isConnected: true }));
        });

        client.on('disconnected', (event) => {
          addLog(`🔌 YJS 连接断开: ${JSON.stringify(event)}`);
          setConnectionState(prev => ({ ...prev, isConnected: false }));
        });

        client.on('error', (error) => {
          addLog(`❌ YJS 连接错误: ${error}`);
        });

        client.on('sync', (event) => {
          addLog(`🔄 文档同步: ${JSON.stringify(event)}`);
        });

        client.on('heartbeat', () => {
          addLog('💓 心跳检测');
        });

        setYjsClient(client);

        // 创建文档管理器
        const docManager = new ImprovedDocumentManager(client, sdk, {
          debug: true,
          cacheTTL: 5 * 60 * 1000,
          maxCacheSize: 1000,
          enableGC: true,
        });

        setDocManager(docManager);
        addLog('✅ 改进版 YJS 客户端初始化成功');

        // 连接
        await client.connect('test-document');
        addLog('🚀 开始连接 YJS 服务器...');

      } catch (error) {
        addLog(`❌ YJS 客户端初始化失败: ${error}`);
      }
    };

    initYjsClient();
  }, [sdk]);

  // 更新统计信息
  useEffect(() => {
    if (!docManager) return;

    const updateStats = () => {
      const stats = docManager.getStats();
      setStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [docManager]);

  // 登录处理
  const handleLogin = async (email: string, password: string) => {
    if (!sdk) return;

    try {
      addLog(`🔐 尝试登录: ${email}`);
      
      const response = await sdk.auth.login({ email, password });
      
      if (response.success && response.data) {
        const user = response.data.user;
        const accessToken = response.data.accessToken;
        
        // 保存到 localStorage
        localStorage.setItem('user', JSON.stringify({
          ...user,
          accessToken,
        }));

        // 设置访问令牌
        sdk.setAccessToken(accessToken);
        
        setConnectionState({
          isConnected: true,
          showLogin: false,
          user,
        });

        addLog(`✅ 登录成功: ${user.name}`);
      } else {
        addLog(`❌ 登录失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      addLog(`❌ 登录异常: ${error}`);
    }
  };

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('user');
    setConnectionState({
      isConnected: false,
      showLogin: true,
    });
    
    if (yjsClient) {
      yjsClient.disconnect();
    }
    
    addLog('👋 已退出登录');
  };

  // 测试记录操作
  const testRecordOperations = async () => {
    if (!docManager) return;

    try {
      addLog('🧪 开始测试记录操作...');
      
      // 获取记录实例
      const record = docManager.getRecordInstance('test-table', 'test-record');
      
      // 订阅记录变化
      const unsubscribe = record.subscribe((changes) => {
        addLog(`📝 记录变化: ${JSON.stringify(changes)}`);
      });
      
      // 设置字段值
      record.setCellValue('field1', 'Hello World');
      record.setCellValue('field2', 123);
      
      // 批量设置
      record.batchSetCellValues({
        'field3': 'Batch Update',
        'field4': true,
      });
      
      addLog('✅ 记录操作测试完成');
      
      // 清理订阅
      setTimeout(() => {
        unsubscribe();
        addLog('🧹 清理记录订阅');
      }, 5000);
      
    } catch (error) {
      addLog(`❌ 记录操作测试失败: ${error}`);
    }
  };

  // 清理资源
  useEffect(() => {
    return () => {
      if (yjsClient) {
        yjsClient.destroy();
      }
      if (docManager) {
        docManager.destroy();
      }
    };
  }, [yjsClient, docManager]);

  if (connectionState.showLogin) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
        <h2>改进版 YJS Demo - 登录</h2>
        <div style={{ marginBottom: '15px' }}>
          <label>邮箱地址</label>
          <input 
            type="email" 
            defaultValue="admin@126.com"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>密码</label>
          <input 
            type="password" 
            defaultValue="Pmker123"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <button 
          onClick={() => handleLogin('admin@126.com', 'Pmker123')}
          style={{ 
            width: '100%', 
            padding: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          登录
        </button>
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          <p>演示账号: admin@126.com</p>
          <p>密码: Pmker123</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>改进版 YJS Demo</h1>
        <div>
          <span style={{ marginRight: '10px' }}>
            欢迎, {connectionState.user?.name} ({connectionState.user?.email})
          </span>
          <button onClick={handleLogout} style={{ padding: '5px 10px' }}>
            退出登录
          </button>
        </div>
      </div>

      {/* 连接状态 */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>连接状态</h3>
        <p>YJS: {connectionState.isConnected ? '✅ 已连接' : '❌ 未连接'}</p>
        <p>用户: {connectionState.user?.name} ({connectionState.user?.email})</p>
        {yjsClient && (
          <p>连接状态: {yjsClient.getConnectionState()}</p>
        )}
      </div>

      {/* 统计信息 */}
      {stats && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
          <h3>统计信息</h3>
          <p>文档数量: {stats.documents}</p>
          <p>记录实例: {stats.recordInstances}</p>
          <p>字段实例: {stats.fieldInstances}</p>
          <p>缓存大小: {stats.cacheSize}</p>
          <p>订阅数量: {stats.subscriptions}</p>
        </div>
      )}

      {/* 测试按钮 */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testRecordOperations}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          测试记录操作
        </button>
      </div>

      {/* 日志 */}
      <div style={{ marginTop: '20px' }}>
        <h3>实时日志</h3>
        <div style={{ 
          backgroundColor: '#000', 
          color: '#0f0', 
          padding: '10px', 
          borderRadius: '4px', 
          fontFamily: 'monospace',
          fontSize: '12px',
          height: '200px',
          overflow: 'auto'
        }}>
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
