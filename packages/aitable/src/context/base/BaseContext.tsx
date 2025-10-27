import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import type { IBase, ICreateBaseRo, IUpdateBaseRo } from '../../api/types';

interface IBaseContext {
  bases: IBase[];
  currentBase: IBase | null;
  isLoading: boolean;
  switchBase: (baseId: string) => void;
  createBase: (data: ICreateBaseRo) => Promise<IBase>;
  updateBase: (id: string, data: IUpdateBaseRo) => Promise<IBase>;
  deleteBase: (id: string) => Promise<void>;
}

const BaseContext = createContext<IBaseContext | null>(null);

export function BaseProvider({ 
  baseId,
  apiClient,
  children 
}: { 
  baseId?: string;
  apiClient: ApiClient;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [currentBaseId, setCurrentBaseId] = useState(baseId);

  // 获取所有 bases
  const { data: bases = [], isLoading } = useQuery({
    queryKey: ['bases'],
    queryFn: () => apiClient.getBases(),
  });

  // 获取当前 base
  const { data: currentBase } = useQuery({
    queryKey: ['base', currentBaseId],
    queryFn: () => currentBaseId ? apiClient.getBase(currentBaseId) : null,
    enabled: !!currentBaseId,
  });

  // 创建 base
  const createMutation = useMutation({
    mutationFn: (data: ICreateBaseRo) => apiClient.createBase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
    },
  });

  // 更新 base
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateBaseRo }) => 
      apiClient.updateBase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['base', id] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
    },
  });

  // 删除 base
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteBase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
    },
  });

  const switchBase = useCallback((id: string) => {
    setCurrentBaseId(id);
  }, []);

  return (
    <BaseContext.Provider value={{
      bases,
      currentBase: currentBase || null,
      isLoading,
      switchBase,
      createBase: createMutation.mutateAsync,
      updateBase: (id, data) => updateMutation.mutateAsync({ id, data }),
      deleteBase: deleteMutation.mutateAsync,
    }}>
      {children}
    </BaseContext.Provider>
  );
}

export function useBase() {
  const context = useContext(BaseContext);
  if (!context) {
    throw new Error('useBase must be used within BaseProvider');
  }
  return context;
}


