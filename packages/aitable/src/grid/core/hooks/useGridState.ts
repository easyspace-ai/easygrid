/**
 * Grid 状态管理 Hook
 * 提取Grid.tsx中的状态管理逻辑
 */
import { useState, useRef } from 'react';
import { uniqueId } from 'lodash';
import { useRafState } from 'react-use';
import type {
  IMouseState,
  IScrollState,
  ICellItem,
  IColumnLoading,
} from '../../types/grid';
import { DEFAULT_SCROLL_STATE, DEFAULT_MOUSE_STATE } from '../../configs';
import type { IInteractionLayerRef } from '../InteractionLayer';
import type { IColumnManagementRef } from '../../components/column-management/ColumnManagement';
import type { IRowContextMenuRef } from '../../components/context-menu/RowContextMenu';
import type { IDeleteConfirmDialogRef } from '../../components/dialogs/DeleteConfirmDialog';
import type { ScrollerRef } from '../InfiniteScroller';

export function useGridState() {
  // 强制渲染标记
  const [forceRenderFlag, setForceRenderFlag] = useState(uniqueId('grid_'));
  
  // 鼠标和滚动状态
  const [mouseState, setMouseState] = useState<IMouseState>(DEFAULT_MOUSE_STATE);
  const [scrollState, setScrollState] = useState<IScrollState>(DEFAULT_SCROLL_STATE);
  
  // 激活单元格
  const [activeCell, setActiveCell] = useRafState<ICellItem | null>(null);
  
  // 加载状态
  const [cellLoadings, setCellLoadings] = useState<ICellItem[]>([]);
  const [columnLoadings, setColumnLoadings] = useState<IColumnLoading[]>([]);
  
  // Refs
  const scrollerRef = useRef<ScrollerRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactionLayerRef = useRef<IInteractionLayerRef | null>(null);
  const columnManagementRef = useRef<IColumnManagementRef | null>(null);
  const rowContextMenuRef = useRef<IRowContextMenuRef | null>(null);
  const deleteConfirmDialogRef = useRef<IDeleteConfirmDialogRef | null>(null);

  return {
    // 状态
    forceRenderFlag,
    setForceRenderFlag,
    mouseState,
    setMouseState,
    scrollState,
    setScrollState,
    activeCell,
    setActiveCell,
    cellLoadings,
    setCellLoadings,
    columnLoadings,
    setColumnLoadings,
    
    // Refs
    scrollerRef,
    containerRef,
    interactionLayerRef,
    columnManagementRef,
    rowContextMenuRef,
    deleteConfirmDialogRef,
  };
}

