/**
 * Grid 事件处理 Hook
 * 提取Grid.tsx中的事件处理逻辑
 */
import { useCallback } from 'react';
import type { ICellItem, IPosition, IRectangle } from '../../types/grid';
import type { CombinedSelection } from '../../managers';
import type { CoordinateManager } from '../../managers/coordinate-manager/CoordinateManager';

interface UseGridEventsProps {
  columns: any[];
  coordInstance: CoordinateManager;
  scrollState: any;
  columnHeaderHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  columnManagementRef: any;
  rowContextMenuRef: any;
  onAddColumn?: (type: string, index: number) => void;
  onRowAppend?: (index: number) => void;
  onDelete?: (selection: CombinedSelection) => void;
}

export function useGridEvents(props: UseGridEventsProps) {
  const {
    columns,
    coordInstance,
    scrollState,
    columnHeaderHeight,
    containerRef,
    columnManagementRef,
    rowContextMenuRef,
    onAddColumn,
    onRowAppend,
    onDelete,
  } = props;

  // 处理添加列点击
  const handleAppendColumnClick = useCallback(() => {
    if (onAddColumn) {
      onAddColumn('text', columns.length);
      return;
    }

    const containerEl = containerRef.current;
    const rect = containerEl?.getBoundingClientRect();
    const pageLeft = (rect?.left ?? 0) + window.scrollX;
    const pageTop = (rect?.top ?? 0) + window.scrollY;

    const totalWidth = columns.reduce((sum, col) => sum + (col.width || 100), 0);
    const x = pageLeft + totalWidth - scrollState.scrollLeft;
    const y = pageTop + columnHeaderHeight;

    columnManagementRef.current?.showFieldTypeSelector({ x, y, width: 520 });
  }, [onAddColumn, columns, coordInstance, scrollState.scrollLeft, columnHeaderHeight, containerRef, columnManagementRef]);

  // 处理列头菜单点击
  const handleColumnHeaderMenuClick = useCallback((colIndex: number, bounds: IRectangle) => {
    const { x, y } = bounds;
    columnManagementRef.current?.showFieldPropertyEditor(columns[colIndex], colIndex, { x, y, width: 520 });
  }, [columns, columnManagementRef]);

  // 处理行头菜单点击
  const handleRowHeaderMenuClick = useCallback((rowIndex: number, position: IPosition) => {
    rowContextMenuRef.current?.show(position, rowIndex);
  }, [rowContextMenuRef]);

  // 处理单元格右键菜单
  const handleCellContextMenu = useCallback((rowIndex: number, _colIndex: number, position: IPosition) => {
    rowContextMenuRef.current?.show(position, rowIndex);
  }, [rowContextMenuRef]);

  // 处理右键菜单
  const handleContextMenu = useCallback((selection: CombinedSelection, position: IPosition) => {
    const [_colIndex, rowIndex] = selection.ranges[0] ?? [];
    if (rowIndex == null || rowIndex < 0) {return;}
    
    const containerEl = containerRef.current;
    const rect = containerEl?.getBoundingClientRect();
    const pageLeft = (rect?.left ?? 0) + window.scrollX;
    const pageTop = (rect?.top ?? 0) + window.scrollY;
    
    rowContextMenuRef.current?.show({ x: pageLeft + position.x, y: pageTop + position.y }, rowIndex);
  }, [containerRef, rowContextMenuRef]);

  // 打开字段编辑器
  const openEditFieldAtColumn = useCallback((colIndex: number) => {
    const containerEl = containerRef.current;
    const rect = containerEl?.getBoundingClientRect();
    const pageLeft = (rect?.left ?? 0) + window.scrollX;
    const pageTop = (rect?.top ?? 0) + window.scrollY;
    const x = pageLeft + coordInstance.getColumnRelativeOffset(colIndex + 1, scrollState.scrollLeft);
    const y = pageTop + columnHeaderHeight;
    const column = columns[colIndex];
    if (!column) {return;}
    columnManagementRef.current?.showFieldPropertyEditor(column, colIndex, { x, y, width: 520 });
  }, [columns, coordInstance, scrollState.scrollLeft, columnHeaderHeight, containerRef, columnManagementRef]);

  return {
    handleAppendColumnClick,
    handleColumnHeaderMenuClick,
    handleRowHeaderMenuClick,
    handleCellContextMenu,
    handleContextMenu,
    openEditFieldAtColumn,
  };
}

