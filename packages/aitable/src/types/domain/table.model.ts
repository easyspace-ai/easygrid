/**
 * Table Domain Model - 领域层 Table 模型
 */

import type { CreateFieldCommand } from './field.model';

/**
 * Table 领域模型
 */
export interface TableModel {
  id: string;
  name: string;
  dbTableName: string;
  baseId: string;
  icon?: string;
  description?: string;
  createdTime: Date;
  lastModifiedTime: Date;
}

/**
 * 创建 Table 命令
 */
export interface CreateTableCommand {
  name: string;
  baseId: string;
  icon?: string;
  description?: string;
  fields?: CreateFieldCommand[];
}

/**
 * 更新 Table 命令
 */
export interface UpdateTableCommand {
  name?: string;
  icon?: string;
  description?: string;
}

