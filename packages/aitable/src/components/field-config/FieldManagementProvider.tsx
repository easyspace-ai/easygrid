/**
 * Field Management Provider Component
 * 字段管理提供者组件
 * 集成字段编辑和删除功能，提供统一的状态管理
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { EnhancedEditFieldDialog } from './EnhancedEditFieldDialog';
import { EnhancedDeleteConfirmDialog } from './EnhancedDeleteConfirmDialog';
import { useField } from '../../context/field/FieldContext';
import type { FieldConfig } from './EditFieldDialog';

interface FieldManagementContextType {
  openEditDialog: (field: FieldConfig) => void;
  openDeleteDialog: (fieldId: string, fieldName: string) => void;
  closeDialogs: () => void;
}

const FieldManagementContext = createContext<FieldManagementContextType | null>(null);

export function useFieldManagement() {
  const context = useContext(FieldManagementContext);
  if (!context) {
    throw new Error('useFieldManagement must be used within FieldManagementProvider');
  }
  return context;
}

interface FieldManagementProviderProps {
  children: ReactNode;
  onFieldUpdated?: (field: FieldConfig) => void;
  onFieldDeleted?: (fieldId: string) => void;
  onError?: (error: Error, operation: 'edit' | 'delete') => void;
}

export function FieldManagementProvider({
  children,
  onFieldUpdated,
  onFieldDeleted,
  onError,
}: FieldManagementProviderProps) {
  const { deleteField } = useField();

  // 编辑对话框状态
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    field: FieldConfig | null;
  }>({
    isOpen: false,
    field: null,
  });

  // 删除对话框状态
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    fieldId: string | null;
    fieldName: string | null;
  }>({
    isOpen: false,
    fieldId: null,
    fieldName: null,
  });

  // 打开编辑对话框
  const openEditDialog = useCallback((field: FieldConfig) => {
    setEditDialog({
      isOpen: true,
      field,
    });
  }, []);

  // 打开删除对话框
  const openDeleteDialog = useCallback((fieldId: string, fieldName: string) => {
    setDeleteDialog({
      isOpen: true,
      fieldId,
      fieldName,
    });
  }, []);

  // 关闭所有对话框
  const closeDialogs = useCallback(() => {
    setEditDialog({ isOpen: false, field: null });
    setDeleteDialog({ isOpen: false, fieldId: null, fieldName: null });
  }, []);

  // 处理字段编辑成功
  const handleEditSuccess = useCallback(
    (field: FieldConfig) => {
      onFieldUpdated?.(field);
      closeDialogs();
    },
    [onFieldUpdated, closeDialogs]
  );

  // 处理字段编辑错误
  const handleEditError = useCallback(
    (error: Error) => {
      onError?.(error, 'edit');
    },
    [onError]
  );

  // 处理字段删除
  const handleDeleteConfirm = useCallback(
    async (fieldId: string) => {
      try {
        await deleteField(fieldId);
        onFieldDeleted?.(fieldId);
        closeDialogs();
      } catch (error) {
        throw error; // 让 EnhancedDeleteConfirmDialog 处理错误显示
      }
    },
    [deleteField, onFieldDeleted, closeDialogs]
  );

  // 处理字段删除错误
  const handleDeleteError = useCallback(
    (error: Error) => {
      onError?.(error, 'delete');
    },
    [onError]
  );

  const contextValue: FieldManagementContextType = {
    openEditDialog,
    openDeleteDialog,
    closeDialogs,
  };

  return (
    <FieldManagementContext.Provider value={contextValue}>
      {children}

      {/* 编辑对话框 */}
      <EnhancedEditFieldDialog
        isOpen={editDialog.isOpen}
        field={editDialog.field}
        onClose={closeDialogs}
        onSuccess={handleEditSuccess}
        onError={handleEditError}
      />

      {/* 删除确认对话框 */}
      <EnhancedDeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        fieldId={deleteDialog.fieldId}
        fieldName={deleteDialog.fieldName}
        onClose={closeDialogs}
        onConfirm={handleDeleteConfirm}
        onError={handleDeleteError}
      />
    </FieldManagementContext.Provider>
  );
}
