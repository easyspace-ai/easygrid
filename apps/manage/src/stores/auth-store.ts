import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthRecord, AuthResponse } from '@easygrid/sdk';
import luckdb, { authStore as luckdbAuthStore } from '@/lib/luckdb';

interface AuthState {
  user: AuthRecord | null;
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
          const resp = await luckdb.auth.login(email, password);
          // SDK 已在 authService 内部保存到 authStore，这里同步到 zustand
          luckdbAuthStore.save(resp.token, resp.record);
          set({
            user: resp.record,
            accessToken: resp.token,
            refreshToken: null,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },

      register: async (userData: { email: string; password: string; passwordConfirm: string; name?: string }) => {
        try {
          const resp = await luckdb.auth.register(userData.email, userData.password, userData.passwordConfirm, userData.name);
          luckdbAuthStore.save(resp.token, resp.record);
          set({
            user: resp.record,
            accessToken: resp.token,
            refreshToken: null,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Register failed:', error);
          throw error;
        }
      },

      logout: async () => {
        try {
          await luckdb.auth.logout();
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          luckdbAuthStore.clear();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      setAuth: (auth: AuthResponse) => {
        set({
          user: auth.record,
          accessToken: auth.token,
          refreshToken: null,
          isAuthenticated: true,
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

