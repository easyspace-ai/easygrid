import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse, RegisterRequest } from '@easygrid/sdk';
import luckdb from '@/lib/luckdb';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          // 新 SDK 的 login 方法返回 AuthResponse { token, record }
          // LocalAuthStore 会自动处理 token 持久化
          const response = await luckdb.auth.login(email, password);
          
          // 从 response.record 获取用户信息，从 response.token 获取 token
          // refreshToken 在新 SDK 中由 authStore 内部管理
          const token = response.token || luckdb.authStore.token;
          const user = response.record;
          
          set({
            user: user as User,
            accessToken: token || null,
            refreshToken: null, // 新 SDK 的 refreshToken 由 authStore 内部管理
            isAuthenticated: !!token && !!user,
          });
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        try {
          // 新 SDK 的 register 方法需要单独传递参数
          const response = await luckdb.auth.register(
            userData.email,
            userData.password,
            userData.passwordConfirm,
            userData.name
          );
          
          const token = response.token || luckdb.authStore.token;
          const user = response.record;
          
          set({
            user: user as User,
            accessToken: token || null,
            refreshToken: null, // 新 SDK 的 refreshToken 由 authStore 内部管理
            isAuthenticated: !!token && !!user,
          });
        } catch (error) {
          console.error('Register failed:', error);
          throw error;
        }
      },

      logout: async () => {
        try {
          await luckdb.auth.logout();
          // LocalAuthStore 会自动清除 token
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          // 确保清除本地状态
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      setAuth: (auth: AuthResponse) => {
        // 新 SDK 的 AuthResponse 格式是 { token, record }
        const user = auth.record;
        const token = auth.token;
        set({
          user: user as User,
          accessToken: token || null,
          refreshToken: null, // 新 SDK 的 refreshToken 由 authStore 内部管理
          isAuthenticated: !!token && !!user,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'luckdb-auth', // localStorage key
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

