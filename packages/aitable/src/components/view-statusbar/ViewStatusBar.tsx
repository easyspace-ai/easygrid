/**
 * ViewStatusBar - 视图状态栏组件
 * 
 * 设计原则：
 * 1. 清晰的信息展示
 * 2. 响应式布局
 * 3. 可扩展的自定义内容
 */

import React from 'react';
import { cn, tokens } from '../../grid/design-system';

export interface ViewStatusBarProps {
  // 记录数量
  recordCount?: number;
  
  // 自定义内容
  children?: React.ReactNode;
  
  // 响应式
  isMobile?: boolean;
  
  className?: string;
}

/**
 * ViewStatusBar 组件
 */
export function ViewStatusBar({
  recordCount = 0,
  children,
  isMobile = false,
  className,
}: ViewStatusBarProps) {
  return (
    <div
      className={cn(
        'border-t flex items-center',
        isMobile 
          ? 'h-9 px-2 text-xs flex-col gap-1 justify-center' 
          : 'h-10 px-4 text-sm justify-between',
        className
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
      {/* 记录数量 */}
      <div 
        aria-label={`共 ${recordCount} 条记录`}
        className="flex items-center gap-2"
      >
        <span className="font-medium">共 {recordCount} 条记录</span>
      </div>

      {/* 自定义内容 */}
      {!isMobile && children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

