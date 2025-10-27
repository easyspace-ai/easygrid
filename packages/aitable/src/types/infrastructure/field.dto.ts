/**
 * Field DTO - API 层字段数据传输对象
 * 
 * 设计原则：
 * 1. 仅用于 API 通信
 * 2. 与后端 API 契约严格一致
 * 3. 不包含业务逻辑
 */

import type { FieldType } from '../core';

/**
 * 字段 DTO (从 API 返回)
 */
export interface FieldDTO {
  id: string;
  name: string;
  type: FieldType;
  tableId: string;
  options?: any; // API 返回的原始 options
  description?: string;
  isComputed: boolean;
  isPrimary: boolean;
  createdTime: string;
  lastModifiedTime: string;
}

/**
 * 创建字段请求 DTO
 */
export interface CreateFieldDTO {
  name: string;
  type: FieldType;
  options?: any;
  description?: string;
  isPrimary?: boolean;
}

/**
 * 更新字段请求 DTO
 */
export interface UpdateFieldDTO {
  name?: string;
  type?: FieldType;
  options?: any;
  description?: string;
}

/**
 * 字段转换请求 DTO
 */
export interface ConvertFieldDTO {
  type: FieldType;
  options?: any;
}

