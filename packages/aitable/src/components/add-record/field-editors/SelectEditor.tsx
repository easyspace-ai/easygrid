/**
 * 单选编辑器（下拉选择）
 */

import React, { useEffect, useRef } from 'react';
import { cn, tokens } from '../../../grid/design-system';
import type { FieldEditorProps } from '../types';
import { ChevronDown } from 'lucide-react';

export function SelectEditor({
  field,
  value,
  onChange,
  error,
  autoFocus,
  onEnter,
}: FieldEditorProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const choices = field.options?.choices || [];

  useEffect(() => {
    if (autoFocus && selectRef.current) {
      selectRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  // 如果没有选项，显示提示
  if (choices.length === 0) {
    return (
      <div className="w-full h-9 px-3 rounded-md text-sm flex items-center bg-gray-50 text-gray-500 border border-gray-300">
        暂无选项
      </div>
    );
  }

  return (
    <div className="w-full relative">
      <select
        ref={selectRef}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        onKeyDown={handleKeyDown}
        disabled={field.locked}
        className={cn(
          'w-full h-9 pl-3 pr-8 rounded-md text-sm appearance-none',
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
      >
        <option value="">-- 请选择 --</option>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
      />
    </div>
  );
}

