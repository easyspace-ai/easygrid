/**
 * Field helper utilities for dynamic cell type selection
 */

import { CellType } from '../grid/renderers/cell-renderer';
import { CellValueType, FieldType } from '../types/field';

/**
 * Get CellType for Formula/Rollup fields based on cellValueType
 * 根据 cellValueType 为 Formula/Rollup 字段选择 CellType
 */
export function getFormulaCellType(
  cellValueType: CellValueType,
  isMultipleCellValue?: boolean
): CellType {
  switch (cellValueType) {
    case CellValueType.Boolean:
      return CellType.Boolean;
    case CellValueType.DateTime:
      return CellType.Text;
    case CellValueType.Number:
      // 如果是多值且有 showAs 配置，可能显示为图表
      // 这里简化处理，默认显示为 Number
      return CellType.Number;
    case CellValueType.String:
    default:
      return CellType.Text;
  }
}

// isComputedField has been moved to field-mapping.ts to avoid duplicate exports
import { isComputedField as isComputedFieldFromMapping } from './field-mapping';

/**
 * Check if a field type is editable
 * 检查字段类型是否可编辑
 */
export function isEditableFieldType(fieldType: FieldType): boolean {
  // 系统字段和计算字段不可编辑
  const readonlyFieldTypes = new Set([
    FieldType.Formula,
    FieldType.Rollup,
    FieldType.CreatedTime,
    FieldType.LastModifiedTime,
    FieldType.AutoNumber,
    FieldType.CreatedBy,
    FieldType.LastModifiedBy,
  ]);
  
  return !readonlyFieldTypes.has(fieldType);
}

// Re-export for backward compatibility
export { isComputedFieldFromMapping as isComputedField };

/**
 * Check if button is clickable based on field options and cell value
 * 检查按钮是否可点击
 */
export function checkButtonClickable(
  fieldOptions: { maxCount?: number },
  cellValue: { count?: number } | null | undefined
): boolean {
  const maxCount = fieldOptions.maxCount ?? 0;
  const count = cellValue?.count ?? 0;
  
  // 如果没有设置 maxCount (为 0)，则总是可点击
  if (maxCount === 0) {return true;}
  
  // 如果设置了 maxCount，则检查是否已达到上限
  return count < maxCount;
}

