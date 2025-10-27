/**
 * Store Module - Exports
 * 
 * 统一导出所有 Store 相关的内容
 */

// Store
export { useGridStore } from './grid-store';

// Selectors
export {
  selectField,
  selectFieldsArray,
  selectRecordsArray,
  selectIsLoading,
  selectError,
  selectIsCellSelected,
  selectIsRowSelected,
  selectIsColumnSelected,
  selectCellValue,
} from './grid-store';

// Types
export type {
  GridStore,
  TypedRecord,
  Base,
  Table,
  View,
  Permission,
  Collaborator,
  UserSelection,
  ContextMenuState,
  DataSlice,
  UISlice,
  CollaborationSlice,
  PermissionSlice,
  HistorySlice,
} from './types';

// Provider
export { GridStoreProvider } from './GridStoreProvider';
export type { GridStoreProviderProps } from './GridStoreProvider';

// Hooks
export {
  useBase,
  useTable,
  useView,
  useFields,
  useRecords,
  useField,
  useCellValue,
  useIsLoading,
  useStoreError,
  useSelection,
  useEditing,
  useIsCellSelected,
  useIsRowSelected,
  useIsColumnSelected,
  useContextMenu,
  usePermissions,
  useCheckPermission,
  useCollaborators,
  useUserSelections,
  useHistory,
} from './hooks';
