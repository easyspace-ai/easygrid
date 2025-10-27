/**
 * View Domain Model - 领域层 View 模型
 */

import type { ViewType } from '../infrastructure';

/**
 * View 领域模型
 */
export interface ViewModel {
  id: string;
  name: string;
  type: ViewType;
  tableId: string;
  order: number;
  filter?: any; // TODO: 定义具体的 Filter 类型
  sort?: any[]; // TODO: 定义具体的 Sort 类型
  group?: any[]; // TODO: 定义具体的 Group 类型
  columnMeta?: Map<string, any>;
  createdTime: Date;
  lastModifiedTime: Date;
}

/**
 * 创建 View 命令
 */
export interface CreateViewCommand {
  name: string;
  type: ViewType;
  tableId?: string;
}

/**
 * 更新 View 命令
 */
export interface UpdateViewCommand {
  name?: string;
  type?: ViewType;
  filter?: any;
  sort?: any[];
  group?: any[];
  columnMeta?: Map<string, any> | Record<string, any>;
}

