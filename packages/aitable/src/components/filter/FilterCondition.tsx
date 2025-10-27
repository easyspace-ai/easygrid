/**
 * FilterCondition - 单个过滤条件组件
 * 
 * 设计原则：
 * 1. 直观的条件构建界面
 * 2. 根据字段类型动态调整操作符
 * 3. 智能的值输入组件
 * 4. 流畅的交互体验
 */

import React, { useState, useCallback, useEffect } from 'react';
import { cn, tokens } from '../../grid/design-system';
import { Button } from '../../ui/Button';
import { Combobox, type ComboboxOption } from '../ui/Combobox';
import { 
  Trash2, 
  ChevronDown,
  type LucideIcon
} from 'lucide-react';
import type { FilterField, FilterCondition, FilterOperator } from './FilterDialog';

export interface FilterConditionProps {
  condition: FilterCondition;
  fields: FilterField[];
  operators: FilterOperator[];
  onUpdate: (condition: FilterCondition) => void;
  onDelete: () => void;
  showDelete?: boolean;
  className?: string;
}

/**
 * 过滤操作符标签映射
 */
const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: '等于',
  not_equals: '不等于',
  contains: '包含',
  not_contains: '不包含',
  starts_with: '开头是',
  ends_with: '结尾是',
  greater_than: '大于',
  less_than: '小于',
  greater_equal: '大于等于',
  less_equal: '小于等于',
  is_empty: '为空',
  is_not_empty: '不为空',
  in: '在列表中',
  not_in: '不在列表中',
};

/**
 * 值输入组件
 */
interface ValueInputProps {
  field: FilterField;
  operator: FilterOperator;
  value: any;
  onChange: (value: any) => void;
}

function ValueInput({ field, operator, value, onChange }: ValueInputProps) {
  // 不需要值的操作符
  const noValueOperators: FilterOperator[] = ['is_empty', 'is_not_empty'];
  
  if (noValueOperators.includes(operator)) {
    return (
      <div
        className="px-3 py-2 text-sm rounded-md border"
        style={{
          backgroundColor: tokens.colors.surface.disabled,
          borderColor: tokens.colors.border.subtle,
          color: tokens.colors.text.tertiary,
        }}
      >
        无需输入值
      </div>
    );
  }

  // 根据字段类型渲染不同的输入组件
  switch (field.type) {
    case 'select':
      const selectOptions: ComboboxOption[] = field.options?.map(option => ({
        value: option,
        label: option,
      })) || [];
      
      return (
        <Combobox
          value={value}
          onChange={onChange}
          options={selectOptions}
          placeholder="选择选项"
          size="sm"
          className="min-w-[120px]"
        />
      );

    case 'boolean':
      const booleanOptions: ComboboxOption[] = [
        { value: true, label: '是' },
        { value: false, label: '否' },
      ];
      
      return (
        <Combobox
          value={value}
          onChange={onChange}
          options={booleanOptions}
          placeholder="选择"
          size="sm"
          className="min-w-[80px]"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'px-3 py-2 text-sm rounded-md border',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            'border-gray-300'
          )}
          style={{
            minWidth: '140px',
          }}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder="请输入数字"
          className={cn(
            'px-3 py-2 text-sm rounded-md border',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            'border-gray-300'
          )}
          style={{
            minWidth: '120px',
          }}
        />
      );

    case 'text':
    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请输入"
          className={cn(
            'px-3 py-2 text-sm rounded-md border',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            'border-gray-300'
          )}
          style={{
            minWidth: '120px',
          }}
        />
      );
  }
}

export function FilterCondition({
  condition,
  fields,
  operators,
  onUpdate,
  onDelete,
  showDelete = true,
  className,
}: FilterConditionProps) {
  const [localCondition, setLocalCondition] = useState<FilterCondition>(condition);
  
  const selectedField = fields.find(f => f.id === localCondition.fieldId);
  const selectedOperator = localCondition.operator;

  // 当条件更新时同步到父组件
  useEffect(() => {
    onUpdate(localCondition);
  }, [localCondition, onUpdate]);

  // 字段选择处理
  const handleFieldChange = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    // 获取新字段支持的操作符
    const fieldOperators = operators.filter(op => {
      const operatorConfig = {
        equals: { valueTypes: ['text', 'number', 'date', 'select', 'boolean'] },
        not_equals: { valueTypes: ['text', 'number', 'date', 'select', 'boolean'] },
        contains: { valueTypes: ['text'] },
        not_contains: { valueTypes: ['text'] },
        starts_with: { valueTypes: ['text'] },
        ends_with: { valueTypes: ['text'] },
        greater_than: { valueTypes: ['number', 'date'] },
        less_than: { valueTypes: ['number', 'date'] },
        greater_equal: { valueTypes: ['number', 'date'] },
        less_equal: { valueTypes: ['number', 'date'] },
        is_empty: { valueTypes: ['text', 'number', 'date', 'select', 'attachment'] },
        is_not_empty: { valueTypes: ['text', 'number', 'date', 'select', 'attachment'] },
        in: { valueTypes: ['text', 'number', 'select'] },
        not_in: { valueTypes: ['text', 'number', 'select'] },
      };
      return operatorConfig[op]?.valueTypes.includes(field.type);
    });

    // 如果当前操作符不被新字段支持，选择第一个支持的操作符
    const newOperator = fieldOperators.includes(selectedOperator) 
      ? selectedOperator 
      : fieldOperators[0] || 'equals';

    setLocalCondition(prev => ({
      ...prev,
      fieldId,
      operator: newOperator,
      value: '', // 重置值
    }));
  }, [fields, operators, selectedOperator]);

  // 操作符选择处理
  const handleOperatorChange = useCallback((operator: FilterOperator) => {
    setLocalCondition(prev => ({
      ...prev,
      operator,
      value: '', // 重置值
    }));
  }, []);

  // 值变化处理
  const handleValueChange = useCallback((value: any) => {
    setLocalCondition(prev => ({
      ...prev,
      value,
    }));
  }, []);

  // 构建字段选项
  const fieldOptions: ComboboxOption[] = fields.map(field => ({
    value: field.id,
    label: field.name,
    description: field.type,
  }));

  // 构建操作符选项
  const operatorOptions: ComboboxOption[] = operators.map(operator => ({
    value: operator,
    label: OPERATOR_LABELS[operator],
  }));

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border',
        'bg-gray-50/50',
        className
      )}
      style={{
        borderColor: tokens.colors.border.subtle,
        backgroundColor: tokens.colors.surface.hover,
      }}
    >
      {/* 字段选择 */}
      <div className="flex-shrink-0">
        <Combobox
          value={localCondition.fieldId}
          onChange={handleFieldChange}
          options={fieldOptions}
          placeholder="选择字段"
          size="sm"
          className="min-w-[120px]"
        />
      </div>

      {/* 操作符选择 */}
      <div className="flex-shrink-0">
        <Combobox
          value={localCondition.operator}
          onChange={handleOperatorChange}
          options={operatorOptions}
          placeholder="选择条件"
          size="sm"
          className="min-w-[100px]"
        />
      </div>

      {/* 值输入 */}
      {selectedField && (
        <div className="flex-1">
          <ValueInput
            field={selectedField}
            operator={selectedOperator}
            value={localCondition.value}
            onChange={handleValueChange}
          />
        </div>
      )}

      {/* 删除按钮 */}
      {showDelete && (
        <div className="flex-shrink-0">
          <Button
            icon={Trash2}
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            aria-label="删除条件"
          />
        </div>
      )}
    </div>
  );
}
