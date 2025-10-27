/**
 * CreateViewMenu - 创建视图下拉菜单（重构版）
 * 
 * 设计原则：
 * 1. 渐变图标底色（视觉惊艳）
 * 2. Hover 时微妙位移（交互反馈）
 * 3. 清晰的分类标签
 * 4. 流畅的进场动画
 */

import React, { useEffect, useRef } from 'react';
import { cn, tokens } from '../../grid/design-system';
import { ALL_VIEW_TYPES } from './viewTypeIcons';

export interface CreateViewMenuProps {
  onSelect: (viewType: string) => void;
  onClose: () => void;
}

export function CreateViewMenu({ onSelect, onClose }: CreateViewMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-[998]"
        style={{ backgroundColor: 'transparent' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 菜单内容 */}
      <div
        ref={menuRef}
        onKeyDown={handleKeyDown}
        className={cn(
          'absolute top-full left-0 mt-2',
          'bg-white rounded-xl border shadow-xl',
          'py-2 min-w-[240px]',
          'z-[999]',
          'animate-in fade-in-0 slide-in-from-top-2 duration-200',
        )}
        style={{
          backgroundColor: tokens.colors.surface.base,
          borderColor: tokens.colors.border.subtle,
          boxShadow: tokens.elevation.xl,
        }}
        role="menu"
        aria-label="创建视图类型"
      >
        {/* 标题 */}
        <div
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
          style={{
            color: tokens.colors.text.secondary,
          }}
        >
          选择视图类型
        </div>

        {/* 分隔线 */}
        <div 
          className="mx-2 my-1 h-px" 
          style={{ backgroundColor: tokens.colors.border.subtle }}
        />

        {/* 视图类型选项 */}
        <div className="px-1">
          {ALL_VIEW_TYPES.map((viewType) => {
            const IconComponent = viewType.icon;
            return (
              <button
                key={viewType.type}
                onClick={() => onSelect(viewType.type)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'text-sm text-left',
                  'transition-all duration-200 ease-out',
                  'hover:bg-gray-50 hover:translate-x-0.5',
                  'focus:outline-none focus:bg-gray-50',
                  'group',
                )}
                style={{
                  color: tokens.colors.text.primary,
                }}
                role="menuitem"
              >
                {/* 图标容器 - 渐变背景 */}
                <div
                  className={cn(
                    'flex-shrink-0 flex items-center justify-center',
                    'w-9 h-9 rounded-lg',
                    'bg-gradient-to-br',
                    viewType.gradient,
                    'transition-all duration-200',
                    'group-hover:scale-110 group-hover:shadow-md',
                  )}
                >
                  <IconComponent 
                    size={18} 
                    className="text-white"
                    strokeWidth={2}
                  />
                </div>

                {/* 名称和描述 */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {viewType.name}
                  </div>
                  <div 
                    className="text-xs truncate mt-0.5"
                    style={{ color: tokens.colors.text.secondary }}
                  >
                    {getViewTypeDescription(viewType.type)}
                  </div>
                </div>

                {/* Hover 箭头指示 */}
                <div
                  className={cn(
                    'flex-shrink-0 w-0 opacity-0',
                    'transition-all duration-200',
                    'group-hover:w-4 group-hover:opacity-100',
                  )}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ color: tokens.colors.text.secondary }}
                  >
                    <path
                      d="M6 4L10 8L6 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div 
          className="mx-2 mt-2 pt-2 border-t"
          style={{ borderColor: tokens.colors.border.subtle }}
        >
          <div
            className="px-2 py-1.5 text-xs text-center"
            style={{ color: tokens.colors.text.tertiary }}
          >
            更多视图类型即将推出
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * 获取视图类型描述
 */
function getViewTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    grid: '经典表格，强大灵活',
    kanban: '看板拖拽，可视化工作流',
    calendar: '时间视图，日程管理',
    gantt: '甘特图，项目进度跟踪',
    gallery: '卡片展示，图片预览',
    form: '表单收集，数据录入',
    list: '简洁列表，快速浏览',
  };
  return descriptions[type] || '高效的数据视图';
}
