import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { config } from '../config';

export interface Table {
  id: string;
  name: string;
  description?: string;
}

export interface Field {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface TableRecord {
  id: string;
  data: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TableData {
  table: Table | null;
  fields: Field[];
  records: TableRecord[];
  loading: boolean;
  error: string | null;
}

export function useTableData(isConnected: boolean) {
  const [data, setData] = useState<TableData>({
    table: null,
    fields: [],
    records: [],
    loading: false,
    error: null,
  });

  // 获取认证头
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 获取表格信息
  const fetchTable = useCallback(async () => {
    if (!isConnected) return;

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.get(`/api/v1/tables/${config.testBase.tableId}`, {
        withCredentials: true,
        headers: getAuthHeaders(),
      });
      
      if (response.data.code === 200000) {
        setData(prev => ({ ...prev, table: response.data.data, loading: false }));
      } else {
        setData(prev => ({
          ...prev,
          loading: false,
          error: `获取表格失败: ${response.data.message}`,
        }));
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: `获取表格失败: ${error}`,
      }));
    }
  }, [isConnected]);

  // 获取字段列表
  const fetchFields = useCallback(async () => {
    if (!isConnected) return;

    try {
      const response = await axios.get(`/api/v1/tables/${config.testBase.tableId}/fields`, {
        withCredentials: true,
        headers: getAuthHeaders(),
      });
      
      if (response.data.code === 200000) {
        setData(prev => ({ ...prev, fields: response.data.data }));
      } else {
        setData(prev => ({
          ...prev,
          error: `获取字段失败: ${response.data.message}`,
        }));
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: `获取字段失败: ${error}`,
      }));
    }
  }, [isConnected]);

  // 获取记录列表
  const fetchRecords = useCallback(async () => {
    if (!isConnected) return;

    try {
      const response = await axios.get(`/api/v1/tables/${config.testBase.tableId}/records`, {
        withCredentials: true,
        headers: getAuthHeaders(),
      });
      
      if (response.data.code === 200000) {
        setData(prev => ({ ...prev, records: response.data.data }));
      } else {
        setData(prev => ({
          ...prev,
          error: `获取记录失败: ${response.data.message}`,
        }));
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: `获取记录失败: ${error}`,
      }));
    }
  }, [isConnected]);

  // 创建记录
  const createRecord = useCallback(async (recordData: Record<string, any>) => {
    if (!isConnected) return null;

    try {
      const response = await axios.post(`/api/v1/tables/${config.testBase.tableId}/records`, {
        data: recordData
      }, {
        withCredentials: true,
      });
      
      if (response.data.code === 200000) {
        // 刷新记录列表
        await fetchRecords();
        return response.data.data;
      } else {
        setData(prev => ({
          ...prev,
          error: `创建记录失败: ${response.data.message}`,
        }));
        return null;
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: `创建记录失败: ${error}`,
      }));
      return null;
    }
  }, [isConnected, fetchRecords]);

  // 更新记录
  const updateRecord = useCallback(async (recordId: string, recordData: Record<string, any>, version?: number) => {
    if (!isConnected) return null;

    try {
      const response = await axios.patch(`/api/v1/tables/${config.testBase.tableId}/records/${recordId}`, {
        data: recordData,
        version
      }, {
        withCredentials: true,
      });
      
      if (response.data.code === 200000) {
        // 刷新记录列表
        await fetchRecords();
        return response.data.data;
      } else {
        setData(prev => ({
          ...prev,
          error: `更新记录失败: ${response.data.message}`,
        }));
        return null;
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: `更新记录失败: ${error}`,
      }));
      return null;
    }
  }, [isConnected, fetchRecords]);

  // 删除记录
  const deleteRecord = useCallback(async (recordId: string) => {
    if (!isConnected) return false;

    try {
      const response = await axios.delete(`/api/v1/tables/${config.testBase.tableId}/records/${recordId}`, {
        withCredentials: true,
      });
      
      if (response.data.code === 200000) {
        // 刷新记录列表
        await fetchRecords();
        return true;
      } else {
        setData(prev => ({
          ...prev,
          error: `删除记录失败: ${response.data.message}`,
        }));
        return false;
      }
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: `删除记录失败: ${error}`,
      }));
      return false;
    }
  }, [isConnected, fetchRecords]);

  // 实时更新记录字段
  const updateRecordFieldRealtime = useCallback(async (recordId: string, fieldId: string, value: any) => {
    if (!isConnected) return false;

    try {
      // 这里可以调用 API 更新字段
      console.log('实时更新字段:', { recordId, fieldId, value });
      return true;
    } catch (error) {
      setData(prev => ({
        ...prev,
        error: `实时更新失败: ${error}`,
      }));
      return false;
    }
  }, [isConnected]);

  // 订阅表格实时更新
  const subscribeToTableRealtime = useCallback((_callback: (updates: any) => void) => {
    if (!isConnected) return;

    try {
      // 这里可以订阅实时更新
      console.log('订阅实时更新:', config.testBase.tableId);
    } catch (error) {
      console.error('订阅表格实时更新失败:', error);
    }
  }, [isConnected]);

  // 初始化数据
  useEffect(() => {
    if (isConnected) {
      fetchTable();
      fetchFields();
      fetchRecords();
    }
  }, [isConnected, fetchTable, fetchFields, fetchRecords]);

  return {
    ...data,
    createRecord,
    updateRecord,
    deleteRecord,
    updateRecordFieldRealtime,
    subscribeToTableRealtime,
    refresh: () => {
      fetchTable();
      fetchFields();
      fetchRecords();
    },
  };
}
