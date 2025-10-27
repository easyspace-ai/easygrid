/**
 * API Types and Interfaces
 */

// Common Response Types
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

// Base
export interface IBase {
  id: string;
  name: string;
  icon?: string;
  spaceId: string;
  createdTime: string;
  lastModifiedTime: string;
}

export interface ICreateBaseRo {
  name: string;
  icon?: string;
  spaceId: string;
}

export interface IUpdateBaseRo {
  name?: string;
  icon?: string;
}

// Table
export interface ITable {
  id: string;
  name: string;
  dbTableName: string;
  baseId: string;
  icon?: string;
  description?: string;
  createdTime: string;
  lastModifiedTime: string;
}

export interface ICreateTableRo {
  name: string;
  baseId: string;
  icon?: string;
  description?: string;
  fields?: ICreateFieldRo[];
}

export interface IUpdateTableRo {
  name?: string;
  icon?: string;
  description?: string;
}

// Field
export type FieldType =
  | 'singleLineText'
  | 'longText'
  | 'number'
  | 'singleSelect'
  | 'multipleSelect'
  | 'date'
  | 'checkbox'
  | 'rating'
  | 'link'
  | 'user'
  | 'attachment'
  | 'formula'
  | 'rollup'
  | 'count'
  | 'createdTime'
  | 'lastModifiedTime'
  | 'createdBy'
  | 'lastModifiedBy'
  | 'autoNumber'
  | 'button';

export interface IField {
  id: string;
  name: string;
  type: FieldType;
  tableId: string;
  options?: any;
  description?: string;
  isComputed: boolean;
  isPrimary: boolean;
  createdTime: string;
  lastModifiedTime: string;
}

export interface ICreateFieldRo {
  name: string;
  type: FieldType;
  options?: any;
  description?: string;
  isPrimary?: boolean;
}

export interface IUpdateFieldRo {
  name?: string;
  type?: FieldType;
  options?: any;
  description?: string;
}

// Record
export interface IRecord {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
  lastModifiedTime?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface ICreateRecordRo {
  fields: Record<string, any>;
  order?: {
    viewId: string;
    anchorId: string;
    position: 'before' | 'after';
  };
}

export interface IUpdateRecordRo {
  recordId: string;
  fieldId: string;
  value: any;
}

export interface IGetRecordsRo {
  viewId?: string;
  filter?: IFilter;
  sort?: ISort[];
  groupBy?: string[];
  fieldKeyType?: 'id' | 'name';
  cellFormat?: 'text' | 'json';
  skip?: number;
  take?: number;
}

// View
export type ApiViewType = 'grid' | 'form' | 'kanban' | 'gallery' | 'calendar';

export interface IView {
  id: string;
  name: string;
  type: ApiViewType;
  tableId: string;
  order: number;
  filter?: IFilter;
  sort?: ISort[];
  group?: IGroup[];
  options?: any;
  columnMeta?: Record<string, IColumnMeta>;
  createdTime: string;
  lastModifiedTime: string;
}

export interface ICreateViewRo {
  name: string;
  type: ApiViewType;
  tableId: string;
}

export interface IUpdateViewRo {
  name?: string;
  filter?: IFilter;
  sort?: ISort[];
  group?: IGroup[];
  options?: any;
  columnMeta?: Record<string, IColumnMeta>;
}

// Filter
export interface IFilter {
  filterSet: IFilterSet[];
  conjunction: 'and' | 'or';
}

export interface IFilterSet {
  fieldId: string;
  operator: string;
  value: any;
}

// Sort
export interface ISort {
  fieldId: string;
  order: 'asc' | 'desc';
}

// Group
export interface IGroup {
  fieldId: string;
  order: 'asc' | 'desc';
}

// Column Meta
export interface IColumnMeta {
  width?: number;
  hidden?: boolean;
  order?: number;
}

// Permissions
export interface IPermissions {
  base?: Record<string, boolean>;
  table?: Record<string, boolean>;
  field?: Record<string, boolean>;
  record?: Record<string, boolean>;
  view?: Record<string, boolean>;
}

export interface ITablePermission {
  'table|read': boolean;
  'table|update': boolean;
  'table|delete': boolean;
  'record|create': boolean;
  'record|read': boolean;
  'record|update': boolean;
  'record|delete': boolean;
  'field|create': boolean;
  'field|read': boolean;
  'field|update': boolean;
  'field|delete': boolean;
  'view|create': boolean;
  'view|read': boolean;
  'view|update': boolean;
  'view|delete': boolean;
}

// User
export interface IUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isActive: boolean;
  createdTime: string;
}

// Comment
export interface IComment {
  id: string;
  content: any;
  recordId: string;
  tableId: string;
  baseId: string;
  createdBy: IUser;
  createdTime: string;
  lastModifiedTime?: string;
  quoteId?: string;
  reaction?: IReaction[];
}

export interface IReaction {
  emoji: string;
  users: string[];
}

export interface ICreateCommentRo {
  content: any;
  quoteId?: string;
}

export interface IUpdateCommentRo {
  content: any;
}


