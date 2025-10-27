import { useState, useEffect } from 'react';
import { LuckDB } from '@easygrid/sdk';
import { config } from '../config';

export interface User {
  id: string;
  email: string;
  name: string;
}

export function useConnection() {
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [shareDBConnectionState, setShareDBConnectionState] = useState<string>('disconnected');

  useEffect(() => {
    // 创建 SDK 实例
    const sdkInstance = new LuckDB({
      baseUrl: config.baseURL,
      debug: true,
    });
    setSdk(sdkInstance);

    // 监听 ShareDB 连接状态变化
    const handleConnectionStateChange = (event: any) => {
      console.log('🔄 ShareDB 连接状态变化:', event.state);
      setShareDBConnectionState(event.state);
    };

    // 注册 ShareDB 连接状态监听器
    sdkInstance.realtime.on('connection', handleConnectionStateChange);

    // 检查本地存储的 token
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        
        // 使用保存的令牌重新初始化 SDK（因为setAccessToken不会重新初始化实时客户端）
        const newSdkInstance = new LuckDB({
          baseUrl: config.baseURL,
          debug: true,
          accessToken: savedToken,
        });
        
        setSdk(newSdkInstance);
        setAccessToken(savedToken);
        setUser(userData);
        setIsLoggedIn(true);
        
        // 自动连接 ShareDB
        newSdkInstance.connectShareDB().then(() => {
          setIsConnected(true);
        }).catch((error) => {
          console.error('自动连接 ShareDB 失败:', error);
        });
      } catch (error) {
        console.error('恢复登录状态失败:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
      }
    }

    // 清理函数
    return () => {
      sdkInstance.realtime.off('connection', handleConnectionStateChange);
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!sdk) {
      throw new Error('SDK 未初始化');
    }

    try {
      const result = await sdk.login({ email, password });
      
      // 使用新的访问令牌重新初始化 SDK
      const newSdkInstance = new LuckDB({
        baseUrl: config.baseURL,
        debug: true,
        accessToken: result.accessToken,
      });
      
      setSdk(newSdkInstance);
      
      // 更新状态
      setAccessToken(result.accessToken);
      setUser(result.user);
      setIsLoggedIn(true);
      
      // 保存 token 到本地存储
      if (result.accessToken) {
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      
      // 连接 ShareDB
      await newSdkInstance.connectShareDB();
      setIsConnected(true);
      
      return result;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  const logout = () => {
    if (sdk) {
      sdk.disconnectShareDB();
    }
    
    // 清理状态
    setAccessToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setIsConnected(false);
    
    // 清理本地存储
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  };

  // 获取 ShareDB 连接状态
  const getShareDBConnectionState = () => {
    // 优先从SDK获取实时状态
    if (sdk) {
      const sdkState = sdk.getShareDBConnectionState();
      console.log('🔍 SDK连接状态 (v2.1):', sdkState, '本地状态:', shareDBConnectionState);
      return sdkState || shareDBConnectionState;
    }
    return shareDBConnectionState;
  };

  return {
    sdk,
    isLoggedIn,
    user,
    accessToken,
    isConnected,
    login,
    logout,
    getShareDBConnectionState,
  };
}