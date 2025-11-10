"use client";

import { Plus } from "lucide-react";
import * as React from "react";
import { DraggableColumnHeaders } from "./data-grid-column-header";
import { DataGridContextMenu } from "./data-grid-context-menu";
import { DataGridRow } from "./data-grid-row";
import { DataGridSearch } from "./data-grid-search";
import { AddColumnMenu } from "./add-column-menu";
import type { useDataGrid } from "../../hooks/use-data-grid";
import { cn } from "../../lib/utils";

interface DataGridProps<TData>
  extends ReturnType<typeof useDataGrid<TData>>,
    React.ComponentProps<"div"> {
  height?: number | 'auto';
  onDeleteField?: (fieldId: string) => void | Promise<void>;
  onUpdateField?: (fieldId: string, config: { type: string; name?: string; options?: any }) => void | Promise<void>;
  getFieldInfo?: (columnId: string) => { name: string; type: string; options?: any } | null;
}

export function DataGrid<TData>({
  dataGridRef,
  headerRef,
  rowMapRef,
  footerRef,
  table,
  rowVirtualizer,
  height = 600,
  searchState,
  columnSizeVars,
  onRowAdd,
  onAddColumn,
  onDeleteField,
  onUpdateField,
  getFieldInfo,
  className,
  ...props
}: DataGridProps<TData>) {
  const rows = table.getRowModel().rows;
  const columns = table.getAllColumns();
  
  // 创建 wrapper ref 用于监听父容器尺寸变化
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  
  // 当 height 为 'auto' 时，需要动态计算可用高度
  const [calculatedHeight, setCalculatedHeight] = React.useState<number | undefined>(
    height === 'auto' ? undefined : height
  );
  
  // 当 height='auto' 时，使用 useEffect 动态计算容器高度
  React.useEffect(() => {
    if (height !== 'auto') {
      setCalculatedHeight(undefined);
      return;
    }
    
    let rafId: number | null = null;
    let resizeTimeout: NodeJS.Timeout | null = null;
    let isInitialized = false;
    let lastHeight = 0;
    let lastWrapperHeight = 0;
    let lastWrapperWidth = 0;
    
    const calculateHeight = () => {
      // 只使用 wrapper 的尺寸，不监听 grid 容器本身（避免滚动时触发）
      if (!wrapperRef.current) return;
      
      const grid = dataGridRef.current;
      if (!grid) return;
      
      const header = grid.querySelector('[data-slot="grid-header"]') as HTMLElement;
      const footer = grid.querySelector('[data-slot="grid-footer"]') as HTMLElement;
      
      if (!header) return;
      
      // 使用 wrapper 的可用高度，减去 header 和 footer
      const wrapperHeight = wrapperRef.current.clientHeight;
      
      // 如果 wrapper 高度为 0 或未初始化，跳过计算
      if (wrapperHeight <= 0) return;
      
      // 更新 wrapper 尺寸记录
      lastWrapperHeight = wrapperHeight;
      lastWrapperWidth = wrapperRef.current.clientWidth;
      
      const headerHeight = header.offsetHeight;
      const footerHeight = footer?.offsetHeight || 0;
      const availableHeight = wrapperHeight - headerHeight - footerHeight;
      
      // 只在高度确实变化时才更新，避免不必要的重渲染
      const newHeight = Math.max(400, availableHeight);
      
      // 如果高度变化小于 2px，忽略更新（避免滚动条出现/消失导致的微小变化）
      if (isInitialized && Math.abs(lastHeight - newHeight) < 2) {
        return;
      }
      
      lastHeight = newHeight;
      isInitialized = true;
      
      setCalculatedHeight((prev) => {
        // 如果高度变化小于 2px，忽略更新
        if (prev !== undefined && Math.abs(prev - newHeight) < 2) {
          return prev;
        }
        return newHeight;
      });
    };
    
    // 防抖的高度计算函数
    const debouncedCalculateHeight = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
          calculateHeight();
        });
      }, 150);
    };
    
    // 等待 DOM 完全渲染后再开始计算，使用稳定的延迟
    let initTimeout: NodeJS.Timeout;
    let initAttempts = 0;
    const maxInitAttempts = 3;
    
    const initialize = () => {
      initTimeout = setTimeout(() => {
        // 检查 wrapper 是否有有效高度
        if (wrapperRef.current && wrapperRef.current.clientHeight > 0) {
          calculateHeight();
          initAttempts = maxInitAttempts; // 如果成功，停止重试
        } else if (initAttempts < maxInitAttempts) {
          initAttempts++;
          initialize(); // 重试
        }
      }, initAttempts === 0 ? 100 : 150); // 第一次延迟稍短，后续更长
    };
    
    initialize();
    
    // 使用 ResizeObserver 只监听 wrapper 容器，不监听 grid 本身
    const resizeObserver = new ResizeObserver((entries) => {
      // 只响应 wrapper 的尺寸变化，忽略其他变化
      for (const entry of entries) {
        if (entry.target === wrapperRef.current) {
          const { width, height } = entry.contentRect;
          // 只有当尺寸真正变化时才触发计算（避免循环更新）
          if (width > 0 && height > 0) {
            // 检查是否是外部尺寸变化（不是我们自己的高度更新导致的）
            const widthChanged = Math.abs(width - lastWrapperWidth) >= 1;
            const heightChanged = Math.abs(height - lastWrapperHeight) >= 1;
            
            if (widthChanged || heightChanged) {
              lastWrapperWidth = width;
              lastWrapperHeight = height;
              debouncedCalculateHeight();
            }
          }
          break;
        }
      }
    });
    
    // 只监听 wrapper 容器
    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    // 额外监听 footer 高度变化（初次渲染时可能为 0），变化后重新计算
    const gridEl = dataGridRef.current as HTMLElement | null;
    const footerEl = gridEl?.querySelector('[data-slot="grid-footer"]') as HTMLElement | null;
    let footerResizeObserver: ResizeObserver | null = null;
    if (footerEl) {
      footerResizeObserver = new ResizeObserver(() => {
        debouncedCalculateHeight();
      });
      footerResizeObserver.observe(footerEl);
    }
    
    // 监听窗口 resize 事件，使用防抖
    const handleWindowResize = () => {
      debouncedCalculateHeight();
    };
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      clearTimeout(initTimeout);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
      if (footerResizeObserver) {
        footerResizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [height]);
  
  const actualHeight = height === 'auto' ? calculatedHeight : height;
  
  // 详细调试：检查实际数据状态
  // 减少日志输出：只在开发环境或调试模式下记录
  // React.useEffect(() => {
  //   const virtualIndexes = rowVirtualizer.getVirtualIndexes();
  //   const virtualItems = rowVirtualizer.getVirtualItems();
  //   console.log("[DataGrid] 渲染状态调试:", {
  //     rowVirtualizerCount: rowVirtualizer.options.count,
  //     virtualIndexes: virtualIndexes,
  //     virtualIndexesLength: virtualIndexes.length,
  //     virtualItems: virtualItems.map(item => ({ index: item.index, start: item.start, size: item.size })),
  //     virtualItemsLength: virtualItems.length,
  //     tableRowsCount: rows.length,
  //     tableRowIds: rows.map(r => r.id),
  //     tableState: {
  //       sorting: table.getState().sorting,
  //       columnOrder: table.getState().columnOrder,
  //       columnFilters: table.getState().columnFilters,
  //       globalFilter: table.getState().globalFilter,
  //     },
  //   });
  // }, [rows, rowVirtualizer, table]);

  const meta = table.options.meta;
  const rowHeight = meta?.rowHeight ?? "short";
  const focusedCell = meta?.focusedCell ?? null;

  // 拖动状态管理
  const [dragState, setDragState] = React.useState<{ 
    activeId: string | null; 
    overId: string | null;
    dragX: number | null;
  }>({
    activeId: null,
    overId: null,
    dragX: null,
  });

  // 添加列菜单状态
  const [isAddColumnMenuOpen, setIsAddColumnMenuOpen] = React.useState(false);
  const addColumnTriggerRef = React.useRef<HTMLDivElement>(null);

  const onGridContextMenu = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    [],
  );

  const onAddRowKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onRowAdd) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onRowAdd();
      }
    },
    [onRowAdd],
  );

  const handleAddColumnConfirm = React.useCallback(
    (payload: { type: string; name?: string; options?: any }) => {
      try {
        console.log('[DataGrid] handleAddColumnConfirm payload', payload);
      } catch {}
      onAddColumn?.(payload);
      setIsAddColumnMenuOpen(false);
    },
    [onAddColumn],
  );

  const handleAddColumnClick = React.useCallback(() => {
    if (onAddColumn) {
      setIsAddColumnMenuOpen(true);
    }
  }, [onAddColumn]);

  return (
    <div
      ref={wrapperRef}
      data-slot="grid-wrapper"
      className={cn("relative flex w-full flex-col", height === 'auto' ? "h-full" : "", className)}
      {...props}
    >
      {searchState && <DataGridSearch {...searchState} />}
      <DataGridContextMenu table={table} />
      <div
        role="grid"
        aria-label="Data grid"
        aria-rowcount={rows.length + (onRowAdd ? 1 : 0)}
        aria-colcount={columns.length + (onAddColumn ? 1 : 0)}
        data-slot="grid"
        tabIndex={0}
        ref={dataGridRef}
        className={cn(
          "relative grid select-none overflow-auto rounded-b-md border-t focus:outline-none",
          height === 'auto' ? "flex-1" : ""
        )}
        style={{
          ...columnSizeVars,
          ...(height !== 'auto' ? { height: `${height}px` } : {}),
        }}
        onContextMenu={onGridContextMenu}
      >
        <div
          role="rowgroup"
          data-slot="grid-header"
          ref={headerRef}
          className="sticky top-0 z-10 grid border-b bg-background"
        >
          {table.getHeaderGroups().map((headerGroup, rowIndex) => (
            <div
              key={headerGroup.id}
              role="row"
              aria-rowindex={rowIndex + 1}
              data-slot="grid-header-row"
              tabIndex={-1}
              className="flex w-full"
            >
              <DraggableColumnHeaders
                headers={headerGroup.headers}
                table={table}
                gridHeight={actualHeight || 600}
                headerElementRef={headerRef as React.RefObject<HTMLElement>}
                gridContainerRef={dataGridRef as React.RefObject<HTMLElement>}
                onDragStateChange={setDragState}
                onAddColumnClick={onAddColumn ? handleAddColumnClick : undefined}
                addColumnTriggerRef={addColumnTriggerRef as React.RefObject<HTMLDivElement>}
                onDeleteField={onDeleteField}
                onUpdateField={onUpdateField}
                getFieldInfo={getFieldInfo}
              />
            </div>
          ))}
        </div>
        <div
          role="rowgroup"
          data-slot="grid-body"
          className="relative grid"
          style={{
            ...(actualHeight !== undefined ? {
              minHeight: `${actualHeight}px`,
              height: `${Math.max(rowVirtualizer.getTotalSize(), actualHeight)}px`,
            } : typeof height === 'number' ? {
              minHeight: `${height}px`,
              height: `${Math.max(rowVirtualizer.getTotalSize(), height)}px`,
            } : {}),
          }}
        >
          {rowVirtualizer.getVirtualIndexes().map((virtualRowIndex) => {
            const row = rows[virtualRowIndex];
            if (!row) return null;

            return (
              <DataGridRow
                key={row.id}
                row={row}
                rowMapRef={rowMapRef}
                virtualRowIndex={virtualRowIndex}
                rowVirtualizer={rowVirtualizer}
                rowHeight={rowHeight}
                focusedCell={focusedCell}
                hasAddColumn={!!onAddColumn}
              />
            );
          })}
        </div>
        {/* 列高亮指示器 - 拖动时显示整个列的边线 */}
        {dragState.activeId && (() => {
          const headers = table.getHeaderGroups()[0]?.headers || [];
          const activeHeader = headers.find(h => h.column.id === dragState.activeId);
          if (!activeHeader) return null;

          // 基于拖动阴影的位置计算目标列和插入位置
          let targetColumnId: string | null = null;
          let highlightLeft = false;
          
          if (dragState.dragX !== null && dataGridRef?.current) {
            // 基于鼠标位置计算目标列
            const containerRect = dataGridRef.current.getBoundingClientRect();
            const scrollLeft = dataGridRef.current.scrollLeft;
            const relativeX = dragState.dragX - containerRect.left + scrollLeft;
            
            // 计算累计宽度，找到鼠标位置对应的列
            let cumulativeWidth = 0;
            for (let i = 0; i < headers.length; i++) {
              const header = headers[i];
              const columnWidth = header.column.getSize();
              const columnStart = cumulativeWidth;
              const columnEnd = cumulativeWidth + columnWidth;
              const columnCenter = cumulativeWidth + columnWidth / 2;
              
              if (relativeX >= columnStart && relativeX < columnEnd) {
                // 判断鼠标在列的前半部分还是后半部分
                if (relativeX <= columnCenter) {
                  // 鼠标在列的前半部分，插入到当前列之前，高亮当前列的左边线
                  targetColumnId = header.column.id;
                  highlightLeft = true;
                } else {
                  // 鼠标在列的后半部分，插入到当前列之后，高亮当前列的右边线
                  targetColumnId = header.column.id;
                  highlightLeft = false;
                }
                break;
              }
              cumulativeWidth += columnWidth;
            }
            
            // 如果没有找到目标列（可能在边界外），使用 overId 作为后备
            if (!targetColumnId && dragState.overId) {
              targetColumnId = dragState.overId;
              const activeIndex = headers.findIndex(h => h.column.id === dragState.activeId);
              const targetIndex = headers.findIndex(h => h.column.id === targetColumnId);
              highlightLeft = activeIndex !== -1 && activeIndex < targetIndex;
            }
          } else if (dragState.overId) {
            // 如果没有 dragX，回退到使用 overId
            targetColumnId = dragState.overId;
            const activeIndex = headers.findIndex(h => h.column.id === dragState.activeId);
            const targetIndex = headers.findIndex(h => h.column.id === dragState.overId);
            highlightLeft = activeIndex !== -1 && activeIndex < targetIndex;
          }

          // 如果没有目标列，不显示高亮
          if (!targetColumnId || targetColumnId === dragState.activeId) return null;

          const targetHeader = headers.find(h => h.column.id === targetColumnId);
          if (!targetHeader) return null;

          // 计算列的位置 - 使用 CSS 变量计算累计宽度
          let left = 0;
          for (let i = 0; i < headers.length; i++) {
            if (headers[i].column.id === targetColumnId) {
              if (highlightLeft) {
                // 高亮左边线，位置在列的开始位置
                break;
              } else {
                // 高亮右边线，位置在列的结束位置
                const columnSize = headers[i].column.getSize();
                left += columnSize;
                break;
              }
            }
            const columnSize = headers[i].column.getSize();
            left += columnSize;
          }

          return (
            <div
              key={`drag-highlight-${targetColumnId}-${highlightLeft}`}
              className="pointer-events-none absolute z-9998"
              style={{
                left: highlightLeft ? `${left - 0.5}px` : `${left - 0.5}px`,
                width: '1px',
                backgroundColor: '#8b5cf6', // 参考 aitable: interactionLineColorHighlight (violet-500)
                top: 0,
                height: `${height}px`,
              }}
            />
          );
        })()}
        {onRowAdd && (
          <div
            role="rowgroup"
            data-slot="grid-footer"
            ref={footerRef}
            className="sticky bottom-0 z-5 grid border-t bg-background"
          >
            <div
              role="row"
              aria-rowindex={rows.length + 2}
              data-slot="grid-add-row"
              tabIndex={-1}
              className="flex w-full"
            >
              <div
                role="gridcell"
                tabIndex={0}
                className="relative flex h-9 grow items-center bg-muted/30 transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                style={{
                  width: table.getTotalSize(),
                  minWidth: table.getTotalSize(),
                }}
                onClick={onRowAdd}
                onKeyDown={onAddRowKeyDown}
              >
                <div className="sticky left-0 flex items-center gap-2 px-3 text-muted-foreground">
                  <Plus className="size-3.5" />
                  <span className="text-sm">Add row</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {onAddColumn && (
        <AddColumnMenu
          isOpen={isAddColumnMenuOpen}
          onClose={() => setIsAddColumnMenuOpen(false)}
          onConfirm={handleAddColumnConfirm}
          triggerRef={addColumnTriggerRef}
        />
      )}
    </div>
  );
}
