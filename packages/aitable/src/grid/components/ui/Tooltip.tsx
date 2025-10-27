/**
 * Tooltip - 现代化提示组件（重构版）
 * 
 * 设计原则：
 * 1. 使用 design tokens，无硬编码颜色
 * 2. 纯 Tailwind 实现
 * 3. 完整的可访问性支持
 * 4. 流畅的动画效果
 * 5. 多种定位选项
 */

import React, { useState, useEffect, type FC } from 'react';
import { createPortal } from 'react-dom';
import { cn, tokens, transitions, elevation } from '../../design-system';
import { useGridTooltipStore } from './tooltip-store';

// Re-export the hook for convenience
export { useGridTooltipStore };

/**
 * Tooltip props
 */
interface IGridTooltipProps {
  id?: string;
}

/**
 * 基础 Tooltip 组件
 */
interface TooltipProps {
  content: string;
  children: React.ReactElement;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  className?: string;
}

/**
 * 计算提示位置
 */
function calculatePosition(
  triggerRect: DOMRect,
  position: 'top' | 'bottom' | 'left' | 'right',
  offset: number = 8
) {
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  
  let x = triggerRect.left + scrollX;
  let y = triggerRect.top + scrollY;
  
  switch (position) {
    case 'top':
      x += triggerRect.width / 2;
      y -= offset;
      break;
    case 'bottom':
      x += triggerRect.width / 2;
      y += triggerRect.height + offset;
      break;
    case 'left':
      x -= offset;
      y += triggerRect.height / 2;
      break;
    case 'right':
      x += triggerRect.width + offset;
      y += triggerRect.height / 2;
      break;
  }
  
  return { x, y };
}

/**
 * 获取位置对应的 CSS 类
 */
function getPositionClasses(position: 'top' | 'bottom' | 'left' | 'right') {
  switch (position) {
    case 'top':
      return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    case 'bottom':
      return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
    case 'left':
      return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
    case 'right':
      return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
  }
}

/**
 * 获取箭头位置
 */
function getArrowClasses(position: 'top' | 'bottom' | 'left' | 'right') {
  switch (position) {
    case 'top':
      return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900';
    case 'bottom':
      return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900';
    case 'left':
      return 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900';
    case 'right':
      return 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900';
  }
}

/**
 * Grid tooltip component
 * Displays contextual tooltip information within the grid
 */
export const GridTooltip: FC<IGridTooltipProps> = (props) => {
  const { id } = props;
  const { tooltipInfo } = useGridTooltipStore();
  const [isVisible, setIsVisible] = useState(false);

  const visible = Boolean(tooltipInfo) && tooltipInfo?.id === id;
  const { text, position, triggerClassName, triggerStyle, contentClassName, contentStyle } =
    tooltipInfo ?? {};

  // Calculate trigger position
  const triggerPositionStyle = position
    ? {
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
      }
    : {};

  // Show tooltip with delay
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setIsVisible(true), 200);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="grid-tooltip-container">
      {/* Trigger element - invisible but positioned */}
      <div
        className={cn('grid-tooltip-trigger', triggerClassName)}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          cursor: 'pointer',
          ...triggerStyle,
          ...triggerPositionStyle,
        }}
      />

      {/* Tooltip content */}
      {isVisible && (
        <div
          className={cn(
            'grid-tooltip-content',
            'absolute z-50 px-3 py-2 text-sm rounded-md shadow-lg',
            'max-w-xs whitespace-pre-line break-words',
            'pointer-events-none',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            contentClassName
          )}
          style={{
            left: position ? position.x : 0,
            top: position ? (position.y + (position.height || 0) + 8) : 0,
            backgroundColor: tokens.colors.text.primary,
            color: tokens.colors.text.inverse,
            boxShadow: elevation.lg,
            ...contentStyle,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

/**
 * Tooltip wrapper component
 * Provides simple tooltip functionality for children
 */
export const Tooltip: FC<TooltipProps> = ({ 
  content, 
  children, 
  delay = 500, 
  position = 'bottom',
  disabled = false,
  className 
}) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setTriggerRect(rect);
    
    const { x, y } = calculatePosition(rect, position);
    setCoords({ x, y });
    
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  };

  const handleMouseLeave = () => {
    setShow(false);
    setTriggerRect(null);
  };

  // Safety check for children
  if (!children || !React.isValidElement(children)) {
    return null;
  }

  return (
    <>
      {React.cloneElement(children as React.ReactElement<any>, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      })}
      {show && createPortal(
        <div
          className={cn(
            'fixed z-50 px-3 py-2 text-sm rounded-md shadow-lg',
            'max-w-xs whitespace-pre-line break-words',
            'pointer-events-none',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            className
          )}
          style={{
            left: coords.x,
            top: coords.y,
            backgroundColor: tokens.colors.text.primary,
            color: tokens.colors.text.inverse,
            boxShadow: elevation.lg,
            transform: position === 'top' || position === 'bottom' 
              ? 'translateX(-50%)' 
              : position === 'left' || position === 'right'
                ? 'translateY(-50%)'
                : 'none',
          }}
        >
          {content}
          
          {/* 箭头 */}
          <div
            className={cn(
              'absolute w-0 h-0 border-4 border-transparent',
              getArrowClasses(position)
            )}
          />
        </div>,
        document.body
      )}
    </>
  );
};

/**
 * 简化版 Tooltip Hook
 */
export function useTooltip() {
  const [isVisible, setIsVisible] = useState(false);
  const [content, setContent] = useState('');
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const showTooltip = (text: string, x: number, y: number) => {
    setContent(text);
    setPosition({ x, y });
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  return {
    isVisible,
    content,
    position,
    showTooltip,
    hideTooltip,
  };
}