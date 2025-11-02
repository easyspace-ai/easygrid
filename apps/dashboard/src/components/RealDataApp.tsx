/**
 * 真实数据演示应用
 * 使用 LuckDB SDK 对接真实数据
 * 完全参考 manage 项目的实现方式
 */

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { StandardDataView } from "@easygrid/aitable";
import luckdb from "@/lib/luckdb";
import { useAuthStore } from "@/stores/auth-store";

// 定义类型（临时解决方案）
type DataViewState = 'idle' | 'loading' | 'empty' | 'error';
type RowHeight = 'short' | 'medium' | 'tall' | 'extra-tall';

// 简单的错误边界组件
class GridErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Grid Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-background">
          <div className="text-center space-y-4 p-8">
            <div className="text-red-500 text-6xl">⚠️</div>
            <h3 className="text-lg font-medium text-foreground">Grid 渲染错误</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              表格组件遇到了一个错误。这可能是由于 React 环境配置问题导致的。
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors ml-2"
              >
                重试
              </button>
            </div>
            <details className="text-xs text-muted-foreground mt-4">
              <summary className="cursor-pointer">错误详情</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto max-h-32">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface RealDataAppProps {
  tableId: string | null;
  tableName?: string | null;
}

function RealDataApp({ tableId, tableName }: RealDataAppProps) {
  const { accessToken } = useAuthStore();
  
  const [isConfigured, setIsConfigured] = useState(() => {
    return !!tableId;
  });
  
  // 数据状态 - 直接使用 SDK，参考 manage 项目
  const [table, setTable] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 视图状态
  const [views, setViews] = useState<any[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('');

  // 行高配置状态
  const [rowHeight, setRowHeight] = useState<RowHeight>('medium');

  // 加载表格数据 - 参考 manage 项目的实现方式
  const loadTableData = useCallback(async () => {
    if (!tableId || !accessToken) {
      console.log('⏸️ 跳过数据加载：缺少 tableId 或 accessToken');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 开始加载表格数据:', { 
        tableId, 
        hasToken: !!accessToken,
        tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'null',
        sdkBaseUrl: (luckdb as any).config?.baseUrl || 'unknown'
      });
      
      // 确保 SDK 有最新的 token
      luckdb.setAccessToken(accessToken);
      console.log('🔑 SDK token 已设置');
      
      // 直接使用 SDK 加载数据，参考 manage 项目
      const [tableData, fieldsData, recordsData] = await Promise.all([
        luckdb.getTable(tableId),
        luckdb.listFields({ tableId }),
        luckdb.listRecords({ tableId, limit: 100 }),
      ]);

      console.log('✅ 数据加载成功:', {
        table: tableData ? tableData.name : 'null',
        fieldsCount: fieldsData.length,
        recordsCount: Array.isArray(recordsData) ? recordsData.length : recordsData?.data?.length || 0,
      });

      setTable(tableData);
      setFields(fieldsData);
      // 处理分页响应格式
      const recordsArray = Array.isArray(recordsData) ? recordsData : recordsData?.data || [];
      setRecords(recordsArray);
      
    } catch (err: any) {
      console.error('❌ 加载表格数据失败:', err);
      setError(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [tableId, accessToken]);

  // 当 tableId 或 accessToken 变化时，重新加载数据
  useEffect(() => {
    if (tableId && accessToken) {
      loadTableData();
    } else {
      // 清空数据
      setTable(null);
      setFields([]);
      setRecords([]);
      setError(null);
    }
  }, [tableId, accessToken, loadTableData]);

  // 数据状态调试
  useEffect(() => {
    console.log('📊 RealDataApp 数据状态:', {
      table: table ? { id: table.id, name: table.name } : null,
      fieldsCount: fields.length,
      recordsCount: records.length,
      loading: loading,
      error: error,
      hasAccessToken: !!accessToken,
      tableId: tableId,
    });
    
    // 调试字段和列信息
    if (fields.length > 0) {
      console.log('🔍 字段信息:', fields.map(f => ({ id: f.id, name: f.name, type: f.type })));
    }
    if (records.length > 0) {
      console.log('🔍 记录示例:', records[0]);
    }
  }, [table, fields, records, loading, error, accessToken, tableId]);

  // 将 IField 转换为 FieldConfig 格式
  const fieldConfigs = useMemo(() => {
    return fields.map((field: any, index: any) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      visible: true, // 默认所有字段都可见
      locked: field.isPrimary, // 主键字段锁定
      required: field.isPrimary, // 主键字段必填
      description: field.description,
    }));
  }, [fields]);

  // 创建简单的 columns 和 getCellContent - 参考 manage 项目
  const columns = useMemo(() => {
    return fields.map((field: any) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      width: 150,
    }));
  }, [fields]);

  const rowCount = Array.isArray(records) ? records.length : 0;

  const getCellContent = useCallback((cell: [number, number]) => {
    const [colIndex, rowIndex] = cell;
    
    // 边界检查
    if (rowIndex < 0 || rowIndex >= records.length || colIndex < 0 || colIndex >= fields.length) {
      return { type: 'text', data: '', displayData: '' };
    }
    
    const record = records[rowIndex];
    const field = fields[colIndex];
    
    if (!record || !field) {
      return { type: 'text', data: '', displayData: '' };
    }
    
    // 获取字段值
    const fieldValue = record[field.name] || record[field.id] || '';
    
    // 根据字段类型返回正确的格式
    switch (field.type) {
      case 'number':
        return { 
          type: 'number', 
          data: fieldValue, 
          displayData: String(fieldValue || '') 
        };
      case 'date':
        return { 
          type: 'date', 
          data: fieldValue, 
          displayData: String(fieldValue || '') 
        };
      case 'select':
      case 'singleSelect':
        return { 
          type: 'singleSelect', 
          data: fieldValue, 
          displayData: String(fieldValue || '') 
        };
      case 'multipleSelect':
        return { 
          type: 'multipleSelect', 
          data: Array.isArray(fieldValue) ? fieldValue : [fieldValue], 
          displayData: Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue || '') 
        };
      case 'checkbox':
        return { 
          type: 'checkbox', 
          data: Boolean(fieldValue), 
          displayData: Boolean(fieldValue) ? '✓' : '' 
        };
      default:
        return { 
          type: 'text', 
          data: fieldValue, 
          displayData: String(fieldValue || '') 
        };
    }
  }, [records, fields]);

  // 创建记录函数
  const createRecord = useCallback(async (data: any) => {
    if (!tableId) return;
    
    try {
      console.log('🔄 创建新记录:', data);
      const newRecord = await luckdb.createRecord({ tableId, data });
      console.log('✅ 记录创建成功:', newRecord);
      
      // 重新加载数据
      await loadTableData();
      
      return newRecord;
    } catch (error) {
      console.error('❌ 创建记录失败:', error);
      throw error;
    }
  }, [tableId, loadTableData]);

  // 简化的处理函数
  const handleAddRecord = useCallback(async () => {
    try {
      console.log('🔄 准备添加新记录...');
      
      // 创建新记录
      const newRecord = await createRecord({
        // 这里可以设置默认值
        name: `新记录 ${Date.now()}`,
      });
      
      console.log('✅ 记录添加成功:', newRecord);
    } catch (error) {
      console.error('❌ 添加记录失败:', error);
      alert('添加记录失败，请重试');
    }
  }, [createRecord]);

  const handleReload = useCallback(async () => {
    console.log('🔄 重新加载数据...');
    await loadTableData();
  }, [loadTableData]);

  // 视图状态
  const currentViewState: DataViewState = useMemo(() => {
    if (!isConfigured) return 'idle';
    if (loading) return 'loading';
    if (error) return 'error';
    if (!Array.isArray(records) || records.length === 0) return 'empty';
    return 'idle';
  }, [isConfigured, loading, error, records]);

  // 统计信息
  const statistics = useMemo(() => {
    // 确保 records 是数组
    const recordsArray = Array.isArray(records) ? records : [];
    
    const completed = recordsArray.filter((record: any) => record.status === 'completed').length;
    const inProgress = recordsArray.filter((record: any) => record.status === 'in_progress').length;
    const pending = recordsArray.filter((record: any) => record.status === 'pending').length;
    const total = recordsArray.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, inProgress, pending, completionRate };
  }, [records]);

  // 简化的处理函数
  const handleViewChange = useCallback((viewId: string) => {
    console.log('视图切换:', viewId);
    setActiveViewId(viewId);
  }, []);

  const handleCreateView = useCallback((viewType: string) => {
    console.log('创建视图:', viewType);
  }, []);

  const handleFieldToggle = useCallback((fieldId: string, visible: boolean) => {
    console.log(`字段 ${fieldId} 显示状态切换为: ${visible}`);
  }, []);

  const handleFieldReorder = useCallback((fromIndex: number, toIndex: number) => {
    console.log(`字段重新排序: ${fromIndex} -> ${toIndex}`);
  }, []);

  const handleFieldEdit = useCallback((fieldId: string) => {
    console.log(`编辑字段: ${fieldId}`);
  }, []);

  const handleFieldDelete = useCallback((fieldId: string) => {
    console.log(`删除字段: ${fieldId}`);
  }, []);

  const handleFieldGroup = useCallback((fieldId: string) => {
    console.log(`创建字段编组: ${fieldId}`);
  }, []);

  const handleFieldCopy = useCallback((fieldId: string) => {
    console.log(`复制字段: ${fieldId}`);
  }, []);

  const handleFieldInsertLeft = useCallback((fieldId: string) => {
    console.log(`左侧插入字段: ${fieldId}`);
  }, []);

  const handleFieldInsertRight = useCallback((fieldId: string) => {
    console.log(`右侧插入字段: ${fieldId}`);
  }, []);

  const handleFieldFilter = useCallback((fieldId: string) => {
    console.log(`字段过滤: ${fieldId}`);
  }, []);

  const handleEditColumn = useCallback((columnIndex: number) => {
    console.log(`编辑列: ${columnIndex}`);
  }, []);

  const handleDeleteColumn = useCallback((columnIndex: number) => {
    console.log(`删除列: ${columnIndex}`);
  }, []);

  const handleFieldSort = useCallback((fieldId: string) => {
    console.log(`字段排序: ${fieldId}`);
  }, []);

  const handleFieldFreeze = useCallback((fieldId: string) => {
    console.log(`字段冻结: ${fieldId}`);
  }, []);

  const handleAddField = useCallback((fieldName: string, fieldType: string) => {
    console.log(`添加字段: ${fieldName} (${fieldType})`);
  }, []);

  const handleAddColumn = useCallback((columnIndex: number) => {
    console.log(`添加列: ${columnIndex}`);
  }, []);

  const handleUpdateField = useCallback((fieldId: string, updates: any) => {
    console.log(`更新字段: ${fieldId}`, updates);
  }, []);

  const handleRowHeightChange = useCallback((newRowHeight: RowHeight) => {
    console.log('行高变化:', newRowHeight);
    setRowHeight(newRowHeight);
  }, []);

  // 未配置状态
  if (!isConfigured) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">请选择一个表格</h3>
          <p className="text-sm">从左侧边栏选择一个表格来查看数据</p>
        </div>
      </div>
    );
  }

  // 已配置，显示数据视图
  return (
    <div className="h-full flex flex-col">
      {/* 配置信息栏 */}
      <div 
        style={{ 
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          真实数据模式：
        </span>
        <span style={{ fontSize: '13px', color: '#3b82f6' }}>
          http://localhost:2345
        </span>
        <span style={{ fontSize: '13px', color: '#22c55e' }}>
          ✅ 已认证
        </span>
        <span style={{ fontSize: '13px', color: '#22c55e' }}>
          ✅ 表格: {tableId}
        </span>
        {tableName && (
          <span style={{ fontSize: '13px', color: '#22c55e' }}>
            📋 {tableName}
          </span>
        )}
      </div>

      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{ 
            padding: '8px 16px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f8fafc',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          <div>🔍 调试信息:</div>
          <div>表格: {table ? `${table.name} (${table.id})` : '未加载'}</div>
          <div>字段数: {fields.length} | 记录数: {Array.isArray(records) ? records.length : 0}</div>
          <div>加载状态: {loading ? '加载中...' : '已完成'} | 错误: {error || '无'}</div>
          <div>列数: {columns.length} | 行数: {rowCount}</div>
        </div>
      )}

      {/* 主视图 */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <GridErrorBoundary>
          <StandardDataView
          state={currentViewState as any}
          loadingMessage="正在加载表格数据..."
          emptyStateProps={{
            title: table ? `${table.name} 暂无数据` : "表格暂无数据",
            description: "开始添加第一条记录，或者检查表格配置",
            actionLabel: "添加记录",
            onAction: handleAddRecord,
          }}
          errorStateProps={{
            title: "数据加载失败",
            message: error || "无法连接到 LuckDB 服务器，请检查网络连接",
            actionLabel: "重新加载",
            onAction: handleReload,
            secondaryActionLabel: "更换表格",
            onSecondaryAction: () => setIsConfigured(false),
          }}
          showHeader
          showToolbar
          showStatus
          toolbarConfig={{ 
            showShare: true, 
            showAPI: true,
            showSearch: true,
            showFilter: true,
            showSort: true,
            showFieldConfig: true, // 启用字段配置按钮
          }}
          // 视图管理属性
          views={views}
          activeViewId={activeViewId}
          onViewChange={handleViewChange}
          onCreateView={handleCreateView}
          // 字段配置属性
          fields={fieldConfigs}
          onFieldToggle={handleFieldToggle}
          onFieldReorder={handleFieldReorder}
          onFieldEdit={handleFieldEdit}
          onFieldDelete={handleFieldDelete}
          onFieldGroup={handleFieldGroup}
          onFieldCopy={handleFieldCopy}
          onFieldInsertLeft={handleFieldInsertLeft}
          onFieldInsertRight={handleFieldInsertRight}
          onFieldFilter={handleFieldFilter}
          // 字段编辑属性
          onEditColumn={handleEditColumn}
          onDeleteColumn={handleDeleteColumn}
          onFieldSort={handleFieldSort}
          onFieldFreeze={handleFieldFreeze}
          onAddField={handleAddField}
          onAddColumn={handleAddColumn}
          onUpdateField={handleUpdateField}
          // 行高配置属性
          rowHeight={rowHeight}
          onRowHeightChange={handleRowHeightChange}
          gridProps={{ 
            columns: columns || [], 
            rowCount: rowCount || 0, 
            getCellContent: getCellContent || (() => ({ type: 'text', data: '', displayData: '' })) 
          }}
          statusContent={
            <span style={{ fontSize: '13px' }}>
              已完成 {statistics.completed} | 
              进行中 {statistics.inProgress} | 
              待处理 {statistics.pending} | 
              完成率 {statistics.completionRate}%
            </span>
          }
          onAdd={handleAddRecord}
          />
        </GridErrorBoundary>
      </div>
    </div>
  );
}

export default RealDataApp;