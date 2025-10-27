/**
 * ShareDB 在线状态管理
 * 处理用户在线状态、光标位置等协作信息
 */

import type { ReactWebSocketShareDBClient } from './react-websocket-sharedb-client.js';
import type { ShareDBPresenceData } from '../types/index.js';

export interface PresenceUpdate {
  userId: string;
  data: Record<string, any>;
  timestamp: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  fieldId?: string;
  recordId?: string;
}

export interface UserPresence {
  userId: string;
  data: Record<string, any>;
  lastSeen: number;
  isActive: boolean;
}

export type PresenceEventHandler = (update: PresenceUpdate) => void;

export class ShareDBPresence {
  private client: ReactWebSocketShareDBClient;
  private collection: string;
  private docId: string;
  private currentPresence: ShareDBPresenceData | null = null;
  private presenceHandlers: PresenceEventHandler[] = [];
  private updateInterval?: any;
  private isActive: boolean = false;

  constructor(client: ReactWebSocketShareDBClient, collection: string, docId: string) {
    this.client = client;
    this.collection = collection;
    this.docId = docId;
  }

  /**
   * 开始在线状态管理
   */
  public start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.setupPresenceUpdate();
  }

  /**
   * 停止在线状态管理
   */
  public stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    // 发送离线状态
    this.submitPresence({
      active: false,
      lastSeen: Date.now(),
    });
  }

  /**
   * 更新光标位置
   */
  public updateCursor(cursor: CursorPosition): void {
    this.submitPresence({
      cursor,
      active: true,
      lastSeen: Date.now(),
    });
  }

  /**
   * 更新选择状态
   */
  public updateSelection(selection: any): void {
    this.submitPresence({
      selection,
      active: true,
      lastSeen: Date.now(),
    });
  }

  /**
   * 更新用户活动状态
   */
  public updateActivity(activity: string): void {
    this.submitPresence({
      activity,
      active: true,
      lastSeen: Date.now(),
    });
  }

  /**
   * 获取当前在线状态
   */
  public getCurrentPresence(): ShareDBPresenceData | null {
    return this.currentPresence;
  }

  /**
   * 获取所有用户的在线状态
   */
  public getAllPresences(): UserPresence[] {
    // 这里需要从 ShareDB 客户端获取所有在线用户信息
    // 实际实现需要根据服务端的 presence 管理机制
    return [];
  }

  /**
   * 监听在线状态变化
   */
  public onPresenceUpdate(handler: PresenceEventHandler): void {
    this.presenceHandlers.push(handler);
  }

  /**
   * 移除在线状态监听器
   */
  public offPresenceUpdate(handler: PresenceEventHandler): void {
    const index = this.presenceHandlers.indexOf(handler);
    if (index > -1) {
      this.presenceHandlers.splice(index, 1);
    }
  }

  /**
   * 检查是否在线
   */
  public isOnline(): boolean {
    return this.isActive && this.currentPresence !== null;
  }

  /**
   * 获取最后活跃时间
   */
  public getLastSeen(): number | null {
    return this.currentPresence?.lastSeen || null;
  }

  // ==================== 私有方法 ====================

  private submitPresence(data: Record<string, any>): void {
    if (!this.isActive) {
      return;
    }

    this.currentPresence = {
      id: 'current-user', // 从认证信息获取
      data,
      lastSeen: Date.now(),
    };

    this.client.submitPresence(this.collection, this.docId, data);
  }

  private setupPresenceUpdate(): void {
    // 定期发送心跳，保持在线状态
    this.updateInterval = setInterval(() => {
      if (this.isActive) {
        this.submitPresence({
          heartbeat: true,
          active: true,
          lastSeen: Date.now(),
        });
      }
    }, 30000); // 30秒心跳

    // 监听页面可见性变化
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.submitPresence({
            active: false,
            lastSeen: Date.now(),
          });
        } else {
          this.submitPresence({
            active: true,
            lastSeen: Date.now(),
          });
        }
      });
    }

    // 监听窗口关闭
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.submitPresence({
          active: false,
          lastSeen: Date.now(),
        });
      });
    }
  }

  private notifyPresenceUpdate(update: PresenceUpdate): void {
    this.presenceHandlers.forEach(handler => {
      try {
        handler(update);
      } catch (error) {
        console.error('Error in presence handler:', error);
      }
    });
  }
}
