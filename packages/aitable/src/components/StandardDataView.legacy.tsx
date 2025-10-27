import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { IGridProps, IGridRef } from '../grid/core/Grid';
import { Grid } from '../grid/core/Grid';
import { GridErrorBoundary } from '../grid/error-handling/GridErrorBoundary';
import { GridToolbar as RefactoredToolbar } from '../grid/components/toolbar/GridToolbar.refactored';
import { cn, tokens, transitions, elevation } from '../grid/design-system';
import { LoadingState, EmptyState, ErrorState } from './states';
import type { EmptyStateProps, ErrorStateProps } from './states';
import { getDeviceType, isTouchDevice } from './utils/responsive';
import { createAdapter } from '../api/sdk-adapter';
import {
  FieldConfigPanel,
  FieldConfigCombobox,
  AddFieldDialogV2,
  EditFieldDialog,
  type FieldConfig,
  type FieldConfigPanelProps,
  type FieldConfigComboboxProps,
} from './field-config';
import { AddRecordDialog, type AddRecordDialogProps } from './add-record';
import { RowHeightCombobox, type RowHeight, type RowHeightComboboxProps } from './row-height';
// Lucide 图标
import {
  Table,
  LayoutGrid,
  Calendar,
  BarChart3,
  Image,
  FileText,
  Plus,
  PanelRight,
  PanelLeft,
  Settings,
  Undo2,
  Redo2,
} from 'lucide-react';

export interface StandardToolbarConfig {
  showUndoRedo?: boolean;
  showAddNew?: boolean;
  showFieldConfig?: boolean;
  showRowHeight?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  showGroup?: boolean;
  showSearch?: boolean;
  showFullscreen?: boolean;
  showShare?: boolean;
  showAPI?: boolean;
  showCollaboration?: boolean;
}

export type DataViewState = 'idle' | 'loading' | 'empty' | 'error';

export interface StandardDataViewProps {
  // Data state
  state?: DataViewState;
  loadingMessage?: string;
  emptyStateProps?: EmptyStateProps;
  errorStateProps?: ErrorStateProps;
  // Section visibility
  showHeader?: boolean; // 顶部标签：表 / 示图 + 添加
  showToolbar?: boolean; // 工具栏
  showStatus?: boolean; // 底部状态栏

  // Header tabs - 支持静态标签或动态视图
  tabs?: Array<{ key: string; label: string }>; // 默认 ['table','chart']
  defaultTabKey?: string;
  onAdd?: () => void; // 顶部 + 按钮

  // 视图管理 - 新增
  views?: Array<{ id: string; name: string; type?: string }>; // 动态视图列表
  activeViewId?: string; // 当前激活的视图ID
  onViewChange?: (viewId: string) => void; // 视图切换回调
  onCreateView?: (viewType: string) => void; // 创建新视图回调

  /**
   * API 客户端（向后兼容）或 LuckDB SDK 实例（推荐）
   * 如果传入 SDK 实例，组件会自动适配为内部使用的接口
   */
  apiClient?: any;
  /**
   * LuckDB SDK 实例（推荐）
   * 外部系统已登录好的 SDK，直接注入使用
   * 优先级高于 apiClient
   */
  sdk?: any;

  /**
   * 表格 ID（用于添加记录等操作）
   */
  tableId?: string;

  // 字段配置 - 新增
  fields?: FieldConfig[]; // 字段列表
  onFieldToggle?: (fieldId: string, visible: boolean) => void; // 字段显示/隐藏切换
  onFieldReorder?: (fromIndex: number, toIndex: number) => void; // 字段排序
  onFieldEdit?: (fieldId: string) => void; // 编辑字段
  onFieldDelete?: (fieldId: string) => void; // 删除字段
  onFieldGroup?: (fieldId: string) => void; // 创建字段编组
  onFieldCopy?: (fieldId: string) => void; // 复制字段
  onFieldInsertLeft?: (fieldId: string) => void; // 在左侧插入字段
  onFieldInsertRight?: (fieldId: string) => void; // 在右侧插入字段
  onFieldFilter?: (fieldId: string) => void; // 按字段筛选
  onFieldSort?: (fieldId: string) => void; // 按字段排序
  onFieldFreeze?: (fieldId: string) => void; // 冻结字段
  onAddField?: (fieldName: string, fieldType: string) => void; // 添加新字段
  onAddColumn?: (
    fieldType: string,
    insertIndex?: number,
    fieldName?: string,
    options?: any
  ) => void; // 添加新列（用于 AddFieldMenu）
  onEditColumn?: (columnIndex: number, updatedColumn: any) => void; // 编辑字段（用于 EditFieldMenu）
  onDeleteColumn?: (columnIndex: number) => void; // 删除字段（用于右键菜单）
  onUpdateField?: (fieldName: string, fieldType: string) => void; // 更新字段
  fieldConfigMode?: 'panel' | 'combobox'; // 字段配置模式：面板或下拉框

  // 行高配置 - 新增
  rowHeight?: RowHeight; // 当前行高设置（不传则组件内部管理）
  onRowHeightChange?: (rowHeight: RowHeight) => void; // 行高变更回调

  // Toolbar configuration
  toolbarConfig?: StandardToolbarConfig;
  onToolbar?: Partial<Parameters<typeof RefactoredToolbar>[0]>; // 允许传入回调覆盖

  // Grid
  gridProps: IGridProps & {
    onDataRefresh?: () => void; // 数据刷新回调
  }; // 必填：对外暴露 Grid 的完整能力

  // Status Bar 渲染器，可自定义
  statusContent?: React.ReactNode;

  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_TABS: Array<{ key: string; label: string }> = [
  { key: 'table', label: '表' },
  { key: 'chart', label: '示图' },
];

const DEFAULT_TOOLBAR: Required<StandardToolbarConfig> = {
  showUndoRedo: true,
  showAddNew: true,
  showFieldConfig: true,
  showRowHeight: true,
  showFilter: true,
  showSort: true,
  showGroup: true,
  showSearch: true,
  showFullscreen: true,
  showShare: false,
  showAPI: false,
  showCollaboration: false,
};

export function StandardDataView(props: StandardDataViewProps) {
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
    // 视图管理参数
    views,
    activeViewId,
    onViewChange,
    onCreateView,
    apiClient,
    sdk,
    tableId,
    // 字段配置参数
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
    fieldConfigMode = 'combobox', // 默认使用 combobox 模式
    // 行高配置参数
    rowHeight = 'medium',
    onRowHeightChange,
    toolbarConfig,
    onToolbar,
    gridProps,
    statusContent,
    className,
    style,
  } = props;

  const gridRef = useRef<IGridRef>(null);
  const [activeKey, setActiveKey] = useState<string>(defaultTabKey);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isTouch, setIsTouch] = useState(false);

  // 列宽状态管理（使用列ID作为key，不依赖列顺序）
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  // 列顺序状态管理
  const [columnOrder, setColumnOrder] = useState<number[]>([]);

  // 视图管理状态
  const [showCreateViewMenu, setShowCreateViewMenu] = useState(false);

  // 字段配置状态
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [showAddRecordDialog, setShowAddRecordDialog] = useState(false);
  const [showEditFieldDialog, setShowEditFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);

  // 视图管理逻辑
  const handleViewChange = useCallback(
    (viewId: string) => {
      if (onViewChange) {
        onViewChange(viewId);
      }
    },
    [onViewChange]
  );

  const handleCreateView = useCallback(
    (viewType: string) => {
      if (onCreateView) {
        onCreateView(viewType);
      }
      setShowCreateViewMenu(false);
    },
    [onCreateView]
  );

  // 字段配置处理函数
  const handleFieldToggle = useCallback(
    (fieldId: string, visible: boolean) => {
      if (onFieldToggle) {
        onFieldToggle(fieldId, visible);
      }
    },
    [onFieldToggle]
  );

  const handleFieldReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (onFieldReorder) {
        onFieldReorder(fromIndex, toIndex);
      }
    },
    [onFieldReorder]
  );

  const handleFieldEdit = useCallback(
    (fieldId: string) => {
      const field = fields?.find((f) => f.id === fieldId);
      if (field) {
        setEditingField(field);
        setShowEditFieldDialog(true);
      }
      if (onFieldEdit) {
        onFieldEdit(fieldId);
      }
    },
    [fields, onFieldEdit]
  );

  const handleFieldDelete = useCallback(
    (fieldId: string) => {
      if (onFieldDelete) {
        onFieldDelete(fieldId);
      }
    },
    [onFieldDelete]
  );

  const handleFieldGroup = useCallback(
    (fieldId: string) => {
      if (onFieldGroup) {
        onFieldGroup(fieldId);
      }
    },
    [onFieldGroup]
  );

  const handleAddField = useCallback(
    async (fieldName: string, fieldType: string, options?: any) => {
      console.log('🔍 StandardDataView handleAddField 被调用:', {
        fieldName,
        fieldType,
        hasOnAddField: !!onAddField,
      });
      if (onAddField) {
        onAddField(fieldName, fieldType);
        return;
      }

      // 默认对接 SDK：当未传入 onAddField 时，自动调用后端创建字段
      try {
        if (!tableId || !(sdk || apiClient)) {
          console.error('❌ 缺少 sdk/apiClient 或 tableId，无法创建字段');
          return;
        }

        const adapter = createAdapter(sdk || apiClient);
        const payload = {
          name: fieldName,
          type: fieldType as any,
          options: options || {},
        } as any;
        console.log('🛠️ 正在通过适配器创建字段:', payload);
        await adapter.createField(tableId, payload);

        // 关闭弹窗
        setShowAddFieldDialog(false);

        // 触发外部刷新
        gridProps.onDataRefresh?.();
        console.log('✅ 字段创建成功并已刷新');
      } catch (error) {
        console.error('❌ 字段创建失败:', error);
      }
    },
    [onAddField, sdk, apiClient, tableId, gridProps]
  );

  // Grid 组件的 onAddColumn 处理函数（表头 + 按钮添加字段）
  const handleGridAddColumn = useCallback(
    async (fieldType: any, insertIndex?: number, fieldName?: string, options?: any) => {
      console.log('🔍 StandardDataView handleGridAddColumn 被调用:', {
        fieldType,
        insertIndex,
        fieldName,
        hasOnAddColumn: !!onAddColumn,
      });

      if (onAddColumn) {
        onAddColumn(fieldType, insertIndex, fieldName, options);
        return;
      }

      // 默认对接 SDK：当未传入 onAddColumn 时，自动调用后端创建字段
      try {
        if (!tableId || !(sdk || apiClient)) {
          console.error('❌ 缺少 sdk/apiClient 或 tableId，无法创建字段');
          return;
        }

        const adapter = createAdapter(sdk || apiClient);
        const payload = {
          name: fieldName || `新字段_${Date.now()}`,
          type: fieldType,
          options: options || {},
        } as any;
        console.log('🛠️ 正在通过 Grid 适配器创建字段:', payload);
        await adapter.createField(tableId, payload);

        // 触发外部刷新
        gridProps.onDataRefresh?.();
        console.log('✅ Grid 字段创建成功并已刷新');
      } catch (error) {
        console.error('❌ Grid 字段创建失败:', error);
      }
    },
    [onAddColumn, sdk, apiClient, tableId, gridProps]
  );

  // Grid 组件的列宽调整处理函数
  const handleColumnResize = useCallback(
    (column: any, newSize: number, colIndex: number) => {
      console.log('🔍 StandardDataView handleColumnResize 被调用:', {
        column: column.name,
        newSize,
        colIndex,
        columnId: column.id,
      });

      // 如果传入了自定义回调，优先使用
      if (gridProps.onColumnResize) {
        gridProps.onColumnResize(column, newSize, colIndex);
        return;
      }

      // 默认行为：更新列宽状态（使用列ID作为key）
      console.log(`📏 列 "${column.name}" (ID: ${column.id}) 宽度调整为: ${newSize}px`);
      setColumnWidths((prev) => ({
        ...prev,
        [column.id]: newSize,
      }));
    },
    [gridProps]
  );

  // Grid 组件的列排序处理函数
  const handleColumnOrdered = useCallback(
    (dragColIndexCollection: number[], dropColIndex: number) => {
      console.log('🔍 StandardDataView handleColumnOrdered 被调用:', {
        dragColIndexCollection,
        dropColIndex,
      });

      // 如果传入了自定义回调，优先使用
      if (gridProps.onColumnOrdered) {
        gridProps.onColumnOrdered(dragColIndexCollection, dropColIndex);
        return;
      }

      // 默认行为：更新列顺序状态
      console.log(`🔄 列排序变化: 拖拽列 ${dragColIndexCollection} 到位置 ${dropColIndex}`);

      setColumnOrder((prev) => {
        // 创建新的列顺序数组
        const newOrder = [...prev];

        // 如果没有初始顺序，创建默认顺序
        if (newOrder.length === 0) {
          return Array.from({ length: gridProps.columns?.length || 0 }, (_, i) => i);
        }

        // 移除被拖拽的列
        const draggedItems = dragColIndexCollection.sort((a, b) => b - a); // 从后往前删除
        draggedItems.forEach((index) => {
          newOrder.splice(index, 1);
        });

        // 在目标位置插入被拖拽的列
        const adjustedDropIndex =
          draggedItems[0] < dropColIndex ? dropColIndex - draggedItems.length : dropColIndex;
        newOrder.splice(adjustedDropIndex, 0, ...dragColIndexCollection);

        return newOrder;
      });
    },
    [gridProps]
  );

  const handleUpdateField = useCallback(
    (fieldName: string, fieldType: string) => {
      if (editingField && onUpdateField) {
        // 调用外部的更新字段函数，传递字段名称和类型
        onUpdateField(fieldName, fieldType);
      }
      setShowEditFieldDialog(false);
      setEditingField(null);
    },
    [editingField, onUpdateField]
  );

  const handleOpenFieldConfig = useCallback(() => {
    setShowFieldConfig(true);
  }, []);

  const handleCloseFieldConfig = useCallback(() => {
    setShowFieldConfig(false);
  }, []);

  const handleOpenAddFieldDialog = useCallback(() => {
    setShowAddFieldDialog(true);
    setShowFieldConfig(false);
  }, []);

  const handleCloseAddFieldDialog = useCallback(() => {
    setShowAddFieldDialog(false);
  }, []);

  const handleCloseEditFieldDialog = useCallback(() => {
    setShowEditFieldDialog(false);
    setEditingField(null);
  }, []);

  const handleCloseAddRecordDialog = useCallback(() => {
    setShowAddRecordDialog(false);
  }, []);

  const handleAddRecordSuccess = useCallback(
    (record: any) => {
      console.log('✅ 记录创建成功:', record);
      // 触发外部刷新回调（如果有）
      if (gridProps.onDataRefresh) {
        gridProps.onDataRefresh();
      }
      // TODO: 可以触发 React Query 的 invalidateQueries
    },
    [gridProps]
  );

  const handleAddRecordError = useCallback((error: any) => {
    console.error('❌ 记录创建失败:', error);
  }, []);

  // 行高变更处理函数
  // 行高受控/非受控实现
  const [rowHeightState, setRowHeightState] = useState<RowHeight>(rowHeight);
  useEffect(() => {
    setRowHeightState(rowHeight);
  }, [rowHeight]);

  const handleRowHeightChange = useCallback(
    (newRowHeight: RowHeight) => {
      // 内部更新（非受控场景）
      setRowHeightState(newRowHeight);
      // 向外通知（受控场景）
      onRowHeightChange?.(newRowHeight);
      console.log(`行高变更为: ${newRowHeight}`);
    },
    [onRowHeightChange]
  );

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

  const mergedToolbar = useMemo(
    () => ({
      ...DEFAULT_TOOLBAR,
      ...(toolbarConfig ?? {}),
    }),
    [toolbarConfig]
  );

  // 移动端优化配置
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';

  // 将行高枚举映射为实际像素值
  const resolvedRowHeight = useMemo(() => {
    const current = rowHeightState;
    switch (current) {
      case 'short':
        return 28; // 紧凑
      case 'tall':
        return 40; // 稍高
      case 'extra-tall':
        return 56; // 超高
      case 'medium':
      default:
        return 32; // 默认
    }
  }, [rowHeightState]);

  // 创建带有更新列宽和列顺序的 gridProps
  const enhancedGridProps = useMemo(() => {
    if (!gridProps.columns) return gridProps;

    // 初始化列顺序（如果还没有设置）
    const finalColumnOrder =
      columnOrder.length === 0
        ? Array.from({ length: gridProps.columns.length }, (_, i) => i)
        : columnOrder;

    // 根据列顺序重新排列列，并根据列ID查找对应的宽度
    const reorderedColumns = finalColumnOrder.map((originalIndex) => {
      const column = gridProps.columns[originalIndex];
      return {
        ...column,
        // 使用列ID查找对应的宽度，这样不受列顺序变化影响
        width: columnWidths[column.id] ?? column.width ?? 150,
      };
    });

    return {
      ...gridProps,
      columns: reorderedColumns,
    };
  }, [gridProps, columnWidths, columnOrder]);

  return (
    <div
      className={cn('flex h-full w-full flex-col', className)}
      style={style}
      role="application"
      aria-label="数据视图"
    >
      {/* Section 1: Header Tabs */}
      {showHeader && (
        <div
          className={cn(
            'flex items-center relative',
            isMobile ? 'px-2 h-11' : 'px-4 h-12',
            'border-b'
          )}
          style={{
            backgroundColor: tokens.colors.surface.base,
            borderColor: tokens.colors.border.subtle,
          }}
          role="banner"
        >
          {/* Tabs - 支持静态标签或动态视图 */}
          <div
            role="tablist"
            className="flex items-center gap-0 py-0"
            style={{ position: 'relative' }}
          >
            {/* 如果有视图列表，使用动态视图标签 */}
            {views && views.length > 0
              ? views.map((view) => {
                  const active = activeViewId === view.id;
                  return (
                    <button
                      key={view.id}
                      role="tab"
                      aria-selected={active}
                      data-state={active ? 'active' : 'inactive'}
                      onClick={() => handleViewChange(view.id)}
                      className={cn(
                        isMobile ? 'h-9 px-2 text-xs' : 'h-10 px-3 text-sm',
                        '-mb-px font-medium',
                        'transition-all focus-visible:outline-none',
                        'border border-solid',
                        // 选中状态：上、左、右边框 + 圆角
                        active ? 'rounded-t-md' : 'rounded-none',
                        // 固定宽度，支持四个字符
                        isMobile ? 'w-16' : 'w-20',
                        // 文字超出省略
                        'overflow-hidden whitespace-nowrap text-ellipsis',
                        // 移动端增大触摸区域
                        isTouch && 'min-w-[44px]'
                      )}
                      style={
                        active
                          ? {
                              // 选中状态：与内容区域背景一致，通过边框突出
                              backgroundColor: tokens.colors.surface.base,
                              color: tokens.colors.text.primary,
                              borderTopColor: tokens.colors.border.subtle,
                              borderLeftColor: tokens.colors.border.subtle,
                              borderRightColor: tokens.colors.border.subtle,
                              borderBottomColor: tokens.colors.surface.base, // 与背景色一致，形成"连接"效果
                              borderBottomWidth: '1px', // 确保有下边框，但颜色与背景一致
                              transition: transitions.presets.all,
                              // 稍微提升层级，确保在未选中标签之上
                              zIndex: 1,
                              position: 'relative',
                              // 确保选中标签与内容区域无缝连接
                              marginBottom: '-1px',
                            }
                          : {
                              // 未选中状态：默认样式
                              backgroundColor: 'transparent',
                              color: tokens.colors.text.secondary,
                              borderTopColor: 'transparent',
                              borderLeftColor: 'transparent',
                              borderRightColor: 'transparent',
                              borderBottomColor: tokens.colors.border.subtle,
                              borderBottomWidth: '1px',
                              transition: transitions.presets.all,
                              zIndex: 0,
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                          e.currentTarget.style.color = tokens.colors.text.primary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = tokens.colors.text.secondary;
                        }
                      }}
                    >
                      {view.name}
                    </button>
                  );
                })
              : /* 如果没有视图列表，使用静态标签 */
                tabs.map((t) => {
                  const active = activeKey === t.key;
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={active}
                      data-state={active ? 'active' : 'inactive'}
                      onClick={() => setActiveKey(t.key)}
                      className={cn(
                        isMobile ? 'h-9 px-2 text-xs' : 'h-10 px-3 text-sm',
                        '-mb-px font-medium',
                        'transition-all focus-visible:outline-none',
                        'border border-solid',
                        // 选中状态：上、左、右边框 + 圆角
                        active ? 'rounded-t-md' : 'rounded-none',
                        // 固定宽度，支持四个字符
                        isMobile ? 'w-16' : 'w-20',
                        // 文字超出省略
                        'overflow-hidden whitespace-nowrap text-ellipsis',
                        // 移动端增大触摸区域
                        isTouch && 'min-w-[44px]'
                      )}
                      style={
                        active
                          ? {
                              // 选中状态：与内容区域背景一致，通过边框突出
                              backgroundColor: tokens.colors.surface.base,
                              color: tokens.colors.text.primary,
                              borderTopColor: tokens.colors.border.subtle,
                              borderLeftColor: tokens.colors.border.subtle,
                              borderRightColor: tokens.colors.border.subtle,
                              borderBottomColor: tokens.colors.surface.base, // 与背景色一致，形成"连接"效果
                              borderBottomWidth: '1px', // 确保有下边框，但颜色与背景一致
                              transition: transitions.presets.all,
                              // 稍微提升层级，确保在未选中标签之上
                              zIndex: 1,
                              position: 'relative',
                              // 确保选中标签与内容区域无缝连接
                              marginBottom: '-1px',
                            }
                          : {
                              // 未选中状态：默认样式
                              backgroundColor: 'transparent',
                              color: tokens.colors.text.secondary,
                              borderTopColor: 'transparent',
                              borderLeftColor: 'transparent',
                              borderRightColor: 'transparent',
                              borderBottomColor: tokens.colors.border.subtle,
                              borderBottomWidth: '1px',
                              transition: transitions.presets.all,
                              zIndex: 0,
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                          e.currentTarget.style.color = tokens.colors.text.primary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = tokens.colors.text.secondary;
                        }
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}

            {/* 新建视图按钮 - 放在最后一个标签之后 */}
            {views && views.length > 0 && (
              <button
                aria-label="添加视图"
                title="添加视图"
                onClick={() => setShowCreateViewMenu(!showCreateViewMenu)}
                className={cn(
                  isMobile ? 'h-9 px-2 text-xs' : 'h-10 px-3 text-sm',
                  '-mb-px font-medium',
                  'transition-all focus-visible:outline-none',
                  'border border-solid',
                  'rounded-t-md'
                )}
                style={{
                  backgroundColor: 'transparent',
                  color: tokens.colors.text.secondary,
                  borderTopColor: 'transparent',
                  borderLeftColor: tokens.colors.border.subtle,
                  borderRightColor: tokens.colors.border.subtle,
                  borderBottomColor: tokens.colors.border.subtle,
                  borderBottomWidth: '1px',
                  marginLeft: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                  e.currentTarget.style.color = tokens.colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = tokens.colors.text.secondary;
                }}
              >
                <Plus size={14} />
              </button>
            )}

            {/* 创建视图下拉菜单 - 在标签栏容器内 */}
            {showCreateViewMenu && (
              <>
                {/* 背景遮罩 */}
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10,
                  }}
                  onClick={() => setShowCreateViewMenu(false)}
                />

                {/* 菜单内容 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: '0',
                    backgroundColor: tokens.colors.surface.base,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: '8px',
                    boxShadow: elevation.lg,
                    padding: '8px',
                    zIndex: 20,
                    minWidth: '200px',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: tokens.colors.text.primary,
                      borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                      marginBottom: '4px',
                    }}
                  >
                    基础视图
                  </div>

                  {/* 视图类型选项 */}
                  {[
                    { type: 'grid', name: '表格视图', icon: Table, color: '#3b82f6' },
                    { type: 'kanban', name: '看板视图', icon: LayoutGrid, color: '#10b981' },
                    { type: 'calendar', name: '日历视图', icon: Calendar, color: '#06b6d4' },
                    { type: 'gantt', name: '甘特视图', icon: BarChart3, color: '#ec4899' },
                    { type: 'gallery', name: '画册视图', icon: Image, color: '#8b5cf6' },
                    { type: 'form', name: '表单视图', icon: FileText, color: '#f59e0b' },
                  ].map((viewType) => {
                    const IconComponent = viewType.icon;
                    return (
                      <button
                        key={viewType.type}
                        onClick={() => handleCreateView(viewType.type)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: tokens.colors.text.primary,
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: transitions.presets.all,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <IconComponent size={14} style={{ color: viewType.color }} />
                        {viewType.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* 原有的添加记录按钮 */}
            <button
              onClick={onAdd}
              className={cn(
                isMobile ? 'h-9 w-9' : 'h-8 w-8',
                'inline-flex items-center justify-center rounded-full',
                'border focus-visible:outline-none',
                // 移动端确保足够大的触摸区域
                isTouch && 'min-w-[44px] min-h-[44px]'
              )}
              style={{
                backgroundColor: tokens.colors.surface.base,
                borderColor: tokens.colors.border.default,
                color: tokens.colors.text.primary,
                transition: transitions.presets.all,
                boxShadow: elevation.xs,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                e.currentTarget.style.boxShadow = elevation.sm;
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.surface.base;
                e.currentTarget.style.boxShadow = elevation.xs;
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              aria-label="添加新项"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Section 2: Toolbar */}
      {showToolbar && activeKey === 'table' && (
        <div role="toolbar" aria-label="数据操作工具栏">
          <div
            className="flex items-center gap-2 px-4 py-2 border-b"
            style={{
              borderColor: tokens.colors.border.subtle,
              backgroundColor: tokens.colors.surface.base,
            }}
          >
            {/* 添加记录按钮 - 移动到第一个位置，使用统一灰色风格 */}
            {mergedToolbar.showAddNew && (
              <button
                onClick={() => setShowAddRecordDialog(true)}
                className={cn(
                  'inline-flex items-center justify-center gap-2',
                  'h-8 px-3 rounded-md text-sm font-medium',
                  'bg-white border border-gray-200',
                  'text-gray-700 hover:text-gray-900',
                  'hover:bg-gray-50 hover:border-gray-300',
                  'active:bg-gray-100',
                  'transition-all duration-200 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                )}
              >
                <Plus size={14} />
                添加记录
              </button>
            )}

            {/* 字段配置 - 根据模式选择组件 */}
            {mergedToolbar.showFieldConfig &&
              fields &&
              (fieldConfigMode === 'combobox' ? (
                <FieldConfigCombobox
                  fields={fields}
                  onFieldToggle={handleFieldToggle}
                  onFieldReorder={handleFieldReorder}
                  onFieldEdit={handleFieldEdit}
                  onFieldDelete={handleFieldDelete}
                  onFieldGroup={handleFieldGroup}
                  onFieldCopy={onFieldCopy}
                  onFieldInsertLeft={onFieldInsertLeft}
                  onFieldInsertRight={onFieldInsertRight}
                  onFieldFilter={onFieldFilter}
                  onFieldSort={onFieldSort}
                  onFieldFreeze={onFieldFreeze}
                />
              ) : (
                <button
                  onClick={handleOpenFieldConfig}
                  className={cn(
                    'inline-flex items-center justify-center gap-2',
                    'h-8 px-3 rounded-md text-sm font-medium',
                    'bg-white border border-gray-200',
                    'text-gray-700 hover:text-gray-900',
                    'hover:bg-gray-50 hover:border-gray-300',
                    'active:bg-gray-100',
                    'transition-all duration-200 ease-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                  )}
                >
                  <Settings size={14} />
                  字段配置
                </button>
              ))}

            {/* 行高配置 */}
            {mergedToolbar.showRowHeight && (
              <RowHeightCombobox value={rowHeightState} onChange={handleRowHeightChange} />
            )}

            {/* 其他工具栏按钮 */}
            <div className="flex items-center gap-2">
              {mergedToolbar.showUndoRedo && (
                <>
                  <button
                    onClick={onToolbar?.onUndo}
                    className={cn(
                      'inline-flex items-center justify-center gap-2',
                      'h-8 px-3 rounded-md text-sm font-medium',
                      'bg-white border border-gray-200',
                      'text-gray-700 hover:text-gray-900',
                      'hover:bg-gray-50 hover:border-gray-300',
                      'active:bg-gray-100',
                      'transition-all duration-200 ease-out',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                    )}
                  >
                    <Undo2 size={14} />
                    撤销
                  </button>
                  <button
                    onClick={onToolbar?.onRedo}
                    className={cn(
                      'inline-flex items-center justify-center gap-2',
                      'h-8 px-3 rounded-md text-sm font-medium',
                      'bg-white border border-gray-200',
                      'text-gray-700 hover:text-gray-900',
                      'hover:bg-gray-50 hover:border-gray-300',
                      'active:bg-gray-100',
                      'transition-all duration-200 ease-out',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                    )}
                  >
                    <Redo2 size={14} />
                    重做
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Content */}
      <div className="flex min-h-0 flex-1 flex-col" role="main" aria-label="主内容区">
        {activeKey === 'table' ? (
          <div className="relative flex min-h-0 flex-1">
            {/* 根据状态渲染不同的内容 */}
            {state === 'loading' ? (
              <div role="status" aria-live="polite" aria-label="正在加载">
                <LoadingState message={loadingMessage} />
              </div>
            ) : state === 'empty' ? (
              <div role="status" aria-live="polite" aria-label="无数据">
                <EmptyState {...emptyStateProps} />
              </div>
            ) : state === 'error' ? (
              <div role="alert" aria-live="assertive" aria-label="发生错误">
                <ErrorState {...errorStateProps} />
              </div>
            ) : (
              <GridErrorBoundary>
                <Grid
                  ref={gridRef}
                  {...enhancedGridProps}
                  rowHeight={resolvedRowHeight}
                  onAddColumn={handleGridAddColumn}
                  onEditColumn={onEditColumn}
                  onDeleteColumn={onDeleteColumn}
                  onColumnResize={handleColumnResize}
                  onColumnOrdered={handleColumnOrdered}
                />
              </GridErrorBoundary>
            )}
          </div>
        ) : (
          <div
            className="flex flex-1 items-center justify-center text-sm"
            style={{ color: tokens.colors.text.secondary }}
            role="status"
          >
            图表视图将在后续版本中提供 API 对接
          </div>
        )}
      </div>

      {/* Section 4: Status Bar */}
      {showStatus && (
        <div
          className={cn(
            'border-t flex items-center',
            isMobile
              ? 'h-9 px-2 text-xs flex-col gap-1 justify-center'
              : 'h-10 px-4 text-sm justify-between'
          )}
          style={{
            borderColor: tokens.colors.border.subtle,
            backgroundColor: tokens.colors.surface.base,
            color: tokens.colors.text.secondary,
          }}
          role="status"
          aria-live="polite"
          aria-label="状态栏"
        >
          <div aria-label={`共 ${gridProps.rowCount} 条记录`}>共 {gridProps.rowCount} 条记录</div>
          {!isMobile && statusContent && <div>{statusContent}</div>}
        </div>
      )}

      {/* 字段配置对话框 */}
      {fields && (
        <>
          <FieldConfigPanel
            fields={fields}
            onFieldToggle={handleFieldToggle}
            onFieldReorder={handleFieldReorder}
            onFieldEdit={handleFieldEdit}
            onFieldDelete={handleFieldDelete}
            onFieldGroup={handleFieldGroup}
            onClose={handleCloseFieldConfig}
            isOpen={showFieldConfig}
          />

          <AddFieldDialogV2
            isOpen={showAddFieldDialog}
            onClose={handleCloseAddFieldDialog}
            onConfirm={handleAddField}
          />

          <AddFieldDialogV2
            isOpen={showEditFieldDialog}
            onClose={handleCloseEditFieldDialog}
            onConfirm={handleUpdateField}
          />
        </>
      )}

      {/* 内置添加记录弹窗 - 新版本 */}
      {fields && tableId && (
        <AddRecordDialog
          isOpen={showAddRecordDialog}
          onClose={handleCloseAddRecordDialog}
          fields={fields}
          tableId={tableId}
          adapter={sdk || apiClient}
          onSuccess={handleAddRecordSuccess}
          onError={handleAddRecordError}
        />
      )}
    </div>
  );
}

export default StandardDataView;
