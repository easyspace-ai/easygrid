/**
 * 简化版改进 YJS Demo 应用
 * 直接测试改进版本的核心功能
 */

import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';

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

  const [yjsDoc, setYjsDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testData, setTestData] = useState<Record<string, any>>({});

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  // 初始化改进版 YJS 连接
  useEffect(() => {
    const initYjs = async () => {
      try {
        addLog('🚀 初始化改进版 YJS 连接...');
        
        // 创建 Y.Doc
        const doc = new Y.Doc();
        setYjsDoc(doc);

        // 创建 Awareness
        const awarenessInstance = new Awareness(doc);
        setAwareness(awarenessInstance);

        // 构建 WebSocket URL - 使用正确的 YJS 端点
        const wsUrl = 'ws://localhost:2345/yjs/ws';
        const roomName = `test-document?token=test-token&user=test-user&document=test-document`;

        addLog(`🔗 连接到: ${wsUrl}/${roomName}`);

        // 创建 WebSocket 提供者（使用改进的配置）
        const providerInstance = new WebsocketProvider(wsUrl, roomName, doc, {
          awareness: awarenessInstance,
          connect: true,
          resyncInterval: 5000,  // 5秒重同步
          maxBackoffTime: 2500,  // 最大退避时间
        });

        setProvider(providerInstance);

        // 监听连接状态
        providerInstance.on('status', (event: { status: string }) => {
          addLog(`📡 连接状态: ${event.status}`);
          
          if (event.status === 'connected') {
            setConnectionState(prev => ({ ...prev, isConnected: true }));
            addLog('✅ YJS 连接成功！');
          } else if (event.status === 'disconnected') {
            setConnectionState(prev => ({ ...prev, isConnected: false }));
            addLog('❌ YJS 连接断开');
          }
        });

        // 监听同步状态
        providerInstance.on('sync', (synced: boolean) => {
          addLog(`🔄 文档同步: ${synced ? '已同步' : '同步中'}`);
        });

        // 监听文档更新
        doc.on('update', (update: Uint8Array, origin: any) => {
          addLog(`📝 文档更新: ${update.length} bytes, origin: ${origin?.constructor?.name || 'unknown'}`);
        });

        // 监听 Awareness 变化
        awarenessInstance.on('change', (changes: any) => {
          addLog(`👥 用户状态变化: ${JSON.stringify(changes)}`);
        });

        // 创建测试数据 Map
        const testMap = doc.getMap('testData');
        
        // 监听测试数据变化
        testMap.observe((event: Y.YMapEvent<any>) => {
          addLog(`🗂️ 测试数据变化: ${JSON.stringify(event.changes.keys)}`);
          
          // 更新本地状态
          const data: Record<string, any> = {};
          testMap.forEach((value, key) => {
            data[key] = value;
          });
          setTestData(data);
        });

        addLog('✅ 改进版 YJS 初始化完成');

      } catch (error) {
        addLog(`❌ YJS 初始化失败: ${error}`);
      }
    };

    initYjs();
  }, []);

  // 登录处理
  const handleLogin = async (email: string, password: string) => {
    try {
      addLog(`🔐 尝试登录: ${email}`);
      
      // 模拟登录
      const user = {
        id: 'user-123',
        email,
        name: 'Test User',
      };
      
      setConnectionState({
        isConnected: true,
        showLogin: false,
        user,
      });

      addLog(`✅ 登录成功: ${user.name}`);
    } catch (error) {
      addLog(`❌ 登录失败: ${error}`);
    }
  };

  // 退出登录
  const handleLogout = () => {
    setConnectionState({
      isConnected: false,
      showLogin: true,
    });
    
    if (provider) {
      provider.destroy();
    }
    
    addLog('👋 已退出登录');
  };

  // 测试数据操作
  const testDataOperations = () => {
    if (!yjsDoc) return;

    try {
      addLog('🧪 开始测试数据操作...');
      
      const testMap = yjsDoc.getMap('testData');
      
      // 设置测试数据
      testMap.set('field1', 'Hello World');
      testMap.set('field2', 123);
      testMap.set('field3', true);
      testMap.set('timestamp', Date.now());
      
      addLog('✅ 测试数据操作完成');
      
    } catch (error) {
      addLog(`❌ 测试数据操作失败: ${error}`);
    }
  };

  // 清理资源
  useEffect(() => {
    return () => {
      if (provider) {
        provider.destroy();
      }
    };
  }, [provider]);

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
        {provider && (
          <p>提供者状态: {provider.wsconnected ? '已连接' : '未连接'}</p>
        )}
      </div>

      {/* 测试数据 */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
        <h3>测试数据</h3>
        <pre style={{ fontSize: '12px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(testData, null, 2)}
        </pre>
      </div>

      {/* 测试按钮 */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testDataOperations}
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
          测试数据操作
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
