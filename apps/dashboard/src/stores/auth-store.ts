/**
 * 认证状态管理
 * 参考 manage 项目实现，使用 Zustand 进行状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import luckdb from '@/lib/luckdb';

// 类型定义
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;  // ✅ 新增：标记 persist hydration 是否完成
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
  checkAuth: () => boolean;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  setHasHydrated: (state: boolean) => void;  // ✅ 设置 hydration 状态
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,  // ✅ 初始值为 false

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      login: async (email: string, password: string) => {
        try {
          // 使用 SDK 进行登录
          const response = await luckdb.login({ email, password });
          
          // 设置 SDK 的 token
          luckdb.setAccessToken(response.accessToken);
          luckdb.setRefreshToken(response.refreshToken);
          
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
          });

          // 保存到 localStorage（作为备用）
          localStorage.setItem('luckdb_auth_token', response.accessToken);
          if (response.refreshToken) {
            localStorage.setItem('luckdb_refresh_token', response.refreshToken);
          }
          
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        try {
          // 使用 SDK 进行注册
          const response = await luckdb.register(userData);
          
          // 设置 SDK 的 token
          luckdb.setAccessToken(response.accessToken);
          luckdb.setRefreshToken(response.refreshToken);
          
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
          });

          // 保存到 localStorage（作为备用）
          localStorage.setItem('luckdb_auth_token', response.accessToken);
          if (response.refreshToken) {
            localStorage.setItem('luckdb_refresh_token', response.refreshToken);
          }
          
        } catch (error) {
          console.error('Register failed:', error);
          throw error;
        }
      },

      logout: async () => {
        try {
          // 使用 SDK 进行登出
          await luckdb.logout();
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          // 清除 SDK 的 token
          luckdb.clearTokens();
          
          // 清除本地状态
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });

          // 清除 localStorage
          localStorage.removeItem('luckdb_auth_token');
          localStorage.removeItem('luckdb_refresh_token');
        }
      },

      setAuth: (auth: AuthResponse) => {
        set({
          user: auth.user,
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          isAuthenticated: true,
        });

        // 保存到 localStorage
        localStorage.setItem('luckdb_auth_token', auth.accessToken);
        if (auth.refreshToken) {
          localStorage.setItem('luckdb_refresh_token', auth.refreshToken);
        }
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });

        // 清除 localStorage
        localStorage.removeItem('luckdb_auth_token');
        localStorage.removeItem('luckdb_refresh_token');
      },

      checkAuth: () => {
        const { accessToken, isAuthenticated } = get();
        const hasToken = !!accessToken || !!localStorage.getItem('luckdb_auth_token');
        return isAuthenticated && hasToken;
      },

      updateTokens: (accessToken: string, refreshToken?: string) => {
        set({
          accessToken,
          refreshToken: refreshToken || get().refreshToken,
        });

        // 同步更新 localStorage
        localStorage.setItem('luckdb_auth_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('luckdb_refresh_token', refreshToken);
        }
      },
    }),
    {
      name: 'luckdb-dashboard-auth', // localStorage key
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        // 注意：_hasHydrated 不持久化，每次刷新都重新检测
      }),
      // ✅ 监听 hydration 完成事件
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('❌ Auth Store Hydration 失败:', error);
            // 即使失败也设置为已完成，避免永久卡在加载状态
            state?.setHasHydrated?.(true);
          } else {
            console.log('✅ Auth Store Hydration 完成:', {
              isAuthenticated: state?.isAuthenticated,
              hasUser: !!state?.user,
              hasAccessToken: !!state?.accessToken,
              hasRefreshToken: !!state?.refreshToken,
            });
            
            // 如果有 token，自动恢复到 SDK
            if (state?.isAuthenticated && state?.accessToken) {
              try {
                luckdb.setAccessToken(state.accessToken);
                if (state.refreshToken) {
                  luckdb.setRefreshToken(state.refreshToken);
                }
                console.log('✅ Token 已自动恢复到 SDK');
              } catch (e) {
                console.error('❌ 恢复 Token 到 SDK 失败:', e);
              }
            }
            
            // 设置 hydration 完成标志
            state?.setHasHydrated?.(true);
          }
        };
      },
    }
  )
);
