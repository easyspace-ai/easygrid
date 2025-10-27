/**
 * 多选编辑器（Checkbox 列表 + Chips）
 */

import React, { useState } from 'react';
import { cn, tokens } from '../../../grid/design-system';
import type { FieldEditorProps } from '../types';
import { X } from 'lucide-react';

export function MultiSelectEditor({
  field,
  value,
  onChange,
  error,
}: FieldEditorProps) {
  const choices = field.options?.choices || [];
  const selectedIds = Array.isArray(value) ? value : [];
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (choiceId: string) => {
    const newSelection = selectedIds.includes(choiceId)
      ? selectedIds.filter((id) => id !== choiceId)
      : [...selectedIds, choiceId];
    onChange(newSelection);
  };

  const handleRemove = (choiceId: string) => {
    onChange(selectedIds.filter((id) => id !== choiceId));
  };

  const selectedChoices = choices.filter((c) => selectedIds.includes(c.id));

  if (choices.length === 0) {
    return (
      <div className="w-full h-9 px-3 rounded-md text-sm flex items-center bg-gray-50 text-gray-500 border border-gray-300">
        暂无选项
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 已选中的 Chips */}
      {selectedChoices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedChoices.map((choice) => (
            <span
              key={choice.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
              style={{
                backgroundColor: choice.color ? `${choice.color}20` : '#dbeafe',
                color: choice.color || '#1e40af',
              }}
            >
              {choice.name}
              <button
                type="button"
                onClick={() => handleRemove(choice.id)}
                className="hover:bg-black/10 rounded p-0.5 transition-colors"
                disabled={field.locked}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 选择按钮 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={field.locked}
          className={cn(
            'w-full h-9 px-3 rounded-md text-sm text-left',
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
          {selectedChoices.length === 0 ? (
            <span className="text-gray-500">选择选项...</span>
          ) : (
            <span className="text-gray-700">已选 {selectedChoices.length} 项</span>
          )}
        </button>

        {/* 下拉选项 */}
        {isOpen && !field.locked && (
          <>
            {/* 背景遮罩 */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            {/* 选项列表 */}
            <div
              className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white shadow-lg border border-gray-200"
              style={{
                backgroundColor: tokens.colors.surface.base,
                borderColor: tokens.colors.border.default,
              }}
            >
              {choices.map((choice) => {
                const isSelected = selectedIds.includes(choice.id);
                return (
                  <label
                    key={choice.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isSelected ? '#f0f9ff' : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(choice.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">{choice.name}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

