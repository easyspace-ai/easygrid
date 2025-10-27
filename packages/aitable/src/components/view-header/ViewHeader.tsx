/**
 * ViewHeader - 视图头部组件（重构版）
 * 
 * 设计原则：
 * 1. 现代化标签设计（底部指示条，非浮起效果）
 * 2. 流畅的动画和交互反馈
 * 3. 真实图标系统
 * 4. 8px 网格对齐
 * 5. 纯 Tailwind，无内联样式
 * 
 * 灵感来源: Linear, Notion, Airtable
 */

import React, { useState, useCallback } from 'react';
import { cn, tokens } from '../../grid/design-system';
import { Plus } from 'lucide-react';
import { CreateViewMenu } from './CreateViewMenu';
import { ViewTab } from './ViewTab';
import { IconButton } from '../../ui/Button';

// ==================== 类型定义 ====================

export interface Tab {
  key: string;
  label: string;
}

export interface View {
  id: string;
  name: string;
  type?: string;
}

export interface ViewHeaderProps {
  // 静态标签模式
  tabs?: Tab[];
  activeTabKey?: string;
  onTabChange?: (tabKey: string) => void;
  
  // 动态视图模式
  views?: View[];
  activeViewId?: string;
  onViewChange?: (viewId: string) => void;
  onCreateView?: (viewType: string) => void;
  onRenameView?: (viewId: string, newName: string) => void;
  onDeleteView?: (viewId: string) => void;
  
  // 右侧操作按钮
  onAdd?: () => void;
  
  // 响应式
  isMobile?: boolean;
  isTouch?: boolean;
  
  className?: string;
}

// ==================== 主组件 ====================

/**
 * ViewHeader 主组件
 */
export function ViewHeader({
  tabs,
  activeTabKey,
  onTabChange,
  views,
  activeViewId,
  onViewChange,
  onCreateView,
  onRenameView,
  onDeleteView,
  onAdd,
  isMobile = false,
  isTouch = false,
  className,
}: ViewHeaderProps) {
  const [showCreateViewMenu, setShowCreateViewMenu] = useState(false);

  // 处理标签切换
  const handleTabChange = useCallback((key: string) => {
    onTabChange?.(key);
  }, [onTabChange]);

  // 处理视图切换
  const handleViewChange = useCallback((viewId: string) => {
    onViewChange?.(viewId);
  }, [onViewChange]);

  // 处理创建视图
  const handleCreateView = useCallback((viewType: string) => {
    onCreateView?.(viewType);
    setShowCreateViewMenu(false);
  }, [onCreateView]);

  // 使用动态视图或静态标签
  const useViews = !!(views && views.length > 0);

  return (
    <div
      className={cn(
        // 布局
        'flex items-center justify-between',
        'relative',
        
        // 尺寸 - 8px 网格
        isMobile ? 'h-12 px-3' : 'h-14 px-4',
        
        // 底部边框
        'border-b',
        
        // 自定义类
        className
      )}
      style={{
        backgroundColor: tokens.colors.surface.base,
        borderColor: tokens.colors.border.subtle,
      }}
      role="banner"
    >
      {/* 左侧标签栏 */}
      <div 
        role="tablist" 
        className={cn(
          'flex items-center',
          // 标签间距 4px
          'gap-1',
        )}
      >
        {useViews ? (
          // 动态视图模式
          <>
            {views.map((view) => (
              <ViewTab
                key={view.id}
                id={view.id}
                label={view.name}
                type={view.type}
                active={activeViewId === view.id}
                onClick={() => handleViewChange(view.id)}
                onRename={onRenameView ? (id) => {
                  // 触发重命名回调
                  onRenameView(id, view.name);
                } : undefined}
                onDelete={onDeleteView ? (id) => {
                  onDeleteView(id);
                } : undefined}
                isMobile={isMobile}
                isTouch={isTouch}
              />
            ))}
          </>
        ) : (
          // 静态标签模式
          <>
            {tabs?.map((tab) => (
              <ViewTab
                key={tab.key}
                id={tab.key}
                label={tab.label}
                active={activeTabKey === tab.key}
                onClick={() => handleTabChange(tab.key)}
                isMobile={isMobile}
                isTouch={isTouch}
              />
            ))}
          </>
        )}

        {/* 添加视图按钮 */}
        {onCreateView && (
          <div className="relative ml-1">
            <IconButton
              icon={Plus}
              variant="ghost"
              size={isMobile ? 'sm' : 'sm'}
              onClick={() => setShowCreateViewMenu(!showCreateViewMenu)}
              className={cn(
                'transition-all duration-200',
                showCreateViewMenu && 'bg-gray-100 rotate-45',
              )}
              aria-label="添加视图"
              title="添加视图"
            />
            
            {/* 创建视图下拉菜单 */}
            {showCreateViewMenu && (
              <CreateViewMenu
                onSelect={handleCreateView}
                onClose={() => setShowCreateViewMenu(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* 右侧操作区域 */}
      {onAdd && (
        <div className="flex items-center gap-2">
          <IconButton
            icon={Plus}
            variant="primary"
            size={isMobile ? 'sm' : 'md'}
            onClick={onAdd}
            className={cn(
              'rounded-lg shadow-sm',
              'hover:shadow-md',
              'transition-all duration-200',
            )}
            aria-label="添加新项"
            title="添加新项"
          />
        </div>
      )}
    </div>
  );
}

export default ViewHeader;
