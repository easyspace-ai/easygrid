/**
 * Grid Store Unit Tests
 * Comprehensive tests for store implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGridStore } from '../grid-store';
import { FIELD_TYPES } from '../../types/core/field-types';
import { TextField } from '../../model/field/TextField';
import type { TypedRecord, Base, Table, View } from '../types';

describe('GridStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useGridStore.getState().reset();
  });

  describe('Data Slice', () => {
    describe('setBase', () => {
      it('should set base', () => {
        const base: Base = {
          id: 'base1',
          name: 'Test Base',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        useGridStore.getState().setBase(base);

        expect(useGridStore.getState().base).toBe(base);
        expect(useGridStore.getState().base?.name).toBe('Test Base');
      });

      it('should clear base', () => {
        const base: Base = {
          id: 'base1',
          name: 'Test Base',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        useGridStore.getState().setBase(base);
        expect(useGridStore.getState().base).not.toBeNull();

        useGridStore.getState().setBase(null);
        expect(useGridStore.getState().base).toBeNull();
      });
    });

    describe('setTable', () => {
      it('should set table', () => {
        const table: Table = {
          id: 'tbl1',
          baseId: 'base1',
          name: 'Test Table',
          order: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        useGridStore.getState().setTable(table);

        expect(useGridStore.getState().table).toBe(table);
        expect(useGridStore.getState().table?.name).toBe('Test Table');
      });
    });

    describe('setFields', () => {
      it('should set fields as Map', () => {
        const field1 = new TextField({
          id: 'fld1',
          name: 'Name',
          type: FIELD_TYPES.SingleLineText,
          tableId: 'tbl1',
          options: { type: FIELD_TYPES.SingleLineText },
          isComputed: false,
          isPrimary: true,
        });

        const field2 = new TextField({
          id: 'fld2',
          name: 'Email',
          type: FIELD_TYPES.SingleLineText,
          tableId: 'tbl1',
          options: { type: FIELD_TYPES.SingleLineText },
          isComputed: false,
          isPrimary: false,
        });

        useGridStore.getState().setFields([field1, field2]);

        const fields = useGridStore.getState().fields;
        expect(fields.size).toBe(2);
        expect(fields.get('fld1')).toBe(field1);
        expect(fields.get('fld2')).toBe(field2);
      });

      it('should clear existing fields', () => {
        const field1 = new TextField({
          id: 'fld1',
          name: 'Name',
          type: FIELD_TYPES.SingleLineText,
          tableId: 'tbl1',
          options: { type: FIELD_TYPES.SingleLineText },
          isComputed: false,
          isPrimary: true,
        });

        useGridStore.getState().setFields([field1]);
        expect(useGridStore.getState().fields.size).toBe(1);

        useGridStore.getState().setFields([]);
        expect(useGridStore.getState().fields.size).toBe(0);
      });
    });

    describe('setRecords', () => {
      it('should set records as Map', () => {
        const record1: TypedRecord = {
          id: 'rec1',
          tableId: 'tbl1',
          fields: { fld1: 'John', fld2: 'john@example.com' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const record2: TypedRecord = {
          id: 'rec2',
          tableId: 'tbl1',
          fields: { fld1: 'Jane', fld2: 'jane@example.com' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        useGridStore.getState().setRecords([record1, record2]);

        const records = useGridStore.getState().records;
        expect(records.size).toBe(2);
        expect(records.get('rec1')).toBe(record1);
        expect(records.get('rec2')).toBe(record2);
      });
    });

    describe('loadBase', () => {
      it('should load base via API', async () => {
        const mockBase: Base = {
          id: 'base1',
          name: 'Test Base',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const mockApi = {
          getBase: vi.fn().mockResolvedValue(mockBase),
        };

        useGridStore.getState().setApi(mockApi);

        await useGridStore.getState().loadBase('base1');

        expect(mockApi.getBase).toHaveBeenCalledWith('base1');
        expect(useGridStore.getState().base).toEqual(mockBase);
        expect(useGridStore.getState().isLoadingBase).toBe(false);
      });

      it('should handle load errors', async () => {
        const mockError = new Error('Failed to load base');
        const mockApi = {
          getBase: vi.fn().mockRejectedValue(mockError),
        };

        useGridStore.getState().setApi(mockApi);

        await expect(useGridStore.getState().loadBase('base1')).rejects.toThrow('Failed to load base');

        expect(useGridStore.getState().baseError).toBe(mockError);
        expect(useGridStore.getState().isLoadingBase).toBe(false);
      });

      it('should throw if API not initialized', async () => {
        await expect(useGridStore.getState().loadBase('base1')).rejects.toThrow();
      });
    });
  });

  describe('UI Slice', () => {
    describe('selection', () => {
      it('should set selected cells', () => {
        const cells = new Set(['0,0', '0,1', '1,0']);
        
        useGridStore.getState().setSelectedCells(cells);

        expect(useGridStore.getState().selectedCells).toEqual(cells);
      });

      it('should set active cell', () => {
        useGridStore.getState().setActiveCell([5, 10]);

        expect(useGridStore.getState().activeCell).toEqual([5, 10]);
      });

      it('should clear selection', () => {
        useGridStore.getState().setSelectedCells(new Set(['0,0', '1,1']));
        useGridStore.getState().setSelectedRows(new Set([0, 1]));
        useGridStore.getState().setActiveCell([0, 0]);

        useGridStore.getState().clearSelectionUI();

        expect(useGridStore.getState().selectedCells.size).toBe(0);
        expect(useGridStore.getState().selectedRows.size).toBe(0);
        expect(useGridStore.getState().activeCell).toBeNull();
      });
    });

    describe('editing', () => {
      it('should start editing', () => {
        useGridStore.getState().startEditing([3, 5], 'initial value');

        expect(useGridStore.getState().isEditing).toBe(true);
        expect(useGridStore.getState().editingCell).toEqual([3, 5]);
        expect(useGridStore.getState().editingValue).toBe('initial value');
      });

      it('should update editing value', () => {
        useGridStore.getState().startEditing([0, 0], 'initial');
        useGridStore.getState().setEditingValue('updated');

        expect(useGridStore.getState().editingValue).toBe('updated');
      });

      it('should stop editing without saving', () => {
        useGridStore.getState().startEditing([0, 0], 'test');
        useGridStore.getState().stopEditing(false);

        expect(useGridStore.getState().isEditing).toBe(false);
        expect(useGridStore.getState().editingCell).toBeNull();
        expect(useGridStore.getState().editingValue).toBeNull();
      });
    });

    describe('context menu', () => {
      it('should show context menu', () => {
        const menu = {
          visible: true,
          x: 100,
          y: 200,
          type: 'cell' as const,
          target: { rowIndex: 0, colIndex: 0 },
        };

        useGridStore.getState().showContextMenu(menu);

        expect(useGridStore.getState().contextMenu).toEqual(menu);
      });

      it('should hide context menu', () => {
        const menu = {
          visible: true,
          x: 100,
          y: 200,
          type: 'cell' as const,
          target: { rowIndex: 0, colIndex: 0 },
        };

        useGridStore.getState().showContextMenu(menu);
        useGridStore.getState().hideContextMenu();

        expect(useGridStore.getState().contextMenu).toBeNull();
      });
    });

    describe('dialogs', () => {
      it('should show dialog', () => {
        useGridStore.getState().showDialog('deleteConfirm');

        expect(useGridStore.getState().dialogs.deleteConfirm).toBe(true);
      });

      it('should hide dialog', () => {
        useGridStore.getState().showDialog('deleteConfirm');
        useGridStore.getState().hideDialog('deleteConfirm');

        expect(useGridStore.getState().dialogs.deleteConfirm).toBe(false);
      });
    });
  });

  describe('Collaboration Slice', () => {
    it('should add collaborator', () => {
      const collaborator = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        color: '#FF0000',
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };

      useGridStore.getState().addCollaborator(collaborator);

      expect(useGridStore.getState().collaborators.get('user1')).toEqual(collaborator);
    });

    it('should remove collaborator', () => {
      const collaborator = {
        id: 'user1',
        name: 'John Doe',
        color: '#FF0000',
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };

      useGridStore.getState().addCollaborator(collaborator);
      useGridStore.getState().removeCollaborator('user1');

      expect(useGridStore.getState().collaborators.has('user1')).toBe(false);
    });

    it('should update collaborator', () => {
      const collaborator = {
        id: 'user1',
        name: 'John Doe',
        color: '#FF0000',
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };

      useGridStore.getState().addCollaborator(collaborator);
      useGridStore.getState().updateCollaborator('user1', { isOnline: false });

      const updated = useGridStore.getState().collaborators.get('user1');
      expect(updated?.isOnline).toBe(false);
      expect(updated?.name).toBe('John Doe'); // Other fields preserved
    });
  });

  describe('Permission Slice', () => {
    it('should set permissions', () => {
      const permissions = {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canManageFields: true,
        canManageViews: true,
        canManagePermissions: false,
      };

      useGridStore.getState().setPermissions(permissions);

      expect(useGridStore.getState().permissions).toEqual(permissions);
    });

    it('should check permission', () => {
      const permissions = {
        canRead: true,
        canWrite: false,
        canDelete: false,
        canManageFields: false,
        canManageViews: false,
        canManagePermissions: false,
      };

      useGridStore.getState().setPermissions(permissions);

      expect(useGridStore.getState().checkPermission('canRead')).toBe(true);
      expect(useGridStore.getState().checkPermission('canWrite')).toBe(false);
    });
  });

  describe('Global Actions', () => {
    it('should set API client', () => {
      const mockApi = { getBase: vi.fn() };

      useGridStore.getState().setApi(mockApi);

      expect(useGridStore.getState().api).toBe(mockApi);
    });

    it('should reset store', () => {
      // Setup some data
      const base: Base = {
        id: 'base1',
        name: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      useGridStore.getState().setBase(base);
      useGridStore.getState().setActiveCell([0, 0]);
      useGridStore.getState().startEditing([0, 0], 'test');

      // Reset
      useGridStore.getState().reset();

      // Verify all cleared
      expect(useGridStore.getState().base).toBeNull();
      expect(useGridStore.getState().activeCell).toBeNull();
      expect(useGridStore.getState().isEditing).toBe(false);
      expect(useGridStore.getState().fields.size).toBe(0);
      expect(useGridStore.getState().records.size).toBe(0);
    });
  });

  describe('Selectors', () => {
    it('should select fields array', () => {
      const field1 = new TextField({
        id: 'fld1',
        name: 'Name',
        type: FIELD_TYPES.SingleLineText,
        tableId: 'tbl1',
        options: { type: FIELD_TYPES.SingleLineText },
        isComputed: false,
        isPrimary: true,
      });

      useGridStore.getState().setFields([field1]);

      const fields = Array.from(useGridStore.getState().fields.values());
      expect(fields).toHaveLength(1);
      expect(fields[0]).toBe(field1);
    });

    it('should select records array', () => {
      const record: TypedRecord = {
        id: 'rec1',
        tableId: 'tbl1',
        fields: { fld1: 'John' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useGridStore.getState().setRecords([record]);

      const records = Array.from(useGridStore.getState().records.values());
      expect(records).toHaveLength(1);
      expect(records[0]).toEqual(record);
    });
  });
});

