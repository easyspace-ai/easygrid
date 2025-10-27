import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { SessionProvider } from './session/SessionContext';
import { AppProvider } from './app/AppContext';
import { BaseProvider } from './base/BaseContext';
import { TableProvider } from './table/TableContext';
import { FieldProvider } from './field/FieldContext';
import { ViewProvider } from './view/ViewContext';
import { PermissionProvider } from './permission/PermissionContext';
import { ApiClient } from '../api/client';
import { type ISDKAdapter, createAdapter } from '../api/sdk-adapter';
import type { LuckDB } from '@easygrid/sdk';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 分钟
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export interface AppProvidersProps {
  baseId?: string;
  tableId?: string;
  viewId?: string;
  userId?: string;
  /**
   * API 客户端 - 支持两种方式：
   * 1. 传入 ApiClient 实例（向后兼容）
   * 2. 传入 LuckDB SDK 实例（推荐 - 外部已初始化）
   */
  apiClient?: ApiClient;
  /**
   * LuckDB SDK 实例（推荐）
   * 外部系统已经登录好的 SDK，直接注入使用
   * 无需 Grid 组件自己维护 SDK 的初始化和登录
   * ShareDB 连接由 SDK 统一管理
   */
  sdk?: LuckDB;
  children: ReactNode;
}

export function AppProviders({
  baseId,
  tableId,
  viewId,
  userId,
  apiClient,
  sdk,
  children
}: AppProvidersProps) {
  // 创建适配器 - 自动识别是 SDK 还是 ApiClient
  const adapter: ISDKAdapter = sdk 
    ? createAdapter(sdk) 
    : apiClient 
      ? createAdapter(apiClient)
      : (() => { throw new Error('Either apiClient or sdk must be provided'); })();
  // 注意：这里仍然需要传递 apiClient，因为现有的 Provider 接受 ApiClient
  // TODO: 未来可以将所有 Provider 改为接受 ISDKAdapter
  const legacyApiClient = apiClient || (adapter as any);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AppProvider>
          {baseId ? (
            <BaseProvider baseId={baseId} apiClient={legacyApiClient}>
              <PermissionProvider baseId={baseId} tableId={tableId} apiClient={legacyApiClient}>
                {tableId ? (
                  <TableProvider baseId={baseId} tableId={tableId} apiClient={legacyApiClient}>
                    <ViewProvider tableId={tableId} viewId={viewId} apiClient={legacyApiClient}>
                      <FieldProvider tableId={tableId} apiClient={legacyApiClient}>
                        {children}
                      </FieldProvider>
                    </ViewProvider>
                  </TableProvider>
                ) : (
                  children
                )}
              </PermissionProvider>
            </BaseProvider>
          ) : (
            children
          )}
        </AppProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
