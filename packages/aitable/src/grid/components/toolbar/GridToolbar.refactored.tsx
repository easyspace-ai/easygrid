/**
 * GridToolbar - 重构版本
 * 
 * 设计原则：
 * 1. ✅ 使用真实图标（lucide-react）
 * 2. ✅ 基于设计系统（Design Tokens）
 * 3. ✅ 完整的交互状态（hover, active, focus）
 * 4. ✅ 流畅的动画过渡
 * 5. ✅ 语义化的分组和间距
 * 6. ✅ 无障碍支持（keyboard navigation, ARIA）
 */

import React from 'react';
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
  Code2,
  Users,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { tokens, cn } from '../../design-system';

export interface IGridToolbarProps {
  onFieldConfig?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  onGroup?: () => void;
  onSearch?: () => void;
  onFullscreen?: () => void;
  onShare?: () => void;
  onAPI?: () => void;
  onCollaboration?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddNew?: () => void;
  onToggleToolbar?: () => void;
  onToggleStatistics?: () => void;
  
  // 新增：状态控制
  undoDisabled?: boolean;
  redoDisabled?: boolean;
  className?: string;
  showStatistics?: boolean;
  // 布局：默认 between（原样），可选 left 统一左对齐
  align?: 'left' | 'between';
}

/**
 * 工具栏按钮组件 - 统一样式
 */
interface ToolbarButtonProps {
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'ghost';
  className?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  icon,
  label,
  disabled = false,
  variant = 'default',
  className,
}) => {
  const baseStyles = cn(
    // 基础样式
    'inline-flex items-center justify-center gap-2',
    'h-8 px-3 rounded-md',
    'text-sm font-medium',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    
    // 变体样式
    variant === 'default' && [
      'bg-white border border-gray-200',
      'text-gray-700 hover:text-gray-900',
      'hover:bg-gray-50 hover:border-gray-300',
      'active:bg-gray-100',
      'focus-visible:ring-blue-500',
    ],
    
    variant === 'primary' && [
      'bg-blue-500 border border-blue-600',
      'text-white',
      'hover:bg-blue-600 hover:border-blue-700',
      'active:bg-blue-700',
      'focus-visible:ring-blue-300',
      'shadow-sm hover:shadow',
    ],
    
    variant === 'ghost' && [
      'bg-transparent border-0',
      'text-gray-600 hover:text-gray-900',
      'hover:bg-gray-100',
      'active:bg-gray-200',
      'focus-visible:ring-gray-300',
    ],
    
    // 禁用状态
    disabled && [
      'opacity-50 cursor-not-allowed',
      'hover:bg-white hover:border-gray-200',
    ],
    
    className
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseStyles}
      title={label}
      aria-label={label}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
};

/**
 * 图标按钮 - 仅显示图标
 */
interface IconButtonProps {
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
  active?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  icon,
  label,
  disabled = false,
  active = false,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        // 基础样式
        'inline-flex items-center justify-center',
        'w-8 h-8 rounded-md',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        
        // 默认状态
        'text-gray-600 hover:text-gray-900',
        'hover:bg-gray-100',
        'active:bg-gray-200',
        
        // 激活状态
        active && 'bg-blue-50 text-blue-600 hover:bg-blue-100',
        
        // 禁用状态
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        
        className
      )}
    >
      {icon}
    </button>
  );
};

/**
 * 文本按钮 - 带文字标签
 */
interface TextButtonProps {
  onClick?: () => void;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}

const TextButton: React.FC<TextButtonProps> = ({
  onClick,
  label,
  icon,
  disabled = false,
  active = false,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // 基础样式
        'inline-flex items-center gap-2',
        'h-8 px-3 rounded-md',
        'text-sm font-medium',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        
        // 默认状态
        'bg-white border border-gray-200',
        'text-gray-700 hover:text-gray-900',
        'hover:bg-gray-50 hover:border-gray-300',
        'active:bg-gray-100',
        
        // 激活状态
        active && [
          'bg-blue-50 border-blue-200',
          'text-blue-700 hover:text-blue-900',
          'hover:bg-blue-100',
        ],
        
        // 禁用状态
        disabled && 'opacity-50 cursor-not-allowed hover:bg-white',
        
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
};

/**
 * 分隔线
 */
const Divider: React.FC = () => (
  <div className="w-px h-6 bg-gray-200" aria-hidden="true" />
);

/**
 * 主工具栏组件
 */
export const GridToolbar: React.FC<IGridToolbarProps> = (props) => {
  const {
    onFieldConfig,
    onFilter,
    onSort,
    onGroup,
    onSearch,
    onFullscreen,
    onShare,
    onAPI,
    onCollaboration,
    onUndo,
    onRedo,
    onAddNew,
    onToggleToolbar,
    onToggleStatistics,
    undoDisabled = false,
    redoDisabled = false,
    showStatistics = false,
    className,
    align = 'between',
  } = props;

  const iconSize = tokens.iconSizes.sm;

  return (
    <div
      className={cn(
        // 基础布局
        'flex items-center',
        align === 'between' ? 'justify-between' : 'justify-start gap-3',
        'w-full h-12 px-4',
        'bg-white border-b border-gray-200',
        'select-none',
        className
      )}
      role="toolbar"
      aria-label="Grid Toolbar"
    >
      {/* 左侧：历史控制 + 新增 */}
      <div className="flex items-center gap-2" role="group" aria-label="History and Add">
        <IconButton
          onClick={onUndo}
          icon={<Undo2 size={iconSize} />}
          label="撤销 (Ctrl+Z)"
          disabled={undoDisabled}
        />
        <IconButton
          onClick={onRedo}
          icon={<Redo2 size={iconSize} />}
          label="重做 (Ctrl+Shift+Z)"
          disabled={redoDisabled}
        />
        
        <Divider />
        
        <ToolbarButton
          onClick={onAddNew}
          icon={<Plus size={iconSize} />}
          label="新增记录 (Ctrl+N)"
          variant="primary"
        />
      </div>

      {/* 中间：视图控制 */}
      <div className="flex items-center gap-2" role="group" aria-label="View Controls">
        <TextButton
          onClick={onFieldConfig}
          icon={<Settings size={iconSize} />}
          label="字段配置"
        />
        <TextButton
          onClick={onFilter}
          icon={<Filter size={iconSize} />}
          label="筛选"
        />
        <TextButton
          onClick={onSort}
          icon={<ArrowUpDown size={iconSize} />}
          label="排序"
        />
        <TextButton
          onClick={onGroup}
          icon={<Group size={iconSize} />}
          label="分组"
        />
      </div>

      {/* 右侧：工具图标 */}
      <div className="flex items-center gap-2" role="group" aria-label="Utilities">
        <IconButton
          onClick={onSearch}
          icon={<Search size={iconSize} />}
          label="搜索 (Ctrl+F)"
        />
        
        <Divider />
        
        <IconButton
          onClick={onToggleStatistics}
          icon={<BarChart3 size={iconSize} />}
          label="统计信息"
          active={showStatistics}
        />
        <IconButton
          onClick={onFullscreen}
          icon={<Maximize2 size={iconSize} />}
          label="全屏 (F11)"
        />
        
        <Divider />
        
        <IconButton
          onClick={onShare}
          icon={<Share2 size={iconSize} />}
          label="分享"
        />
        <IconButton
          onClick={onAPI}
          icon={<Code2 size={iconSize} />}
          label="API 文档"
        />
        <IconButton
          onClick={onCollaboration}
          icon={<Users size={iconSize} />}
          label="协作者"
        />
        
        <Divider />
        
        <IconButton
          onClick={onToggleToolbar}
          icon={<ChevronUp size={iconSize} />}
          label="隐藏工具栏"
        />
      </div>
    </div>
  );
};

/**
 * 导出默认组件（保持向后兼容）
 */
export default GridToolbar;

