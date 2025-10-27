/**
 * 日期编辑器
 */

import React, { useEffect, useRef } from 'react';
import { cn, tokens } from '../../../grid/design-system';
import type { FieldEditorProps } from '../types';
import { format } from 'date-fns';

export function DateEditor({
  field,
  value,
  onChange,
  error,
  autoFocus,
  onEnter,
}: FieldEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  // 将值转换为 input[type=date] 需要的格式 (YYYY-MM-DD)
  const inputValue = value
    ? value instanceof Date
      ? format(value, 'yyyy-MM-dd')
      : typeof value === 'string'
      ? value.split('T')[0]
      : ''
    : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      onChange(dateStr); // 保存为 ISO 字符串或 Date 对象
    } else {
      onChange(null);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="date"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={field.locked}
        className={cn(
          'w-full h-9 px-3 rounded-md text-sm',
          'border transition-all',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200',
          field.locked && 'bg-gray-50 cursor-not-allowed'
        )}
        style={{
          backgroundColor: field.locked ? tokens.colors.surface.disabled : tokens.colors.surface.base,
          borderColor: error ? '#fca5a5' : tokens.colors.border.default,
        }}
      />
    </div>
  );
}

