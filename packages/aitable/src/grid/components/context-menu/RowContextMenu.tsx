import { useState, useRef, useEffect } from 'react';
import type { ForwardRefRenderFunction } from 'react';
import { forwardRef, useImperativeHandle } from 'react';
import { calculateMenuPosition } from '../../utils/core/menu-position';

export interface IRowContextMenuRef {
  show: (position: { x: number; y: number }, rowIndex: number) => void;
  hide: () => void;
}

export interface IRowContextMenuProps {
  onDeleteRow?: (rowIndex: number) => void;
  onDuplicateRow?: (rowIndex: number) => void;
  onInsertRowAbove?: (rowIndex: number) => void;
  onInsertRowBelow?: (rowIndex: number) => void;
  onExpandRow?: (rowIndex: number) => void;
}

const RowContextMenuBase: ForwardRefRenderFunction<IRowContextMenuRef, IRowContextMenuProps> = (props, ref) => {
  const { 
    onDeleteRow, 
    onDuplicateRow,
    onInsertRowAbove,
    onInsertRowBelow,
    onExpandRow,
  } = props;
  
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rowIndex, setRowIndex] = useState(-1);
  const [computedPosition, setComputedPosition] = useState({ left: 0, top: 0, transformOrigin: 'top left' });
  const menuRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    show: (pos: { x: number; y: number }, rIndex: number) => {
      setPosition(pos);
      setRowIndex(rIndex);
      setIsVisible(true);
    },
    hide: () => {
      setIsVisible(false);
      setRowIndex(-1);
    },
  }));

  // 计算菜单位置（带边界检测）
  useEffect(() => {
    if (isVisible && menuRef.current) {
      const menuSize = {
        width: menuRef.current.offsetWidth || 160, // min-w-40 = 160px
        height: menuRef.current.offsetHeight || 200,
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
    onExpandRow && {
      label: '展开记录',
      icon: '🔍',
      onClick: () => handleAction(() => onExpandRow(rowIndex)),
    },
    onDuplicateRow && {
      label: '复制记录',
      icon: '📋',
      onClick: () => handleAction(() => onDuplicateRow(rowIndex)),
    },
    onInsertRowAbove && {
      label: '在上方插入',
      icon: '↑',
      onClick: () => handleAction(() => onInsertRowAbove(rowIndex)),
    },
    onInsertRowBelow && {
      label: '在下方插入',
      icon: '↓',
      onClick: () => handleAction(() => onInsertRowBelow(rowIndex)),
    },
    { type: 'divider' },
    onDeleteRow && {
      label: '删除记录',
      icon: '🗑',
      onClick: () => handleAction(() => onDeleteRow(rowIndex)),
      className: 'text-red-600 hover:bg-red-50',
    },
  ].filter(Boolean);

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
        minWidth: '160px',
        maxWidth: '220px',
        width: 'max-content',
        opacity: computedPosition.left === 0 && computedPosition.top === 0 ? 0 : 1,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item: any, index) => {
        if (item.type === 'divider') {
          return <div key={index} style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }} />;
        }
        return (
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
              whiteSpace: 'nowrap',
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
        );
      })}
    </div>
  );
};

export const RowContextMenu = forwardRef(RowContextMenuBase);



