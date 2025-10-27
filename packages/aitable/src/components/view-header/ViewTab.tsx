/**
 * ViewTab - 现代化标签组件
 * 
 * 设计原则：
 * 1. 底部指示条而非浮起效果（Linear/Notion 风格）
 * 2. 真实图标替代彩色方块
 * 3. 流畅的 hover/active 动画
 * 4. 8px 网格对齐，优雅间距
 */

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn, tokens } from '../../grid/design-system';
import { MoreVertical, type LucideIcon } from 'lucide-react';
import { getViewTypeIcon } from './viewTypeIcons';

export interface ViewTabProps {
  id: string;
  label: string;
  type?: string;
  active: boolean;
  onClick: () => void;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  isMobile?: boolean;
  isTouch?: boolean;
}

export function ViewTab({ 
  id, 
  label, 
  type,
  active, 
  onClick, 
  onRename, 
  onDelete, 
  isMobile, 
  isTouch 
}: ViewTabProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuAnchorRef = useRef<HTMLDivElement | null>(null);

  // 获取视图图标
  const ViewIcon = getViewTypeIcon(type);

  return (
    <div
      role="tab"
      aria-selected={active}
      data-state={active ? 'active' : 'inactive'}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setMenuOpen(false);
      }}
      className={cn(
        // 基础样式
        'relative group cursor-pointer select-none',
        
        // 尺寸 - 8px 网格对齐
        isMobile ? 'h-8 px-2' : 'h-9 px-3',
        
        // 最小宽度
        isMobile ? 'min-w-[64px]' : 'min-w-[80px]',
        
        // 移动端触摸优化
        isTouch && 'min-h-[44px]',
      )}
    >
      {/* 主内容 */}
      <button
        onClick={onClick}
        className={cn(
          // 布局
          'relative z-10 flex items-center justify-center gap-2',
          'w-full h-full rounded-md',
          
          // 文字样式
          'font-medium whitespace-nowrap',
          isMobile ? 'text-xs' : 'text-sm',
          
          // 颜色 - 未选中
          !active && 'text-gray-600',
          
          // 颜色 - 选中
          active && 'text-blue-700',
          
          // 背景 - 未选中
          !active && 'bg-transparent',
          
          // 背景 - hover
          !active && isHovering && 'bg-gray-50',
          
          // 背景 - 选中
          active && 'bg-blue-50',
          
          // 动画
          'transition-all duration-200 ease-out',
          
          // Hover 放大
          !active && isHovering && 'scale-[1.02]',
          
          // Active 缩小
          'active:scale-[0.98]',
          
          // Focus 样式
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        )}
      >
        {/* 图标 */}
        <ViewIcon
          size={isMobile ? 14 : 16}
          className={cn(
            'flex-shrink-0 transition-colors duration-200',
            !active && 'text-gray-400',
            active && 'text-blue-600',
            isHovering && !active && 'text-gray-600',
          )}
        />
        
        {/* 标签文字 */}
        <span className="truncate">{label}</span>
        
        {/* 菜单按钮 */}
        {(onRename || onDelete) && (
          <div
            ref={menuAnchorRef}
            onClick={(e) => {
              e.stopPropagation();
              const rect = menuAnchorRef.current?.getBoundingClientRect();
              if (rect) {
                const width = 160;
                setMenuPos({ 
                  top: rect.bottom + 6, 
                  left: Math.max(8, rect.right - width) 
                });
              }
              setMenuOpen((v) => !v);
            }}
            className={cn(
              'flex-shrink-0 p-0.5 rounded',
              'transition-all duration-200',
              'hover:bg-gray-200/50',
              menuOpen && 'rotate-90',
            )}
            aria-label="更多操作"
            title="更多操作"
          >
            <MoreVertical 
              size={14} 
              className={cn(
                'transition-colors duration-200',
                !active && 'text-gray-400',
                active && 'text-blue-600',
              )}
            />
          </div>
        )}
      </button>

      {/* 底部指示条 - 只在选中时显示 */}
      {active && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5',
            'bg-gradient-to-r from-blue-500 to-blue-600',
            'rounded-full',
            'transition-all duration-300 ease-out',
            'animate-in slide-in-from-bottom-1',
          )}
          style={{
            marginLeft: isMobile ? '4px' : '8px',
            marginRight: isMobile ? '4px' : '8px',
          }}
        />
      )}

      {/* 下拉菜单 */}
      {menuOpen && menuPos && createPortal(
        <div
          className={cn(
            'fixed z-[9999]',
            'min-w-[160px] rounded-lg border bg-white shadow-xl',
            'py-1',
            'animate-in fade-in-0 slide-in-from-top-2 duration-150',
          )}
          style={{
            top: menuPos.top,
            left: menuPos.left,
            borderColor: tokens.colors.border.subtle,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onRename && (
            <button
              className={cn(
                'w-full px-3 py-2 text-left text-sm',
                'text-gray-700',
                'transition-colors duration-150',
                'hover:bg-gray-50',
                'focus:outline-none focus:bg-gray-50',
              )}
              onClick={() => {
                setMenuOpen(false);
                onRename(id);
              }}
            >
              重命名
            </button>
          )}
          {onDelete && (
            <button
              className={cn(
                'w-full px-3 py-2 text-left text-sm',
                'text-red-600',
                'transition-colors duration-150',
                'hover:bg-red-50',
                'focus:outline-none focus:bg-red-50',
              )}
              onClick={() => {
                setMenuOpen(false);
                onDelete(id);
              }}
            >
              删除
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

