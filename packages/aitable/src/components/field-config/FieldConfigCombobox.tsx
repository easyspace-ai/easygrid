/**
 * FieldConfigCombobox - 字段配置下拉组件（重构版）
 * 
 * 设计原则：
 * 1. 基于统一的 Combobox 基类
 * 2. 真实图标替代 emoji
 * 3. 纯 Tailwind 实现
 * 4. 简化的交互逻辑
 * 5. 拖拽排序支持
 */

import React, { useState, useCallback } from 'react';
import { cn, tokens } from '../../grid/design-system';
import { Combobox, type ComboboxOption } from '../ui/Combobox';
import { 
  Eye, 
  EyeOff, 
  GripVertical, 
  MoreHorizontal, 
  Settings,
  Lock,
  Type,
  Hash,
  Circle,
  CheckSquare,
  Calendar,
  Paperclip,
  Mail,
  Phone,
  Link,
  Star,
  FunctionSquare,
  Search,
  Calculator,
  Clock,
  Edit3,
  UserPlus,
  UserCheck,
  FileText,
  type LucideIcon
} from 'lucide-react';
import { FieldContextMenu } from './FieldContextMenu';

export interface FieldConfig {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked?: boolean;
  required?: boolean;
  description?: string;
}

export interface FieldConfigComboboxProps {
  fields: FieldConfig[];
  onFieldToggle: (fieldId: string, visible: boolean) => void;
  onFieldReorder: (fromIndex: number, toIndex: number) => void;
  onFieldEdit: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldGroup: (fieldId: string) => void;
  onFieldCopy?: (fieldId: string) => void;
  onFieldInsertLeft?: (fieldId: string) => void;
  onFieldInsertRight?: (fieldId: string) => void;
  onFieldFilter?: (fieldId: string) => void;
  onFieldSort?: (fieldId: string) => void;
  onFieldFreeze?: (fieldId: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 字段类型图标映射
 */
const FIELD_TYPE_ICONS: Record<string, LucideIcon> = {
  text: Type,
  number: Hash,
  singleSelect: Circle,
  multipleSelect: CheckSquare,
  date: Calendar,
  attachment: Paperclip,
  checkbox: CheckSquare,
  email: Mail,
  phone: Phone,
  url: Link,
  rating: Star,
  formula: FunctionSquare,
  lookup: Search,
  rollup: Calculator,
  createdTime: Clock,
  lastModifiedTime: Edit3,
  createdBy: UserPlus,
  lastModifiedBy: UserCheck,
};

/**
 * 获取字段类型图标
 */
function getFieldIcon(type: string): LucideIcon {
  return FIELD_TYPE_ICONS[type] || FileText;
}

/**
 * 字段配置选项组件
 */
interface FieldOptionProps {
  field: FieldConfig;
  index: number;
  onToggle: (fieldId: string, visible: boolean) => void;
  onContextMenu: (fieldId: string, event: React.MouseEvent) => void;
  onDragStart: (index: number, event: React.DragEvent) => void;
  onDragEnd: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (index: number, event: React.DragEvent) => void;
  isDragging?: boolean;
}

function FieldOption({
  field,
  index,
  onToggle,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
}: FieldOptionProps) {
  const FieldIcon = getFieldIcon(field.type);
  
  return (
    <div
      draggable={!field.locked}
      onDragStart={(e) => onDragStart(index, e)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(index, e)}
      onContextMenu={(e) => !field.locked && onContextMenu(field.id, e)}
      className={cn(
        'flex items-center gap-3 px-3 py-2',
        'border-b border-gray-100 last:border-b-0',
        'transition-all duration-150',
        'hover:bg-gray-50',
        isDragging && 'opacity-50',
        field.locked && 'bg-gray-50'
      )}
      style={{
        borderBottomColor: tokens.colors.border.subtle,
      }}
    >
      {/* 拖拽手柄 */}
      {!field.locked && (
        <GripVertical 
          size={14} 
          className="text-gray-400 cursor-grab hover:text-gray-600 flex-shrink-0"
          style={{ color: tokens.colors.text.tertiary }}
        />
      )}

      {/* 锁定图标 */}
      {field.locked && (
        <Lock 
          size={14} 
          className="text-gray-400 flex-shrink-0"
          style={{ color: tokens.colors.text.tertiary }}
        />
      )}

      {/* 字段图标和名称 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FieldIcon 
          size={16} 
          className="text-gray-500 flex-shrink-0"
          style={{ color: tokens.colors.text.secondary }}
        />
        <div className="flex-1 min-w-0">
          <div 
            className={cn(
              'text-sm truncate',
              field.locked ? 'font-semibold' : 'font-medium'
            )}
            style={{ color: tokens.colors.text.primary }}
            title={field.name}
          >
            {field.name}
          </div>
          <div 
            className="text-xs truncate mt-0.5"
            style={{ color: tokens.colors.text.tertiary }}
          >
            {field.type}
          </div>
        </div>
      </div>

      {/* 显示/隐藏切换 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(field.id, !field.visible);
        }}
        className={cn(
          'p-1 rounded transition-colors duration-150',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
        )}
        style={{
          color: field.visible ? tokens.colors.text.primary : tokens.colors.text.tertiary,
        }}
        aria-label={field.visible ? '隐藏字段' : '显示字段'}
      >
        {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      {/* 更多操作菜单 */}
      {!field.locked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(field.id, e);
          }}
          className={cn(
            'p-1 rounded transition-colors duration-150',
            'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
          style={{ color: tokens.colors.text.secondary }}
          aria-label="更多操作"
        >
          <MoreHorizontal size={14} />
        </button>
      )}
    </div>
  );
}

export function FieldConfigCombobox({
  fields,
  onFieldToggle,
  onFieldReorder,
  onFieldEdit,
  onFieldDelete,
  onFieldGroup,
  onFieldCopy,
  onFieldInsertLeft,
  onFieldInsertRight,
  onFieldFilter,
  onFieldSort,
  onFieldFreeze,
  disabled = false,
  className,
}: FieldConfigComboboxProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // 拖拽开始
  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedIndex(null);
  }, []);

  // 拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // 放置
  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onFieldReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  }, [draggedIndex, onFieldReorder]);

  // 上下文菜单处理
  const handleContextMenu = useCallback((fieldId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenuPosition({
      x: rect.right,
      y: rect.top,
    });
    setShowContextMenu(fieldId);
  }, []);

  // 构建选项数据
  const options: ComboboxOption<FieldConfig>[] = fields.map(field => ({
    value: field,
    label: field.name,
    icon: getFieldIcon(field.type),
    disabled: field.locked,
    description: field.type,
  }));

  // 自定义渲染触发器
  const renderTrigger = useCallback(() => (
    <div className="flex items-center gap-2">
      <Settings size={14} />
      <span>字段配置</span>
    </div>
  ), []);

  // 自定义渲染选项
  const renderOption = useCallback((option: ComboboxOption<FieldConfig>, isSelected: boolean) => (
    <FieldOption
      field={option.value}
      index={fields.findIndex(f => f.id === option.value.id)}
      onToggle={onFieldToggle}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      isDragging={draggedIndex === fields.findIndex(f => f.id === option.value.id)}
    />
  ), [fields, onFieldToggle, handleContextMenu, handleDragStart, handleDragEnd, handleDragOver, handleDrop, draggedIndex]);

  return (
    <div className={cn('relative', className)}>
      <Combobox
        value={null}
        onChange={() => {}} // 不需要选择，只是展示
        options={options}
        placeholder="字段配置"
        disabled={disabled}
        size="sm"
        variant="default"
        searchable
        renderTrigger={renderTrigger}
        renderOption={renderOption}
        className="min-w-[120px]"
      />

      {/* 上下文菜单 */}
      <FieldContextMenu
        isOpen={!!showContextMenu}
        position={contextMenuPosition}
        fieldId={showContextMenu || ''}
        fieldName={fields.find(f => f.id === showContextMenu)?.name || ''}
        onClose={() => setShowContextMenu(null)}
        onEdit={onFieldEdit}
        onCopy={onFieldCopy || (() => {})}
        onInsertLeft={onFieldInsertLeft || (() => {})}
        onInsertRight={onFieldInsertRight || (() => {})}
        onFilter={onFieldFilter || (() => {})}
        onSort={onFieldSort || (() => {})}
        onGroup={onFieldGroup}
        onFreeze={onFieldFreeze || (() => {})}
        onToggleVisibility={(fieldId) => {
          const field = fields.find(f => f.id === fieldId);
          if (field) {
            onFieldToggle(fieldId, !field.visible);
          }
        }}
        onDelete={onFieldDelete}
        fieldVisible={fields.find(f => f.id === showContextMenu)?.visible}
        fieldLocked={fields.find(f => f.id === showContextMenu)?.locked}
      />
    </div>
  );
}