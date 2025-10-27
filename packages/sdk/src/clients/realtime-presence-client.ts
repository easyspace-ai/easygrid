/**
 * 实时在线状态客户端
 * 管理用户在线状态、光标位置和选区
 */

import type { 
  PresenceUser,
  CursorPosition,
  Selection,
  CursorEvent,
  SelectionEvent
} from '../types/realtime.js';
import type { EventBus, PresenceEvent } from '../types/events.js';

export class RealtimePresenceClient {
  private eventBus: EventBus;
  private connection: any; // ShareDBConnection 实例
  private currentUser: PresenceUser | null = null;
  private users: Map<string, PresenceUser> = new Map();
  private activeSessions: Map<string, { resourceType: string; resourceId: string }> = new Map();

  constructor(eventBus: EventBus, connection: any) {
    this.eventBus = eventBus;
    this.connection = connection;
    this.setupEventHandlers();
  }

  /**
   * 加入协作会话
   */
  join(resourceType: string, resourceId: string, userData?: any): void {
    if (!this.connection || !this.connection.isConnected()) {
      throw new Error('ShareDB connection not established');
    }

    // 创建当前用户信息
    this.currentUser = {
      userId: userData?.userId || 'anonymous',
      name: userData?.name || 'Anonymous User',
      avatar: userData?.avatar,
      color: userData?.color || this.generateUserColor(),
      lastSeen: Date.now()
    };

    // 记录活跃会话
    const sessionKey = `${resourceType}:${resourceId}`;
    this.activeSessions.set(sessionKey, { resourceType, resourceId });

    // 发送在线状态消息
    this.sendPresenceMessage(resourceType, resourceId, {
      action: 'join',
      user: this.currentUser,
      timestamp: Date.now()
    });

    // 触发用户加入事件
    this.emitPresenceEvent('user-joined', {
      type: 'user-joined',
      timestamp: Date.now(),
      userId: this.currentUser.userId,
      data: this.currentUser
    } as PresenceEvent);
  }

  /**
   * 离开协作会话
   */
  leave(resourceType: string, resourceId: string): void {
    if (!this.currentUser) {
      return;
    }

    const sessionKey = `${resourceType}:${resourceId}`;
    this.activeSessions.delete(sessionKey);

    // 发送离开消息
    this.sendPresenceMessage(resourceType, resourceId, {
      action: 'leave',
      user: this.currentUser,
      timestamp: Date.now()
    });

    // 触发用户离开事件
    this.emitPresenceEvent('user-left', {
      type: 'user-left',
      timestamp: Date.now(),
      userId: this.currentUser.userId,
      data: this.currentUser
    } as PresenceEvent);
  }

  /**
   * 更新光标位置
   */
  updateCursor(position: CursorPosition): void {
    if (!this.currentUser) {
      return;
    }

    this.currentUser.cursor = {
      ...position,
      timestamp: Date.now()
    };

    // 发送光标更新消息
    this.broadcastPresenceUpdate({
      action: 'cursor-move',
      user: this.currentUser,
      data: position,
      timestamp: Date.now()
    });

    // 触发光标移动事件
    this.emitPresenceEvent('cursor-moved', {
      type: 'cursor-moved',
      timestamp: Date.now(),
      userId: this.currentUser.userId,
      data: {
        userId: this.currentUser.userId,
        position: this.currentUser.cursor,
        timestamp: Date.now()
      }
    } as PresenceEvent);
  }

  /**
   * 更新选区
   */
  updateSelection(selection: Selection): void {
    if (!this.currentUser) {
      return;
    }

    this.currentUser.selection = {
      ...selection,
      timestamp: Date.now()
    };

    // 发送选区更新消息
    this.broadcastPresenceUpdate({
      action: 'selection-change',
      user: this.currentUser,
      data: selection,
      timestamp: Date.now()
    });

    // 触发选区变更事件
    this.emitPresenceEvent('selection-changed', {
      type: 'selection-changed',
      timestamp: Date.now(),
      userId: this.currentUser.userId,
      data: {
        userId: this.currentUser.userId,
        selection: this.currentUser.selection,
        timestamp: Date.now()
      }
    } as PresenceEvent);
  }

  /**
   * 更新用户信息
   */
  updateUserInfo(userInfo: Partial<PresenceUser>): void {
    if (!this.currentUser) {
      return;
    }

    this.currentUser = { ...this.currentUser, ...userInfo };
    
    // 广播用户信息更新
    this.broadcastPresenceUpdate({
      action: 'user-update',
      user: this.currentUser,
      timestamp: Date.now()
    });
  }

  /**
   * 监听用户加入
   */
  onUserJoined(callback: (user: PresenceUser) => void): void {
    this.eventBus.on('user-joined', callback);
  }

  /**
   * 移除用户加入监听器
   */
  offUserJoined(callback: (user: PresenceUser) => void): void {
    this.eventBus.off('user-joined', callback);
  }

  /**
   * 监听用户离开
   */
  onUserLeft(callback: (user: PresenceUser) => void): void {
    this.eventBus.on('user-left', callback);
  }

  /**
   * 移除用户离开监听器
   */
  offUserLeft(callback: (user: PresenceUser) => void): void {
    this.eventBus.off('user-left', callback);
  }

  /**
   * 监听光标移动
   */
  onCursorMove(callback: (event: CursorEvent) => void): void {
    this.eventBus.on('cursor-moved', callback);
  }

  /**
   * 移除光标移动监听器
   */
  offCursorMove(callback: (event: CursorEvent) => void): void {
    this.eventBus.off('cursor-moved', callback);
  }

  /**
   * 监听选区变更
   */
  onSelectionChange(callback: (event: SelectionEvent) => void): void {
    this.eventBus.on('selection-changed', callback);
  }

  /**
   * 移除选区变更监听器
   */
  offSelectionChange(callback: (event: SelectionEvent) => void): void {
    this.eventBus.off('selection-changed', callback);
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): PresenceUser | null {
    return this.currentUser;
  }

  /**
   * 获取所有用户
   */
  getAllUsers(): PresenceUser[] {
    return Array.from(this.users.values());
  }

  /**
   * 获取活跃会话
   */
  getActiveSessions(): Array<{ resourceType: string; resourceId: string }> {
    return Array.from(this.activeSessions.values());
  }

  /**
   * 设置连接
   */
  setConnection(connection: any): void {
    this.connection = connection;
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    // 离开所有活跃会话
    for (const session of this.activeSessions.values()) {
      this.leave(session.resourceType, session.resourceId);
    }
    
    this.activeSessions.clear();
    this.users.clear();
    this.currentUser = null;
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 监听在线状态消息
    this.eventBus.on('presence', (event: any) => {
      this.handlePresenceMessage(event);
    });
  }

  /**
   * 处理在线状态消息
   */
  private handlePresenceMessage(event: any): void {
    const { action, user, data } = event.data || {};

    switch (action) {
      case 'join':
        this.users.set(user.userId, user);
        this.emitPresenceEvent('user-joined', {
          type: 'user-joined',
          timestamp: Date.now(),
          userId: user.userId,
          data: user
        } as PresenceEvent);
        break;

      case 'leave':
        this.users.delete(user.userId);
        this.emitPresenceEvent('user-left', {
          type: 'user-left',
          timestamp: Date.now(),
          userId: user.userId,
          data: user
        } as PresenceEvent);
        break;

      case 'cursor-move':
        if (this.users.has(user.userId)) {
          const existingUser = this.users.get(user.userId)!;
          existingUser.cursor = data;
          this.users.set(user.userId, existingUser);
        }
        this.emitPresenceEvent('cursor-moved', {
          type: 'cursor-moved',
          timestamp: Date.now(),
          userId: user.userId,
          data: {
            userId: user.userId,
            position: data,
            timestamp: Date.now()
          }
        } as PresenceEvent);
        break;

      case 'selection-change':
        if (this.users.has(user.userId)) {
          const existingUser = this.users.get(user.userId)!;
          existingUser.selection = data;
          this.users.set(user.userId, existingUser);
        }
        this.emitPresenceEvent('selection-changed', {
          type: 'selection-changed',
          timestamp: Date.now(),
          userId: user.userId,
          data: {
            userId: user.userId,
            selection: data,
            timestamp: Date.now()
          }
        } as PresenceEvent);
        break;

      case 'user-update':
        this.users.set(user.userId, user);
        break;
    }
  }

  /**
   * 发送在线状态消息
   */
  private sendPresenceMessage(resourceType: string, resourceId: string, data: any): void {
    if (!this.connection || !this.connection.isConnected()) {
      return;
    }

    const message = {
      a: 'p',
      c: `${resourceType}_${resourceId}`,
      d: resourceId,
      data
    };

    this.connection.send(message);
  }

  /**
   * 广播在线状态更新
   */
  private broadcastPresenceUpdate(data: any): void {
    for (const session of this.activeSessions.values()) {
      this.sendPresenceMessage(session.resourceType, session.resourceId, data);
    }
  }

  /**
   * 触发在线状态事件
   */
  private emitPresenceEvent(type: string, event: PresenceEvent): void {
    this.eventBus.emit('presence', event);
  }

  /**
   * 生成用户颜色
   */
  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 获取在线状态统计
   */
  getStats(): {
    totalUsers: number;
    activeSessions: number;
    currentUser: boolean;
  } {
    return {
      totalUsers: this.users.size,
      activeSessions: this.activeSessions.size,
      currentUser: !!this.currentUser
    };
  }
}
