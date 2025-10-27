/**
 * Infrastructure Types - 基础设施层类型导出
 * 
 * 这一层包含所有与外部系统交互的数据传输对象 (DTO)
 * - API 请求/响应类型
 * - 与后端契约一致
 * - 不包含业务逻辑
 */

// DTO 导出
export * from './base.dto';
export * from './table.dto';
export * from './field.dto';
export * from './record.dto';
export * from './view.dto';

// 通用响应类型
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

