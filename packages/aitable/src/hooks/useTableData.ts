/**
 * 表格数据 Hook
 * 使用现有的 API 客户端或 SDK 获取和管理表格数据
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ApiClient, type ITable, type IField, type IRecord } from '../api';
import { CellType } from '../grid';
import { createGetCellContent, convertFieldsToColumns } from '../utils/field-mappers';
import { createAdapter } from '../api/sdk-adapter';

export interface TableDataState {
  table: ITable | null;
  fields: IField[];
  records: IRecord[];
  totalRecords: number;
  loading: boolean;
  error: string | null;
}

export interface UseTableDataOptions {
  baseURL?: string;
  token?: string;
  tableId: string;
  autoLoad?: boolean;
  limit?: number;
  offset?: number;
  // 新增：支持直接传入 SDK
  sdk?: any;
  apiClient?: any;
}

export interface CellData {
  type: CellType;
  data: any;
  displayData: string;
  // 选择字段特有属性
  choiceMap?: Map<string, { id: string; name: string; color: string }>;
  choiceSorted?: Array<{ id: string; name: string; color: string }>;
  isMultiple?: boolean;
}

/**
 * 表格数据管理 Hook
 */
export function useTableData(options: UseTableDataOptions) {
  const { 
    baseURL, 
    token, 
    tableId, 
    autoLoad = true, 
    limit = 100, 
    offset = 0,
    sdk,
    apiClient: externalApiClient 
  } = options;

  // 状态管理
  const [state, setState] = useState<TableDataState>({
    table: null,
    fields: [],
    records: [],
    totalRecords: 0,
    loading: false,
    error: null,
  });

  // 创建 API 客户端或使用外部传入的
  const apiClient = useMemo(() => {
    if (externalApiClient) {
      return externalApiClient;
    }
    
    if (sdk) {
      // 如果传入了 SDK，通过适配器包装
      return createAdapter(sdk);
    }
    
    if (baseURL) {
      // 创建新的 ApiClient
      return new ApiClient({
        baseURL,
        token,
        onError: (error) => {
          console.error('API Error:', error);
          setState(prev => ({ ...prev, error: error.message || 'API 请求失败' }));
        },
        onUnauthorized: () => {
          console.log('未授权，需要重新登录');
          setState(prev => ({ ...prev, error: '未授权，请重新登录' }));
        },
      });
    }
    
    throw new Error('必须提供 baseURL、sdk 或 apiClient 其中之一');
  }, [baseURL, token, sdk, externalApiClient]);

  /**
   * 加载表格数据
   */
  const loadTableData = useCallback(async () => {
    if (!tableId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 并行获取表格、字段和记录数据
      const [table, fields, recordsResponse] = await Promise.all([
        apiClient.getTable(tableId),
        apiClient.getFields(tableId),
        apiClient.getRecords(tableId, {
          skip: offset,
          take: limit,
        }),
      ]);

      // 处理 records 数据结构
      // SDK 可能返回 { data: { list: [...] } } 或 { data: [...] } 或 { list: [...] }
      let recordsData: any[] = [];
      if (recordsResponse) {
        if (Array.isArray(recordsResponse)) {
          recordsData = recordsResponse;
        } else if (recordsResponse.data) {
          if (Array.isArray(recordsResponse.data)) {
            recordsData = recordsResponse.data;
          } else if (recordsResponse.data.list && Array.isArray(recordsResponse.data.list)) {
            recordsData = recordsResponse.data.list;
          }
        } else if (recordsResponse.list && Array.isArray(recordsResponse.list)) {
          recordsData = recordsResponse.list;
        }
      }

      const totalRecords = recordsResponse?.total || recordsResponse?.data?.total || recordsData.length;

      setState({
        table,
        fields,
        records: recordsData,
        totalRecords,
        loading: false,
        error: null,
      });

      console.log(`✅ 表格数据加载完成: ${table.name} (${recordsData.length}/${totalRecords} 条记录)`, {
        recordsResponse,
        recordsData: recordsData.slice(0, 2), // 只打印前两条
        fieldsCount: fields.length,
      });
    } catch (error: any) {
      console.error('❌ 加载表格数据失败:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || '加载数据失败',
      }));
    }
  }, [apiClient, tableId, limit, offset]);

  /**
   * 创建记录
   */
  const createRecord = useCallback(async (data: Record<string, any>) => {
    if (!tableId) throw new Error('表格ID不能为空');

    try {
      const newRecord = await apiClient.createRecord(tableId, { fields: data });
      
      // 更新本地状态
      setState(prev => ({
        ...prev,
        records: [newRecord, ...prev.records],
        totalRecords: prev.totalRecords + 1,
      }));

      console.log('✅ 记录创建成功:', newRecord.id);
      return newRecord;
    } catch (error: any) {
      console.error('❌ 创建记录失败:', error);
      throw error;
    }
  }, [apiClient, tableId]);

  /**
   * 更新记录
   */
  const updateRecord = useCallback(async (recordId: string, fieldId: string, value: any) => {
    if (!tableId) throw new Error('表格ID不能为空');

    try {
      const updatedRecord = await apiClient.updateRecord(tableId, recordId, fieldId, value);
      
      // 更新本地状态
      setState(prev => ({
        ...prev,
        records: prev.records.map(record =>
          record.id === recordId ? updatedRecord : record
        ),
      }));

      console.log('✅ 记录更新成功:', recordId);
      return updatedRecord;
    } catch (error: any) {
      console.error('❌ 更新记录失败:', error);
      throw error;
    }
  }, [apiClient, tableId]);

  /**
   * 删除记录
   */
  const deleteRecord = useCallback(async (recordId: string) => {
    if (!tableId) throw new Error('表格ID不能为空');

    try {
      await apiClient.deleteRecord(tableId, recordId);
      
      // 更新本地状态
      setState(prev => ({
        ...prev,
        records: prev.records.filter(record => record.id !== recordId),
        totalRecords: prev.totalRecords - 1,
      }));

      console.log('✅ 记录删除成功:', recordId);
    } catch (error: any) {
      console.error('❌ 删除记录失败:', error);
      throw error;
    }
  }, [apiClient, tableId]);

  /**
   * 获取单元格内容（适配 Grid 组件接口）
   * 使用内置的字段映射工具
   */
  const getCellContent = useMemo(() => {
    return createGetCellContent(state.fields, state.records);
  }, [state.fields, state.records]);

  /**
   * 生成列定义（适配 Grid 组件接口）
   * 使用内置的字段映射工具
   */
  const columns = useMemo(() => {
    return convertFieldsToColumns(state.fields);
  }, [state.fields]);

  // 自动加载数据
  useEffect(() => {
    if (autoLoad && tableId) {
      loadTableData();
    }
  }, [autoLoad, tableId, loadTableData]);

  return {
    // 状态
    ...state,
    
    // 数据
    columns,
    rowCount: state.records.length,
    
    // 方法
    loadTableData,
    createRecord,
    updateRecord,
    deleteRecord,
    getCellContent,
    
    // API 客户端（用于高级操作）
    apiClient,
  };
}

export default useTableData;
