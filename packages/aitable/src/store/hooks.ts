/**
 * Grid Store Hooks
 * 
 * 提供便捷的 hooks 来访问和操作 store
 * 这些 hooks 经过优化，只订阅需要的状态，避免无脑重渲染
 */

import { useGridStore } from './grid-store';
import {
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

// ============= Data Hooks =============

/**
 * Use current base
 */
export function useBase() {
  return useGridStore((state) => state.base);
}

/**
 * Use current table
 */
export function useTable() {
  return useGridStore((state) => state.table);
}

/**
 * Use current view
 */
export function useView() {
  return useGridStore((state) => state.view);
}

/**
 * Use all fields as array
 */
export function useFields() {
  return useGridStore(selectFieldsArray);
}

/**
 * Use all records as array
 */
export function useRecords() {
  return useGridStore(selectRecordsArray);
}

/**
 * Use specific field by ID
 */
export function useField(fieldId: string) {
  return useGridStore(selectField(fieldId));
}

/**
 * Use cell value by position
 */
export function useCellValue(colIndex: number, rowIndex: number) {
  return useGridStore(selectCellValue(colIndex, rowIndex));
}

/**
 * Check if any data is loading
 */
export function useIsLoading() {
  return useGridStore(selectIsLoading);
}

/**
 * Get any error
 */
export function useStoreError() {
  return useGridStore(selectError);
}

// ============= UI Hooks =============

/**
 * Use selection state
 */
export function useSelection() {
  return useGridStore((state) => ({
    selectedCells: state.selectedCells,
    selectedRows: state.selectedRows,
    selectedColumns: state.selectedColumns,
    activeCell: state.activeCell,
  }));
}

/**
 * Use editing state
 */
export function useEditing() {
  return useGridStore((state) => ({
    isEditing: state.isEditing,
    editingCell: state.editingCell,
    editingValue: state.editingValue,
  }));
}

/**
 * Check if cell is selected
 */
export function useIsCellSelected(colIndex: number, rowIndex: number) {
  return useGridStore(selectIsCellSelected(colIndex, rowIndex));
}

/**
 * Check if row is selected
 */
export function useIsRowSelected(rowIndex: number) {
  return useGridStore(selectIsRowSelected(rowIndex));
}

/**
 * Check if column is selected
 */
export function useIsColumnSelected(colIndex: number) {
  return useGridStore(selectIsColumnSelected(colIndex));
}

/**
 * Use context menu state
 */
export function useContextMenu() {
  return useGridStore((state) => state.contextMenu);
}

// ============= Permission Hooks =============

/**
 * Use permissions
 */
export function usePermissions() {
  return useGridStore((state) => state.permissions);
}

/**
 * Check specific permission
 */
export function useCheckPermission(action: keyof import('./types').Permission) {
  return useGridStore((state) => state.checkPermission(action));
}

// ============= Collaboration Hooks =============

/**
 * Use collaborators
 */
export function useCollaborators() {
  return useGridStore((state) => Array.from(state.collaborators.values()));
}

/**
 * Use user selections
 */
export function useUserSelections() {
  return useGridStore((state) => Array.from(state.selections.values()));
}

// ============= History Hooks =============

/**
 * Use history state
 */
export function useHistory() {
  return useGridStore((state) => ({
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    undo: state.undo,
    redo: state.redo,
  }));
}
