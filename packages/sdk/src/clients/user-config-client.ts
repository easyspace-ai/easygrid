/**
 * 用户配置客户端
 * 处理用户配置的获取和更新
 */

import { HttpClient } from '../core/http-client.js';
import type { UserConfig, UpdateUserConfigRequest } from '../types/index.js';

export class UserConfigClient {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * 获取用户配置
   * GET /api/v1/user/config
   */
  public async getUserConfig(): Promise<UserConfig> {
    return this.httpClient.get<UserConfig>('/api/v1/user/config');
  }

  /**
   * 更新用户配置
   * PUT /api/v1/user/config
   */
  public async updateUserConfig(data: UpdateUserConfigRequest): Promise<UserConfig> {
    return this.httpClient.put<UserConfig>('/api/v1/user/config', data);
  }

  /**
   * 更新主题设置
   * @param theme 主题名称
   */
  public async updateTheme(theme: string): Promise<UserConfig> {
    return this.updateUserConfig({ theme });
  }

  /**
   * 更新语言设置
   * @param language 语言代码
   */
  public async updateLanguage(language: string): Promise<UserConfig> {
    return this.updateUserConfig({ language });
  }

  /**
   * 更新通知设置
   * @param notifications 通知配置
   */
  public async updateNotifications(notifications: Record<string, any>): Promise<UserConfig> {
    return this.updateUserConfig({ notifications });
  }

  /**
   * 更新用户偏好设置
   * @param preferences 偏好配置
   */
  public async updatePreferences(preferences: Record<string, any>): Promise<UserConfig> {
    return this.updateUserConfig({ preferences });
  }

  /**
   * 获取特定配置项
   * @param key 配置键
   */
  public async getConfigValue(key: string): Promise<any> {
    const config = await this.getUserConfig();
    
    // 支持嵌套键，如 'notifications.email'
    const keys = key.split('.');
    let value: any = config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * 设置特定配置项
   * @param key 配置键
   * @param value 配置值
   */
  public async setConfigValue(key: string, value: any): Promise<UserConfig> {
    const config = await this.getUserConfig();
    
    // 支持嵌套键，如 'notifications.email'
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    let target: any = config;
    
    // 创建嵌套对象结构
    for (const k of keys) {
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[lastKey] = value;
    
    return this.updateUserConfig(config);
  }

  /**
   * 重置配置为默认值
   */
  public async resetConfig(): Promise<UserConfig> {
    const defaultConfig: UpdateUserConfigRequest = {
      theme: 'auto',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        inApp: true,
      },
      preferences: {},
    };
    
    return this.updateUserConfig(defaultConfig);
  }

  /**
   * 批量更新配置
   * @param updates 配置更新对象
   */
  public async batchUpdateConfig(updates: Record<string, any>): Promise<UserConfig> {
    const config = await this.getUserConfig();
    
    // 深度合并配置
    const mergedConfig = this.deepMerge(config, updates);
    
    return this.updateUserConfig(mergedConfig);
  }

  /**
   * 检查配置是否存在
   * @param key 配置键
   */
  public async hasConfig(key: string): Promise<boolean> {
    const value = await this.getConfigValue(key);
    return value !== undefined;
  }

  /**
   * 删除配置项
   * @param key 配置键
   */
  public async removeConfig(key: string): Promise<UserConfig> {
    const config = await this.getUserConfig();
    
    // 支持嵌套键删除
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    let target: any = config;
    
    for (const k of keys) {
      if (target && typeof target === 'object' && k in target) {
        target = target[k];
      } else {
        return config; // 键不存在，直接返回
      }
    }
    
    if (target && typeof target === 'object' && lastKey in target) {
      delete target[lastKey];
    }
    
    return this.updateUserConfig(config);
  }

  // ==================== 私有方法 ====================

  /**
   * 深度合并对象
   * @param target 目标对象
   * @param source 源对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
}
