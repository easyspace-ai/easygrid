/**
 * 响应适配器：将后端的分页响应格式转换为前端期望的格式
 * 
 * 后端格式（PaginatedSuccess）：
 * {
 *   list: [...],
 *   pagination: { page, limit, total, total_pages }
 * }
 * 
 * 前端格式（PaginatedResponse）：
 * {
 *   data: [...],
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */

import type { PaginatedResponse } from "../types";

export interface BackendPaginatedResponse<T> {
  list: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * 转换后端分页响应为前端格式
 */
export function adaptPaginatedResponse<T>(
  backendResponse: BackendPaginatedResponse<T>
): PaginatedResponse<T> {
  const { list, pagination } = backendResponse;
  
  return {
    data: list,
    total: pagination.total,
    limit: pagination.limit,
    offset: (pagination.page - 1) * pagination.limit
  };
}

