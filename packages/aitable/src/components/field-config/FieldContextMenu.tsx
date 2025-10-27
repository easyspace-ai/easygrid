import React from 'react';
import { cn, tokens, elevation } from '../../grid/design-system';
import { 
  Edit3,
  Copy,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Layout,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Grid3X3,
  Filter,
  Layers
} from 'lucide-react';

export interface FieldContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  fieldId: string;
  fieldName: string;
  onClose: () => void;
  onEdit: (fieldId: string) => void;
  onCopy: (fieldId: string) => void;
  onInsertLeft: (fieldId: string) => void;
  onInsertRight: (fieldId: string) => void;
  onFilter: (fieldId: string) => void;
  onSort: (fieldId: string) => void;
  onGroup: (fieldId: string) => void;
  onFreeze: (fieldId: string) => void;
  onToggleVisibility: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  fieldVisible?: boolean;
  fieldLocked?: boolean;
}

export function FieldContextMenu({
  isOpen,
  position,
  fieldId,
  fieldName,
  onClose,
  onEdit,
  onCopy,
  onInsertLeft,
  onInsertRight,
  onFilter,
  onSort,
  onGroup,
  onFreeze,
  onToggleVisibility,
  onDelete,
  fieldVisible = true,
  fieldLocked = false,
}: FieldContextMenuProps) {
  if (!isOpen || !position) {
    return null;
  }

  const menuItems = [
    {
      id: 'edit',
      label: '编辑字段',
      icon: Edit3,
      onClick: () => onEdit(fieldId),
      primary: true,
      disabled: false,
    },
    {
      id: 'copy',
      label: '复制字段',
      icon: Copy,
      onClick: () => onCopy(fieldId),
      disabled: false,
    },
    {
      id: 'insert-left',
      label: '在左侧插入字段',
      icon: ChevronLeft,
      onClick: () => onInsertLeft(fieldId),
      disabled: false,
    },
    {
      id: 'insert-right',
      label: '在右侧插入字段',
      icon: ChevronRight,
      onClick: () => onInsertRight(fieldId),
      disabled: false,
    },
    {
      id: 'filter',
      label: '按此字段筛选',
      icon: Filter,
      onClick: () => onFilter(fieldId),
      disabled: false,
    },
    {
      id: 'sort',
      label: '按此字段排序',
      icon: ArrowUpDown,
      onClick: () => onSort(fieldId),
      disabled: false,
    },
    {
      id: 'group',
      label: '按此字段分组',
      icon: Layers,
      onClick: () => onGroup(fieldId),
      disabled: false,
    },
    {
      id: 'freeze',
      label: '冻结至此字段',
      icon: Grid3X3,
      onClick: () => onFreeze(fieldId),
      disabled: false,
    },
    {
      id: 'toggle-visibility',
      label: fieldVisible ? '隐藏字段' : '显示字段',
      icon: fieldVisible ? EyeOff : Eye,
      onClick: () => onToggleVisibility(fieldId),
      disabled: fieldLocked,
    },
    {
      id: 'delete',
      label: '删除字段',
      icon: Trash2,
      onClick: () => onDelete(fieldId),
      destructive: true,
      disabled: fieldLocked,
    },
  ];

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* 菜单内容 */}
      <div
        className="absolute bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
        style={{
          left: position.x,
          top: position.y,
          backgroundColor: tokens.colors.surface.base,
          borderColor: tokens.colors.border.subtle,
          boxShadow: elevation.lg,
          minWidth: '180px',
        }}
      >
        {/* 菜单标题 */}
        <div
          className="px-3 py-2 border-b border-gray-100 mb-1"
          style={{ borderBottomColor: tokens.colors.border.subtle }}
        >
          <div className="text-xs font-medium text-gray-500" style={{ color: tokens.colors.text.secondary }}>
            字段操作
          </div>
          <div className="text-sm font-medium text-gray-900 truncate" style={{ color: tokens.colors.text.primary }}>
            {fieldName}
          </div>
        </div>

        {/* 菜单项 */}
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onClose();
                }
              }}
              disabled={item.disabled}
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-colors duration-150',
                'focus:outline-none',
                item.disabled 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : item.destructive
                    ? 'text-red-600 hover:bg-red-50'
                    : item.primary
                      ? 'text-blue-600 hover:bg-blue-50 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
              )}
              style={{
                color: item.disabled 
                  ? tokens.colors.text.disabled
                  : item.destructive
                    ? tokens.colors.text.error
                    : item.primary
                      ? tokens.colors.text.accent
                      : tokens.colors.text.primary,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  e.currentTarget.style.backgroundColor = item.destructive
                    ? tokens.colors.surface.destructive
                    : item.primary
                      ? tokens.colors.surface.selected
                      : tokens.colors.surface.hover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <IconComponent 
                size={16} 
                className={cn(
                  item.disabled && 'opacity-50'
                )}
              />
              <span className="flex-1">{item.label}</span>
              
              {/* 主操作项添加勾选图标 */}
              {item.primary && (
                <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                  <div className="w-2 h-2 bg-current rounded-full" />
                </div>
              )}
            </button>
          );
        })}

        {/* 锁定字段提示 */}
        {fieldLocked && (
          <div
            className="px-3 py-2 border-t border-gray-100 mt-1"
            style={{ borderTopColor: tokens.colors.border.subtle }}
          >
            <div className="flex items-center gap-2 text-xs text-gray-500" style={{ color: tokens.colors.text.tertiary }}>
              <Lock size={12} />
              <span>主键字段，部分操作不可用</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
