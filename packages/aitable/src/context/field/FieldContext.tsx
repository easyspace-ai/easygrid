import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '../../api/client';
import { createFieldInstance } from '../../model/field/factory';
import type { IField, ICreateFieldRo, IUpdateFieldRo } from '../../api/types';
import type { Field } from '../../model/field/Field';

interface IFieldContext {
  fields: Field[];
  getField: (id: string) => Field | undefined;
  isLoading: boolean;
  createField: (data: ICreateFieldRo) => Promise<Field>;
  updateField: (id: string, data: IUpdateFieldRo) => Promise<Field>;
  deleteField: (id: string) => Promise<void>;
  convertField: (id: string, newType: string) => Promise<Field>;
}

const FieldContext = createContext<IFieldContext | null>(null);

export function FieldProvider({ 
  tableId,
  apiClient,
  children 
}: { 
  tableId: string;
  apiClient: ApiClient;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  // 获取字段列表
  const { data: rawFields = [], isLoading } = useQuery({
    queryKey: ['fields', tableId],
    queryFn: () => apiClient.getFields(tableId),
    enabled: !!tableId,
  });

  // 转换为字段实例
  const fields = useMemo(() => 
    rawFields.map(field => createFieldInstance(field)),
    [rawFields]
  );

  const getField = (id: string) => fields.find(f => f.id === id);

  // 创建字段
  const createMutation = useMutation({
    mutationFn: (data: ICreateFieldRo) => apiClient.createField(tableId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', tableId] });
    },
  });

  // 更新字段
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateFieldRo }) =>
      apiClient.updateField(tableId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', tableId] });
    },
  });

  // 删除字段
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteField(tableId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', tableId] });
    },
  });

  // 转换字段类型
  const convertMutation = useMutation({
    mutationFn: ({ id, newType }: { id: string; newType: string }) =>
      apiClient.convertField(tableId, id, newType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', tableId] });
    },
  });

  return (
    <FieldContext.Provider value={{
      fields,
      getField,
      isLoading,
      createField: async (data) => {
        const result = await createMutation.mutateAsync(data);
        return createFieldInstance(result);
      },
      updateField: async (id, data) => {
        const result = await updateMutation.mutateAsync({ id, data });
        return createFieldInstance(result);
      },
      deleteField: deleteMutation.mutateAsync,
      convertField: async (id, newType) => {
        const result = await convertMutation.mutateAsync({ id, newType });
        return createFieldInstance(result);
      },
    }}>
      {children}
    </FieldContext.Provider>
  );
}

export function useField() {
  const context = useContext(FieldContext);
  if (!context) {
    throw new Error('useField must be used within FieldProvider');
  }
  return context;
}


