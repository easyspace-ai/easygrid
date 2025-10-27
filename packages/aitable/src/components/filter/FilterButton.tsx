/**
 * FilterButton - 过滤按钮组件
 * 
 * 设计原则：
 * 1. 显示当前过滤状态
 * 2. 直观的激活/非激活状态
 * 3. 过滤条件数量提示
 * 4. 流畅的交互体验
 */

import React from 'react';
import { cn, tokens } from '../../grid/design-system';
import { Button } from '../../ui/Button';
import { Filter, X } from 'lucide-react';
import type { FilterCondition } from './FilterDialog';

export interface FilterButtonProps {
  // 状态
  isActive: boolean;
  conditionCount: number;
  
  // 事件
  onClick: () => void;
  onClear?: () => void;
  
  // 样式
  variant?: 'default' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FilterButton({
  isActive,
  conditionCount,
  onClick,
  onClear,
  variant = 'default',
  size = 'md',
  className,
}: FilterButtonProps) {
  const hasConditions = conditionCount > 0;

  if (variant === 'compact') {
    return (
      <div className={cn('relative', className)}>
        <Button
          icon={Filter}
          variant={isActive ? 'primary' : 'secondary'}
          size={size}
          onClick={onClick}
          className={cn(
            'transition-all duration-200',
            isActive && 'shadow-md'
          )}
          aria-label={`筛选${hasConditions ? ` (${conditionCount} 个条件)` : ''}`}
        />
        
        {/* 条件数量徽章 */}
        {hasConditions && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: tokens.colors.primary[500],
              color: tokens.colors.text.inverse,
            }}
          >
            {conditionCount > 9 ? '9+' : conditionCount}
          </div>
        )}
        
        {/* 清除按钮 */}
        {hasConditions && onClear && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
              'bg-red-500 text-white text-xs hover:bg-red-600',
              'transition-colors duration-200'
            )}
            aria-label="清除筛选"
          >
            <X size={10} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        icon={Filter}
        variant={isActive ? 'primary' : 'secondary'}
        size={size}
        onClick={onClick}
        className={cn(
          'transition-all duration-200',
          isActive && 'shadow-md'
        )}
      >
        筛选
        </Button>
        
        {/* 条件数量徽章 */}
        {hasConditions && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: tokens.colors.primary[500],
              color: tokens.colors.text.inverse,
            }}
          >
            {conditionCount > 9 ? '9+' : conditionCount}
          </div>
        )}
    </div>
  );
}
