/**
 * 认证客户端（完全匹配EasyDB API v1）
 * 处理用户登录、注册、token 管理等功能
 */

import { HttpClient } from '../core/http-client';
import type { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  UserPreferences
} from '../types/index.js';

export class AuthClient {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * 用户登录（POST /api/v1/auth/login）
   */
  public async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.httpClient.post<AuthResponse>('/api/v1/auth/login', credentials);
    
    // 自动设置 token (响应使用camelCase)
    this.httpClient.setAccessToken(response.accessToken);
    this.httpClient.setRefreshToken(response.refreshToken);
    
    return response;
  }

  /**
   * 用户注册（POST /api/v1/auth/register）
   */
  public async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.httpClient.post<AuthResponse>('/api/v1/auth/register', userData);
    
    // 自动设置 token (响应使用camelCase)
    this.httpClient.setAccessToken(response.accessToken);
    this.httpClient.setRefreshToken(response.refreshToken);
    
    return response;
  }

  /**
   * 刷新访问令牌（POST /api/v1/auth/refresh）
   */
  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return this.httpClient.post('/api/v1/auth/refresh', { refreshToken });
  }

  /**
   * 用户登出（POST /api/v1/auth/logout）
   */
  public async logout(): Promise<void> {
    await this.httpClient.post('/api/v1/auth/logout');
    
    // 清除本地 token
    this.httpClient.clearTokens();
  }

  /**
   * 获取当前用户信息（GET /api/v1/auth/me）
   */
  public async getCurrentUser(): Promise<User> {
    return this.httpClient.get<User>('/api/v1/auth/me');
  }

  /**
   * 更新用户资料（PUT /api/v1/users/profile）
   * 注：当前API可能未实现，仅预留接口
   */
  public async updateProfile(updates: Partial<User>): Promise<User> {
    return this.httpClient.patch<User>('/api/v1/users/profile', updates);
  }

  /**
   * 修改密码（POST /api/v1/users/change-password）
   * 注：当前API可能未实现，仅预留接口
   */
  public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.httpClient.post('/api/v1/users/change-password', {
      currentPassword,
      newPassword
    });
  }

  /**
   * 获取用户活动记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async getUserActivity(userId: string, limit?: number, offset?: number): Promise<any[]> {
    return this.httpClient.get(`/api/v1/users/${userId}/activity`, { limit, offset });
  }

  /**
   * 获取用户偏好设置
   * 注：当前API可能未实现，仅预留接口
   */
  public async getUserPreferences(): Promise<UserPreferences> {
    return this.httpClient.get<UserPreferences>('/api/v1/users/preferences');
  }

  /**
   * 更新用户偏好设置
   * 注：当前API可能未实现，仅预留接口
   */
  public async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.httpClient.patch<UserPreferences>('/api/v1/users/preferences', preferences);
  }

  /**
   * 检查是否已登录
   */
  public isAuthenticated(): boolean {
    // 这里可以添加更复杂的 token 验证逻辑
    return !!(this.httpClient as any)['accessToken'];
  }

  /**
   * 获取当前访问令牌
   */
  public getAccessToken(): string | undefined {
    return (this.httpClient as any)['accessToken'];
  }

  /**
   * 获取当前刷新令牌
   */
  public getRefreshToken(): string | undefined {
    return (this.httpClient as any)['refreshToken'];
  }
}
