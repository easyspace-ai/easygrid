/**
 * StandardDataView V3 - 支持 LuckDB SDK 的现代化数据视图组件
 *
 * 特性：
 * - ✅ 组合式架构（ViewHeader + ViewToolbar + ViewContent + ViewStatusBar）
 * - ✅ 支持 LuckDB SDK 通过适配器模式
 * - ✅ 内置视图自动管理（加载、创建、重命名、删除）
 * - ✅ Toast 通知系统
 * - ✅ 字段配置（Combobox + Panel 模式）
 * - ✅ 过滤系统（简化版）
 * - ✅ 列宽调整和列排序
 * - ✅ 响应式设计
 *
 * @version 3.0.0
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../grid/design-system';
import { ViewHeader } from './view-header';
import { ViewToolbar, type ToolbarConfig } from './view-toolbar';
import { ViewContent, type ViewContentState } from './view-content';
import { ViewStatusBar } from './view-statusbar';
import { getDeviceType, isTouchDevice } from './utils/responsive';
import { createAdapter } from '../api/sdk-adapter';
import type { IGridProps, IGridRef } from '../grid/core/Grid';
import type { EmptyStateProps, ErrorStateProps } from './states';
import type { FieldConfig } from './field-config';
import type { RowHeight } from './row-height';
import type { FilterField, FilterCondition } from './filter';
import { AddFieldDialogV2, EditFieldDialog } from './field-config';
import { AddRecordDialog } from './add-record';
import { useToast } from '../ui/Toast';

// ==================== 类型定义 ====================

export interface Tab {
  key: string;
  label: string;
}

export interface View {
  id: string;
  name: string;
  type?: string;
}

export interface StandardDataViewV3Props {
  // ========== 数据状态 ==========
  state?: ViewContentState;
  loadingMessage?: string;
  emptyStateProps?: EmptyStateProps;
  errorStateProps?: ErrorStateProps;

  // ========== 区域显示控制 ==========
  showHeader?: boolean;
  showToolbar?: boolean;
  showStatus?: boolean;

  // ========== Header - 标签或视图 ==========
  tabs?: Tab[];
  defaultTabKey?: string;
  onAdd?: () => void;

  // 视图管理
  views?: View[];
  activeViewId?: string;
  onViewChange?: (viewId: string) => void;
  onCreateView?: (viewType: string) => void;
  onRenameView?: (viewId: string, newName: string) => void;
  onDeleteView?: (viewId: string) => void;

  // ========== SDK/API 客户端 ==========
  apiClient?: any; // 向后兼容
  sdk?: any; // LuckDB SDK 实例（推荐）
  tableId?: string; // 表格 ID

  // ========== 字段配置 ==========
  fields?: FieldConfig[];
  onFieldToggle?: (fieldId: string, visible: boolean) => void;
  onFieldReorder?: (fromIndex: number, toIndex: number) => void;
  onFieldEdit?: (fieldId: string) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldGroup?: (fieldId: string) => void;
  onFieldCopy?: (fieldId: string) => void;
  onFieldInsertLeft?: (fieldId: string) => void;
  onFieldInsertRight?: (fieldId: string) => void;
  onFieldFilter?: (fieldId: string) => void;
  onFieldSort?: (fieldId: string) => void;
  onFieldFreeze?: (fieldId: string) => void;
  onAddField?: (fieldName: string, fieldType: string) => void;
  onAddColumn?: (
    fieldType: string,
    insertIndex?: number,
    fieldName?: string,
    options?: any
  ) => void;
  onEditColumn?: (columnIndex: number, updatedColumn: any) => void;
  onDeleteColumn?: (columnIndex: number) => void;
  onUpdateField?: (fieldName: string, fieldType: string) => void;
  fieldConfigMode?: 'panel' | 'combobox';

  // ========== 行高配置 ==========
  rowHeight?: RowHeight;
  onRowHeightChange?: (rowHeight: RowHeight) => void;

  // ========== 过滤配置 ==========
  filterFields?: FilterField[];
  filterConditions?: FilterCondition[];
  onFilterConditionsChange?: (conditions: FilterCondition[]) => void;
  onFilteredDataChange?: (filteredData: any[]) => void;

  // ========== 工具栏配置 ==========
  toolbarConfig?: ToolbarConfig;
  onToolbar?: {
    onUndo?: () => void;
    onRedo?: () => void;
    onFilter?: () => void;
    onSort?: () => void;
    onGroup?: () => void;
  };

  // ========== Grid 配置 ==========
  gridProps: IGridProps & {
    onDataRefresh?: () => void;
  };

  // ========== 状态栏 ==========
  statusContent?: React.ReactNode;

  // ========== 样式 ==========
  className?: string;
  style?: React.CSSProperties;
}

// ==================== 默认值 ====================

const DEFAULT_TABS: Tab[] = [
  { key: 'table', label: '表' },
  { key: 'chart', label: '示图' },
];

// ==================== 主组件 ====================

export function StandardDataViewV3(props: StandardDataViewV3Props) {
  const {
    state = 'idle',
    loadingMessage,
    emptyStateProps,
    errorStateProps,
    showHeader = true,
    showToolbar = true,
    showStatus = true,
    tabs = DEFAULT_TABS,
    defaultTabKey = 'table',
    onAdd,
    views,
    activeViewId,
    onViewChange,
    onCreateView,
    onRenameView,
    onDeleteView,
    apiClient,
    sdk,
    tableId,
    fields,
    onFieldToggle,
    onFieldReorder,
    onFieldEdit,
    onFieldDelete,
    onFieldGroup,
    onFieldCopy,
    onFieldInsertLeft,
    onFieldInsertRight,
    onFieldFilter,
    onFieldSort,
    onFieldFreeze,
    onAddField,
    onAddColumn,
    onEditColumn,
    onDeleteColumn,
    onUpdateField,
    fieldConfigMode = 'combobox',
    rowHeight: controlledRowHeight = 'medium',
    onRowHeightChange,
    filterFields,
    filterConditions = [],
    onFilterConditionsChange,
    onFilteredDataChange,
    toolbarConfig,
    onToolbar,
    gridProps,
    statusContent,
    className,
    style,
  } = props;

  // ==================== Refs ====================

  const gridRef = useRef<IGridRef>(null);
  const toast = useToast();

  // ==================== 核心状态 ====================

  const [activeKey, setActiveKey] = useState<string>(defaultTabKey);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isTouch, setIsTouch] = useState(false);
  const [rowHeightState, setRowHeightState] = useState<RowHeight>(controlledRowHeight);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<number[]>([]);

  // ==================== 视图管理状态 ====================

  const [internalViews, setInternalViews] = useState<View[]>([]);
  const [internalActiveViewId, setInternalActiveViewId] = useState<string>('');
  const [viewsLoading, setViewsLoading] = useState(false);

  // ==================== 对话框状态 ====================

  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [showEditFieldDialog, setShowEditFieldDialog] = useState(false);
  const [showAddRecordDialog, setShowAddRecordDialog] = useState(false);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);

  // ==================== Effects ====================

  // 检测设备类型
  useEffect(() => {
    const updateDeviceType = () => {
      setDeviceType(getDeviceType());
      setIsTouch(isTouchDevice());
    };
    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    return () => window.removeEventListener('resize', updateDeviceType);
  }, []);

  // 行高同步
  useEffect(() => {
    setRowHeightState(controlledRowHeight);
  }, [controlledRowHeight]);

  // 自动加载视图数据
  useEffect(() => {
    if (!tableId || !(sdk || apiClient)) return;

    const loadViews = async () => {
      try {
        setViewsLoading(true);
        const adapter = createAdapter(sdk || apiClient);
        const viewsList = await adapter.getViews(tableId);

        setInternalViews(viewsList);

        // 如果外部没有指定 activeViewId，使用第一个视图
        if (!activeViewId && viewsList.length > 0) {
          setInternalActiveViewId(viewsList[0].id);
        }

        console.log('✅ 视图数据自动加载完成:', {
          viewsCount: viewsList.length,
          activeViewId: activeViewId || viewsList[0]?.id,
        });
      } catch (error) {
        console.error('❌ 加载视图数据失败:', error);
        toast.showToast({ type: 'error', message: '加载视图数据失败' });
      } finally {
        setViewsLoading(false);
      }
    };

    loadViews();
  }, [tableId, sdk, apiClient, activeViewId, toast]);

  // 同步外部 activeViewId
  useEffect(() => {
    if (activeViewId) {
      setInternalActiveViewId(activeViewId);
    }
  }, [activeViewId]);

  // ==================== 视图管理 Handlers ====================

  // 视图切换
  const handleInternalViewChange = useCallback(
    async (viewId: string) => {
      if (onViewChange) {
        onViewChange(viewId);
        return;
      }

      // 默认实现：更新内部状态
      setInternalActiveViewId(viewId);
      toast.showToast({ type: 'info', message: '视图切换成功' });
    },
    [onViewChange, toast]
  );

  // 视图创建
  const handleInternalCreateView = useCallback(
    async (viewType: string) => {
      if (onCreateView) {
        onCreateView(viewType);
        return;
      }

      try {
        if (!tableId || !(sdk || apiClient)) {
          console.error('❌ 缺少 sdk/apiClient 或 tableId');
          return;
        }

        const adapter = createAdapter(sdk || apiClient);
        const defaultNameBase = viewType === 'grid' ? '表格视图' : '看板视图';

        // 智能命名
        const existingViewsOfType = internalViews.filter((v) => {
          if (v.type !== viewType) return false;
          const pattern = new RegExp(`^${defaultNameBase} \\d+$`);
          return pattern.test(v.name);
        });

        const existingNumbers = existingViewsOfType
          .map((v) => {
            const match = v.name.match(new RegExp(`^${defaultNameBase} (\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num) => num > 0)
          .sort((a, b) => a - b);

        let nextIndex = 1;
        for (const num of existingNumbers) {
          if (num === nextIndex) {
            nextIndex++;
          } else {
            break;
          }
        }

        const name = `${defaultNameBase} ${nextIndex}`;

        const newView = await adapter.createView(tableId, {
          tableId,
          name,
          type: viewType as any,
        });

        // 更新内部视图列表
        setInternalViews((prev) => [...prev, newView]);
        setInternalActiveViewId(newView.id);

        toast.showToast({ type: 'success', message: `已创建${name}并自动切换` });
      } catch (error) {
        console.error('❌ 创建视图失败:', error);
        toast.showToast({ type: 'error', message: '创建视图失败' });
      }
    },
    [onCreateView, sdk, apiClient, tableId, internalViews, toast]
  );

  // 视图重命名
  const handleInternalRenameView = useCallback(
    async (viewId: string, newName: string) => {
      if (onRenameView) {
        onRenameView(viewId, newName);
        return;
      }
      try {
        if (!tableId || !(sdk || apiClient)) return;
        const adapter = createAdapter(sdk || apiClient);
        const updated = await adapter.updateView(tableId, viewId, { name: newName } as any);
        setInternalViews((prev) => prev.map((v) => (v.id === viewId ? updated : v)));
        toast.showToast({ type: 'success', message: '重命名成功' });
      } catch (e) {
        console.error('❌ 重命名视图失败:', e);
        toast.showToast({ type: 'error', message: '重命名失败' });
      }
    },
    [onRenameView, sdk, apiClient, tableId, toast]
  );

  // 视图删除
  const handleInternalDeleteView = useCallback(
    async (viewId: string) => {
      if (onDeleteView) {
        onDeleteView(viewId);
        return;
      }
      try {
        if (!tableId || !(sdk || apiClient)) return;
        const adapter = createAdapter(sdk || apiClient);
        await adapter.deleteView(tableId, viewId);
        setInternalViews((prev) => prev.filter((v) => v.id !== viewId));
        // 若删除的是当前视图，切换到第一个
        setInternalActiveViewId((prev) => (prev === viewId ? internalViews[0]?.id || '' : prev));
        toast.showToast({ type: 'success', message: '已删除视图' });
      } catch (e) {
        console.error('❌ 删除视图失败:', e);
        toast.showToast({ type: 'error', message: '删除失败' });
      }
    },
    [onDeleteView, sdk, apiClient, tableId, toast, internalViews]
  );

  // ==================== 字段管理 Handlers ====================

  // 添加字段
  const handleAddField = useCallback(
    async (fieldName: string, fieldType: string, options?: any) => {
      if (onAddField) {
        onAddField(fieldName, fieldType);
        return;
      }

      // 默认 SDK 实现
      try {
        if (!tableId || !(sdk || apiClient)) {
          console.error('❌ 缺少 sdk/apiClient 或 tableId');
          return;
        }
        const adapter = createAdapter(sdk || apiClient);
        await adapter.createField(tableId, {
          name: fieldName,
          type: fieldType,
          options: options || {},
        } as any);
        setShowAddFieldDialog(false);
        gridProps.onDataRefresh?.();
        toast.showToast({ type: 'success', message: '字段创建成功' });
      } catch (error) {
        console.error('❌ 字段创建失败:', error);
        toast.showToast({ type: 'error', message: '字段创建失败' });
      }
    },
    [onAddField, sdk, apiClient, tableId, gridProps, toast]
  );

  // 关闭添加字段对话框
  const handleCloseAddFieldDialog = useCallback(() => {
    setShowAddFieldDialog(false);
  }, []);

  // 关闭添加记录对话框
  const handleCloseAddRecordDialog = useCallback(() => {
    setShowAddRecordDialog(false);
  }, []);

  // 添加记录成功回调
  const handleAddRecordSuccess = useCallback(() => {
    gridProps.onDataRefresh?.();
    toast.showToast({ type: 'success', message: '记录添加成功' });
  }, [gridProps, toast]);

  // 添加记录失败回调
  const handleAddRecordError = useCallback(() => {
    toast.showToast({ type: 'error', message: '记录添加失败' });
  }, [toast]);

  // Grid 添加列
  const handleGridAddColumn = useCallback(
    async (fieldType: any, insertIndex?: number, fieldName?: string, options?: any) => {
      if (onAddColumn) {
        onAddColumn(fieldType, insertIndex, fieldName, options);
        return;
      }

      try {
        if (!tableId || !(sdk || apiClient)) return;
        const adapter = createAdapter(sdk || apiClient);
        await adapter.createField(tableId, {
          name: fieldName || `新字段_${Date.now()}`,
          type: fieldType,
          options: options || {},
        } as any);
        gridProps.onDataRefresh?.();
        toast.showToast({ type: 'success', message: '字段添加成功' });
      } catch (error) {
        console.error('❌ Grid 字段创建失败:', error);
        toast.showToast({ type: 'error', message: '字段添加失败' });
      }
    },
    [onAddColumn, sdk, apiClient, tableId, gridProps, toast]
  );

  // ==================== 列操作 Handlers ====================

  // 列宽调整
  const handleColumnResize = useCallback(
    (column: any, newSize: number, colIndex: number) => {
      if (gridProps.onColumnResize) {
        gridProps.onColumnResize(column, newSize, colIndex);
        return;
      }
      setColumnWidths((prev) => ({ ...prev, [column.id]: newSize }));
    },
    [gridProps]
  );

  // 列排序
  const handleColumnOrdered = useCallback(
    (dragColIndexCollection: number[], dropColIndex: number) => {
      if (gridProps.onColumnOrdered) {
        gridProps.onColumnOrdered(dragColIndexCollection, dropColIndex);
        return;
      }
      // 默认实现
      setColumnOrder((prev) => {
        const newOrder = [...prev];
        if (newOrder.length === 0) {
          return Array.from({ length: gridProps.columns?.length || 0 }, (_, i) => i);
        }
        const draggedItems = dragColIndexCollection.sort((a, b) => b - a);
        draggedItems.forEach((index) => newOrder.splice(index, 1));
        const adjustedDropIndex =
          draggedItems[0] < dropColIndex ? dropColIndex - draggedItems.length : dropColIndex;
        newOrder.splice(adjustedDropIndex, 0, ...dragColIndexCollection);
        return newOrder;
      });
    },
    [gridProps]
  );

  // 行高变更
  const handleRowHeightChange = useCallback(
    (newRowHeight: RowHeight) => {
      setRowHeightState(newRowHeight);
      onRowHeightChange?.(newRowHeight);
    },
    [onRowHeightChange]
  );

  // ==================== Computed ====================

  const isMobile = deviceType === 'mobile';

  // 计算最终使用的视图数据
  const finalViews = useMemo(() => {
    return views && views.length > 0 ? views : internalViews;
  }, [views, internalViews]);

  const finalActiveViewId = useMemo(() => {
    return activeViewId || internalActiveViewId;
  }, [activeViewId, internalActiveViewId]);

  // 解析行高像素值
  const resolvedRowHeight = useMemo(() => {
    const heightMap: Record<RowHeight, number> = {
      short: 28,
      medium: 32,
      tall: 40,
      'extra-tall': 56,
    };
    return heightMap[rowHeightState] || 32;
  }, [rowHeightState]);

  // 增强的 Grid Props（应用列宽和列顺序）
  const enhancedGridProps = useMemo(() => {
    if (!gridProps.columns) return gridProps;

    const finalColumnOrder =
      columnOrder.length === 0
        ? Array.from({ length: gridProps.columns.length }, (_, i) => i)
        : columnOrder;

    const reorderedColumns = finalColumnOrder.map((originalIndex) => {
      const column = gridProps.columns[originalIndex];
      return {
        ...column,
        width: columnWidths[column.id] ?? column.width ?? 150,
      };
    });

    return { ...gridProps, columns: reorderedColumns };
  }, [gridProps, columnWidths, columnOrder]);

  // ==================== Render ====================

  return (
    <div
      className={cn('flex h-full w-full flex-col', className)}
      style={style}
      role="application"
      aria-label="数据视图"
    >
      {/* Header - 视图标签栏 */}
      {showHeader && (
        <ViewHeader
          tabs={tabs}
          activeTabKey={activeKey}
          onTabChange={setActiveKey}
          views={finalViews}
          activeViewId={finalActiveViewId}
          onViewChange={handleInternalViewChange}
          onCreateView={handleInternalCreateView}
          onRenameView={handleInternalRenameView}
          onDeleteView={handleInternalDeleteView}
          onAdd={onAdd}
          isMobile={isMobile}
          isTouch={isTouch}
        />
      )}

      {/* Toolbar - 工具栏 */}
      {showToolbar && activeKey === 'table' && (
        <ViewToolbar
          config={toolbarConfig}
          fields={fields}
          fieldConfigMode={fieldConfigMode}
          onFieldToggle={onFieldToggle}
          onFieldReorder={onFieldReorder}
          onFieldEdit={onFieldEdit}
          onFieldDelete={onFieldDelete}
          onFieldGroup={onFieldGroup}
          onFieldCopy={onFieldCopy}
          onFieldInsertLeft={onFieldInsertLeft}
          onFieldInsertRight={onFieldInsertRight}
          onFieldFilter={onFieldFilter}
          onFieldSort={onFieldSort}
          onFieldFreeze={onFieldFreeze}
          rowHeight={rowHeightState}
          onRowHeightChange={handleRowHeightChange}
          filterFields={filterFields}
          filterConditions={filterConditions}
          onFilterConditionsChange={onFilterConditionsChange}
          onFilteredDataChange={onFilteredDataChange}
          onAddRecord={() => setShowAddRecordDialog(true)}
          onUndo={onToolbar?.onUndo}
          onRedo={onToolbar?.onRedo}
          onFilter={onToolbar?.onFilter}
          onSort={onToolbar?.onSort}
          onGroup={onToolbar?.onGroup}
          isMobile={isMobile}
        />
      )}

      {/* Content - 表格内容 */}
      {activeKey === 'table' ? (
        <ViewContent
          state={state}
          loadingMessage={loadingMessage}
          emptyStateProps={emptyStateProps}
          errorStateProps={errorStateProps}
          gridProps={enhancedGridProps}
          gridRef={gridRef}
          rowHeight={resolvedRowHeight}
          onAddColumn={handleGridAddColumn}
          onEditColumn={onEditColumn}
          onDeleteColumn={onDeleteColumn}
          onColumnResize={handleColumnResize}
          onColumnOrdered={handleColumnOrdered}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          图表视图将在后续版本中提供
        </div>
      )}

      {/* StatusBar - 状态栏 */}
      {showStatus && (
        <ViewStatusBar recordCount={gridProps.rowCount} isMobile={isMobile}>
          {statusContent}
        </ViewStatusBar>
      )}

      {/* Dialogs - 对话框 */}
      {fields && tableId && (
        <>
          <AddFieldDialogV2
            isOpen={showAddFieldDialog}
            onClose={handleCloseAddFieldDialog}
            onConfirm={handleAddField}
          />
          <AddRecordDialog
            isOpen={showAddRecordDialog}
            onClose={handleCloseAddRecordDialog}
            fields={fields}
            tableId={tableId}
            adapter={sdk || apiClient}
            onSuccess={handleAddRecordSuccess}
            onError={handleAddRecordError}
          />
        </>
      )}
    </div>
  );
}

export default StandardDataViewV3;


