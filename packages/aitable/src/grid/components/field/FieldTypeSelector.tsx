/**
 * Field Type Selector Component
 * 占位符实现 - 待完善
 */

import { forwardRef, useImperativeHandle, useState } from 'react';
import type { ForwardRefRenderFunction } from 'react';

export type IFieldType =
  | 'text'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'multipleSelect'
  | 'date'
  | 'dateTime'
  | 'user'
  | 'attachment'
  | 'link'
  | 'formula'
  | 'rollup'
  | 'rating'
  | 'autoNumber'
  | 'createdTime'
  | 'lastModifiedTime'
  | 'createdBy'
  | 'lastModifiedBy';

export interface IFieldTypeSelectorRef {
  show: (position: { x: number; y: number }) => void;
  hide: () => void;
}

export interface IFieldTypeSelectorProps {
  onSelect?: (fieldType: IFieldType) => void;
  onClose?: () => void;
  onCancel?: () => void;
}

const FieldTypeSelectorBase: ForwardRefRenderFunction<
  IFieldTypeSelectorRef,
  IFieldTypeSelectorProps
> = ({ onSelect, onClose }, ref) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    show: (pos) => {
      setPosition(pos);
      setVisible(true);
    },
    hide: () => {
      setVisible(false);
      onClose?.();
    },
  }));

  if (!visible) {return null;}

  const fieldTypes: Array<{ type: IFieldType; label: string; icon: string }> = [
    { type: 'text', label: '单行文本', icon: '📝' },
    { type: 'number', label: '数字', icon: '🔢' },
    { type: 'checkbox', label: '复选框', icon: '☑️' },
    { type: 'select', label: '单选', icon: '🔘' },
    { type: 'multipleSelect', label: '多选', icon: '☑️' },
    { type: 'date', label: '日期', icon: '📅' },
    { type: 'user', label: '用户', icon: '👤' },
    { type: 'attachment', label: '附件', icon: '📎' },
    { type: 'link', label: '关联', icon: '🔗' },
    { type: 'rating', label: '评分', icon: '⭐' },
  ];

  const handleSelect = (type: IFieldType) => {
    onSelect?.(type);
    setVisible(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 10000,
      }}
    >
      {fieldTypes.map(({ type, label, icon }) => (
        <div
          key={type}
          onClick={() => handleSelect(type)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
};

export const FieldTypeSelector = forwardRef(FieldTypeSelectorBase);

