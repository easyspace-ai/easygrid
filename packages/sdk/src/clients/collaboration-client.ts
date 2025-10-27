/**
 * 协作客户端
 * 处理实时协作、在线状态、光标位置等功能
 * 使用 SSE 和 ShareDB 进行实时通信
 */

import { HttpClient } from '../core/http-client';
import type { ReactWebSocketShareDBClient } from '../core/react-websocket-sharedb-client';
import { ShareDBPresence } from '../core/sharedb-presence';
import type { 
  CollaborationSession,
  CollaborationParticipant,
  Presence,
  CursorPosition,
  CollaborationMessage,
  RecordChangeMessage,
  ShareDBPresenceData
} from '../types/index.js';

export class CollaborationClient {
  private httpClient: HttpClient;
  private shareDBClient?: ReactWebSocketShareDBClient;
  private sseEventSource: EventSource | undefined;
  private eventListeners: Map<string, Function[]> = new Map();
  private presenceManagers: Map<string, ShareDBPresence> = new Map();

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * 设置 ShareDB 客户端
   */
  public setShareDBClient(shareDBClient: ReactWebSocketShareDBClient): void {
    this.shareDBClient = shareDBClient;
  }

  /**
   * 获取集合名称
   */
  private getCollectionName(resourceType: string, resourceId: string): string {
    switch (resourceType) {
      case 'table':
        return `table_${resourceId}`;
      case 'view':
        return `view_${resourceId}`;
      case 'record':
        return `record_${resourceId}`;
      default:
        return `${resourceType}_${resourceId}`;
    }
  }

  /**
   * 获取文档ID
   */
  private getDocumentId(resourceType: string, resourceId: string): string {
    return resourceId;
  }

  // ==================== 协作会话管理 ====================

  /**
   * 创建协作会话
   */
  public async createSession(sessionData: {
    name: string;
    description?: string;
    resourceType: string;
    resourceId: string;
  }): Promise<CollaborationSession> {
    return this.httpClient.post<CollaborationSession>('/api/collaboration/sessions', sessionData);
  }

  /**
   * 获取协作会话列表
   */
  public async listSessions(params?: {
    limit?: number;
    offset?: number;
    resourceType?: string;
    resourceId?: string;
  }): Promise<{
    data: CollaborationSession[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.httpClient.get('/api/collaboration/sessions', params);
  }

  /**
   * 获取协作会话详情
   */
  public async getSession(sessionId: string): Promise<CollaborationSession> {
    return this.httpClient.get<CollaborationSession>(`/api/collaboration/sessions/${sessionId}`);
  }

  /**
   * 更新协作会话
   */
  public async updateSession(sessionId: string, updates: {
    name?: string;
    description?: string;
  }): Promise<CollaborationSession> {
    return this.httpClient.put<CollaborationSession>(`/api/collaboration/sessions/${sessionId}`, updates);
  }

  /**
   * 结束协作会话
   */
  public async endSession(sessionId: string): Promise<void> {
    await this.httpClient.delete(`/api/collaboration/sessions/${sessionId}`);
  }

  /**
   * 加入协作会话
   */
  public async joinSession(sessionId: string): Promise<CollaborationParticipant> {
    return this.httpClient.post<CollaborationParticipant>(`/api/collaboration/sessions/${sessionId}/join`);
  }

  /**
   * 离开协作会话
   */
  public async leaveSession(sessionId: string): Promise<void> {
    await this.httpClient.post(`/api/collaboration/sessions/${sessionId}/leave`);
  }

  /**
   * 获取参与者列表
   */
  public async getParticipants(sessionId: string): Promise<CollaborationParticipant[]> {
    return this.httpClient.get<CollaborationParticipant[]>(`/api/collaboration/sessions/${sessionId}/participants`);
  }

  /**
   * 邀请参与协作
   */
  public async inviteToSession(sessionId: string, userIds: string[]): Promise<void> {
    await this.httpClient.post(`/api/collaboration/sessions/${sessionId}/invite`, { userIds });
  }

  /**
   * 移除参与者
   */
  public async removeParticipant(sessionId: string, userId: string): Promise<void> {
    await this.httpClient.post(`/api/collaboration/sessions/${sessionId}/kick`, { userId });
  }

  // ==================== 在线状态管理 ====================

  /**
   * 更新在线状态
   */
  public async updatePresence(resourceType: string, resourceId: string, cursorPosition?: CursorPosition): Promise<Presence> {
    if (this.shareDBClient) {
      // 使用 ShareDB 进行实时在线状态管理
      const collection = this.getCollectionName(resourceType, resourceId);
      const docId = this.getDocumentId(resourceType, resourceId);
      
      // 获取或创建在线状态管理器
      const key = `${collection}:${docId}`;
      let presenceManager = this.presenceManagers.get(key);
      
      if (!presenceManager) {
        presenceManager = new ShareDBPresence(this.shareDBClient, collection, docId);
        this.presenceManagers.set(key, presenceManager);
        presenceManager.start();
      }

      // 更新光标位置
      if (cursorPosition) {
        presenceManager.updateCursor(cursorPosition);
      }

      // 更新活动状态
      presenceManager.updateActivity('active');
    }

    // 同时使用 HTTP API 作为备用
    const presence = await this.httpClient.post<Presence>('/api/collaboration/presence', {
      resourceType,
      resourceId,
      cursorPosition
    });

    return presence;
  }

  /**
   * 移除在线状态
   */
  public async removePresence(): Promise<void> {
    await this.httpClient.delete('/api/collaboration/presence');
  }

  /**
   * 获取在线状态列表
   */
  public async getPresenceList(resourceType?: string, resourceId?: string): Promise<Presence[]> {
    return this.httpClient.get<Presence[]>('/api/collaboration/presence', {
      resourceType,
      resourceId
    });
  }

  // ==================== 光标位置管理 ====================

  /**
   * 更新光标位置
   */
  public async updateCursor(
    resourceType: string,
    resourceId: string,
    cursorPosition: CursorPosition,
    fieldId?: string,
    recordId?: string
  ): Promise<void> {
    if (this.shareDBClient) {
      // 使用 ShareDB 进行实时光标位置更新
      const collection = this.getCollectionName(resourceType, resourceId);
      const docId = this.getDocumentId(resourceType, resourceId);
      
      const key = `${collection}:${docId}`;
      let presenceManager = this.presenceManagers.get(key);
      
      if (!presenceManager) {
        presenceManager = new ShareDBPresence(this.shareDBClient, collection, docId);
        this.presenceManagers.set(key, presenceManager);
        presenceManager.start();
      }

      // 更新光标位置，包含字段和记录信息
      const enhancedCursor = {
        ...cursorPosition,
        fieldId,
        recordId,
      };
      
      presenceManager.updateCursor(enhancedCursor);
    }

    // 同时使用 HTTP API 作为备用
    await this.httpClient.post('/api/collaboration/cursor', {
      resourceType,
      resourceId,
      cursorPosition,
      fieldId,
      recordId
    });
  }

  /**
   * 移除光标位置
   */
  public async removeCursor(): Promise<void> {
    await this.httpClient.delete('/api/collaboration/cursor');
  }

  /**
   * 获取光标位置列表
   */
  public async getCursorList(resourceType?: string, resourceId?: string): Promise<Array<{
    userId: string;
    resourceType: string;
    resourceId: string;
    cursorPosition: CursorPosition;
    fieldId?: string;
    recordId?: string;
    lastSeen: string;
  }>> {
    return this.httpClient.get('/api/collaboration/cursor', {
      resourceType,
      resourceId
    });
  }

  // ==================== SSE 事件处理 ====================

  /**
   * 初始化 SSE 连接
   */
  public initializeSSE(): void {
    if (this.sseEventSource) {
      this.sseEventSource.close();
    }

    // 检查环境是否支持 EventSource
    if (typeof EventSource === 'undefined') {
      console.warn('EventSource is not available in this environment. SSE features will be disabled.');
      return;
    }

    // 构建 SSE URL
    const baseUrl = this.httpClient.getBaseUrl();
    const sseUrl = `${baseUrl}/api/realtime?client_id=${Date.now()}`;
    
    this.sseEventSource = new EventSource(sseUrl);
    this.setupSSEEventHandlers();
  }

  private setupSSEEventHandlers(): void {
    if (!this.sseEventSource) return;

    this.sseEventSource.onopen = () => {
      this.emit('connected');
    };

    this.sseEventSource.onerror = (error) => {
      this.emit('error', error);
    };

    this.sseEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
        
        // 根据消息类型分发到具体的事件处理器
        if (data.type) {
          this.emit(data.type, data);
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };
  }

  /**
   * 关闭 SSE 连接
   */
  public closeSSE(): void {
    if (this.sseEventSource) {
      this.sseEventSource.close();
      this.sseEventSource = undefined;
    }
  }

  // ==================== 事件监听方法 ====================

  /**
   * 监听 SSE 连接成功事件
   */
  public onSSEConnected(callback: () => void): void {
    this.on('connected', callback);
  }

  /**
   * 监听 SSE 断开连接事件
   */
  public onSSEDisconnected(callback: (data: any) => void): void {
    this.on('disconnected', callback);
  }

  /**
   * 监听 SSE 错误事件
   */
  public onSSEError(callback: (error: Error) => void): void {
    this.on('error', callback);
  }

  /**
   * 监听所有消息
   */
  public onMessage(callback: (message: any) => void): void {
    this.on('message', callback);
  }

  /**
   * 监听表格更新事件
   */
  public onTableUpdate(callback: (message: any) => void): void {
    this.on('table_update', callback);
  }

  /**
   * 监听记录更新事件
   */
  public onRecordUpdate(callback: (message: any) => void): void {
    this.on('record_update', callback);
  }

  /**
   * 监听视图更新事件
   */
  public onViewUpdate(callback: (message: any) => void): void {
    this.on('view_update', callback);
  }

  /**
   * 监听记录变更事件（兼容旧版本API）
   */
  public onRecordChange(callback: (message: RecordChangeMessage) => void): void {
    this.on('record_change', callback);
  }

  /**
   * 监听协作消息
   */
  public onCollaboration(callback: (message: CollaborationMessage) => void): void {
    this.on('collaboration', callback);
  }

  /**
   * 监听在线状态更新
   */
  public onPresenceUpdate(callback: (message: any) => void): void {
    this.on('presence_update', callback);
  }

  /**
   * 监听光标更新
   */
  public onCursorUpdate(callback: (message: any) => void): void {
    this.on('cursor_update', callback);
  }

  /**
   * 监听通知消息
   */
  public onNotification(callback: (message: any) => void): void {
    this.on('notification', callback);
  }

  /**
   * 添加事件监听器
   */
  private on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * 移除事件监听器
   */
  public off(event: string, callback?: Function): void {
    if (!this.eventListeners.has(event)) return;
    
    if (callback) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  /**
   * 移除所有事件监听器
   */
  public removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  // ==================== 实时协作方法 ====================

  /**
   * 订阅表格的实时更新
   */
  public subscribeToTable(tableId: string): void {
    // 通过 HTTP API 订阅表格更新
    this.httpClient.post('/api/realtime/subscribe', {
      type: 'table',
      resourceId: tableId
    }).catch(error => {
      console.error('Failed to subscribe to table:', error);
    });
  }

  /**
   * 取消订阅表格
   */
  public unsubscribeFromTable(tableId: string): void {
    this.httpClient.post('/api/realtime/unsubscribe', {
      type: 'table',
      resourceId: tableId
    }).catch(error => {
      console.error('Failed to unsubscribe from table:', error);
    });
  }

  /**
   * 订阅记录的实时更新
   */
  public subscribeToRecord(tableId: string, recordId: string): void {
    this.httpClient.post('/api/realtime/subscribe', {
      type: 'record',
      resourceId: recordId,
      tableId: tableId
    }).catch(error => {
      console.error('Failed to subscribe to record:', error);
    });
  }

  /**
   * 取消订阅记录
   */
  public unsubscribeFromRecord(tableId: string, recordId: string): void {
    this.httpClient.post('/api/realtime/unsubscribe', {
      type: 'record',
      resourceId: recordId,
      tableId: tableId
    }).catch(error => {
      console.error('Failed to unsubscribe from record:', error);
    });
  }

  /**
   * 订阅视图的实时更新
   */
  public subscribeToView(viewId: string): void {
    this.httpClient.post('/api/realtime/subscribe', {
      type: 'view',
      resourceId: viewId
    }).catch(error => {
      console.error('Failed to subscribe to view:', error);
    });
  }

  /**
   * 取消订阅视图
   */
  public unsubscribeFromView(viewId: string): void {
    this.httpClient.post('/api/realtime/unsubscribe', {
      type: 'view',
      resourceId: viewId
    }).catch(error => {
      console.error('Failed to unsubscribe from view:', error);
    });
  }

  // ==================== 协作统计 ====================

  /**
   * 获取协作统计信息
   */
  public async getCollaborationStats(): Promise<{
    activeSessions: number;
    totalParticipants: number;
    onlineUsers: number;
    recentActivity: Array<{
      type: string;
      userId: string;
      resourceType: string;
      resourceId: string;
      timestamp: string;
    }>;
  }> {
    return this.httpClient.get('/api/collaboration/stats');
  }

  /**
   * 获取用户协作活动
   */
  public async getUserCollaborationActivity(userId: string, params?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    data: Array<{
      sessionId: string;
      resourceType: string;
      resourceId: string;
      action: string;
      timestamp: string;
    }>;
    total: number;
  }> {
    return this.httpClient.get(`/api/collaboration/users/${userId}/activity`, params);
  }

}
