/**
 * SelectEditor - 重构版本
 * 
 * 优化点：
 * 1. ✅ 移除内联 hover 事件操作 style
 * 2. ✅ 使用 CSS :hover 和 Tailwind
 * 3. ✅ 键盘导航的视觉反馈
 * 4. ✅ 流畅的动画过渡
 * 5. ✅ 使用设计系统
 */

import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef } from 'react';
import Fuse from 'fuse.js';
import { Check, Search as SearchIcon } from 'lucide-react';
import type { ISelectCell, IMultiSelectCell } from '../../../renderers/cell-renderer/interface';
import type { IEditorRef } from '../EditorContainer';
import { tokens, cn } from '../../../design-system';

export interface ISelectEditorProps {
  cell: ISelectCell | IMultiSelectCell;
  rect?: { x: number; y: number; width: number; height: number };
  theme?: any;
  style?: React.CSSProperties;
  isEditing?: boolean;
  setEditing?: (editing: boolean) => void;
  onChange: (value: any) => void;
}

/**
 * 选项项组件
 */
interface OptionItemProps {
  option: {
    id: string;
    name: string;
    color?: string;
    backgroundColor?: string;
  };
  isSelected: boolean;
  isMultiple: boolean;
  isDisabled: boolean;
  isFocused: boolean;
  onClick: () => void;
}

const OptionItem: React.FC<OptionItemProps> = ({
  option,
  isSelected,
  isMultiple,
  isDisabled,
  isFocused,
  onClick,
}) => {
  return (
    <div
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        // 基础样式
        'flex items-center gap-2',
        'px-3 py-2 rounded-md',
        'text-sm transition-all duration-150 ease-out',
        
        // 光标
        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
        
        // 选中状态
        isSelected && [
          'bg-blue-50 text-blue-700',
          'hover:bg-blue-100',
        ],
        
        // 未选中状态
        !isSelected && [
          'text-gray-700',
          'hover:bg-gray-50',
        ],
        
        // Focus 状态（键盘导航）
        isFocused && 'ring-2 ring-blue-500 ring-offset-1',
        
        // 禁用状态
        isDisabled && 'opacity-50',
      )}
      role="option"
      aria-selected={isSelected}
    >
      {/* 多选：Checkbox */}
      {isMultiple && (
        <div
          className={cn(
            'flex items-center justify-center',
            'w-4 h-4 rounded border-2 transition-colors',
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'bg-white border-gray-300'
          )}
        >
          {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
        </div>
      )}

      {/* 颜色指示器 */}
      {option.color && (
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: option.color }}
          aria-hidden="true"
        />
      )}

      {/* 选项名称 */}
      <span className="flex-1 truncate">{option.name}</span>
      
      {/* 单选：Checkmark */}
      {!isMultiple && isSelected && (
        <Check size={16} className="text-blue-600 flex-shrink-0" strokeWidth={2.5} />
      )}
    </div>
  );
};

/**
 * SelectEditor 主组件
 */
const SelectEditorBase: React.ForwardRefRenderFunction<
  IEditorRef<ISelectCell | IMultiSelectCell>,
  ISelectEditorProps
> = (props, ref) => {
  const { cell, style, isEditing, setEditing, onChange, rect } = props;
  const { data, isMultiple, choiceSorted = [], choiceMap = {}, readonly } = cell;

  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 转换选项格式
  const options = useMemo(() => {
    return choiceSorted.map((choice: any) => ({
      id: choice.id || choice.name,
      name: choice.name,
      color: choice.color,
      backgroundColor: choice.backgroundColor,
    }));
  }, [choiceSorted]);

  // Fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(options, {
        keys: ['name'],
        threshold: 0.3,
        includeScore: true,
      }),
    [options]
  );

  // 过滤选项
  const filteredOptions = useMemo(() => {
    if (!searchQuery) {return options;}
    return fuse.search(searchQuery).map((result) => result.item);
  }, [options, fuse, searchQuery]);

  // 获取选中值
  const selectedValues = useMemo(() => {
    if (!data) {return [];}
    if (!Array.isArray(data)) {return [data];}
    return data.map((item: any) => {
      if (typeof item === 'string') {return item;}
      return item.title || item.id || item.name;
    });
  }, [data]);

  // 检查是否选中
  const isSelected = useCallback(
    (optionId: string) => selectedValues.includes(optionId),
    [selectedValues]
  );

  // Ref API
  React.useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    setValue: () => {},
    saveValue: () => {},
  }));

  // 处理选择
  const handleSelect = useCallback(
    (optionId: string) => {
      if (readonly) {return;}

      if (isMultiple) {
        const newValue = isSelected(optionId)
          ? selectedValues.filter((id) => id !== optionId)
          : [...selectedValues, optionId];
        onChange(newValue);
      } else {
        onChange([optionId]);
        setEditing?.(false);
      }
    },
    [readonly, isMultiple, isSelected, selectedValues, onChange, setEditing]
  );

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[focusedIndex]) {
            handleSelect(filteredOptions[focusedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setEditing?.(false);
          break;
      }
    },
    [filteredOptions, focusedIndex, handleSelect, setEditing]
  );

  // 计算弹窗位置
  const popupStyle = useMemo(() => {
    if (!rect) {return {};}

    const baseStyle = {
      left: rect.x,
      top: rect.y + rect.height + 4,
    };

    const viewportHeight = window.innerHeight;
    const maxDropdownHeight = 320;

    if (baseStyle.top + maxDropdownHeight > viewportHeight) {
      return {
        left: rect.x,
        top: rect.y - maxDropdownHeight - 4,
      };
    }

    return baseStyle;
  }, [rect]);

  // 自动聚焦
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  // 滚动到焦点项
  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      focusedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  // 点击外部关闭
  useEffect(() => {
    if (!isEditing) {return;}

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.select-editor-popup')) {
        setEditing?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, setEditing]);

  if (!isEditing) {return null;}

  return (
    <div
      className={cn(
        'select-editor-popup',
        'fixed z-[1500]',
        'flex flex-col gap-2',
        'min-w-[220px] max-w-[320px]',
        'p-2',
        'bg-white rounded-lg border border-gray-200',
        'shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-200',
      )}
      style={{
        ...popupStyle,
        ...style,
      }}
      role="listbox"
      aria-label="Select options"
    >
      {/* 搜索框 */}
      <div className="relative">
        <SearchIcon
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索选项..."
          disabled={readonly}
          className={cn(
            'w-full h-8 pl-8 pr-3',
            'text-sm',
            'bg-white border border-gray-200 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-150',
            'placeholder:text-gray-400',
            readonly && 'bg-gray-50 cursor-not-allowed',
          )}
        />
      </div>

      {/* 选项列表 */}
      <div
        ref={listRef}
        className="max-h-[240px] overflow-y-auto px-1 py-1 -mx-1 space-y-0.5"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: `${tokens.colors.border.default} transparent`,
        }}
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => (
            <OptionItem
              key={option.id}
              option={option}
              isSelected={isSelected(option.id)}
              isMultiple={isMultiple}
              isDisabled={readonly}
              isFocused={index === focusedIndex}
              onClick={() => handleSelect(option.id)}
            />
          ))
        ) : (
          <div className="px-3 py-8 text-center text-sm text-gray-400">
            未找到匹配的选项
          </div>
        )}
      </div>

      {/* 多选底部操作栏 */}
      {isMultiple && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            已选 {selectedValues.length} 项
          </span>
          <button
            onClick={() => setEditing?.(false)}
            disabled={readonly}
            className={cn(
              'px-3 py-1.5 text-sm font-medium',
              'bg-blue-500 text-white rounded-md',
              'hover:bg-blue-600 active:bg-blue-700',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              readonly && 'opacity-50 cursor-not-allowed',
            )}
          >
            确定
          </button>
        </div>
      )}
    </div>
  );
};

export const SelectEditor = forwardRef(SelectEditorBase);

