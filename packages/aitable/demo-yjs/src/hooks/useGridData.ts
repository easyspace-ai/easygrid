/**
 * Grid 数据管理 Hook
 * 负责获取和转换数据为 Grid 组件所需的格式
 */

import { useState, useEffect, useCallback } from 'react';
// import { createAdapter } from '@easygrid/aitable';
import { mapFieldTypeToGridType, mapFieldOptionsToGridOptions } from '../utils/typeMapping';
import type { IGridColumn } from '@easygrid/aitable';

export interface GridData {
  columns: IGridColumn[];
  rowData: any[];
  loading: boolean;
  error: string | null;
  table: any | null;
  fields: any[];
  records: any[];
  views: any[];
}

export function useGridData(adapter: any, tableId: string) {
  const [data, setData] = useState<GridData>({
    columns: [],
    rowData: [],
    loading: false,
    error: null,
    table: null,
    fields: [],
    records: [],
    views: [],
  });

  // 获取表格信息
  const fetchTable = useCallback(async () => {
    if (!adapter || !tableId) return;
    
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      const table = await adapter.getTable(tableId);
      if (table.code === 200000) {
        setData(prev => ({ ...prev, table: table.data }));
      } else {
        setData(prev => ({ ...prev, error: `获取表格失败: ${table.message}` }));
      }
    } catch (error: any) {
      setData(prev => ({ ...prev, error: `获取表格失败: ${error.message}` }));
    } finally {
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [adapter, tableId]);

  // 获取字段列表
  const fetchFields = useCallback(async () => {
    if (!adapter || !tableId) return;
    
    try {
      const response = await adapter.getFields(tableId);
      if (response.code === 200000) {
        const fields = response.data;
        setData(prev => ({ ...prev, fields }));
        
        // 转换为 Grid 列格式
        const columns: IGridColumn[] = fields.map((field: any) => ({
          id: field.id,
          name: field.name,
          type: mapFieldTypeToGridType(field.type),
          width: 150,
          resizable: true,
          sortable: true,
          filterable: true,
          options: mapFieldOptionsToGridOptions(field.options),
        }));
        
        setData(prev => ({ ...prev, columns }));
      } else {
        setData(prev => ({ ...prev, error: `获取字段失败: ${response.message}` }));
      }
    } catch (error: any) {
      setData(prev => ({ ...prev, error: `获取字段失败: ${error.message}` }));
    }
  }, [adapter, tableId]);

  // 获取记录列表
  const fetchRecords = useCallback(async () => {
    if (!adapter || !tableId) return;
    
    try {
      const response = await adapter.getRecords(tableId);
      if (response.code === 200000) {
        const records = response.data;
        setData(prev => ({ ...prev, records }));
        
        // 转换为 Grid 行数据格式
        const rowData = records.map((record: any) => ({
          id: record.id,
          ...record.data, // 字段值
        }));
        
        setData(prev => ({ ...prev, rowData }));
      } else {
        setData(prev => ({ ...prev, error: `获取记录失败: ${response.message}` }));
      }
    } catch (error: any) {
      setData(prev => ({ ...prev, error: `获取记录失败: ${error.message}` }));
    }
  }, [adapter, tableId]);

  // 获取视图列表
  const fetchViews = useCallback(async () => {
    if (!adapter || !tableId) return;
    
    try {
      const response = await adapter.getViews(tableId);
      if (response.code === 200000) {
        setData(prev => ({ ...prev, views: response.data }));
      } else {
        setData(prev => ({ ...prev, error: `获取视图失败: ${response.message}` }));
      }
    } catch (error: any) {
      setData(prev => ({ ...prev, error: `获取视图失败: ${error.message}` }));
    }
  }, [adapter, tableId]);

  // 创建字段
  const createField = useCallback(async (fieldData: any) => {
    if (!adapter || !tableId) return null;
    
    try {
      const response = await adapter.createField(tableId, fieldData);
      if (response.code === 200000) {
        // 刷新字段列表
        await fetchFields();
        return response.data;
      } else {
        setData(prev => ({ ...prev, error: `创建字段失败: ${response.message}` }));
        return null;
      }
    } catch (error: any) {
      setData(prev => ({ ...prev, error: `创建字段失败: ${error.message}` }));
      return null;
    }
  }, [adapter, tableId, fetchFields]);

  // 创建记录
  const createRecord = useCallback(async (recordData: any) => {
    if (!adapter || !tableId) return null;
    
    try {
      const response = await adapter.createRecord(tableId, recordData);
      if (response.code === 200000) {
        // 刷新记录列表
        await fetchRecords();
        return response.data;
      } else {
        setData(prev => ({ ...prev, error: `创建记录失败: ${response.message}` }));
        return null;
      }
    } catch (error: any) {
      setData(prev => ({ ...prev, error: `创建记录失败: ${error.message}` }));
      return null;
    }
  }, [adapter, tableId, fetchRecords]);

  // 更新记录
  const updateRecord = useCallback(async (recordId: string, fieldId: string, value: any) => {
    if (!adapter || !tableId) return null;
    
    try {
      const response = await adapter.updateRecord(tableId, recordId, { [fieldId]: value });
      if (response.code === 200000) {
        // 刷新记录列表
        await fetchRecords();
        return response.data;
      } else {
        setData(prev => ({ ...prev, error: `更新记录失败: ${response.message}` }));
        return null;
      }
    } catch (error: any) {
      setData(prev => ({ ...prev, error: `更新记录失败: ${error.message}` }));
      return null;
    }
  }, [adapter, tableId, fetchRecords]);

  // 刷新所有数据
  const refreshData = useCallback(async () => {
    if (!adapter || !tableId) return;
    
    await Promise.all([
      fetchTable(),
      fetchFields(),
      fetchRecords(),
      fetchViews(),
    ]);
  }, [adapter, tableId, fetchTable, fetchFields, fetchRecords, fetchViews]);

  // 初始化数据
  useEffect(() => {
    if (adapter && tableId) {
      refreshData();
    }
  }, [adapter, tableId, refreshData]);

  return {
    ...data,
    createField,
    createRecord,
    updateRecord,
    refreshData,
  };
}
