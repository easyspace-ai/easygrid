/**
 * API Client Factory
 * 工厂函数用于创建 API 客户端
 */

import { ApiClient, ApiClientConfig } from './client';

/**
 * 创建 API 客户端（向后兼容）
 * @param options - 客户端配置选项
 * @returns API 客户端实例
 */
export function createApiClient(options: ApiClientConfig): ApiClient {
  return new ApiClient(options);
}

