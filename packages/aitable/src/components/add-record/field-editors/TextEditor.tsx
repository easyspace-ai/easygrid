/**
 * 文本编辑器（单行文本）
 */

import React, { useEffect, useRef } from 'react';
import { cn, tokens } from '../../../grid/design-system';
import type { FieldEditorProps } from '../types';

export function TextEditor({
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

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={field.description || `请输入${field.name}`}
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

