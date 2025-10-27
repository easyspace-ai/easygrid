/**
 * API Module Exports
 */

// 导出核心 API 客户端（向后兼容）
export { ApiClient } from './client';

// 导出 SDK 适配器（新增 - 用于外部 SDK 注入）
export {
  type ISDKAdapter,
  LuckDBAdapter,
  ApiClientAdapter,
  createAdapter,
  isLuckDBSDK,
  isApiClient,
} from './sdk-adapter';

// 导出类型
export * from './types';

// 创建 API 客户端的工厂函数
export { createApiClient } from './factory';


