/**
 * Combobox - 统一的下拉选择组件基类
 * 
 * 设计原则：
 * 1. 统一的下拉交互模式
 * 2. 完整的键盘导航支持
 * 3. 可访问性优化
 * 4. 纯 Tailwind 实现
 * 5. 高度可定制
 */

import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { cn, tokens, transitions, elevation } from '../../grid/design-system';
import { ChevronDown, Check, type LucideIcon } from 'lucide-react';

export interface ComboboxOption<T = any> {
  value: T;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  description?: string;
}

export interface ComboboxProps<T = any> {
  // 基础属性
  value?: T;
  onChange?: (value: T) => void;
  options: ComboboxOption<T>[];
  
  // 显示配置
  placeholder?: string;
  label?: string;
  description?: string;
  
  // 状态
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  
  // 样式
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
  
  // 行为
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  
  // 位置
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  
  // 自定义渲染
  renderTrigger?: (option: ComboboxOption<T> | null, isOpen: boolean) => React.ReactNode;
  renderOption?: (option: ComboboxOption<T>, isSelected: boolean) => React.ReactNode;
  
  // 事件
  onOpen?: () => void;
  onClose?: () => void;
  onSearch?: (query: string) => void;
}

/**
 * 尺寸样式配置
 */
const sizeStyles = {
  sm: {
    trigger: 'h-8 px-2 text-xs',
    option: 'px-2 py-1.5 text-xs',
    icon: 12,
  },
  md: {
    trigger: 'h-9 px-3 text-sm',
    option: 'px-3 py-2 text-sm',
    icon: 14,
  },
  lg: {
    trigger: 'h-10 px-4 text-base',
    option: 'px-4 py-2.5 text-base',
    icon: 16,
  },
};

/**
 * 变体样式配置
 */
const variantStyles = {
  default: {
    trigger: 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400',
    focus: 'border-blue-500 ring-2 ring-blue-500/20',
  },
  ghost: {
    trigger: 'bg-transparent border-transparent text-gray-700 hover:bg-gray-100',
    focus: 'border-gray-300 ring-2 ring-gray-500/20',
  },
  outline: {
    trigger: 'bg-transparent border-gray-300 text-gray-900 hover:bg-gray-50',
    focus: 'border-blue-500 ring-2 ring-blue-500/20',
  },
};

export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(
  <T,>({
    value,
    onChange,
    options,
    placeholder = '请选择...',
    label,
    description,
    disabled = false,
    loading = false,
    error,
    size = 'md',
    variant = 'default',
    className,
    searchable = false,
    clearable = false,
    multiple = false,
    placement = 'bottom-start',
    renderTrigger,
    renderOption,
    onOpen,
    onClose,
    onSearch,
  }: ComboboxProps<T>, ref: React.Ref<HTMLButtonElement>) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    
    const sizeStyle = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    
    // 获取当前选中的选项
    const selectedOption = options.find(option => option.value === value) || null;
    
    // 过滤选项
    const filteredOptions = searchable && searchQuery
      ? options.filter(option => 
          option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;
    
    // 点击外部关闭
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearchQuery('');
          setFocusedIndex(-1);
          onClose?.();
        }
      };
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen, onClose]);
    
    // 键盘导航
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
          onOpen?.();
        }
        return;
      }
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          setFocusedIndex(-1);
          onClose?.();
          triggerRef.current?.focus();
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
          
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            const option = filteredOptions[focusedIndex];
            if (!option.disabled) {
              onChange?.(option.value);
              setIsOpen(false);
              setSearchQuery('');
              setFocusedIndex(-1);
              onClose?.();
            }
          }
          break;
          
        case 'Tab':
          setIsOpen(false);
          setSearchQuery('');
          setFocusedIndex(-1);
          onClose?.();
          break;
      }
    }, [isOpen, filteredOptions, focusedIndex, onChange, onOpen, onClose]);
    
    // 选择选项
    const handleSelect = useCallback((option: ComboboxOption<T>) => {
      if (option.disabled) return;
      
      onChange?.(option.value);
      setIsOpen(false);
      setSearchQuery('');
      setFocusedIndex(-1);
      onClose?.();
    }, [onChange, onClose]);
    
    // 清除选择
    const handleClear = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(undefined as T);
    }, [onChange]);
    
    // 搜索处理
    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      setFocusedIndex(-1);
      onSearch?.(query);
    }, [onSearch]);
    
    // 计算下拉位置
    const getDropdownPosition = useCallback(() => {
      if (!triggerRef.current) return { top: 0, left: 0 };
      
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      let top = rect.bottom + scrollTop + 4;
      let left = rect.left + scrollLeft;
      
      if (placement.includes('top')) {
        top = rect.top + scrollTop - 4;
      }
      
      if (placement.includes('end')) {
        left = rect.right + scrollLeft;
      }
      
      return { top, left };
    }, [placement]);
    
    const dropdownPosition = getDropdownPosition();
    
    return (
      <div className={cn('relative', className)}>
        {/* 标签 */}
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        {/* 触发器 */}
        <button
          ref={ref || triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled && !loading) {
              setIsOpen(!isOpen);
              if (!isOpen) {
                onOpen?.();
                setTimeout(() => searchRef.current?.focus(), 0);
              } else {
                onClose?.();
              }
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            // 基础样式
            'flex items-center justify-between',
            'border rounded-md',
            'transition-all duration-200',
            'focus:outline-none',
            
            // 尺寸
            sizeStyle.trigger,
            
            // 变体样式
            variantStyle.trigger,
            
            // 状态样式
            disabled && 'opacity-50 cursor-not-allowed',
            loading && 'opacity-75 cursor-wait',
            error && 'border-red-500',
            isOpen && variantStyle.focus,
            
            // 自定义样式
            className
          )}
          style={{
            borderColor: error ? tokens.colors.border.error : undefined,
          }}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label || placeholder}
        >
          {/* 左侧内容 */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedOption?.icon && (
              <selectedOption.icon 
                size={sizeStyle.icon} 
                className="flex-shrink-0 text-gray-500"
              />
            )}
            <span className={cn(
              'truncate',
              !selectedOption && 'text-gray-500'
            )}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          
          {/* 右侧图标 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {clearable && selectedOption && (
              <button
                onClick={handleClear}
                className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                aria-label="清除选择"
              >
                <svg width={sizeStyle.icon} height={sizeStyle.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <ChevronDown 
              size={sizeStyle.icon} 
              className={cn(
                'text-gray-400 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>
        
        {/* 描述文本 */}
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
        
        {/* 错误信息 */}
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
        
        {/* 下拉面板 */}
        {isOpen && createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              'absolute z-50',
              'bg-white border rounded-lg shadow-lg',
              'w-64 max-h-60 overflow-hidden',
              'animate-in fade-in-0 slide-in-from-top-2 duration-200'
            )}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              borderColor: tokens.colors.border.subtle,
              boxShadow: elevation.lg,
            }}
            onKeyDown={handleKeyDown}
            role="listbox"
            aria-label={label || '选项列表'}
          >
            {/* 搜索框 */}
            {searchable && (
              <div className="p-2 border-b" style={{ borderColor: tokens.colors.border.subtle }}>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="搜索..."
                  className={cn(
                    'w-full px-2 py-1 text-sm border rounded',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                    'border-gray-300'
                  )}
                />
              </div>
            )}
            
            {/* 选项列表 */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  {searchQuery ? '未找到匹配项' : '暂无选项'}
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  const isFocused = index === focusedIndex;
                  
                  return (
                    <button
                      key={String(option.value)}
                      onClick={() => handleSelect(option)}
                      disabled={option.disabled}
                      className={cn(
                        'w-full flex items-center gap-2 text-left',
                        'transition-colors duration-150',
                        sizeStyle.option,
                        'hover:bg-gray-50 focus:bg-gray-50',
                        'focus:outline-none',
                        isFocused && 'bg-blue-50',
                        isSelected && 'bg-blue-50 text-blue-700',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {/* 选中指示器 */}
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {isSelected ? (
                          <Check size={12} className="text-blue-600" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-gray-300" />
                        )}
                      </div>
                      
                      {/* 图标 */}
                      {option.icon && (
                        <option.icon 
                          size={sizeStyle.icon} 
                          className="flex-shrink-0 text-gray-500"
                        />
                      )}
                      
                      {/* 内容 */}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }
);

Combobox.displayName = 'Combobox';