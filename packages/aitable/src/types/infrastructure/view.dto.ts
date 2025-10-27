/**
 * View DTO - API 层 View 数据传输对象
 */

/**
 * 视图类型
 */
export type DTOViewType = 'grid' | 'kanban' | 'gallery' | 'gantt' | 'calendar' | 'form';

/**
 * View DTO (从 API 返回)
 */
export interface ViewDTO {
  id: string;
  name: string;
  type: ViewType;
  tableId: string;
  order: number;
  filter?: any;
  sort?: any[];
  group?: any[];
  columnMeta?: Record<string, any>;
  createdTime: string;
  lastModifiedTime: string;
}

/**
 * 创建 View 请求 DTO
 */
export interface CreateViewDTO {
  name: string;
  type: ViewType;
  tableId?: string;
}

/**
 * 更新 View 请求 DTO
 */
export interface UpdateViewDTO {
  name?: string;
  type?: ViewType;
  filter?: any;
  sort?: any[];
  group?: any[];
  columnMeta?: Record<string, any>;
}

