/**
 * Field Domain Model - 领域层字段模型
 * 
 * 设计原则：
 * 1. 纯业务模型，包含业务逻辑
 * 2. 不依赖外部服务
 * 3. 类型安全的字段选项
 */

import type { FieldType, FieldOptions } from '../core';

/**
 * 字段领域模型
 * 这是业务层使用的字段模型
 */
export interface FieldModel<T extends FieldType = FieldType> {
  id: string;
  name: string;
  type: T;
  tableId: string;
  options?: any;
  description?: string;
  isComputed: boolean;
  isPrimary: boolean;
  createdTime: Date;
  lastModifiedTime: Date;
}

/**
 * 创建字段命令
 */
export interface CreateFieldCommand<T extends FieldType = FieldType> {
  name: string;
  type: T;
  options?: any;
  description?: string;
  isPrimary?: boolean;
}

/**
 * 更新字段命令
 */
export interface UpdateFieldCommand<T extends FieldType = FieldType> {
  name?: string;
  type?: T;
  options?: any;
  description?: string;
}

/**
 * 转换字段命令
 */
export interface ConvertFieldCommand<T extends FieldType = FieldType> {
  type: T;
  options?: any;
}

