import { useState, useRef, useEffect } from 'react';
import type { ForwardRefRenderFunction } from 'react';
import { forwardRef, useImperativeHandle } from 'react';
import { calculateMenuPosition } from '../../utils/core/menu-position';

export interface IColumnContextMenuRef {
  show: (position: { x: number; y: number }, columnIndex: number) => void;
  hide: () => void;
}

export interface IColumnContextMenuProps {
  onEditField?: (columnIndex: number) => void;
  onDuplicateField?: (columnIndex: number) => void;
  onInsertFieldLeft?: (columnIndex: number) => void;
  onInsertFieldRight?: (columnIndex: number) => void;
  onFilterByField?: (columnIndex: number) => void;
  onSortByField?: (columnIndex: number) => void;
  onGroupByField?: (columnIndex: number) => void;
  onFreezeToField?: (columnIndex: number) => void;
  onHideField?: (columnIndex: number) => void;
  onDeleteField?: (columnIndex: number) => void;
}

const ColumnContextMenuBase: ForwardRefRenderFunction<
  IColumnContextMenuRef,
  IColumnContextMenuProps
> = (props, ref) => {
  const {
    onEditField,
    onDuplicateField,
    onInsertFieldLeft,
    onInsertFieldRight,
    onFilterByField,
    onSortByField,
    onGroupByField,
    onFreezeToField,
    onHideField,
    onDeleteField,
  } = props;

  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [columnIndex, setColumnIndex] = useState(-1);
  const [computedPosition, setComputedPosition] = useState({ left: 0, top: 0, transformOrigin: 'top left' });
  const menuRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    show: (pos: { x: number; y: number }, colIndex: number) => {
      setPosition(pos);
      setColumnIndex(colIndex);
      setIsVisible(true);
    },
    hide: () => {
      setIsVisible(false);
      setColumnIndex(-1);
    },
  }));

  // 计算菜单位置（带边界检测）
  useEffect(() => {
    if (isVisible && menuRef.current) {
      const menuSize = {
        width: menuRef.current.offsetWidth || 192, // min-w-48 = 192px
        height: menuRef.current.offsetHeight || 400, // 估算高度
      };
      
      const computed = calculateMenuPosition(position, menuSize, {
        preferredPlacement: 'bottom-start',
        padding: 8,
      });
      
      
      setComputedPosition({
        left: computed.left,
        top: computed.top,
        transformOrigin: computed.transformOrigin || 'top left',
      });
    }
  }, [isVisible, position]);

  // 全局点击关闭菜单
  useEffect(() => {
    if (!isVisible) {return;}

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible]);

  const handleAction = (action: () => void) => {
    action();
    setIsVisible(false);
  };

  if (!isVisible) {return null;}

  const menuItems = [
    {
      label: '编辑字段',
      icon: '✓',
      onClick: () => handleAction(() => onEditField?.(columnIndex)),
    },
    {
      label: '复制字段',
      icon: '□',
      onClick: () => handleAction(() => onDuplicateField?.(columnIndex)),
    },
    {
      label: '← 在左侧插入字段',
      icon: '←',
      onClick: () => handleAction(() => onInsertFieldLeft?.(columnIndex)),
    },
    {
      label: '→ 在右侧插入字段',
      icon: '→',
      onClick: () => handleAction(() => onInsertFieldRight?.(columnIndex)),
    },
    {
      label: '按此字段筛选',
      icon: '🔍',
      onClick: () => handleAction(() => onFilterByField?.(columnIndex)),
    },
    {
      label: '↓↑ 按此字段排序',
      icon: '↓↑',
      onClick: () => handleAction(() => onSortByField?.(columnIndex)),
    },
    {
      label: '按此字段分组',
      icon: '≡',
      onClick: () => handleAction(() => onGroupByField?.(columnIndex)),
    },
    {
      label: '冻结至此字段',
      icon: '⊞',
      onClick: () => handleAction(() => onFreezeToField?.(columnIndex)),
    },
    {
      label: '隐藏字段',
      icon: '👁',
      onClick: () => handleAction(() => onHideField?.(columnIndex)),
    },
    {
      label: '删除字段',
      icon: '🗑',
      onClick: () => handleAction(() => onDeleteField?.(columnIndex)),
      className: 'text-red-600 hover:bg-red-50',
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        left: `${computedPosition.left}px`,
        top: `${computedPosition.top}px`,
        transformOrigin: computedPosition.transformOrigin,
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        padding: '4px 0',
        minWidth: '192px',
        maxWidth: '240px',  // 添加最大宽度限制
        width: 'max-content',  // 内容自适应宽度
        opacity: computedPosition.left === 0 && computedPosition.top === 0 ? 0 : 1,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => (
        <button
          key={index}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            textAlign: 'left',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',  // 防止文本换行
            color: item.className?.includes('red') ? '#dc2626' : '#374151',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = item.className?.includes('red') ? '#fef2f2' : '#f9fafb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onClick={item.onClick}
        >
          <span style={{ marginRight: '12px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
};

export const ColumnContextMenu = forwardRef(ColumnContextMenuBase);
