/**
 * FilterDialog - 过滤条件设置对话框
 * 
 * 设计原则：
 * 1. 直观的过滤条件构建
 * 2. 支持多条件组合
 * 3. 完整的字段类型支持
 * 4. 现代化的交互体验
 * 5. 可访问性优化
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn, tokens, elevation } from '../../grid/design-system';
import { Button } from '../../ui/Button';
import { FilterCondition } from './FilterCondition';
import { 
  X, 
  Plus, 
  Filter,
  type LucideIcon
} from 'lucide-react';

export interface FilterField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'attachment';
  options?: string[]; // 用于 select 类型
}

export interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: any;
}

export type FilterOperator = 
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than'
  | 'greater_equal' | 'less_equal'
  | 'is_empty' | 'is_not_empty'
  | 'in' | 'not_in';

export interface FilterDialogProps {
  // 基础配置
  isOpen: boolean;
  onClose: () => void;
  
  // 字段配置
  fields: FilterField[];
  
  // 过滤条件
  conditions: FilterCondition[];
  onConditionsChange: (conditions: FilterCondition[]) => void;
  
  // 样式
  className?: string;
}

/**
 * 过滤操作符配置
 */
const FILTER_OPERATORS: Record<FilterOperator, {
  label: string;
  icon?: LucideIcon;
  valueTypes: FilterField['type'][];
}> = {
  equals: { label: '等于', valueTypes: ['text', 'number', 'date', 'select', 'boolean'] },
  not_equals: { label: '不等于', valueTypes: ['text', 'number', 'date', 'select', 'boolean'] },
  contains: { label: '包含', valueTypes: ['text'] },
  not_contains: { label: '不包含', valueTypes: ['text'] },
  starts_with: { label: '开头是', valueTypes: ['text'] },
  ends_with: { label: '结尾是', valueTypes: ['text'] },
  greater_than: { label: '大于', valueTypes: ['number', 'date'] },
  less_than: { label: '小于', valueTypes: ['number', 'date'] },
  greater_equal: { label: '大于等于', valueTypes: ['number', 'date'] },
  less_equal: { label: '小于等于', valueTypes: ['number', 'date'] },
  is_empty: { label: '为空', valueTypes: ['text', 'number', 'date', 'select', 'attachment'] },
  is_not_empty: { label: '不为空', valueTypes: ['text', 'number', 'date', 'select', 'attachment'] },
  in: { label: '在列表中', valueTypes: ['text', 'number', 'select'] },
  not_in: { label: '不在列表中', valueTypes: ['text', 'number', 'select'] },
};

/**
 * 获取字段支持的操作符
 */
function getFieldOperators(fieldType: FilterField['type']): FilterOperator[] {
  return Object.entries(FILTER_OPERATORS)
    .filter(([_, config]) => config.valueTypes.includes(fieldType))
    .map(([operator]) => operator as FilterOperator);
}

/**
 * 生成新的过滤条件
 */
function createNewCondition(fields: FilterField[]): FilterCondition {
  const firstField = fields[0];
  const operators = firstField ? getFieldOperators(firstField.type) : ['equals'];
  
  return {
    id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fieldId: firstField?.id || '',
    operator: operators[0],
    value: '',
  };
}

export function FilterDialog({
  isOpen,
  onClose,
  fields,
  conditions,
  onConditionsChange,
  className,
}: FilterDialogProps) {
  const [localConditions, setLocalConditions] = useState<FilterCondition[]>(conditions);

  // 添加条件
  const handleAddCondition = useCallback(() => {
    const newCondition = createNewCondition(fields);
    setLocalConditions(prev => [...prev, newCondition]);
  }, [fields]);

  // 删除条件
  const handleDeleteCondition = useCallback((conditionId: string) => {
    setLocalConditions(prev => prev.filter(c => c.id !== conditionId));
  }, []);

  // 更新条件
  const handleUpdateCondition = useCallback((updatedCondition: FilterCondition) => {
    setLocalConditions(prev => 
      prev.map(c => c.id === updatedCondition.id ? updatedCondition : c)
    );
  }, []);

  // 应用过滤
  const handleApply = useCallback(() => {
    onConditionsChange(localConditions);
    onClose();
  }, [localConditions, onConditionsChange, onClose]);

  // 清除所有条件
  const handleClear = useCallback(() => {
    setLocalConditions([]);
  }, []);

  // 重置条件
  const handleReset = useCallback(() => {
    setLocalConditions(conditions);
  }, [conditions]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-2xl mx-4',
          'bg-white rounded-lg shadow-xl',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          className
        )}
        style={{
          boxShadow: elevation.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: tokens.colors.border.subtle }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-md"
              style={{ backgroundColor: tokens.colors.primary[50] }}
            >
              <Filter size={16} style={{ color: tokens.colors.primary[600] }} />
            </div>
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: tokens.colors.text.primary }}
              >
                设置筛选条件
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: tokens.colors.text.secondary }}
              >
                定义数据筛选规则，支持多条件组合
              </p>
            </div>
          </div>
          <Button
            icon={X}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="关闭"
          />
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 过滤条件列表 */}
          <div className="space-y-4">
            {localConditions.length === 0 ? (
              <div
                className="text-center py-8"
                style={{ color: tokens.colors.text.tertiary }}
              >
                <Filter size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无筛选条件</p>
                <p className="text-xs mt-1">点击下方按钮添加筛选条件</p>
              </div>
            ) : (
              localConditions.map((condition, index) => (
                <FilterCondition
                  key={condition.id}
                  condition={condition}
                  fields={fields}
                  operators={getFieldOperators(
                    fields.find(f => f.id === condition.fieldId)?.type || 'text'
                  )}
                  onUpdate={handleUpdateCondition}
                  onDelete={() => handleDeleteCondition(condition.id)}
                  showDelete={localConditions.length > 1}
                />
              ))
            )}
          </div>

          {/* 添加条件按钮 */}
          <div className="mt-6">
            <Button
              icon={Plus}
              variant="secondary"
              onClick={handleAddCondition}
              className="w-full"
            >
              添加条件
            </Button>
          </div>
        </div>

        {/* 底部操作 */}
        <div
          className="flex items-center justify-between p-6 border-t"
          style={{ borderColor: tokens.colors.border.subtle }}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={localConditions.length === 0}
            >
              清除全部
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={JSON.stringify(localConditions) === JSON.stringify(conditions)}
            >
              重置
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
            >
              确定
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
