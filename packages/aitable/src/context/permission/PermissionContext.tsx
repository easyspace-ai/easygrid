import { createContext, useContext, useMemo, ReactNode } from 'react';
import { ApiClient } from '../../api/client';
import type { IPermissions } from '../../api/types';

type PermissionLevel = 'owner' | 'editor' | 'commenter' | 'viewer' | 'none';
type PermissionAction = 'create' | 'read' | 'update' | 'delete';
type PermissionResource = 'base' | 'table' | 'field' | 'record' | 'view' | 'comment';

interface IPermissionContext {
  permissions: IPermissions | null;
  isLoading: boolean;
  hasPermission: (resource: PermissionResource, action: PermissionAction) => boolean;
  canCreateField: () => boolean;
  canEditField: (fieldId: string) => boolean;
  canDeleteField: (fieldId: string) => boolean;
  canCreateRecord: () => boolean;
  canEditRecord: (recordId: string) => boolean;
  canDeleteRecord: (recordId: string) => boolean;
  canEditCell: (recordId: string, fieldId: string) => boolean;
  canCreateView: () => boolean;
  canEditView: (viewId: string) => boolean;
  canDeleteView: (viewId: string) => boolean;
  canComment: () => boolean;
  getCurrentUserRole: () => PermissionLevel;
}

const PermissionContext = createContext<IPermissionContext | null>(null);

interface IPermissionProviderProps {
  baseId: string;
  tableId?: string;
  apiClient: ApiClient;
  children: ReactNode;
}

export function PermissionProvider({
  baseId,
  tableId,
  apiClient,
  children
}: IPermissionProviderProps) {
  
  // 简化的权限管理，默认返回 true
  const contextValue: IPermissionContext = useMemo(() => ({
    permissions: null,
    isLoading: false,
    hasPermission: () => true,
    canCreateField: () => true,
    canEditField: () => true,
    canDeleteField: () => true,
    canCreateRecord: () => true,
    canEditRecord: () => true,
    canDeleteRecord: () => true,
    canEditCell: () => true,
    canCreateView: () => true,
    canEditView: () => true,
    canDeleteView: () => true,
    canComment: () => true,
    getCurrentUserRole: () => 'owner' as PermissionLevel,
  }), [baseId, tableId]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission(): IPermissionContext {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}
