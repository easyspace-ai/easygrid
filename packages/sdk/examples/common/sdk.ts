/**
 * SDK 单例管理
 * 提供统一的 SDK 初始化和管理
 */
import LuckDB from '../../src';
import { config } from './config';
import type { AuthResponse } from '../../src/types';

let sdkInstance: LuckDB | null = null;
let currentUser: AuthResponse | null = null;

/**
 * 获取或创建 SDK 实例（单例模式）
 */
export function getSDK(): LuckDB {
  if (!sdkInstance) {
    sdkInstance = new LuckDB({
      baseUrl: config.apiUrl,
      debug: config.debug,
      disableProxy: true, // 禁用代理，避免本地代理干扰
    });
  }
  return sdkInstance;
}

/**
 * 初始化 SDK 并登录
 * @returns SDK 实例、用户信息和 token
 */
export async function initAndLogin() {
  const sdk = getSDK();
  
  try {
    const response = await sdk.login({
      email: config.testEmail,
      password: config.testPassword,
    });
    
    currentUser = response;
    
    console.log('✅ 登录成功:', {
      email: config.testEmail,
      userId: response.user.id,
    });
    
    return {
      sdk,
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
  } catch (error) {
    console.error('❌ 登录失败:', error);
    throw error;
  }
}

/**
 * 获取当前登录用户
 */
export function getCurrentUser(): AuthResponse | null {
  return currentUser;
}

/**
 * 清理资源（登出并重置 SDK）
 */
export async function cleanup() {
  if (sdkInstance && currentUser) {
    try {
      await sdkInstance.logout();
      console.log('✅ 登出成功');
    } catch (error) {
      console.warn('⚠️  登出失败:', error);
    }
  }
  
  sdkInstance = null;
  currentUser = null;
}

/**
 * 重置 SDK（不执行登出操作）
 */
export function resetSDK() {
  sdkInstance = null;
  currentUser = null;
}

