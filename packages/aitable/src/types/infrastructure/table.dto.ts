/**
 * Table DTO - API 层 Table 数据传输对象
 */

import type { CreateFieldDTO } from './field.dto';

/**
 * Table DTO (从 API 返回)
 */
export interface TableDTO {
  id: string;
  name: string;
  dbTableName: string;
  baseId: string;
  icon?: string;
  description?: string;
  createdTime: string;
  lastModifiedTime: string;
}

/**
 * 创建 Table 请求 DTO
 */
export interface CreateTableDTO {
  name: string;
  baseId: string;
  icon?: string;
  description?: string;
  fields?: CreateFieldDTO[];
}

/**
 * 更新 Table 请求 DTO
 */
export interface UpdateTableDTO {
  name?: string;
  icon?: string;
  description?: string;
}

