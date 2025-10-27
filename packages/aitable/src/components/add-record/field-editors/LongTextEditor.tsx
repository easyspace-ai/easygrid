/**
 * 长文本编辑器（多行文本）
 */

import React, { useEffect, useRef } from 'react';
import { cn, tokens } from '../../../grid/design-system';
import type { FieldEditorProps } from '../types';

export function LongTextEditor({
  field,
  value,
  onChange,
  error,
  autoFocus,
}: FieldEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="w-full">
      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.description || `请输入${field.name}`}
        disabled={field.locked}
        rows={4}
        className={cn(
          'w-full px-3 py-2 rounded-md text-sm',
          'border transition-all resize-vertical',
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

