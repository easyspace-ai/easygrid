/**
 * 链接编辑器（URL）
 */

import React, { useEffect, useRef } from 'react';
import { cn, tokens } from '../../../grid/design-system';
import type { FieldEditorProps } from '../types';
import { Link as LinkIcon } from 'lucide-react';

export function LinkEditor({
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
      <div className="relative">
        <LinkIcon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          disabled={field.locked}
          className={cn(
            'w-full h-9 pl-9 pr-3 rounded-md text-sm',
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
    </div>
  );
}

