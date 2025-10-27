import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import type { ITable, ICreateTableRo, IUpdateTableRo } from '../../api/types';

interface ITableContext {
  tables: ITable[];
  currentTable: ITable | null;
  isLoading: boolean;
  switchTable: (tableId: string) => void;
  createTable: (data: ICreateTableRo) => Promise<ITable>;
  updateTable: (id: string, data: IUpdateTableRo) => Promise<ITable>;
  deleteTable: (id: string) => Promise<void>;
}

const TableContext = createContext<ITableContext | null>(null);

export function TableProvider({ 
  baseId,
  tableId,
  apiClient,
  children 
}: { 
  baseId: string;
  tableId?: string;
  apiClient: ApiClient;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [currentTableId, setCurrentTableId] = useState(tableId);

  // 获取表格列表
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', baseId],
    queryFn: () => apiClient.getTables(baseId),
    enabled: !!baseId,
  });

  // 获取当前表格
  const { data: currentTable } = useQuery({
    queryKey: ['table', currentTableId],
    queryFn: () => currentTableId ? apiClient.getTable(currentTableId) : null,
    enabled: !!currentTableId,
  });

  // 创建表格
  const createMutation = useMutation({
    mutationFn: (data: ICreateTableRo) => apiClient.createTable(baseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', baseId] });
    },
  });

  // 更新表格
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateTableRo }) =>
      apiClient.updateTable(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['table', id] });
      queryClient.invalidateQueries({ queryKey: ['tables', baseId] });
    },
  });

  // 删除表格
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', baseId] });
    },
  });

  const switchTable = useCallback((id: string) => {
    setCurrentTableId(id);
  }, []);

  return (
    <TableContext.Provider value={{
      tables,
      currentTable: currentTable || null,
      isLoading,
      switchTable,
      createTable: createMutation.mutateAsync,
      updateTable: (id, data) => updateMutation.mutateAsync({ id, data }),
      deleteTable: deleteMutation.mutateAsync,
    }}>
      {children}
    </TableContext.Provider>
  );
}

export function useTable() {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTable must be used within TableProvider');
  }
  return context;
}


