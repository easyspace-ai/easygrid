/**
 * Grid Store - 重构版本
 * 
 * 使用强类型的 Zustand Store
 * - 完整的类型安全
 * - 清晰的状态分片
 * - 精确的状态订阅
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { ApiClient } from '../api/client';
import type { 
  GridStore, 
  TypedRecord, 
  Base, 
  Table, 
  View, 
  Permission,
  Collaborator,
  UserSelection,
  ContextMenuState,
} from './types';
import type { Field } from '../model/field/Field';
import type { CellValue } from '../types/core/cell-values';

// Enable Map/Set support in Immer
enableMapSet();

/**
 * 默认权限
 */
const DEFAULT_PERMISSIONS: Permission = {
  canRead: true,
  canWrite: false,
  canDelete: false,
  canManageFields: false,
  canManageViews: false,
  canManagePermissions: false,
};

/**
 * 创建 Grid Store
 */
export const useGridStore = create<GridStore>()(
  devtools(
    immer((set, get) => ({
      // ============= Data Slice =============
      
      // 当前数据
      base: null,
      table: null,
      view: null,
      fields: new Map<string, Field>(),
      records: new Map<string, TypedRecord>(),

      // 加载状态
      isLoadingBase: false,
      isLoadingTable: false,
      isLoadingView: false,
      isLoadingFields: false,
      isLoadingRecords: false,

      // 错误状态
      baseError: null,
      tableError: null,
      viewError: null,
      fieldsError: null,
      recordsError: null,

      // Data Actions
      setBase: (base: Base | null) => {
        set((state) => {
          state.base = base as any;
        });
      },

      setTable: (table: Table | null) => {
        set((state) => {
          state.table = table as any;
        });
      },

      setView: (view: View | null) => {
        set((state) => {
          state.view = view as any;
        });
      },

      setFields: (fields: Field[]) => {
        set((state) => {
          const newMap = new Map<string, Field>();
          fields.forEach((field) => {
            newMap.set(field.id, field as any);
          });
          state.fields = newMap as any;
        });
      },

      setRecords: (records: TypedRecord[]) => {
        set((state) => {
          const newMap = new Map<string, TypedRecord>();
          records.forEach((record) => {
            newMap.set(record.id, record as any);
          });
          state.records = newMap as any;
        });
      },

      // Async Load Actions
      loadBase: async (baseId: string) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        set((state) => {
          state.isLoadingBase = true;
          state.baseError = null;
        });

        try {
          const base = await api.getBase(baseId);
          set((state) => {
            state.base = base as any;
            state.isLoadingBase = false;
          });
        } catch (error) {
          set((state) => {
            state.baseError = error as Error;
            state.isLoadingBase = false;
          });
          throw error;
        }
      },

      loadTable: async (tableId: string) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        set((state) => {
          state.isLoadingTable = true;
          state.tableError = null;
        });

        try {
          const table = await api.getTable(tableId);
          set((state) => {
            state.table = table as any;
            state.isLoadingTable = false;
          });
        } catch (error) {
          set((state) => {
            state.tableError = error as Error;
            state.isLoadingTable = false;
          });
          throw error;
        }
      },

      loadView: async (viewId: string) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        set((state) => {
          state.isLoadingView = true;
          state.viewError = null;
        });

        try {
          const view = await api.getView(viewId);
          set((state) => {
            state.view = view as any;
            state.isLoadingView = false;
          });
        } catch (error) {
          set((state) => {
            state.viewError = error as Error;
            state.isLoadingView = false;
          });
          throw error;
        }
      },

      loadFields: async (tableId: string) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        set((state) => {
          state.isLoadingFields = true;
          state.fieldsError = null;
        });

        try {
          const fields = await api.getFields(tableId);
          set((state) => {
            state.fields.clear();
            fields.forEach((field: Field) => {
              state.fields.set(field.id, field);
            });
            state.isLoadingFields = false;
          });
        } catch (error) {
          set((state) => {
            state.fieldsError = error as Error;
            state.isLoadingFields = false;
          });
          throw error;
        }
      },

      loadRecords: async (tableId: string, viewId?: string) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        set((state) => {
          state.isLoadingRecords = true;
          state.recordsError = null;
        });

        try {
          const records = await api.getRecords(tableId, { viewId });
          set((state) => {
            state.records.clear();
            records.forEach((record: TypedRecord) => {
              state.records.set(record.id, record);
            });
            state.isLoadingRecords = false;
          });
        } catch (error) {
          set((state) => {
            state.recordsError = error as Error;
            state.isLoadingRecords = false;
          });
          throw error;
        }
      },

      // CRUD Operations
      createRecord: async (tableId: string, fields: Record<string, CellValue>) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        const newRecord = await api.createRecord(tableId, { fields });
        
        set((state) => {
          state.records.set(newRecord.id, newRecord);
        });

        return newRecord;
      },

      updateRecord: async (recordId: string, fields: Record<string, CellValue>) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        const updatedRecord = await api.updateRecord(recordId, { fields });
        
        set((state) => {
          state.records.set(recordId, updatedRecord);
        });

        return updatedRecord;
      },

      deleteRecord: async (recordId: string) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        await api.deleteRecord(recordId);
        
        set((state) => {
          state.records.delete(recordId);
        });
      },

      deleteRecords: async (recordIds: string[]) => {
        const { api } = get();
        if (!api) {
          throw new Error('API client not initialized');
        }

        await api.deleteRecords(recordIds);
        
        set((state) => {
          recordIds.forEach((id) => {
            state.records.delete(id);
          });
        });
      },

      // ============= UI Slice =============
      
      selectedCells: new Set<string>(),
      selectedRows: new Set<number>(),
      selectedColumns: new Set<number>(),
      activeCell: null,

      isEditing: false,
      editingCell: null,
      editingValue: null,

      contextMenu: null,

      dialogs: {
        deleteConfirm: false,
        fieldConfig: false,
        viewConfig: false,
      },

      // UI Actions
      setSelectedCells: (cells: Set<string>) => {
        set((state) => {
          state.selectedCells = new Set(cells);
        });
      },

      setSelectedRows: (rows: Set<number>) => {
        set((state) => {
          state.selectedRows = new Set(rows);
        });
      },

      setSelectedColumns: (columns: Set<number>) => {
        set((state) => {
          state.selectedColumns = new Set(columns);
        });
      },

      setActiveCell: (cell: [number, number] | null) => {
        set((state) => {
          state.activeCell = cell;
        });
      },

      clearSelectionUI: () => {
        set((state) => {
          state.selectedCells.clear();
          state.selectedRows.clear();
          state.selectedColumns.clear();
          state.activeCell = null;
        });
      },

      startEditing: (cell: [number, number], initialValue: CellValue) => {
        set((state) => {
          state.isEditing = true;
          state.editingCell = cell;
          state.editingValue = initialValue as any;
        });
      },

      stopEditing: (save: boolean) => {
        if (save) {
          const { editingCell, editingValue, records, fields } = get();
          if (editingCell && editingValue !== null) {
            const [colIndex, rowIndex] = editingCell;
            const recordId = Array.from(records.keys())[rowIndex];
            const fieldId = Array.from(fields.keys())[colIndex];
            
            if (recordId && fieldId) {
              get().updateRecord(recordId, { [fieldId]: editingValue });
            }
          }
        }
        
        set((state) => {
          state.isEditing = false;
          state.editingCell = null;
          state.editingValue = null;
        });
      },

      setEditingValue: (value: CellValue) => {
        set((state) => {
          state.editingValue = value as any;
        });
      },

      showContextMenu: (menu: ContextMenuState) => {
        set((state) => {
          state.contextMenu = menu;
        });
      },

      hideContextMenu: () => {
        set((state) => {
          state.contextMenu = null;
        });
      },

      showDialog: (dialog: keyof GridStore['dialogs']) => {
        set((state) => {
          state.dialogs[dialog] = true;
        });
      },

      hideDialog: (dialog: keyof GridStore['dialogs']) => {
        set((state) => {
          state.dialogs[dialog] = false;
        });
      },

      // ============= Collaboration Slice =============
      
      collaborators: new Map<string, Collaborator>(),
      selections: new Map<string, UserSelection>(),

      addCollaborator: (collaborator: Collaborator) => {
        set((state) => {
          state.collaborators.set(collaborator.id, collaborator);
        });
      },

      removeCollaborator: (userId: string) => {
        set((state) => {
          state.collaborators.delete(userId);
          state.selections.delete(userId);
        });
      },

      updateCollaborator: (userId: string, updates: Partial<Collaborator>) => {
        set((state) => {
          const existing = state.collaborators.get(userId);
          if (existing) {
            state.collaborators.set(userId, { ...existing, ...updates });
          }
        });
      },

      updateUserSelection: (userId: string, selection: UserSelection) => {
        set((state) => {
          state.selections.set(userId, selection);
        });
      },

      clearUserSelection: (userId: string) => {
        set((state) => {
          state.selections.delete(userId);
        });
      },

      // ============= Permission Slice =============
      
      permissions: DEFAULT_PERMISSIONS,

      setPermissions: (permissions: Permission) => {
        set((state) => {
          state.permissions = permissions;
        });
      },

      checkPermission: (action: keyof Permission) => {
        const { permissions } = get();
        return permissions[action];
      },

      // ============= History Slice =============
      
      canUndo: false,
      canRedo: false,
      historyIndex: 0,

      undo: () => {
        // TODO: Implement undo logic
        console.warn('Undo not implemented yet');
      },

      redo: () => {
        // TODO: Implement redo logic
        console.warn('Redo not implemented yet');
      },

      clearHistory: () => {
        set((state) => {
          state.canUndo = false;
          state.canRedo = false;
          state.historyIndex = 0;
        });
      },

      // ============= Global =============
      
      api: null,

      setApi: (api: any) => {
        set((state) => {
          state.api = api;
        });
      },

      reset: () => {
        set((state) => {
          // Data
          state.base = null;
          state.table = null;
          state.view = null;
          state.fields.clear();
          state.records.clear();
          
          // UI
          state.selectedCells.clear();
          state.selectedRows.clear();
          state.selectedColumns.clear();
          state.activeCell = null;
          state.isEditing = false;
          state.editingCell = null;
          state.editingValue = null;
          state.contextMenu = null;
          
          // Collaboration
          state.collaborators.clear();
          state.selections.clear();
          
          // Permissions
          state.permissions = DEFAULT_PERMISSIONS;
          
          // History
          state.canUndo = false;
          state.canRedo = false;
          state.historyIndex = 0;
        });
      },
    })),
    { name: 'GridStore' }
  )
);

// ============= Selectors =============

/**
 * Get cell value by position
 */
export const selectCellValue = (colIndex: number, rowIndex: number) => (state: GridStore): CellValue => {
  const recordId = Array.from(state.records.keys())[rowIndex];
  const fieldId = Array.from(state.fields.keys())[colIndex];
  
  if (!recordId || !fieldId) return null;
  
  const record = state.records.get(recordId);
  return record?.fields[fieldId] ?? null;
};

/**
 * Get field by ID
 */
export const selectField = (fieldId: string) => (state: GridStore): Field | undefined => {
  return state.fields.get(fieldId);
};

/**
 * Get all fields as array
 */
export const selectFieldsArray = (state: GridStore): Field[] => {
  return Array.from(state.fields.values());
};

/**
 * Get all records as array
 */
export const selectRecordsArray = (state: GridStore): TypedRecord[] => {
  return Array.from(state.records.values());
};

/**
 * Check if any data is loading
 */
export const selectIsLoading = (state: GridStore): boolean => {
  return (
    state.isLoadingBase ||
    state.isLoadingTable ||
    state.isLoadingView ||
    state.isLoadingFields ||
    state.isLoadingRecords
  );
};

/**
 * Get any error
 */
export const selectError = (state: GridStore): Error | null => {
  return (
    state.baseError ||
    state.tableError ||
    state.viewError ||
    state.fieldsError ||
    state.recordsError
  );
};

/**
 * Check if cell is selected
 */
export const selectIsCellSelected = (colIndex: number, rowIndex: number) => (state: GridStore): boolean => {
  const key = `${colIndex},${rowIndex}`;
  return state.selectedCells.has(key);
};

/**
 * Check if row is selected
 */
export const selectIsRowSelected = (rowIndex: number) => (state: GridStore): boolean => {
  return state.selectedRows.has(rowIndex);
};

/**
 * Check if column is selected
 */
export const selectIsColumnSelected = (colIndex: number) => (state: GridStore): boolean => {
  return state.selectedColumns.has(colIndex);
};

