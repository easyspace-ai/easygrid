/**
 * ViewToolbar - 视图工具栏组件
 * 
 * 设计原则：
 * 1. 统一的按钮样式
 * 2. 清晰的视觉分组
 * 3. 响应式布局（移动端折叠）
 */

import React from 'react';
import { cn, tokens } from '../../grid/design-system';
import { Button } from '../../ui/Button';

// 稳定的空数组引用，避免无限渲染
const EMPTY_ARRAY: any[] = [];
import { 
  Plus, 
  Settings, 
  Undo2, 
  Redo2,
  Filter,
  ArrowUpDown,
  Group
} from 'lucide-react';
import { FieldConfigCombobox, type FieldConfig } from '../field-config';
import { RowHeightCombobox, type RowHeight } from '../row-height';
import { FilterManager, type FilterField, type FilterCondition } from '../filter';

export interface ToolbarConfig {
  showUndoRedo?: boolean;
  showAddNew?: boolean;
  showFieldConfig?: boolean;
  showRowHeight?: boolean;
  showFilter?: boolean;
  showSort?: boolean;
  showGroup?: boolean;
  showSearch?: boolean;
}

export interface ViewToolbarProps {
  config?: ToolbarConfig;
  
  // 字段配置
  fields?: FieldConfig[];
  fieldConfigMode?: 'panel' | 'combobox';
  onFieldToggle?: (fieldId: string, visible: boolean) => void;
  onFieldReorder?: (fromIndex: number, toIndex: number) => void;
  onFieldEdit?: (fieldId: string) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldGroup?: (fieldId: string) => void;
  onFieldCopy?: (fieldId: string) => void;
  onFieldInsertLeft?: (fieldId: string) => void;
  onFieldInsertRight?: (fieldId: string) => void;
  onFieldFilter?: (fieldId: string) => void;
  onFieldSort?: (fieldId: string) => void;
  onFieldFreeze?: (fieldId: string) => void;
  
  // 行高配置
  rowHeight?: RowHeight;
  onRowHeightChange?: (rowHeight: RowHeight) => void;
  
  // 过滤配置
  filterFields?: FilterField[];
  filterConditions?: FilterCondition[];
  onFilterConditionsChange?: (conditions: FilterCondition[]) => void;
  onFilteredDataChange?: (filteredData: any[]) => void;
  
  // 操作回调
  onAddRecord?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  onGroup?: () => void;
  onSearch?: () => void;
  
  // 响应式
  isMobile?: boolean;
  
  className?: string;
}

const DEFAULT_CONFIG: Required<ToolbarConfig> = {
  showUndoRedo: true,
  showAddNew: true,
  showFieldConfig: true,
  showRowHeight: true,
  showFilter: true,
  showSort: true,
  showGroup: true,
  showSearch: true,
};

export function ViewToolbar({
  config,
  fields,
  fieldConfigMode = 'combobox',
  onFieldToggle,
  onFieldReorder,
  onFieldEdit,
  onFieldDelete,
  onFieldGroup,
  onFieldCopy,
  onFieldInsertLeft,
  onFieldInsertRight,
  onFieldFilter,
  onFieldSort,
  onFieldFreeze,
  rowHeight = 'medium',
  onRowHeightChange,
  filterFields,
  filterConditions = [],
  onFilterConditionsChange,
  onFilteredDataChange,
  onAddRecord,
  onUndo,
  onRedo,
  onFilter,
  onSort,
  onGroup,
  onSearch,
  isMobile = false,
  className,
}: ViewToolbarProps) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        'px-4 py-2 border-b',
        className
      )}
      style={{
        borderColor: tokens.colors.border.subtle,
        backgroundColor: tokens.colors.surface.base,
      }}
      role="toolbar"
      aria-label="数据操作工具栏"
    >
      {/* 主要操作组 */}
      <div className="flex items-center gap-2">
        {/* 添加记录 */}
        {mergedConfig.showAddNew && onAddRecord && (
          <Button
            variant="primary"
            size={'sm'}
            icon={Plus}
            onClick={onAddRecord}
          >
            添加记录
          </Button>
        )}

        {/* 字段配置 */}
        {mergedConfig.showFieldConfig && fields && fieldConfigMode === 'combobox' && (
          <FieldConfigCombobox
            fields={fields}
            onFieldToggle={onFieldToggle!}
            onFieldReorder={onFieldReorder!}
            onFieldEdit={onFieldEdit!}
            onFieldDelete={onFieldDelete!}
            onFieldGroup={onFieldGroup!}
            onFieldCopy={onFieldCopy}
            onFieldInsertLeft={onFieldInsertLeft}
            onFieldInsertRight={onFieldInsertRight}
            onFieldFilter={onFieldFilter}
            onFieldSort={onFieldSort}
            onFieldFreeze={onFieldFreeze}
          />
        )}

        {/* 行高配置 */}
        {mergedConfig.showRowHeight && (
          <RowHeightCombobox
            value={rowHeight}
            onChange={onRowHeightChange}
          />
        )}
      </div>

      {/* 分隔线 */}
      {(mergedConfig.showFilter || mergedConfig.showSort || mergedConfig.showGroup) && (
        <div
          className="w-px h-6 bg-gray-300"
          style={{ backgroundColor: tokens.colors.border.default }}
        />
      )}

      {/* 数据操作组 */}
      <div className="flex items-center gap-2">
        {mergedConfig.showFilter && filterFields && (
          <FilterManager
            data={EMPTY_ARRAY} // 数据由父组件管理，使用稳定的空数组引用
            fields={filterFields}
            conditions={filterConditions}
            onConditionsChange={onFilterConditionsChange || (() => {})}
            onFilteredDataChange={onFilteredDataChange}
            buttonVariant="default"
            buttonSize="sm"
          />
        )}

        {mergedConfig.showSort && onSort && (
          <Button
            variant="secondary"
            size={'sm'}
            icon={ArrowUpDown}
            onClick={onSort}
          >
            {!isMobile && '排序'}
          </Button>
        )}

        {mergedConfig.showGroup && onGroup && (
          <Button
            variant="secondary"
            size={'sm'}
            icon={Group}
            onClick={onGroup}
          >
            {!isMobile && '分组'}
          </Button>
        )}
      </div>

      {/* 分隔线 */}
      {mergedConfig.showUndoRedo && (
        <div
          className="w-px h-6 bg-gray-300"
          style={{ backgroundColor: tokens.colors.border.default }}
        />
      )}

      {/* 撤销/重做组 */}
      {mergedConfig.showUndoRedo && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size={'sm'}
            icon={Undo2}
            onClick={onUndo}
            aria-label="撤销"
            title="撤销"
          />
          <Button
            variant="ghost"
            size={'sm'}
            icon={Redo2}
            onClick={onRedo}
            aria-label="重做"
            title="重做"
          />
        </div>
      )}
    </div>
  );
}

