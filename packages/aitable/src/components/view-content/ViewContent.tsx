/**
 * ViewContent - 视图内容区域组件
 * 
 * 设计原则：
 * 1. 统一的状态处理（loading, empty, error, idle）
 * 2. 优雅的错误边界
 * 3. 流畅的状态切换动画
 */

import React from 'react';
import { cn, tokens } from '../../grid/design-system';
import { Grid } from '../../grid/core/Grid';
import { GridErrorBoundary } from '../../grid/error-handling/GridErrorBoundary';
import { LoadingState, EmptyState, ErrorState } from '../states';
import type { EmptyStateProps, ErrorStateProps } from '../states';
import type { IGridProps, IGridRef } from '../../grid/core/Grid';

export type ViewContentState = 'idle' | 'loading' | 'empty' | 'error';

export interface ViewContentProps {
  // 状态
  state?: ViewContentState;
  loadingMessage?: string;
  emptyStateProps?: EmptyStateProps;
  errorStateProps?: ErrorStateProps;
  
  // Grid 配置
  gridProps: IGridProps;
  gridRef?: React.RefObject<IGridRef>;
  
  // 行高
  rowHeight?: number;
  
  // Grid 回调
  onAddColumn?: (fieldType: any, insertIndex?: number, fieldName?: string, options?: any) => void;
  onEditColumn?: (columnIndex: number, updatedColumn: any) => void;
  onDeleteColumn?: (columnIndex: number) => void;
  onColumnResize?: (column: any, newSize: number, colIndex: number) => void;
  onColumnOrdered?: (dragColIndexCollection: number[], dropColIndex: number) => void;
  
  className?: string;
}

/**
 * ViewContent 组件
 */
export function ViewContent({
  state = 'idle',
  loadingMessage,
  emptyStateProps,
  errorStateProps,
  gridProps,
  gridRef,
  rowHeight,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onColumnResize,
  onColumnOrdered,
  className,
}: ViewContentProps) {
  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col', className)}
      role="main"
      aria-label="主内容区"
    >
      <div className="relative flex min-h-0 flex-1">
        {/* Loading 状态 */}
        {state === 'loading' && (
          <div 
            role="status" 
            aria-live="polite" 
            aria-label="正在加载"
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: tokens.colors.surface.base }}
          >
            <LoadingState message={loadingMessage} />
          </div>
        )}

        {/* Empty 状态 */}
        {state === 'empty' && (
          <div 
            role="status" 
            aria-live="polite" 
            aria-label="无数据"
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: tokens.colors.surface.base }}
          >
            <EmptyState {...emptyStateProps} />
          </div>
        )}

        {/* Error 状态 */}
        {state === 'error' && (
          <div 
            role="alert" 
            aria-live="assertive" 
            aria-label="发生错误"
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: tokens.colors.surface.base }}
          >
            <ErrorState {...errorStateProps} />
          </div>
        )}

        {/* Idle 状态 - 渲染 Grid */}
        {state === 'idle' && (
          <GridErrorBoundary>
            <Grid
              ref={gridRef}
              {...gridProps}
              rowHeight={rowHeight}
              onAddColumn={onAddColumn}
              onEditColumn={onEditColumn}
              onDeleteColumn={onDeleteColumn}
              onColumnResize={onColumnResize}
              onColumnOrdered={onColumnOrdered}
            />
          </GridErrorBoundary>
        )}
      </div>
    </div>
  );
}

