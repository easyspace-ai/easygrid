/**
 * RowHeightCombobox - 行高配置下拉组件（重构版）
 * 
 * 设计原则：
 * 1. 基于统一的 Combobox 基类
 * 2. 纯 Tailwind 实现
 * 3. 简化的交互逻辑
 * 4. 视觉化的行高预览
 */

import React from 'react';
import { Combobox, type ComboboxOption } from '../ui/Combobox';
import { ChevronDown, Check, type LucideIcon } from 'lucide-react';

export type RowHeight = 'short' | 'medium' | 'tall' | 'extra-tall';

export interface RowHeightOption {
  value: RowHeight;
  label: string;
  icon: LucideIcon;
}

export interface RowHeightComboboxProps {
  value?: RowHeight;
  onChange?: (rowHeight: RowHeight) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 行高预览图标组件
 */
interface RowHeightIconProps {
  height: RowHeight;
  size?: number;
}

function RowHeightIcon({ height, size = 16 }: RowHeightIconProps) {
  const getGap = () => {
    switch (height) {
      case 'short': return 'gap-0.5';
      case 'medium': return 'gap-1';
      case 'tall': return 'gap-1.5';
      case 'extra-tall': return 'gap-2';
      default: return 'gap-1';
    }
  };

  return (
    <div className={cn('flex items-center gap-1')}>
      <div className={cn('flex flex-col', getGap())}>
        <div className="w-3 h-0.5 bg-current opacity-60"></div>
        <div className="w-4 h-0.5 bg-current"></div>
        <div className="w-3 h-0.5 bg-current opacity-60"></div>
      </div>
      <ChevronDown size={size * 0.75} className="opacity-50" />
    </div>
  );
}

/**
 * 行高选项配置
 */
const rowHeightOptions: ComboboxOption<RowHeight>[] = [
  {
    value: 'short',
    label: '低',
    icon: () => <RowHeightIcon height="short" />,
    description: '紧凑显示，适合大量数据',
  },
  {
    value: 'medium',
    label: '中等',
    icon: () => <RowHeightIcon height="medium" />,
    description: '标准显示，平衡美观与效率',
  },
  {
    value: 'tall',
    label: '高',
    icon: () => <RowHeightIcon height="tall" />,
    description: '宽松显示，提升可读性',
  },
  {
    value: 'extra-tall',
    label: '超高',
    icon: () => <RowHeightIcon height="extra-tall" />,
    description: '最大显示，最佳可读性',
  },
];

export function RowHeightCombobox({
  value = 'medium',
  onChange,
  disabled = false,
  className,
}: RowHeightComboboxProps) {
  // 自定义渲染选项
  const renderOption = (option: ComboboxOption<RowHeight>, isSelected: boolean) => {
    const IconComponent = option.icon;
    
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        {/* 选中状态指示器 */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isSelected ? (
            <Check size={12} className="text-blue-600" />
          ) : (
            <div className="w-3 h-3 rounded-full border border-gray-300" />
          )}
        </div>

        {/* 图标 */}
        <div className="flex-shrink-0">
          <IconComponent />
        </div>

        {/* 内容 */}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm">{option.label}</div>
          {option.description && (
            <div className="text-xs text-gray-500 mt-0.5">
              {option.description}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={rowHeightOptions}
      placeholder="行高配置"
      disabled={disabled}
      size="sm"
      variant="default"
      renderOption={renderOption}
      className={className}
    />
  );
}

// 辅助函数：cn
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}