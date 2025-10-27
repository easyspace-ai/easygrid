/**
 * GridToolbar - 现代化网格工具栏组件
 * 
 * 设计原则：
 * 1. 纯 Tailwind 实现，无内联样式
 * 2. Lucide 图标系统，告别 emoji
 * 3. 清晰的视觉分组和层次
 * 4. 完整的响应式设计
 * 5. 可访问性支持
 * 
 * 灵感来源: Linear, Notion, Airtable
 */

import React from 'react';
import { cn, tokens } from '../../design-system';
import { Button, IconButton } from '../../../ui/Button';
import { 
  Undo2, 
  Redo2, 
  Plus, 
  Settings, 
  Filter, 
  ArrowUpDown, 
  Group, 
  Search, 
  Maximize2, 
  Share2, 
  Code, 
  Users, 
  ChevronUp,
  type LucideIcon
} from 'lucide-react';

export interface IGridToolbarProps {
  // 历史操作
  onUndo?: () => void;
  onRedo?: () => void;
  
  // 数据操作
  onAddNew?: () => void;
  onFieldConfig?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  onGroup?: () => void;
  onSearch?: () => void;
  
  // 视图操作
  onFullscreen?: () => void;
  onShare?: () => void;
  onAPI?: () => void;
  onCollaboration?: () => void;
  
  // 工具栏控制
  onToggleToolbar?: () => void;
  onToggleStatistics?: () => void;
  
  // 状态
  canUndo?: boolean;
  canRedo?: boolean;
  isFullscreen?: boolean;
  
  // 响应式
  isMobile?: boolean;
  
  className?: string;
}

/**
 * 工具栏按钮组配置
 */
interface ToolbarGroup {
  id: string;
  label: string;
  buttons: ToolbarButton[];
  separator?: boolean;
}

interface ToolbarButton {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  tooltip?: string;
}

export const GridToolbar: React.FC<IGridToolbarProps> = ({
  onUndo,
  onRedo,
  onAddNew,
  onFieldConfig,
  onFilter,
  onSort,
  onGroup,
  onSearch,
  onFullscreen,
  onShare,
  onAPI,
  onCollaboration,
  onToggleToolbar,
  onToggleStatistics,
  canUndo = false,
  canRedo = false,
  isFullscreen = false,
  isMobile = false,
  className,
}) => {
  // 构建工具栏组
  const toolbarGroups: ToolbarGroup[] = [
    {
      id: 'history',
      label: '历史操作',
      buttons: [
        {
          id: 'undo',
          label: '撤销',
          icon: Undo2,
          onClick: onUndo,
          disabled: !canUndo,
          variant: 'ghost',
          tooltip: '撤销 (Ctrl+Z)',
        },
        {
          id: 'redo',
          label: '重做',
          icon: Redo2,
          onClick: onRedo,
          disabled: !canRedo,
          variant: 'ghost',
          tooltip: '重做 (Ctrl+Y)',
        },
      ],
    },
    {
      id: 'data',
      label: '数据操作',
      buttons: [
        {
          id: 'add',
          label: '添加记录',
          icon: Plus,
          onClick: onAddNew,
          variant: 'primary',
          tooltip: '添加新记录',
        },
        {
          id: 'field-config',
          label: '字段配置',
          icon: Settings,
          onClick: onFieldConfig,
          variant: 'secondary',
          tooltip: '配置字段显示和属性',
        },
      ],
      separator: true,
    },
    {
      id: 'view',
      label: '视图操作',
      buttons: [
        {
          id: 'filter',
          label: '筛选',
          icon: Filter,
          onClick: onFilter,
          variant: 'secondary',
          tooltip: '筛选数据',
        },
        {
          id: 'sort',
          label: '排序',
          icon: ArrowUpDown,
          onClick: onSort,
          variant: 'secondary',
          tooltip: '排序数据',
        },
        {
          id: 'group',
          label: '分组',
          icon: Group,
          onClick: onGroup,
          variant: 'secondary',
          tooltip: '分组数据',
        },
      ],
      separator: true,
    },
    {
      id: 'tools',
      label: '工具',
      buttons: [
        {
          id: 'search',
          label: '搜索',
          icon: Search,
          onClick: onSearch,
          variant: 'ghost',
          tooltip: '搜索数据',
        },
        {
          id: 'fullscreen',
          label: isFullscreen ? '退出全屏' : '全屏',
          icon: Maximize2,
          onClick: onFullscreen,
          variant: 'ghost',
          tooltip: isFullscreen ? '退出全屏' : '进入全屏',
        },
        {
          id: 'share',
          label: '分享',
          icon: Share2,
          onClick: onShare,
          variant: 'ghost',
          tooltip: '分享表格',
        },
        {
          id: 'api',
          label: 'API',
          icon: Code,
          onClick: onAPI,
          variant: 'ghost',
          tooltip: 'API 文档',
        },
        {
          id: 'collaboration',
          label: '协作',
          icon: Users,
          onClick: onCollaboration,
          variant: 'ghost',
          tooltip: '协作设置',
        },
      ],
      separator: true,
    },
    {
      id: 'controls',
      label: '控制',
      buttons: [
        {
          id: 'toggle-toolbar',
          label: '隐藏工具栏',
          icon: ChevronUp,
          onClick: onToggleToolbar,
          variant: 'ghost',
          tooltip: '隐藏工具栏',
        },
      ],
    },
  ];

  return (
    <div
      className={cn(
        // 基础布局
        'flex items-center justify-between',
        'px-4 py-2 border-b',
        
        // 尺寸
        isMobile ? 'h-12' : 'h-14',
        
        // 背景和边框
        'bg-white',
        
        // 自定义类名
        className
      )}
      style={{
        borderColor: tokens.colors.border.subtle,
        backgroundColor: tokens.colors.surface.base,
      }}
      role="toolbar"
      aria-label="网格工具栏"
    >
      {/* 左侧：主要操作组 */}
      <div className="flex items-center gap-1">
        {toolbarGroups.slice(0, 2).map((group, groupIndex) => (
          <React.Fragment key={group.id}>
            <div className="flex items-center gap-1">
              {group.buttons.map((button) => {
                const IconComponent = button.icon;
                return (
                  <IconButton
                    key={button.id}
                    icon={IconComponent}
                    size={isMobile ? 'sm' : 'md'}
                    variant={button.variant || 'ghost'}
                    onClick={button.onClick}
                    disabled={button.disabled}
                    className={cn(
                      'transition-all duration-200',
                      button.disabled && 'opacity-50 cursor-not-allowed',
                    )}
                    aria-label={button.tooltip || button.label}
                    title={button.tooltip || button.label}
                  />
                );
              })}
            </div>
            {group.separator && (
              <div
                className="w-px h-6 mx-2"
                style={{ backgroundColor: tokens.colors.border.subtle }}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 中间：视图操作组 */}
      {!isMobile && (
        <div className="flex items-center gap-1">
          {toolbarGroups[2].buttons.map((button) => {
            const IconComponent = button.icon;
            return (
              <Button
                key={button.id}
                icon={IconComponent}
                size="sm"
                variant={button.variant || 'secondary'}
                onClick={button.onClick}
                className="transition-all duration-200"
                aria-label={button.tooltip || button.label}
                title={button.tooltip || button.label}
              >
                {button.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* 右侧：工具和控制组 */}
      <div className="flex items-center gap-1">
        {/* 工具组 */}
        <div className="flex items-center gap-1">
          {toolbarGroups[3].buttons.map((button) => {
            const IconComponent = button.icon;
            return (
              <IconButton
                key={button.id}
                icon={IconComponent}
                size={isMobile ? 'sm' : 'md'}
                variant={button.variant || 'ghost'}
                onClick={button.onClick}
                className="transition-all duration-200"
                aria-label={button.tooltip || button.label}
                title={button.tooltip || button.label}
              />
            );
          })}
        </div>

        {/* 分隔线 */}
        <div
          className="w-px h-6 mx-2"
          style={{ backgroundColor: tokens.colors.border.subtle }}
          aria-hidden="true"
        />

        {/* 控制组 */}
        <div className="flex items-center gap-1">
          {toolbarGroups[4].buttons.map((button) => {
            const IconComponent = button.icon;
            return (
              <IconButton
                key={button.id}
                icon={IconComponent}
                size={isMobile ? 'sm' : 'md'}
                variant={button.variant || 'ghost'}
                onClick={button.onClick}
                className="transition-all duration-200"
                aria-label={button.tooltip || button.label}
                title={button.tooltip || button.label}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GridToolbar;