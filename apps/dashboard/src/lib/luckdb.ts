/**
 * LuckDB SDK 配置和实例
 * 统一管理 SDK 的初始化和配置
 */

import LuckDB from '@easygrid/sdk';
import { useAuthStore } from '@/stores/auth-store';

// 创建 SDK 实例 - 完全参考 manage 项目
export const luckdb = new LuckDB({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:2345',
  debug: true
});

// 设置 token 刷新回调，确保前端状态与 SDK 同步
(luckdb as any).setTokenRefreshCallback((accessToken: string, refreshToken: string) => {
  // 获取当前 store 实例并更新 token
  const store = useAuthStore.getState();
  store.updateTokens(accessToken, refreshToken);
  
  console.log('🔄 Token 已自动刷新并同步到前端状态');
});

export default luckdb;
