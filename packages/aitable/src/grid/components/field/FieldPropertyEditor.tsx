/**
 * Field Property Editor Component
 * 占位符实现 - 待完善
 */

import { forwardRef, useImperativeHandle, useState } from 'react';
import type { ForwardRefRenderFunction } from 'react';
import type { IGridColumn } from '../../types/grid';

export interface IFieldPropertyEditorRef {
  show: (column: IGridColumn, columnIndex: number, position?: { x: number; y: number; width?: number }) => void;
  hide: () => void;
}

export interface IFieldPropertyEditorProps {
  onSave?: (columnIndex: number, updatedColumn: IGridColumn) => void;
  onClose?: () => void;
  onCancel?: () => void;
}

const FieldPropertyEditorBase: ForwardRefRenderFunction<
  IFieldPropertyEditorRef,
  IFieldPropertyEditorProps
> = ({ onSave, onClose }, ref) => {
  const [visible, setVisible] = useState(false);
  const [currentColumn, setCurrentColumn] = useState<IGridColumn | null>(null);
  const [columnIndex, setColumnIndex] = useState<number>(-1);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 300 });
  const [name, setName] = useState('');

  useImperativeHandle(ref, () => ({
    show: (column, index, pos) => {
      setCurrentColumn(column);
      setColumnIndex(index);
      setName(column.name);
      if (pos) {
        setPosition({ x: pos.x, y: pos.y, width: pos.width || 300 });
      }
      setVisible(true);
    },
    hide: () => {
      setVisible(false);
      onClose?.();
    },
  }));

  if (!visible || !currentColumn) {return null;}

  const handleSave = () => {
    if (currentColumn) {
      onSave?.(columnIndex, {
        ...currentColumn,
        name,
      });
    }
    setVisible(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: position.width,
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000,
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
        编辑字段属性
      </h3>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          字段名称
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button
          onClick={() => setVisible(false)}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            background: '#1890ff',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
};

export const FieldPropertyEditor = forwardRef(FieldPropertyEditorBase);

