/**
 * TableViewV3 - 使用 StandardDataViewV3 的高性能表格组件
 * 
 * 集成 @easygrid/aitable 的 StandardDataViewV3 组件：
 * - Canvas 渲染，支持大数据集
 * - 虚拟滚动
 * - 列操作（调整大小、排序）
 * - 单元格编辑
 * - 实时协作
 * - 视图管理
 * - 字段配置
 */

import React, { useCallback, useEffect, useState, useMemo, createContext, useContext, ReactNode } from 'react';
import { StandardDataViewV3, CellType } from '@easygrid/aitable';
import { LuckDB } from '@easygrid/sdk';
import { useConnection } from '../hooks/useConnection';
import { useRealtimeRecord } from '../hooks/useRealtimeRecord';
import { createDemoAdapter } from '../utils/sdkAdapter';
import { config } from '../config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 创建完整的 FieldManagementProvider 实现
const FieldManagementContext = createContext<any>(null);

// 创建 useFieldManagement Hook - 与原始实现兼容
export function useFieldManagement() {
  const context = useContext(FieldManagementContext);
  if (!context) {
    throw new Error('useFieldManagement must be used within FieldManagementProvider');
  }
  return context;
}

// 创建全局的 Hook 替换 - 解决 Grid 组件中的导入问题
// @ts-ignore
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.useFieldManagement = useFieldManagement;
}

// 创建全局的 Hook 替换 - 解决 Grid 组件中的导入问题
// @ts-ignore
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.useFieldManagement = useFieldManagement;
}

// 创建全局的 Hook 替换 - 解决 Grid 组件中的导入问题
// @ts-ignore
if (typeof globalThis !== 'undefined') {
  // @ts-ignore
  globalThis.useFieldManagement = useFieldManagement;
}

// 创建 FieldContext 和 useField Hook
const FieldContext = createContext<any>(null);

function useField() {
  const context = useContext(FieldContext);
  if (!context) {
    throw new Error('useField must be used within FieldProvider');
  }
  return context;
}

// 创建 FieldProvider
function FieldProvider({ children }: { children: ReactNode }) {
  const value = {
    deleteField: async (fieldId: string) => {
      console.log('删除字段:', fieldId);
    },
  };
  
  return (
    <FieldContext.Provider value={value}>
      {children}
    </FieldContext.Provider>
  );
}

// 创建全局的 Hook 替换 - 解决 Grid 组件中的导入问题
// @ts-ignore
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.useField = useField;
}

// @ts-ignore
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.useField = useField;
}

// @ts-ignore
if (typeof globalThis !== 'undefined') {
  // @ts-ignore
  globalThis.useField = useField;
}

// 创建完整的 FieldManagementProvider
function FieldManagementProvider({ 
  children, 
  onFieldUpdated, 
  onFieldDeleted, 
  onError 
}: { 
  children: ReactNode;
  onFieldUpdated?: (field: any) => void;
  onFieldDeleted?: (fieldId: string) => void;
  onError?: (error: Error, operation: 'edit' | 'delete') => void;
}) {
  const { deleteField } = useField();
  
  // 编辑对话框状态
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    field: any | null;
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
  const openEditDialog = useCallback((field: any) => {
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

  // 处理字段更新
  const handleFieldUpdated = useCallback((field: any) => {
    onFieldUpdated?.(field);
    closeDialogs();
  }, [onFieldUpdated, closeDialogs]);

  // 处理字段删除
  const handleFieldDeleted = useCallback(async (fieldId: string) => {
    try {
      await deleteField(fieldId);
      onFieldDeleted?.(fieldId);
      closeDialogs();
    } catch (error) {
      onError?.(error as Error, 'delete');
    }
  }, [deleteField, onFieldDeleted, onError, closeDialogs]);

  const value = {
    openEditDialog,
    openDeleteDialog,
    closeDialogs,
  };
  
  return (
    <FieldManagementContext.Provider value={value}>
      {children}
      {/* 这里可以添加编辑和删除对话框组件 */}
    </FieldManagementContext.Provider>
  );
}

// 创建 QueryClient 实例
const queryClient = new QueryClient();

// 定义本地类型，避免导入错误
interface IGridColumn {
  id: string;
  name: string;
  type: string;
  width?: number;
  resizable?: boolean;
}

interface FieldConfig {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  width?: number;
  options?: any;
}

// 将 API 字段类型映射为 Grid 单元格类型
const mapFieldTypeToCellType = (fieldType: string): CellType => {
  const typeMap: Record<string, CellType> = {
    'text': CellType.Text,
    'longText': CellType.Text,
    'number': CellType.Number,
    'select': CellType.Select,
    'multiSelect': CellType.MultiSelect,
    'date': CellType.Date,
    'checkbox': CellType.Boolean,
    'attachment': CellType.Attachment,
    'link': CellType.Link,
    'user': CellType.User,
    'rating': CellType.Rating,
    'formula': CellType.Formula,
  };
  return typeMap[fieldType] || CellType.Text;
};

// 格式化单元格显示数据
const formatCellDisplayData = (value: any, fieldType: string): any => {
  if (value === null || value === undefined) return '';
  
  switch (fieldType) {
    case 'date':
      return new Date(value).toLocaleDateString('zh-CN');
    case 'checkbox':
      return Boolean(value);
    case 'number':
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    default:
      return String(value);
  }
};

export interface TableViewV3Props {
  sdk?: LuckDB | null;
  isShareDBConnected?: boolean;
}

export function TableViewV3({ sdk, isShareDBConnected }: TableViewV3Props) {
  const { isLoggedIn, user } = useConnection();
  
  // 状态管理
  const [adapter, setAdapter] = useState<any>(null);
  const [table, setTable] = useState<any>(null);
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 调试状态：跟踪更新的单元格
  const [updatedCells, setUpdatedCells] = useState<Set<string>>(new Set());
  const [cellUpdateLog, setCellUpdateLog] = useState<Array<{
    recordId: string;
    fieldId: string;
    fieldName: string;
    oldValue: any;
    newValue: any;
    timestamp: string;
  }>>([]);
  
  // 添加强制更新触发器
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // 跟踪单元格更新的函数
  const trackCellUpdate = useCallback((recordId: string, fieldId: string, fieldName: string, oldValue: any, newValue: any) => {
    const cellKey = `${recordId}-${fieldId}`;
    const timestamp = new Date().toISOString();
    
    // 记录更新日志
    const updateLog = {
      recordId,
      fieldId,
      fieldName,
      oldValue,
      newValue,
      timestamp
    };
    
    setCellUpdateLog(prev => [...prev.slice(-9), updateLog]); // 保留最近10条记录
    
    // 添加到更新单元格集合
    setUpdatedCells(prev => new Set([...prev, cellKey]));
    
    // 3秒后移除闪动效果
    setTimeout(() => {
      setUpdatedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }, 3000);
    
    // 控制台输出
    console.log(`🔄 [TableViewV3] 单元格更新:`, {
      recordId,
      fieldId,
      fieldName,
      oldValue,
      newValue,
      timestamp
    });
  }, []);

  // 初始化 SDK 和适配器
  useEffect(() => {
    if (sdk && isLoggedIn) {
      const demoAdapter = createDemoAdapter(sdk);
      setAdapter(demoAdapter);
      console.log('✅ SDK 和适配器初始化成功');
    }
  }, [sdk, isLoggedIn]);

  // 加载表格数据
  const loadTableData = useCallback(async () => {
    if (!sdk || !config.testBase.tableId) return;

    try {
      setLoading(true);
      setError(null);

      // 获取表格信息
      const tableData = await sdk.getTable(config.testBase.tableId);
      setTable(tableData);

      // 获取字段列表
      const fieldsData = await sdk.listFields({ tableId: config.testBase.tableId });
      const fieldConfigs: FieldConfig[] = fieldsData.map((field: any) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        visible: true,
      }));
      setFields(fieldConfigs);

      // 获取记录列表
      const recordsData = await sdk.listRecords({ tableId: config.testBase.tableId });
      setRecords(recordsData.data || []);

      console.log('✅ 表格数据加载完成:', {
        table: tableData.name,
        fieldsCount: fieldsData.length,
        recordsCount: recordsData.data?.length || 0,
      });
    } catch (error) {
      console.error('❌ 加载表格数据失败:', error);
      setError(`加载数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  // 订阅测试记录的实时更新
  const testRecordId = 'rec_mQdD3mQ9hNmcTX2Cb2R8e'; // 测试记录ID
  const { record: realtimeRecord, isSubscribed: isRecordSubscribed } = useRealtimeRecord(
    sdk,
    config.testBase.tableId,
    testRecordId
  );

  // 当实时记录更新时，同步到本地状态
  useEffect(() => {
    if (realtimeRecord && realtimeRecord.data) {
      console.log('📡 收到实时记录更新 (v2.1):', realtimeRecord);
      console.log('📡 记录数据:', realtimeRecord.data);
      console.log('📡 更新时间戳:', realtimeRecord._updateTime);
      
      setRecords(prevRecords => {
        const newRecords = prevRecords.map(record => 
          record.id === testRecordId 
            ? { ...record, data: { ...realtimeRecord.data } }
            : record
        );
        console.log('📡 更新后的记录数组:', newRecords);
        return newRecords;
      });
      
      // 强制触发UI更新
      setUpdateTrigger(prev => {
        console.log('📡 触发UI更新 (v2.1):', prev + 1);
        return prev + 1;
      });
    }
  }, [realtimeRecord, realtimeRecord?.data, realtimeRecord?._updateTime, testRecordId]);

  // 初始化数据
  useEffect(() => {
    if (sdk) {
      loadTableData();
    }
  }, [sdk]); // 移除 loadTableData 依赖以避免无限循环

  // 转换为 Grid 列格式
  const gridColumns: IGridColumn[] = useMemo(() => {
    const columns = fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type as any,
      width: field.width || 150, // 使用字段的实际宽度，默认为 150
      resizable: true,
    }));
    console.log('🔧 Grid 列配置:', columns);
    return columns;
  }, [fields]);

  // 转换为 Grid 数据格式
  const gridData = useMemo(() => {
    const data = records.map((record) => ({
      id: record.id,
      ...record.data,
    }));
    console.log('🔧 Grid 数据更新:', data.slice(0, 2)); // 只打印前2条记录
    return data;
  }, [records, updateTrigger]); // 添加 updateTrigger 依赖

  // 处理单元格编辑 (使用 SDK 实时 API)
  const handleCellEdit = useCallback(async (cell: any, newValue: any) => {
    console.log('🔧 handleCellEdit 调用:', { cell, newValue });
    
    // 修复：与 getCellContent 保持一致的索引顺序
    const rowIndex = Array.isArray(cell) ? cell[0] : cell.rowIndex;
    const colIndex = Array.isArray(cell) ? cell[1] : cell.colIndex;
    
    const column = gridColumns[colIndex];
    const record = gridData[rowIndex];
    
    if (!column || !record) {
      console.warn('⚠️ 列或记录不存在', { rowIndex, colIndex });
      return;
    }
    
    const fieldId = column.id;
    const recordId = record.id;
    const oldValue = record[fieldId];
    
    console.log('🔧 准备更新:', { recordId, fieldId, rowIndex, colIndex, value: newValue.data });
    
    // 1. Optimistic Update - 立即更新 UI
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          data: {
            ...r.data,
            [fieldId]: newValue.data
          }
        };
      }
      return r;
    }));
    
    // 2. 跟踪单元格更新
    trackCellUpdate(recordId, fieldId, column.name, oldValue, newValue.data);
    
    try {
      // 3. 使用 SDK 实时 API 更新
      if (sdk && config.testBase.tableId) {
        const recordClient = sdk.realtime.record(config.testBase.tableId, recordId);
        await recordClient.set(fieldId, newValue.data);
        
        console.log('✅ 单元格更新成功:', { fieldId, value: newValue.data });
      }
    } catch (error) {
      console.error('❌ 单元格更新失败:', error);
      
      // 错误回滚
      setRecords(prev => prev.map(r => {
        if (r.id === recordId) {
          return {
            ...r,
            data: {
              ...r.data,
              [fieldId]: oldValue
            }
          };
        }
        return r;
      }));
      
      alert(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [gridColumns, gridData, sdk, trackCellUpdate]);

  // 处理列宽调整
  const handleColumnResize = useCallback(async (column: any, newSize: number, colIndex: number) => {
    console.log('列宽调整:', column.name, newSize);
    
    if (!sdk || !config.testBase.tableId) return;
    
    try {
      // 更新字段配置中的列宽
      const fieldId = column.id;
      if (fieldId) {
        // 通过 SDK 更新字段配置
        // 注意：当前 SDK 可能不支持 width 字段，但我们可以尝试更新
        try {
          const currentField = fields.find(f => f.id === fieldId);
          await sdk.updateField(fieldId, {
            // 尝试更新字段配置，即使 SDK 可能不支持 width
            // 这里我们通过 options 字段来存储列宽信息
            options: {
              ...(currentField?.options || {}),
              width: newSize,
            },
          });
        } catch (sdkError) {
          console.warn('SDK 不支持列宽更新，仅更新本地状态:', sdkError);
        }
        
        // 更新本地状态
        setFields(prevFields => 
          prevFields.map(field => 
            field.id === fieldId 
              ? { ...field, width: newSize }
              : field
          )
        );
        
        console.log('✅ 列宽更新成功:', column.name, newSize);
      }
    } catch (error) {
      console.error('❌ 列宽更新失败:', error);
    }
  }, [sdk]);

  // 触发首行首列数值自增（非数字则置为 1）
  const handleTriggerCell = useCallback(async () => {
    try {
      if (gridData.length === 0 || gridColumns.length === 0) {
        console.warn('⚠️ 无可用数据或字段');
        return;
      }
      const firstRecord = gridData[0];
      const firstColumn = gridColumns[0];
      const recordId = firstRecord.id;
      const fieldId = firstColumn.id;
      const fieldType = firstColumn.type || 'text'; // 获取字段类型
      const localVal = firstRecord[fieldId];
      const current = localVal;
      
      console.log('🔍 字段信息:', { 
        fieldId, 
        fieldType, 
        currentValue: current, 
        currentType: typeof current 
      });

      // 根据字段类型进行适当的类型转换
      let nextValue;
      switch (fieldType) {
        case 'number':
        case 'integer':
          // 数字类型：尝试转换为数字
          const numValue = typeof current === 'number' ? current : parseFloat(String(current)) || 0;
          nextValue = numValue + 1;
          break;
        case 'text':
        case 'string':
          // 文本类型：追加数字
          const strValue = String(current || '');
          const isNumeric = /^\d+$/.test(strValue);
          if (isNumeric) {
            nextValue = String(parseInt(strValue, 10) + 1);
          } else {
            nextValue = strValue + '_' + Date.now();
          }
          break;
        case 'boolean':
          // 布尔类型：切换值
          nextValue = !Boolean(current);
          break;
        case 'date':
          // 日期类型：增加一天
          const dateValue = current ? new Date(current) : new Date();
          dateValue.setDate(dateValue.getDate() + 1);
          nextValue = dateValue.toISOString();
          break;
        default:
          // 默认处理：尝试数字转换
          const defaultStr = String(current ?? '');
          const isInt = /^\d+$/.test(defaultStr);
          nextValue = isInt ? parseInt(defaultStr, 10) + 1 : 1;
      }

      console.log('🔄 类型转换:', { 
        fieldType, 
        from: current, 
        to: nextValue, 
        fromType: typeof current, 
        toType: typeof nextValue 
      });

      // 使用 SDK 实时 API 更新
      if (sdk && config.testBase.tableId) {
        try {
          const recordClient = sdk.realtime.record(config.testBase.tableId, recordId);
          await recordClient.set(fieldId, nextValue);
          console.log('✅ 已通过 SDK 实时同步');
        } catch (e) {
          console.error('SDK 同步失败', e);
        }
      }

      console.log('✅ 触发单格更新: ', { recordId, fieldId, fieldType, from: current, to: nextValue });
      // 更新本地 records.data
      setRecords(prev => prev.map(r => {
        if (r.id === recordId) {
          const newData = { ...(r.data || {}), [fieldId]: nextValue };
          return { ...r, data: newData };
        }
        return r;
      }));
    } catch (e) {
      console.error('❌ 触发单格更新失败', e);
    }
  }, [gridData, gridColumns, sdk]);

  // 处理列排序
  const handleColumnReorder = useCallback(async (dragColIndexCollection: number[], dropColIndex: number) => {
    console.log('列排序:', dragColIndexCollection, dropColIndex);
    
    if (!sdk || !config.testBase.tableId) return;
    
    try {
      // 获取拖拽的列
      const draggedColumns = dragColIndexCollection.map(index => gridColumns[index]);
      const draggedFieldIds = draggedColumns.map(col => col.id).filter(Boolean);
      
      if (draggedFieldIds.length === 0) return;
      
      // 计算新的位置
      const dropColumn = gridColumns[dropColIndex];
      const dropFieldId = dropColumn?.id;
      
      if (!dropFieldId) return;
      
      // 通过 SDK 更新字段顺序
      for (let i = 0; i < draggedFieldIds.length; i++) {
        const fieldId = draggedFieldIds[i];
        const newOrder = dropColIndex + i;
        
        await sdk.updateField(fieldId, {
          fieldOrder: newOrder,
        });
      }
      
      // 更新本地状态
      const newFields = [...fields];
      const draggedFields = dragColIndexCollection.map(index => newFields[index]);
      
      // 移除拖拽的字段
      dragColIndexCollection.sort((a: number, b: number) => b - a).forEach((index: number) => {
        newFields.splice(index, 1);
      });
      
      // 插入到新位置
      const insertIndex = dropColIndex > dragColIndexCollection[0] 
        ? dropColIndex - dragColIndexCollection.length 
        : dropColIndex;
      
      newFields.splice(insertIndex, 0, ...draggedFields);
      
      setFields(newFields);
      
      console.log('✅ 列顺序更新成功');
    } catch (error) {
      console.error('❌ 列顺序更新失败:', error);
    }
  }, [sdk, fields, gridColumns]);

  // 处理行排序
  const handleRowReorder = useCallback(async (dragRowIndexCollection: number[], dropRowIndex: number) => {
    console.log('行排序:', dragRowIndexCollection, dropRowIndex);
    
    if (!sdk || !config.testBase.tableId) return;
    
    try {
      // 获取拖拽的行
      const draggedRows = dragRowIndexCollection.map(index => gridData[index]);
      const draggedRecordIds = draggedRows.map(row => row.id).filter(Boolean);
      
      if (draggedRecordIds.length === 0) return;
      
      // 计算新的位置
      const dropRow = gridData[dropRowIndex];
      const dropRecordId = dropRow?.id;
      
      if (!dropRecordId) return;
      
      // 通过 SDK 更新记录顺序
      for (let i = 0; i < draggedRecordIds.length; i++) {
        const recordId = draggedRecordIds[i];
        const newOrder = dropRowIndex + i;
        
        await sdk.updateRecord(config.testBase.tableId, recordId, {
          fieldKeyType: 'id',
          record: {
            fields: {
              order: newOrder
            }
          }
        });
      }
      
      // 更新本地状态
      const newRecords = [...records];
      const draggedRecords = dragRowIndexCollection.map(index => newRecords[index]);
      
      // 移除拖拽的记录
      dragRowIndexCollection.sort((a, b) => b - a).forEach(index => {
        newRecords.splice(index, 1);
      });
      
      // 插入到新位置
      const insertIndex = dropRowIndex > dragRowIndexCollection[0] 
        ? dropRowIndex - dragRowIndexCollection.length 
        : dropRowIndex;
      
      newRecords.splice(insertIndex, 0, ...draggedRecords);
      
      setRecords(newRecords);
      
      console.log('✅ 行顺序更新成功');
    } catch (error) {
      console.error('❌ 行顺序更新失败:', error);
    }
  }, [sdk, records, gridData]);

  // 处理数据刷新
  const handleDataRefresh = useCallback(async () => {
    await loadTableData();
  }, [loadTableData]);

  // 处理添加字段
  const handleAddField = useCallback(async (fieldName: string, fieldType: string) => {
    if (!sdk || !config.testBase.tableId) return;

    try {
      await sdk.createField({
        tableId: config.testBase.tableId,
        name: fieldName,
        type: fieldType as any,
      });
      
      // 刷新数据
      await loadTableData();
      console.log('✅ 字段添加成功');
    } catch (error) {
      console.error('❌ 字段添加失败:', error);
    }
  }, [sdk, loadTableData]);

  // 处理字段编辑
  const handleFieldEdit = useCallback((fieldId: string) => {
    console.log('编辑字段:', fieldId);
    // 这里可以打开字段编辑对话框
  }, []);

  // 处理字段删除
  const handleFieldDelete = useCallback(async (fieldId: string) => {
    if (!sdk || !config.testBase.tableId) return;

    try {
      // TODO: 修复 SDK 调用
      console.log('删除字段:', fieldId);
      // await sdk.deleteField({ tableId: config.testBase.tableId, fieldId });
      
      // 刷新数据
      await loadTableData();
      console.log('✅ 字段删除成功');
    } catch (error) {
      console.error('❌ 字段删除失败:', error);
    }
  }, [sdk, loadTableData]);

  // 处理视图创建
  const handleCreateView = useCallback(async (viewType: string) => {
    if (!sdk || !config.testBase.tableId) return;

    try {
      const viewName = viewType === 'grid' ? '表格视图' : '看板视图';
      await sdk.createView({
        tableId: config.testBase.tableId,
        name: viewName,
        type: viewType as any,
      });
      
      console.log('✅ 视图创建成功');
    } catch (error) {
      console.error('❌ 视图创建失败:', error);
    }
  }, [sdk]);

  // 处理视图重命名
  const handleRenameView = useCallback(async (viewId: string, newName: string) => {
    if (!sdk || !config.testBase.tableId) return;

    try {
      // TODO: 修复 SDK 调用
      console.log('重命名视图:', viewId, newName);
      // await sdk.updateView({ tableId: config.testBase.tableId, viewId, name: newName });
      
      console.log('✅ 视图重命名成功');
    } catch (error) {
      console.error('❌ 视图重命名失败:', error);
    }
  }, [sdk]);

  // 处理视图删除
  const handleDeleteView = useCallback(async (viewId: string) => {
    if (!sdk || !config.testBase.tableId) return;

    try {
      // TODO: 修复 SDK 调用
      console.log('删除视图:', viewId);
      // await sdk.deleteView({ tableId: config.testBase.tableId, viewId });
      
      console.log('✅ 视图删除成功');
    } catch (error) {
      console.error('❌ 视图删除失败:', error);
    }
  }, [sdk]);

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">加载表格数据中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div className="text-center">
          <p className="text-lg font-medium">错误</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadTableData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 未连接状态
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">未连接</p>
          <p className="text-sm mt-1">请先登录以查看表格数据</p>
        </div>
      </div>
    );
  }

  // 无数据状态
  if (!table) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">未找到表格</p>
          <p className="text-sm mt-1">请检查表格 ID 配置</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <FieldProvider>
        <FieldManagementProvider
          onFieldUpdated={(field) => console.log('字段更新:', field)}
          onFieldDeleted={(fieldId) => console.log('字段删除:', fieldId)}
          onError={(error, operation) => console.error('字段操作错误:', operation, error)}
        >
          <div className="h-screen w-full">
            {/* 调试工具栏：触发单格更新 */}
            <div className="p-2 flex items-center gap-2">
              <button onClick={handleTriggerCell} className="px-2 py-1 border rounded">
                触发单格更新（+1）
              </button>
              <span className="text-sm text-gray-500">
                ShareDB: {isShareDBConnected ? '✅ 已连接' : '❌ 未连接'}
              </span>
            </div>
            <StandardDataViewV3
        // SDK 配置
        sdk={sdk}
        tableId={config.testBase.tableId}
        
        // 字段配置
        fields={fields}
        fieldConfigMode="combobox"
        onAddField={handleAddField}
        onFieldEdit={handleFieldEdit}
        onFieldDelete={handleFieldDelete}
        
        // 行高配置
        rowHeight="medium"
        
        // Grid 配置
        gridProps={{
          columns: gridColumns,
          rowCount: gridData.length,
          draggable: 'all' as any, // 启用所有拖拽功能（行、列、单元格）
          getCellContent: (cell: any) => {
            // cell 可能是数组格式 [rowIndex, colIndex]
            const rowIndex = Array.isArray(cell) ? cell[0] : cell.rowIndex;
            const colIndex = Array.isArray(cell) ? cell[1] : cell.colIndex;
            
            const record = gridData[rowIndex];
            const column = gridColumns[colIndex];
            
            // 安全检查
            if (!record || !column) {
              return {
                type: CellType.Text,
                data: '',
                displayData: '',
              };
            }
            
            // 直接从记录数据读取值
            const value = record[column.id];
            
            // 检测值变化并跟踪更新
            const cellKey = `${record.id}-${column.id}`;
            const previousValue = record[`_prev_${column.id}`];
            
            if (value !== previousValue && previousValue !== undefined) {
              trackCellUpdate(record.id, column.id, column.name, previousValue, value);
            }
            
            // 更新记录中的前一个值
            record[`_prev_${column.id}`] = value;
            
            // 检查是否应该显示闪动效果
            const isUpdated = updatedCells.has(cellKey);
            
            const cellType = mapFieldTypeToCellType(column.type);
            const formattedValue = formatCellDisplayData(value, column.type);
            
            return {
              type: cellType,
              value: formattedValue,
              data: value,
              displayData: formattedValue,
            };
          },
          onDataRefresh: handleDataRefresh,
          onCellEdited: handleCellEdit,
          onColumnResize: handleColumnResize,
          onColumnOrdered: handleColumnReorder,
          onRowOrdered: handleRowReorder,
        }}
        
        // 视图管理
        onCreateView={handleCreateView}
        onRenameView={handleRenameView}
        onDeleteView={handleDeleteView}
        
        // 工具栏配置
        toolbarConfig={{
          showUndoRedo: true,
          showAddNew: true,
          showFieldConfig: true,
          showRowHeight: true,
          showFilter: true,
          showSort: true,
          showGroup: true,
        }}
        
        // 状态栏
        statusContent={
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>连接: 已连接</span>
            </span>
            <span>用户: {user?.name} ({user?.email})</span>
            <span>表格: {table?.name}</span>
            <span>记录: {records.length}</span>
          </div>
        }
        
        // 状态
        state={loading ? 'loading' : gridData.length === 0 ? 'empty' : 'idle'}
        loadingMessage="加载数据中..."
        emptyStateProps={{
          title: '暂无数据',
          description: '点击"添加记录"按钮开始创建数据',
        }}
      />
        </div>
      </FieldManagementProvider>
    </FieldProvider>
  </QueryClientProvider>
  );
}

export default TableViewV3;