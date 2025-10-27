import React, { useState, useEffect } from 'react';
import { LuckDB, ShareDBClient } from '@easyspace/sdk';

// 模拟 SDK 实例
const sdk = new LuckDB({
  baseUrl: 'http://localhost:2345',
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNyXzkwNkdDQ2I4QkJLcTZpZTJkOW5VVCIsImVtYWlsIjoidGVzdDJAZXhhbXBsZS5jb20iLCJpc19hZG1pbiI6ZmFsc2UsImlzcyI6InRlYWJsZS1hcGkiLCJleHAiOjE3NjEyMzgzMzksImlhdCI6MTc2MTE1MTkzOX0._1M7Kyra6H29aKic96vaK5SL0fGfaj5WfvzsMnZWr94',
  debug: true,
});

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [shareDBStatus, setShareDBStatus] = useState<string>('未连接');
  const [shareDBClient, setShareDBClient] = useState<ShareDBClient | null>(null);
  const [shareDBConnected, setShareDBConnected] = useState<boolean>(false);

  // 创建 ShareDB 客户端
  useEffect(() => {
    const client = new ShareDBClient({
      baseUrl: 'http://localhost:2345',
      accessToken: sdk.getAccessToken() || '',
    });

    setShareDBClient(client);

    // 监听连接状态
    client.on('connected', () => {
      setShareDBConnected(true);
      setShareDBStatus('已连接');
      addLog('✅ ShareDB 连接成功');
    });

    client.on('disconnected', () => {
      setShareDBConnected(false);
      setShareDBStatus('已断开');
      addLog('❌ ShareDB 连接断开');
    });

    client.on('error', (error) => {
      setShareDBStatus(`错误: ${error.message}`);
      addLog(`❌ ShareDB 连接错误: ${error.message}`);
    });

    // 连接
    client.connect().catch((error) => {
      addLog(`❌ ShareDB 连接失败: ${error.message}`);
    });

    return () => {
      client.disconnect();
    };
  }, []);

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };



  // 测试 ShareDB 文档操作
  const testShareDB = async () => {
    if (!shareDBClient || !shareDBConnected) {
      addLog('❌ ShareDB 未连接');
      return;
    }

    try {
      const doc = shareDBClient.getDoc('test-collection', 'test-doc');
      addLog('📄 获取 ShareDB 文档');
      
      // 监听文档变更
      doc.on('op', (op: any) => {
        addLog(`📝 ShareDB 文档操作: ${JSON.stringify(op)}`);
      });

      // 订阅文档
      doc.subscribe((err: any) => {
        if (err) {
          addLog(`❌ ShareDB 订阅失败: ${err.message}`);
        } else {
          addLog('✅ ShareDB 文档订阅成功');
        }
      });

    } catch (error) {
      addLog(`❌ ShareDB 操作失败: ${error}`);
    }
  };


  // 测试 Presence
  const testPresence = async () => {
    if (!shareDBClient || !shareDBConnected) {
      addLog('❌ ShareDB 未连接');
      return;
    }

    try {
      const presence = shareDBClient.getPresence('test-channel');
      addLog('👥 获取 Presence');
      
      // 设置本地状态
      presence.submit({ cursor: { x: 100, y: 200 } });
      addLog('✅ Presence 状态设置成功');

      // 监听远程状态
      presence.on('receive', (id: string, value: any) => {
        addLog(`👥 远程用户状态: ${id} - ${JSON.stringify(value)}`);
      });

    } catch (error) {
      addLog(`❌ Presence 操作失败: ${error}`);
    }
  };


  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 改进的实时协作客户端演示</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>📡 ShareDB 连接状态</h3>
          <p><strong>状态:</strong> {shareDBStatus}</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={testShareDB} disabled={!shareDBConnected}>
              测试 ShareDB 文档操作
            </button>
            <button onClick={testPresence} disabled={!shareDBConnected}>
              测试 Presence
            </button>
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
        <h3>📋 操作日志</h3>
        <div style={{ 
          height: '300px', 
          overflow: 'auto', 
          backgroundColor: '#f5f5f5', 
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '2px' }}>
              {log}
            </div>
          ))}
        </div>
        <button 
          onClick={() => setLogs([])} 
          style={{ marginTop: '10px', padding: '5px 10px' }}
        >
          清空日志
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
        <h3>🔧 技术特性</h3>
        <ul>
          <li>✅ <strong>ShareDB 集成</strong> - 实时协作文档同步</li>
          <li>✅ <strong>Presence 支持</strong> - 用户在线状态和光标位置</li>
          <li>✅ <strong>事件系统</strong> - 完整的事件监听和触发机制</li>
          <li>✅ <strong>TypeScript 支持</strong> - 完整的类型定义</li>
          <li>✅ <strong>WebSocket 连接</strong> - 稳定的实时通信</li>
          <li>✅ <strong>JWT 认证</strong> - 安全的用户认证</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
