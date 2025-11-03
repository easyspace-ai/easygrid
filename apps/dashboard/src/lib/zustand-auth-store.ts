/**
 * Zustand Auth Store 适配器
 * 将 dashboard 的 Zustand authStore 适配为 SDK 的 BaseAuthStore
 */

import { BaseAuthStore } from '@easygrid/sdk';
import type { AuthRecord } from '@easygrid/sdk';
import { useAuthStore } from '@/stores/auth-store';

/**
 * 将 dashboard 的 User 类型转换为 SDK 的 AuthRecord 类型
 */
function convertUserToAuthRecord(user: {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}): AuthRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    created: user.createdAt,
    updated: user.updatedAt,
  };
}

/**
 * Zustand Auth Store 适配器类
 * 将 Zustand store 的状态同步到 SDK 的 BaseAuthStore
 */
export class ZustandAuthStore extends BaseAuthStore {
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super();
    // 初始加载
    this.load();
    // 订阅 Zustand store 的变化
    this.subscribeToZustandStore();
  }

  /**
   * 订阅 Zustand store 的变化
   */
  private subscribeToZustandStore(): void {
    const store = useAuthStore.getState();
    
    // 监听 Zustand store 的变化
    this.unsubscribe = useAuthStore.subscribe(
      (state) => {
        const { user, accessToken, isAuthenticated } = state;
        
        if (isAuthenticated && user && accessToken) {
          // 如果有用户和 token，同步到 SDK store
          const authRecord = convertUserToAuthRecord(user);
          if (this._token !== accessToken || this._record?.id !== user.id) {
            this._token = accessToken;
            this._record = authRecord;
            this.triggerChange();
          }
        } else {
          // 如果未认证，清除状态
          if (this._token !== null || this._record !== null) {
            this._token = null;
            this._record = null;
            this.triggerChange();
          }
        }
      },
      (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      })
    );
  }

  /**
   * 保存认证信息
   * 这个方法会被 SDK 调用，但我们主要从 Zustand store 同步状态
   */
  save(token: string, record: AuthRecord): void {
    // 这里不做实际保存，因为状态由 Zustand store 管理
    // 如果需要，可以调用 Zustand store 的 setAuth 方法
    this._token = token;
    this._record = record;
    this.triggerChange();
  }

  /**
   * 清除认证信息
   */
  clear(): void {
    this._token = null;
    this._record = null;
    this.triggerChange();
  }

  /**
   * 从 Zustand store 加载认证信息
   */
  load(): void {
    const state = useAuthStore.getState();
    const { user, accessToken, isAuthenticated } = state;
    
    if (isAuthenticated && user && accessToken) {
      this._token = accessToken;
      this._record = convertUserToAuthRecord(user);
    } else {
      this._token = null;
      this._record = null;
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

