/**
 * FilterManager - 过滤管理器组件
 *
 * 设计原则：
 * 1. 统一的过滤状态管理
 * 2. 数据过滤逻辑
 * 3. 过滤条件持久化
 * 4. 性能优化
 */

import React, { useState, useCallback, useMemo } from 'react';
import { FilterDialog } from './FilterDialog';
import { FilterButton } from './FilterButton';
import type { FilterField, FilterCondition, FilterOperator } from './FilterDialog';

export interface FilterManagerComponentProps {
  // 数据
  data: any[];
  fields: FilterField[];

  // 过滤状态
  conditions: FilterCondition[];
  onConditionsChange: (conditions: FilterCondition[]) => void;

  // 过滤结果
  onFilteredDataChange?: (filteredData: any[]) => void;

  // 按钮配置
  buttonVariant?: 'default' | 'compact';
  buttonSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 过滤数据
 */
function filterData(data: any[], conditions: FilterCondition[], fields: FilterField[]): any[] {
  if (conditions.length === 0) {
    return data;
  }

  return data.filter((item) => {
    return conditions.every((condition) => {
      const field = fields.find((f) => f.id === condition.fieldId);
      if (!field) return true;

      const itemValue = item[field.id];
      const filterValue = condition.value;

      switch (condition.operator) {
        case 'equals':
          return itemValue === filterValue;
        case 'not_equals':
          return itemValue !== filterValue;
        case 'contains':
          return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'not_contains':
          return !String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'starts_with':
          return String(itemValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
        case 'ends_with':
          return String(itemValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
        case 'greater_than':
          return Number(itemValue) > Number(filterValue);
        case 'less_than':
          return Number(itemValue) < Number(filterValue);
        case 'greater_equal':
          return Number(itemValue) >= Number(filterValue);
        case 'less_equal':
          return Number(itemValue) <= Number(filterValue);
        case 'is_empty':
          return itemValue === null || itemValue === undefined || itemValue === '';
        case 'is_not_empty':
          return itemValue !== null && itemValue !== undefined && itemValue !== '';
        case 'in':
          return Array.isArray(filterValue) && filterValue.includes(itemValue);
        case 'not_in':
          return Array.isArray(filterValue) && !filterValue.includes(itemValue);
        default:
          return true;
      }
    });
  });
}

export function FilterManagerComponent({
  data,
  fields,
  conditions,
  onConditionsChange,
  onFilteredDataChange,
  buttonVariant = 'default',
  buttonSize = 'md',
  className,
}: FilterManagerComponentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return filterData(data, conditions, fields);
  }, [data, conditions, fields]);

  // 通知过滤结果变化
  const onFilteredDataChangeRef = React.useRef(onFilteredDataChange);
  onFilteredDataChangeRef.current = onFilteredDataChange;

  React.useEffect(() => {
    if (onFilteredDataChangeRef.current) {
      onFilteredDataChangeRef.current(filteredData);
    }
  }, [filteredData]);

  // 打开过滤对话框
  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  // 关闭过滤对话框
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  // 清除所有过滤条件
  const handleClearFilters = useCallback(() => {
    onConditionsChange([]);
  }, [onConditionsChange]);

  // 过滤条件变化
  const handleConditionsChange = useCallback(
    (newConditions: FilterCondition[]) => {
      onConditionsChange(newConditions);
    },
    [onConditionsChange]
  );

  return (
    <div className={className}>
      {/* 过滤按钮 */}
      <FilterButton
        isActive={conditions.length > 0}
        conditionCount={conditions.length}
        onClick={handleOpenDialog}
        onClear={conditions.length > 0 ? handleClearFilters : undefined}
        variant={buttonVariant}
        size={buttonSize}
      />

      {/* 过滤对话框 */}
      <FilterDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        fields={fields}
        conditions={conditions}
        onConditionsChange={handleConditionsChange}
      />
    </div>
  );
}
