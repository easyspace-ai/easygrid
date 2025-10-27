/**
 * Grid Store Provider - 重构版本
 * 简化的Provider实现，配合新的Store
 */

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGridStore } from './grid-store';
import type { ApiClient } from '../api/client';

/**
 * Provider Props
 */
export interface GridStoreProviderProps {
  apiClient: ApiClient;
  baseId?: string;
  tableId?: string;
  viewId?: string;
  userId?: string;
  autoLoad?: boolean;
  children: React.ReactNode;
}

/**
 * React Query Client (单例)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

/**
 * Grid Store Provider
 * 
 * @example
 * ```tsx
 * <GridStoreProvider
 *   apiClient={apiClient}
 *   baseId="base1"
 *   tableId="tbl1"
 *   viewId="view1"
 *   autoLoad
 * >
 *   <YourApp />
 * </GridStoreProvider>
 * ```
 */
export function GridStoreProvider({
  apiClient,
  baseId,
  tableId,
  viewId,
  userId,
  autoLoad = true,
  children,
}: GridStoreProviderProps) {
  // 设置 API Client
  useEffect(() => {
    useGridStore.getState().setApi(apiClient);
  }, [apiClient]);

  // 自动加载数据
  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const loadData = async (): Promise<void> => {
      try {
        const store = useGridStore.getState();

        // 1. 如果指定了 baseId，加载 base
        if (baseId) {
          await store.loadBase(baseId);
        }

        // 2. 如果指定了 tableId，加载 table 和相关数据
        if (tableId) {
          await store.loadTable(tableId);
          
          // 并行加载 fields 和 records
          await Promise.all([
            store.loadFields(tableId),
            store.loadRecords(tableId, viewId),
          ]);
        }
        
        // 3. 如果指定了 viewId，加载 view
        if (viewId && tableId) {
          await store.loadView(viewId);
        }
      } catch (error) {
        console.error('[GridStoreProvider] Failed to load data:', error);
      }
    };

    void loadData();
  }, [autoLoad, baseId, tableId, viewId]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default GridStoreProvider;

