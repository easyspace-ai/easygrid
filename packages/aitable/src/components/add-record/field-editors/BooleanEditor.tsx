/**
 * 布尔编辑器（开关/复选框）
 */

import React from 'react';
import { cn, tokens } from '../../../grid/design-system';
import type { FieldEditorProps } from '../types';

export function BooleanEditor({
  field,
  value,
  onChange,
  error,
}: FieldEditorProps) {
  const checked = Boolean(value);

  return (
    <div className="w-full flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={field.locked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full',
          'border-2 border-transparent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-blue-600' : 'bg-gray-200'
        )}
        style={{
          backgroundColor: checked
            ? '#3b82f6'
            : field.locked
            ? tokens.colors.surface.disabled
            : '#e5e7eb',
        }}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full',
            'bg-white shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      <span className="text-sm text-gray-700">
        {checked ? '已选中' : '未选中'}
      </span>
    </div>
  );
}

