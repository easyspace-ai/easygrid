/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import { uniqueId } from 'lodash';
import type { CSSProperties, ForwardRefRenderFunction } from 'react';
import { useState, useRef, useMemo, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useRafState } from 'react-use';
import { LoadingIndicator, ColumnManagement, type IColumnManagementRef } from '../components';
import { AddFieldMenu } from '../../components/field-config/AddFieldMenu';
import { EditFieldMenu } from '../../components/field-config/EditFieldMenu';
import type { IFieldTypeModal } from '../components/field/FieldTypeSelectModal';

/**
 * 将 API 字段类型映射为菜单字段类型
 */
const mapAPITypeToMenuType = (apiType: string): string => {
  const typeMapping: Record<string, string> = {
    // 文本类型
    'text': 'text',
    'singleLineText': 'text',
    'longText': 'longText',
    
    // 数字类型
    'number': 'number',
    
    // 选择类型
    'select': 'singleSelect',  // API 的 select 对应前端的 singleSelect
    'singleSelect': 'singleSelect',
    'multipleSelect': 'multipleSelect',  // API 的 multipleSelect 对应前端的 multipleSelect
    
    // 日期时间
    'date': 'date',
    
    // 其他类型
    'checkbox': 'checkbox',
    'attachment': 'attachment',
    'link': 'link',
    'user': 'user',
    'rating': 'rating',
    'formula': 'formula',
    'email': 'email',
    'phone': 'phone',
  };
  return typeMapping[apiType] || 'text';
};
import { RowContextMenu, type IRowContextMenuRef } from '../components/context-menu/RowContextMenu';
import { DeleteConfirmDialog, type IDeleteConfirmDialogRef, type DeleteType } from '../components/dialogs/DeleteConfirmDialog';
import type { IGridTheme } from '../configs';
import { gridTheme, GRID_DEFAULT, DEFAULT_SCROLL_STATE, DEFAULT_MOUSE_STATE } from '../configs';
import { useResizeObserver } from '../hooks/primitive';
import type { ScrollerRef } from './InfiniteScroller';
import { InfiniteScroller } from './InfiniteScroller';
import type { IInteractionLayerRef } from './InteractionLayer';
import { InteractionLayer } from './InteractionLayer';
import type {
  IRectangle,
  IScrollState,
  ICellItem,
  IGridColumn,
  IMouseState,
  IPosition,
  IRowControlItem,
  IColumnStatistics,
  ICollaborator,
  IGroupPoint,
  ILinearRow,
  IGroupCollection,
  DragRegionType,
  IColumnLoading,
} from '../types/grid';
import {
  RegionType,
  RowControlType,
  DraggableType,
  SelectableType,
  LinearRowType,
} from '../types/grid';
import type { ISpriteMap, CombinedSelection, IIndicesMap } from '../managers';
import { CoordinateManager, SpriteManager, ImageManager } from '../managers';
import { getCellRenderer, CellType, type ICell, type IInnerCell } from '../renderers';
import { TouchLayer } from './TouchLayer';
import { measuredCanvas } from '../utils/core';

export interface IGridExternalProps {
  theme?: Partial<IGridTheme>;
  customIcons?: ISpriteMap;
  rowControls?: IRowControlItem[];
  smoothScrollX?: boolean;
  smoothScrollY?: boolean;
  scrollBufferX?: number;
  scrollBufferY?: number;
  scrollBarVisible?: boolean;
  rowIndexVisible?: boolean;
  collaborators?: ICollaborator;
  // [rowIndex, colIndex]
  searchCursor?: [number, number] | null;
  searchHitIndex?: { fieldId: string; recordId: string }[];

  /**
   * Indicates which areas can be dragged, including rows, columns or no drag
   * - 'all': Allow drag of rows, columns and cells (default)
   * - 'none': Disable drag for all areas
   * - 'row': Allow row drag only
   * - 'column': Allow column drag only
   */
  draggable?: DraggableType;

  /**
   * Indicates which areas can be selected, including row selection,
   * column selection, cell selection, all areas, or no selection
   * - 'all': Allow selection of rows, columns and cells (default)
   * - 'none': Disable selection for all areas
   * - 'row': Allow row selection only
   * - 'column': Allow column selection only
   * - 'cell': Allow cell selection only
   */
  selectable?: SelectableType;

  /**
   * Whether to allow multiple selection operations, including rows, columns and cells
   * If true, allow multiple selection of rows/columns/cells (default)
   * If false, disable multiple selection operations
   * @type {boolean}
   */
  isMultiSelectionEnable?: boolean;

  groupCollection?: IGroupCollection | null;
  collapsedGroupIds?: Set<string> | null;
  groupPoints?: IGroupPoint[] | null;

  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: (selection: CombinedSelection, e: React.ClipboardEvent) => void;
  onPaste?: (selection: CombinedSelection, e: React.ClipboardEvent) => void;
  onDelete?: (selection: CombinedSelection) => void;
  onCellEdited?: (cell: ICellItem, newValue: IInnerCell) => void;
  onCellDblClick?: (cell: ICellItem) => void;
  onSelectionChanged?: (selection: CombinedSelection) => void;
  onVisibleRegionChanged?: (rect: IRectangle) => void;
  onCollapsedGroupChanged?: (collapsedGroupIds: Set<string>) => void;
  onColumnFreeze?: (freezeColumnCount: number) => void;
  onColumnAppend?: () => void;
  onAddColumn?: (fieldType: any, insertIndex?: number, fieldName?: string, options?: any) => void;
  onEditColumn?: (columnIndex: number, updatedColumn: IGridColumn) => void;
  onDuplicateColumn?: (columnIndex: number) => void;
  onDeleteColumn?: (columnIndex: number) => void;
  // 新增：当用户选择“编辑字段”时，允许上层自定义编辑弹窗
  onStartEditColumn?: (columnIndex: number, column: IGridColumn) => void;
  onRowExpand?: (rowIndex: number) => void;
  onRowAppend?: (targetIndex?: number) => void;
  onRowOrdered?: (dragRowIndexCollection: number[], dropRowIndex: number) => void;
  onColumnOrdered?: (dragColIndexCollection: number[], dropColIndex: number) => void;
  onColumnResize?: (column: IGridColumn, newSize: number, colIndex: number) => void;
  onColumnHeaderClick?: (colIndex: number, bounds: IRectangle) => void;
  onColumnHeaderDblClick?: (colIndex: number, bounds: IRectangle) => void;
  onColumnHeaderMenuClick?: (colIndex: number, bounds: IRectangle) => void;
  onRowHeaderMenuClick?: (rowIndex: number, position: IPosition) => void;
  onCellContextMenu?: (rowIndex: number, colIndex: number, position: IPosition) => void;
  onColumnStatisticClick?: (colIndex: number, bounds: IRectangle) => void;
  onContextMenu?: (selection: CombinedSelection, position: IPosition) => void;
  onGroupHeaderContextMenu?: (groupId: string, position: IPosition) => void;
  onScrollChanged?: (scrollLeft: number, scrollTop: number) => void;
  onDragStart?: (type: DragRegionType, dragIndexs: number[]) => void;

  /**
   * Triggered when the mouse hovers over the every type of region
   */
  onItemHovered?: (type: RegionType, bounds: IRectangle, cellItem: ICellItem) => void;

  /**
   * Triggered when the mouse clicks the every type of region
   */
  onItemClick?: (type: RegionType, bounds: IRectangle, cellItem: ICellItem) => void;
}

export interface IGridProps extends IGridExternalProps {
  columns: IGridColumn[];
  commentCountMap?: Record<string, number>;
  freezeColumnCount?: number;
  rowCount: number;
  rowHeight?: number;
  style?: CSSProperties;
  isTouchDevice?: boolean;
  columnHeaderHeight?: number;
  columnStatistics?: IColumnStatistics;
  getCellContent: (cell: ICellItem) => ICell;
}

export interface IGridRef {
  resetState: () => void;
  forceUpdate: () => void;
  getActiveCell: () => ICellItem | null;
  getRowOffset: (rowIndex: number) => number;
  setSelection: (selection: CombinedSelection) => void;
  getScrollState: () => IScrollState;
  scrollBy: (deltaX: number, deltaY: number) => void;
  scrollTo: (scrollLeft?: number, scrollTop?: number) => void;
  scrollToItem: (position: [columnIndex: number, rowIndex: number]) => void;
  setActiveCell: (cell: ICellItem | null) => void;
  getCellIndicesAtPosition: (x: number, y: number) => ICellItem | null;
  getContainer: () => HTMLDivElement | null;
  getCellBounds: (cell: ICellItem) => IRectangle | null;
  setCellLoading: (cells: ICellItem[]) => void;
  setColumnLoadings: (columnLoadings: IColumnLoading[]) => void;
  isEditing: () => boolean | undefined;
}

const {
  scrollBuffer,
  appendRowHeight,
  groupHeaderHeight,
  cellScrollBuffer,
  columnAppendBtnWidth,
  columnStatisticHeight,
  rowHeight: defaultRowHeight,
  columnWidth: defaultColumnWidth,
  columnHeadHeight: defaultColumnHeaderHeight,
} = GRID_DEFAULT;

const GridBase: ForwardRefRenderFunction<IGridRef, IGridProps> = (props, forwardRef) => {
  const {
    columns,
    commentCountMap,
    groupCollection,
    collapsedGroupIds,
    draggable = DraggableType.All,
    selectable = SelectableType.All,
    columnStatistics,
    freezeColumnCount: _freezeColumnCount = 1,
    rowCount: originRowCount,
    rowHeight = defaultRowHeight,
    rowControls = [{ type: RowControlType.Checkbox }],
    theme: customTheme,
    isTouchDevice,
    smoothScrollX = true,
    smoothScrollY = true,
    scrollBufferX = scrollBuffer,
    scrollBufferY = scrollBuffer,
    scrollBarVisible = true,
    rowIndexVisible = true,
    isMultiSelectionEnable = true,
    style,
    customIcons,
    collaborators,
    searchCursor,
    searchHitIndex,
    groupPoints,
    columnHeaderHeight = defaultColumnHeaderHeight,
    getCellContent,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onDelete,
    onRowAppend,
    onRowExpand,
    onRowOrdered,
    onCellEdited,
    onCellDblClick,
    onColumnAppend,
    onColumnResize,
    onColumnOrdered,
    onDragStart,
    // onContextMenu, // 未使用
    onSelectionChanged,
    onVisibleRegionChanged,
    onColumnFreeze,
    onColumnHeaderClick,
    onColumnHeaderDblClick,
    // onColumnHeaderMenuClick, // 未使用
    // onRowHeaderMenuClick, // 未使用
    // onCellContextMenu, // 未使用
    onColumnStatisticClick,
    onCollapsedGroupChanged,
    onGroupHeaderContextMenu,
    onItemHovered,
    onItemClick,
    onScrollChanged,
    onAddColumn,
    onEditColumn,
    onDuplicateColumn,
    onDeleteColumn,
    onStartEditColumn,
  } = props;

  useImperativeHandle(forwardRef, () => ({
    resetState: () => interactionLayerRef.current?.resetState(),
    forceUpdate: () => setForceRenderFlag(uniqueId('grid_')),
    getActiveCell: () => activeCell,
    setSelection: (selection: CombinedSelection) => {
      interactionLayerRef.current?.setSelection(selection);
    },
    getRowOffset: (rowIndex: number) => {
      const { scrollTop } = scrollState;
      const realRowIndex = real2RowIndex(rowIndex);
      return (coordInstance.getRowOffset(realRowIndex) ?? 0) - scrollTop;
    },
    scrollBy,
    scrollTo,
    scrollToItem,
    setActiveCell,
    getScrollState: () => scrollState,
    getCellIndicesAtPosition: (x: number, y: number): ICellItem | null => {
      const { scrollLeft, scrollTop } = scrollState;

      const rowIndex = coordInstance.getRowStartIndex(scrollTop + y);
      const columnIndex = coordInstance.getColumnStartIndex(scrollLeft + x);

      const { type, realIndex } = getLinearRow(rowIndex);
      if (type !== LinearRowType.Row) {return null;}

      return [columnIndex, realIndex];
    },
    getContainer: () => containerRef.current,
    setCellLoading: (cells: ICellItem[]) => {
      setCellLoadings(cells);
    },
    setColumnLoadings: (columnLoadings: IColumnLoading[]) => {
      setColumnLoadings(columnLoadings);
    },
    getCellBounds: (cell: ICellItem) => {
      const [columnIndex, _rowIndex] = cell;
      const rowIndex = real2RowIndex(_rowIndex);
      const { scrollLeft, scrollTop } = scrollState;

      const columnOffsetX = coordInstance.getColumnRelativeOffset(columnIndex, scrollLeft);
      const columnWidth = coordInstance.getColumnWidth(columnIndex);

      if (columnOffsetX == null || columnWidth == null) {
        return null;
      }

      const rowOffsetY = coordInstance.getRowOffset(rowIndex) ?? 0;
      const rowHeight = coordInstance.getRowHeight(rowIndex) ?? 0;

      return {
        x: columnOffsetX,
        y: rowOffsetY - scrollTop,
        width: columnWidth,
        height: rowHeight,
      };
    },
    isEditing: () => {
      return interactionLayerRef.current?.isEditing();
    },
  }));

  const hasAppendRow = onRowAppend != null;
  const hasAppendColumn = onColumnAppend != null;
  const rowControlCount = rowControls.length;
  const totalWidth = columns.reduce(
    (prev, column) => prev + (column.width || defaultColumnWidth),
    hasAppendColumn ? scrollBufferX + columnAppendBtnWidth : scrollBufferX
  );

  const [forceRenderFlag, setForceRenderFlag] = useState(uniqueId('grid_'));
  const [mouseState, setMouseState] = useState<IMouseState>(DEFAULT_MOUSE_STATE);
  const [scrollState, setScrollState] = useState<IScrollState>(DEFAULT_SCROLL_STATE);
  const [activeCell, setActiveCell] = useRafState<ICellItem | null>(null);
  const [cellLoadings, setCellLoadings] = useState<ICellItem[]>([]);
  const [columnLoadings, setColumnLoadings] = useState<IColumnLoading[]>([]);
  const [isAddFieldMenuOpen, setIsAddFieldMenuOpen] = useState(false);
  const [isEditFieldMenuOpen, setIsEditFieldMenuOpen] = useState(false);
  const [editingColumnIndex, setEditingColumnIndex] = useState(-1);
  const scrollerRef = useRef<ScrollerRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactionLayerRef = useRef<IInteractionLayerRef | null>(null);
  const columnManagementRef = useRef<IColumnManagementRef | null>(null);
  const rowContextMenuRef = useRef<IRowContextMenuRef | null>(null);
  const deleteConfirmDialogRef = useRef<IDeleteConfirmDialogRef | null>(null);
  const addFieldMenuTriggerRef = useRef<HTMLElement | null>(null);
  const editFieldMenuTriggerRef = useRef<HTMLElement | null>(null);
  const { ref, width, height } = useResizeObserver<HTMLDivElement>();

  const [activeColumnIndex, activeRowIndex] = activeCell ?? [];
  const hoverRegionType = mouseState.type;
  const hasColumnStatistics = columnStatistics != null;
  const containerHeight = hasColumnStatistics ? height - columnStatisticHeight : height;
  const columnCount = columns.length;
  const freezeColumnCount = Math.min(_freezeColumnCount, columnCount);

  const theme = useMemo(() => ({ ...gridTheme, ...customTheme }), [customTheme]);
  const { iconSizeMD } = theme;

  const columnInitSize = useMemo(() => {
    return !rowIndexVisible && !rowControlCount ? 0 : Math.max(rowControlCount, 2) * iconSizeMD;
  }, [rowControlCount, rowIndexVisible, iconSizeMD]);

  const defaultRowsInfo = useMemo(() => {
    return {
      linearRows: [],
      real2LinearRowMap: null,
      pureRowCount: originRowCount,
      rowCount: hasAppendRow ? originRowCount + 1 : originRowCount,
      rowHeightMap: hasAppendRow ? { [originRowCount]: appendRowHeight } : undefined,
    };
  }, [hasAppendRow, originRowCount]);

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const groupRowsInfo = useMemo(() => {
    if (!groupPoints?.length) {return null;}
    let rowIndex = 0;
    let totalIndex = 0;
    let currentValue: unknown = null;
    let collapsedDepth = Number.MAX_VALUE;
    const linearRows: ILinearRow[] = [];
    const rowHeightMap: IIndicesMap = {};
    const real2LinearRowMap: Record<number, number> = {};

    groupPoints.forEach((point) => {
      const { type } = point;
      if (type === LinearRowType.Group) {
        const { id, value, depth, isCollapsed } = point;
        const isSubGroup = depth > collapsedDepth;

        if (isCollapsed) {
          collapsedDepth = Math.min(collapsedDepth, depth);
          if (isSubGroup) {return;}
        } else if (!isSubGroup) {
          collapsedDepth = Number.MAX_VALUE;
        } else {
          return;
        }

        rowHeightMap[totalIndex] = groupHeaderHeight;
        linearRows.push({
          id,
          type: LinearRowType.Group,
          depth,
          value,
          realIndex: rowIndex,
          isCollapsed: Boolean(isCollapsed),
        });
        currentValue = value;
        totalIndex++;
      }
      if (type === LinearRowType.Row) {
        const count = point.count;

        for (let i = 0; i < count; i++) {
          real2LinearRowMap[rowIndex + i] = totalIndex + i;
          linearRows.push({
            type: LinearRowType.Row,
            displayIndex: i + 1,
            realIndex: rowIndex + i,
          });
        }

        rowIndex += count;
        totalIndex += count;

        if (hasAppendRow) {
          rowHeightMap[totalIndex] = appendRowHeight;
          linearRows.push({
            type: LinearRowType.Append,
            value: currentValue,
            realIndex: rowIndex - 1,
          });
          totalIndex++;
        }
      }
    });

    return {
      linearRows,
      real2LinearRowMap,
      pureRowCount: rowIndex,
      rowCount: totalIndex,
      rowHeightMap,
    };
  }, [groupPoints, hasAppendRow]);

  const { rowCount, pureRowCount, rowHeightMap, linearRows, real2LinearRowMap } = useMemo(() => {
    return { ...defaultRowsInfo, ...groupRowsInfo };
  }, [defaultRowsInfo, groupRowsInfo]);

  const getLinearRow = useCallback(
    (index: number): ILinearRow => {
      if (!linearRows.length) {
        return (
          index >= pureRowCount
            ? {
                type: LinearRowType.Append,
                realIndex: index - 1,
                value: null,
              }
            : {
                type: LinearRowType.Row,
                displayIndex: index + 1,
                realIndex: index,
              }
        ) as ILinearRow;
      }
      return linearRows[index] ?? ({ type: LinearRowType.Row, realIndex: -2 } as ILinearRow);
    },
    [linearRows, pureRowCount]
  );

  const real2RowIndex = useCallback(
    (index: number): number => {
      if (real2LinearRowMap == null) {return index;}
      return real2LinearRowMap[index] ?? index;
    },
    [real2LinearRowMap]
  );

  const columnWidthMap = useMemo(() => {
    return columns.reduce(
      (acc, column, index) => ({
        ...acc,
        [index]: column.width || defaultColumnWidth,
      }),
      {}
    );
  }, [columns]);

  const coordInstance = useMemo<CoordinateManager>(() => {
    return new CoordinateManager({
      rowHeight,
      columnWidth: defaultColumnWidth,
      pureRowCount,
      rowCount,
      columnCount,
      freezeColumnCount,
      containerWidth: width,
      containerHeight,
      rowInitSize: columnHeaderHeight,
      columnInitSize,
      rowHeightMap,
      columnWidthMap,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowHeight, pureRowCount, rowCount, rowHeightMap, columnHeaderHeight]);

  const totalHeight = coordInstance.totalHeight + scrollBufferY;

  useMemo(() => {
    coordInstance.refreshColumnDimensions({ columnInitSize, columnCount, columnWidthMap });
    setForceRenderFlag(uniqueId('grid_'));
  }, [coordInstance, columnInitSize, columnCount, columnWidthMap]);

  useMemo(() => {
    coordInstance.containerWidth = width;
    coordInstance.containerHeight = containerHeight;
    coordInstance.freezeColumnCount = freezeColumnCount;
    setForceRenderFlag(uniqueId('grid_'));
  }, [coordInstance, width, containerHeight, freezeColumnCount]);

  const activeCellBound = useMemo(() => {
    if (activeColumnIndex == null || activeRowIndex == null) {
      return null;
    }

    const cell = getCellContent([activeColumnIndex, activeRowIndex]);
    const cellRenderer = getCellRenderer(cell.type as CellType);
    const originWidth = coordInstance.getColumnWidth(activeColumnIndex) ?? 0;
    const originHeight = coordInstance.getRowHeight(real2RowIndex(activeRowIndex)) ?? 0;

    if (cellRenderer?.measure && measuredCanvas?.ctx != null) {
      const measureResult = cellRenderer.measure(cell as never, {
        theme,
        ctx: measuredCanvas.ctx,
        width: originWidth,
        height: originHeight,
      });
      const { width, height, totalHeight = height } = measureResult;
      return {
        x: coordInstance.getColumnOffset(activeColumnIndex) ?? 0,
        y: coordInstance.getRowOffset(real2RowIndex(activeRowIndex)) ?? 0,
        rowIndex: activeRowIndex,
        columnIndex: activeColumnIndex,
        width,
        height,
        totalHeight,
        scrollTop: 0,
        scrollEnable: totalHeight > height,
      };
    }
    return {
      x: coordInstance.getColumnOffset(activeColumnIndex) ?? 0,
      y: coordInstance.getRowOffset(real2RowIndex(activeRowIndex)) ?? 0,
      rowIndex: activeRowIndex,
      columnIndex: activeColumnIndex,
      width: originWidth,
      height: originHeight,
      totalHeight: originHeight,
      scrollTop: 0,
      scrollEnable: false,
    };
  }, [activeColumnIndex, activeRowIndex, coordInstance, theme, getCellContent, real2RowIndex]);

  const scrollEnable =
    hoverRegionType !== RegionType.None &&
    !(hoverRegionType === RegionType.ActiveCell && activeCellBound?.scrollEnable);

  const spriteManager = useMemo(
    () => new SpriteManager(customIcons, () => setForceRenderFlag(uniqueId('grid_'))),
    [customIcons]
  );

  const imageManager = useMemo<ImageManager>(() => {
    const imgManager = new ImageManager();
    imgManager.setCallback(() => setForceRenderFlag(uniqueId('grid_')));
    return imgManager;
  }, []);

  const scrollTo = useCallback((sl?: number, st?: number) => {
    scrollerRef.current?.scrollTo(sl, st);
  }, []);

  const scrollBy = useCallback((deltaX: number, deltaY: number) => {
    scrollerRef.current?.scrollBy(deltaX, deltaY);
  }, []);

  // 点击右侧"+"添加列时，显示字段类型选择弹窗
  const handleAppendColumnClick = useCallback(() => {
    // 计算 + 号按钮的位置，用于菜单定位
    const containerEl = containerRef.current;
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      const { totalWidth } = coordInstance;
      const { scrollLeft } = scrollState;
      
      // 创建一个虚拟的触发器元素用于定位
      const triggerElement = {
        getBoundingClientRect: () => ({
          left: rect.left + totalWidth - scrollLeft,
          top: rect.top,
          right: rect.left + totalWidth - scrollLeft + 40, // 按钮宽度
          bottom: rect.top + columnHeaderHeight,
          width: 40,
          height: columnHeaderHeight,
        }),
      } as unknown as HTMLElement;
      
      addFieldMenuTriggerRef.current = triggerElement;
    }

    // 显示新的 Airtable 风格菜单
    setIsAddFieldMenuOpen(true);
  }, [coordInstance, scrollState.scrollLeft, columnHeaderHeight]);

  // 新菜单的最终确认：直接创建字段
  const handleAddFieldConfirm = useCallback((payload: { type: string; name?: string; options?: any }) => {
    onAddColumn?.(payload.type, columns.length, payload.name, payload.options);
    setIsAddFieldMenuOpen(false);
  }, [onAddColumn, columns.length]);

  // 关闭菜单
  const handleCloseAddFieldMenu = useCallback(() => {
    setIsAddFieldMenuOpen(false);
  }, []);

  // 处理编辑字段
  const handleEditField = useCallback((columnIndex: number) => {
    const column = columns[columnIndex];
    if (!column) return;

    // 计算列头位置，用于菜单定位
    const containerEl = containerRef.current;
    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      const columnX = coordInstance.getColumnRelativeOffset(columnIndex, scrollState.scrollLeft);
      
      // 创建一个虚拟的触发器元素用于定位
      const triggerElement = {
        getBoundingClientRect: () => ({
          left: rect.left + columnX,
          top: rect.top,
          right: rect.left + columnX + (column.width || defaultColumnWidth),
          bottom: rect.top + columnHeaderHeight,
          width: column.width || defaultColumnWidth,
          height: columnHeaderHeight,
        }),
      } as unknown as HTMLElement;
      
      editFieldMenuTriggerRef.current = triggerElement;
    }

    setEditingColumnIndex(columnIndex);
    setIsEditFieldMenuOpen(true);
  }, [columns, coordInstance, scrollState.scrollLeft, columnHeaderHeight]);

  // 处理编辑字段确认
  const handleEditFieldConfirm = useCallback((payload: { type: string; name: string; options?: any }) => {
    if (editingColumnIndex >= 0) {
      const updatedColumn = {
        ...columns[editingColumnIndex],
        name: payload.name,
        type: payload.type,
        options: payload.options,
      };
      onEditColumn?.(editingColumnIndex, updatedColumn);
    }
    setIsEditFieldMenuOpen(false);
    setEditingColumnIndex(-1);
  }, [editingColumnIndex, columns, onEditColumn]);

  // 关闭编辑字段菜单
  const handleCloseEditFieldMenu = useCallback(() => {
    setIsEditFieldMenuOpen(false);
    setEditingColumnIndex(-1);
  }, []);

  // 处理列头右键菜单 - bounds现在包含实际的clientX/clientY
  const handleColumnHeaderMenuClick = useCallback((colIndex: number, bounds: IRectangle) => {
    // bounds.x 和 bounds.y 是 event.clientX 和 event.clientY（viewport坐标）
    columnManagementRef.current?.showColumnContextMenu({ x: bounds.x, y: bounds.y }, colIndex);
  }, []);

  // 处理行号右键菜单
  const handleRowHeaderMenuClick = useCallback((rowIndex: number, position: IPosition) => {
    // position已经是viewport坐标，直接使用
    rowContextMenuRef.current?.show(position, rowIndex);
  }, []);

  // 处理单元格右键菜单
  const handleCellContextMenu = useCallback((rowIndex: number, _colIndex: number, position: IPosition) => {
    // position已经是viewport坐标（从InteractionLayer传来），直接使用
    rowContextMenuRef.current?.show(position, rowIndex);
  }, []);

  // 对齐编辑弹窗定位：顶部与第一行顶部对齐、左侧与该列右边对齐
  const openEditFieldAtColumn = useCallback((colIndex: number) => {
    const containerEl = containerRef.current;
    const rect = containerEl?.getBoundingClientRect();
    const pageLeft = (rect?.left ?? 0) + window.scrollX;
    const pageTop = (rect?.top ?? 0) + window.scrollY;
    const x = pageLeft + coordInstance.getColumnRelativeOffset(colIndex + 1, scrollState.scrollLeft);
    const y = pageTop + columnHeaderHeight; // 表头下沿
    const column = columns[colIndex];
    if (!column) {return;}
    columnManagementRef.current?.showFieldPropertyEditor(column, colIndex, { x, y, width: 520 });
  }, [columns, coordInstance, scrollState.scrollLeft, columnHeaderHeight]);

  const scrollToItem = useCallback(
    (position: [columnIndex: number, rowIndex: number]) => {
      try {
        const {
          containerHeight,
          containerWidth,
          freezeRegionWidth,
          freezeColumnCount,
          rowInitSize,
        } = coordInstance;
        const { scrollTop, scrollLeft } = scrollState;
        const [columnIndex, _rowIndex] = position;
        const rowIndex = real2RowIndex(_rowIndex);
        const isFreezeColumn = columnIndex < freezeColumnCount;

        if (!isFreezeColumn) {
          const offsetX = coordInstance.getColumnOffset(columnIndex) ?? 0;
          const columnWidth = coordInstance.getColumnWidth(columnIndex) ?? 0;
          const deltaLeft = Math.min(offsetX - scrollLeft - freezeRegionWidth, 0);
          const deltaRight = Math.max(offsetX + columnWidth - scrollLeft - containerWidth, 0);
          const sl = scrollLeft + deltaLeft + deltaRight;
          if (sl !== scrollLeft) {
            const scrollBuffer =
              deltaLeft < 0 ? -cellScrollBuffer : deltaRight > 0 ? cellScrollBuffer : 0;
            scrollTo(sl + scrollBuffer, undefined);
          }
        }

        const rowHeight = coordInstance.getRowHeight(rowIndex) ?? 0;
        const offsetY = coordInstance.getRowOffset(rowIndex) ?? 0;
        const deltaTop = Math.min(offsetY - scrollTop - rowInitSize, 0);
        const deltaBottom = Math.max(offsetY + rowHeight - scrollTop - containerHeight, 0);
        const st = scrollTop + deltaTop + deltaBottom;
        if (st !== scrollTop) {
          scrollTo(undefined, st);
        }
      } catch (error) {
        console.error('scrollToItem error', error);
      }
    },
    [coordInstance, scrollState, scrollTo, real2RowIndex]
  );

  const onMouseDown = () => {
    containerRef.current?.focus();
  };

  // 右键行时弹出菜单（先实现删除）
  const handleContextMenu = useCallback((selection: CombinedSelection, position: IPosition) => {
    const [_colIndex, rowIndex] = selection.ranges[0] ?? [];
    if (rowIndex == null || rowIndex < 0) {return;}
    const containerEl = containerRef.current;
    const rect = containerEl?.getBoundingClientRect();
    const pageLeft = (rect?.left ?? 0) + window.scrollX;
    const pageTop = (rect?.top ?? 0) + window.scrollY;
    rowContextMenuRef.current?.show({ x: pageLeft + position.x, y: pageTop + position.y }, rowIndex);
  }, []);

  const { rowInitSize } = coordInstance;

  // 防御性设计：检测容器尺寸
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn(
          '[Grid] 警告：Grid容器尺寸为0，表格可能无法正常显示。',
          `尺寸: ${rect.width}x${rect.height}`,
          '\n建议：确保Grid的父容器有明确的宽高设置。',
          '\n示例：<div style={{ width: "100%", height: "600px" }}><Grid ... /></div>'
        );
      }
    }
  }, []);

  // 列头双击：若上层未自定义处理，则默认打开字段编辑弹窗
  const handleHeaderDblClick = useCallback(
    (colIndex: number, bounds: IRectangle) => {
      if (onColumnHeaderDblClick) {
        onColumnHeaderDblClick(colIndex, bounds);
        return;
      }
      openEditFieldAtColumn(colIndex);
    },
    [onColumnHeaderDblClick, openEditFieldAtColumn]
  );

  return (
    <div 
      ref={ref}
      style={{ 
        width: '100%', 
        height: '100%', 
        ...style 
      }}
    >
      <div
        data-t-grid-container
        ref={containerRef}
        tabIndex={0}
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          outline: 'none',
          // 防御性设计：设置最小尺寸，确保即使父容器配置错误，Grid也有基本显示
          minWidth: '200px',
          minHeight: '150px'
        }}
        onMouseDown={onMouseDown}
      >
        {isTouchDevice ? (
          <TouchLayer
            width={width}
            height={height}
            theme={theme}
            columns={columns}
            commentCountMap={commentCountMap}
            mouseState={mouseState}
            scrollState={scrollState}
            rowControls={rowControls}
            collaborators={collaborators}
            searchCursor={searchCursor}
            searchHitIndex={searchHitIndex}
            imageManager={imageManager}
            spriteManager={spriteManager}
            coordInstance={coordInstance}
            columnStatistics={columnStatistics}
            collapsedGroupIds={collapsedGroupIds}
            columnHeaderHeight={columnHeaderHeight}
            forceRenderFlag={forceRenderFlag}
            rowIndexVisible={rowIndexVisible}
            groupCollection={groupCollection}
            getLinearRow={getLinearRow}
            real2RowIndex={real2RowIndex}
            getCellContent={getCellContent}
            setMouseState={setMouseState}
            setActiveCell={setActiveCell}
            onDelete={onDelete}
            onRowAppend={onRowAppend}
            onRowExpand={onRowExpand}
            onCellEdited={onCellEdited}
            onContextMenu={handleContextMenu}
            onColumnAppend={handleAppendColumnClick}
            onColumnHeaderClick={onColumnHeaderClick}
            onColumnStatisticClick={onColumnStatisticClick}
            onCollapsedGroupChanged={onCollapsedGroupChanged}
            onSelectionChanged={onSelectionChanged}
          />
        ) : (
          <InteractionLayer
            ref={interactionLayerRef}
            width={width}
            height={height}
            theme={theme}
            columns={columns}
            commentCountMap={commentCountMap}
            draggable={draggable}
            selectable={selectable}
            collaborators={collaborators}
            searchCursor={searchCursor}
            searchHitIndex={searchHitIndex}
            rowControls={rowControls}
            imageManager={imageManager}
            spriteManager={spriteManager}
            coordInstance={coordInstance}
            columnStatistics={columnStatistics}
            collapsedGroupIds={collapsedGroupIds}
            columnHeaderHeight={columnHeaderHeight}
            isMultiSelectionEnable={isMultiSelectionEnable}
            activeCell={activeCell}
            mouseState={mouseState}
            scrollState={scrollState}
            activeCellBound={activeCellBound}
            forceRenderFlag={forceRenderFlag}
            rowIndexVisible={rowIndexVisible}
            groupCollection={groupCollection}
            getLinearRow={getLinearRow}
            real2RowIndex={real2RowIndex}
            getCellContent={getCellContent}
            setMouseState={setMouseState}
            setActiveCell={setActiveCell}
            scrollToItem={scrollToItem}
            scrollBy={scrollBy}
            onUndo={onUndo}
            onRedo={onRedo}
            onCopy={onCopy}
            onPaste={onPaste}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onRowAppend={onRowAppend}
            onRowExpand={onRowExpand}
            onRowOrdered={onRowOrdered}
            onCellEdited={onCellEdited}
            onCellDblClick={onCellDblClick}
            onContextMenu={handleContextMenu}
            onColumnAppend={handleAppendColumnClick}
            onColumnResize={onColumnResize}
            onColumnOrdered={onColumnOrdered}
            onColumnHeaderClick={onColumnHeaderClick}
            onColumnStatisticClick={onColumnStatisticClick}
            onColumnHeaderDblClick={handleHeaderDblClick}
            onColumnHeaderMenuClick={handleColumnHeaderMenuClick}
            onRowHeaderMenuClick={handleRowHeaderMenuClick}
            onCellContextMenu={handleCellContextMenu}
            onCollapsedGroupChanged={onCollapsedGroupChanged}
            onGroupHeaderContextMenu={onGroupHeaderContextMenu}
            onSelectionChanged={onSelectionChanged}
            onColumnFreeze={onColumnFreeze}
            onItemHovered={onItemHovered}
            onItemClick={onItemClick}
          />
        )}
      </div>

      <InfiniteScroller
        ref={scrollerRef}
        coordInstance={coordInstance}
        top={rowInitSize}
        left={columnInitSize}
        containerWidth={width}
        containerHeight={containerHeight}
        scrollWidth={totalWidth}
        scrollHeight={totalHeight}
        smoothScrollX={smoothScrollX}
        smoothScrollY={smoothScrollY}
        scrollBarVisible={scrollBarVisible}
        containerRef={containerRef}
        scrollState={scrollState}
        scrollEnable={scrollEnable}
        getLinearRow={getLinearRow}
        setScrollState={setScrollState}
        onScrollChanged={onScrollChanged}
        onVisibleRegionChanged={onVisibleRegionChanged}
      />

      <LoadingIndicator
        cellLoadings={cellLoadings}
        columnLoadings={columnLoadings}
        coordInstance={coordInstance}
        scrollState={scrollState}
      />

      <ColumnManagement
        ref={columnManagementRef}
        columns={columns}
        onAddColumn={onAddColumn}
        onEditColumn={onEditColumn}
        onDuplicateColumn={onDuplicateColumn}
        onDeleteColumn={onDeleteColumn}
        onStartEditColumn={handleEditField}
      />

      {/* Airtable 风格的字段添加菜单 */}
      <AddFieldMenu
        isOpen={isAddFieldMenuOpen}
        onClose={handleCloseAddFieldMenu}
        onConfirm={handleAddFieldConfirm}
        triggerRef={addFieldMenuTriggerRef}
      />

      {/* Airtable 风格的字段编辑菜单 */}
      <EditFieldMenu
        isOpen={isEditFieldMenuOpen}
        onClose={handleCloseEditFieldMenu}
        onConfirm={handleEditFieldConfirm}
        triggerRef={editFieldMenuTriggerRef}
        initialData={editingColumnIndex >= 0 ? {
          type: mapAPITypeToMenuType((columns[editingColumnIndex] as any)?.type || 'text'),
          name: columns[editingColumnIndex]?.name || '',
          options: (columns[editingColumnIndex] as any)?.options || {},
          description: (columns[editingColumnIndex] as any)?.description || '',
        } : undefined}
      />

      <RowContextMenu
        ref={rowContextMenuRef}
        onDeleteRow={(rowIndex) => {
          // 显示删除确认对话框
          const recordId = `record-${rowIndex}`;
          deleteConfirmDialogRef.current?.show('row', recordId, rowIndex);
        }}
        onDuplicateRow={(_rowIndex) => {
          // TODO: 实现复制行逻辑
        }}
        onInsertRowAbove={(rowIndex) => {
          onRowAppend?.(rowIndex);
        }}
        onInsertRowBelow={(rowIndex) => {
          onRowAppend?.(rowIndex + 1);
        }}
        onExpandRow={(rowIndex) => onRowExpand?.(rowIndex)}
      />

      <DeleteConfirmDialog
        ref={deleteConfirmDialogRef}
        onConfirm={(type: DeleteType, itemIndex: number) => {
          if (type === 'row') {
            onDelete?.({ type: SelectableType.Row } as any);
          }
        }}
      />
    </div>
  );
};

export const Grid = forwardRef(GridBase);
