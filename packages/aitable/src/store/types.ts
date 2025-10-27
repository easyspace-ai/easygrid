/**
 * Store 类型定义
 * 强类型的状态管理类型系统
 */

import type { FieldType } from '../types/core/field-types';
import type { CellValue } from '../types/core/cell-values';
import type { Field } from '../model/field/Field';

// ============= 基础数据模型 =============

/**
 * Base 基础空间
 */
export interface Base {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly createdAt: string; // ISO string
  readonly updatedAt: string; // ISO string
}

/**
 * Table 数据表
 */
export interface Table {
  readonly id: string;
  readonly baseId: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly order: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Field 配置（用于Store存储）
 */
export interface FieldConfig {
  readonly id: string;
  readonly tableId: string;
  readonly name: string;
  readonly type: FieldType;
  readonly description?: string;
  readonly options: Record<string, unknown>;
  readonly order: number;
  readonly required: boolean;
  readonly unique: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Record 记录 - 强类型
 */
export interface TypedRecord {
  readonly id: string;
  readonly tableId: string;
  readonly fields: Record<string, CellValue>; // 使用 CellValue 联合类型
  readonly createdBy?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * View 视图
 */
export interface View {
  readonly id: string;
  readonly tableId: string;
  readonly name: string;
  readonly type: ViewType;
  readonly filter?: FilterConfig;
  readonly sort?: SortConfig[];
  readonly group?: GroupConfig[];
  readonly columnOrder?: string[];
  readonly columnWidths?: Record<string, number>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * View 类型
 */
export type StoreViewType = 'grid' | 'kanban' | 'calendar' | 'gallery' | 'form';

/**
 * Filter 配置
 */
export interface FilterConfig {
  readonly conjunction: 'and' | 'or';
  readonly conditions: FilterCondition[];
}

/**
 * Filter 条件
 */
export interface FilterCondition {
  readonly fieldId: string;
  readonly operator: FilterOperator;
  readonly value: CellValue;
}

/**
 * Filter 操作符
 */
export type FilterOperator =
  | 'is'
  | 'isNot'
  | 'contains'
  | 'doesNotContain'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual';

/**
 * Sort 配置
 */
export interface SortConfig {
  readonly fieldId: string;
  readonly order: 'asc' | 'desc';
}

/**
 * Group 配置
 */
export interface GroupConfig {
  readonly fieldId: string;
}

/**
 * Permission 权限
 */
export interface Permission {
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly canDelete: boolean;
  readonly canManageFields: boolean;
  readonly canManageViews: boolean;
  readonly canManagePermissions: boolean;
}

/**
 * Session 会话
 */
export interface Session {
  readonly userId?: string;
  readonly userName?: string;
  readonly userEmail?: string;
  readonly avatar?: string;
  readonly token?: string;
  readonly expiresAt?: string;
}

/**
 * Collaborator 协作者
 */
export interface Collaborator {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
  readonly avatar?: string;
  readonly color: string;
  readonly isOnline: boolean;
  readonly lastSeen: string;
}

/**
 * User Selection 用户选择
 */
export interface UserSelection {
  readonly userId: string;
  readonly cells: Set<string>; // 格式: "colIndex,rowIndex"
  readonly activeCell: [number, number] | null; // [colIndex, rowIndex]
}

// ============= Store Slice 接口 =============

/**
 * Data Slice - 数据管理
 */
export interface DataSlice {
  // 当前数据
  base: Base | null;
  table: Table | null;
  view: View | null;
  fields: Map<string, Field>; // 使用 Field 类实例
  records: Map<string, TypedRecord>;

  // 加载状态
  isLoadingBase: boolean;
  isLoadingTable: boolean;
  isLoadingView: boolean;
  isLoadingFields: boolean;
  isLoadingRecords: boolean;

  // 错误状态
  baseError: Error | null;
  tableError: Error | null;
  viewError: Error | null;
  fieldsError: Error | null;
  recordsError: Error | null;

  // Actions
  setBase: (base: Base | null) => void;
  setTable: (table: Table | null) => void;
  setView: (view: View | null) => void;
  setFields: (fields: Field[]) => void;
  setRecords: (records: TypedRecord[]) => void;

  // Async Actions
  loadBase: (baseId: string) => Promise<void>;
  loadTable: (tableId: string) => Promise<void>;
  loadView: (viewId: string) => Promise<void>;
  loadFields: (tableId: string) => Promise<void>;
  loadRecords: (tableId: string, viewId?: string) => Promise<void>;

  // Data Operations
  createRecord: (tableId: string, fields: Record<string, CellValue>) => Promise<TypedRecord>;
  updateRecord: (recordId: string, fields: Record<string, CellValue>) => Promise<TypedRecord>;
  deleteRecord: (recordId: string) => Promise<void>;
  deleteRecords: (recordIds: string[]) => Promise<void>;
}

/**
 * UI Slice - UI状态管理
 */
export interface UISlice {
  // 选择状态
  selectedCells: Set<string>; // 格式: "colIndex,rowIndex"
  selectedRows: Set<number>;
  selectedColumns: Set<number>;
  activeCell: [number, number] | null; // [colIndex, rowIndex]

  // 编辑状态
  isEditing: boolean;
  editingCell: [number, number] | null;
  editingValue: CellValue;

  // 菜单状态
  contextMenu: ContextMenuState | null;

  // 对话框状态
  dialogs: {
    deleteConfirm: boolean;
    fieldConfig: boolean;
    viewConfig: boolean;
  };

  // UI Actions
  setSelectedCells: (cells: Set<string>) => void;
  setSelectedRows: (rows: Set<number>) => void;
  setSelectedColumns: (columns: Set<number>) => void;
  setActiveCell: (cell: [number, number] | null) => void;
  clearSelectionUI: () => void;

  startEditing: (cell: [number, number], initialValue: CellValue) => void;
  stopEditing: (save: boolean) => void;
  setEditingValue: (value: CellValue) => void;

  showContextMenu: (menu: ContextMenuState) => void;
  hideContextMenu: () => void;

  showDialog: (dialog: keyof UISlice['dialogs']) => void;
  hideDialog: (dialog: keyof UISlice['dialogs']) => void;
}

/**
 * Context Menu 状态
 */
export interface ContextMenuState {
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly type: 'cell' | 'row' | 'column' | 'header';
  readonly target: {
    rowIndex?: number;
    colIndex?: number;
  };
}

/**
 * Collaboration Slice - 协作状态管理
 */
export interface CollaborationSlice {
  collaborators: Map<string, Collaborator>;
  selections: Map<string, UserSelection>;

  // Actions
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (userId: string) => void;
  updateCollaborator: (userId: string, updates: Partial<Collaborator>) => void;
  updateUserSelection: (userId: string, selection: UserSelection) => void;
  clearUserSelection: (userId: string) => void;
}

/**
 * Permission Slice - 权限管理
 */
export interface PermissionSlice {
  permissions: Permission;

  // Actions
  setPermissions: (permissions: Permission) => void;
  checkPermission: (action: keyof Permission) => boolean;
}

/**
 * History Slice - 历史记录管理
 */
export interface HistorySlice {
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;

  // Actions
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

// ============= 组合的 Store 类型 =============

/**
 * 完整的 Grid Store
 */
export interface GridStore
  extends DataSlice,
    UISlice,
    CollaborationSlice,
    PermissionSlice,
    HistorySlice {
  // API Client
  api: any | null; // 暂时使用 any，待 ApiClient 类型完善

  // Global Actions
  setApi: (api: any) => void;
  reset: () => void;
}

// ============= Selector 辅助类型 =============

/**
 * Store Selector
 */
export type StoreSelector<T> = (state: GridStore) => T;

/**
 * Store Subscriber
 */
export type StoreSubscriber<T> = (state: T, prevState: T) => void;

