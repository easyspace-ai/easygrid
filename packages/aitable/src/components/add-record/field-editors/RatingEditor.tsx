/**
 * 评分编辑器（星级）
 */

import React from 'react';
import { cn } from '../../../grid/design-system';
import type { FieldEditorProps } from '../types';
import { Star } from 'lucide-react';

export function RatingEditor({
  field,
  value,
  onChange,
  error,
}: FieldEditorProps) {
  const max = field.options?.max || 5;
  const currentRating = typeof value === 'number' ? value : 0;

  const handleClick = (rating: number) => {
    if (field.locked) return;
    // 如果点击当前分数，则取消选择
    onChange(currentRating === rating ? 0 : rating);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((rating) => {
          const isFilled = rating <= currentRating;
          return (
            <button
              key={rating}
              type="button"
              onClick={() => handleClick(rating)}
              disabled={field.locked}
              className={cn(
                'p-1 rounded transition-all',
                'hover:scale-110 active:scale-95',
                field.locked && 'cursor-not-allowed opacity-50'
              )}
              aria-label={`评分 ${rating}`}
            >
              <Star
                size={24}
                className={cn(
                  'transition-all',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-none text-gray-300'
                )}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm text-gray-600">
          {currentRating > 0 ? `${currentRating} / ${max}` : '未评分'}
        </span>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

