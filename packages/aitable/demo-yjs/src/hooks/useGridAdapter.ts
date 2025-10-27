import { useMemo, useCallback } from 'react';
import type { IGridColumn, CellType, ICellItem, ICell } from '@easygrid/aitable';

// 字段类型映射函数
function mapFieldType(fieldType: string): CellType {
  const mapping: Record<string, CellType> = {
    'text': CellType.Text,
    'number': CellType.Number,
    'select': CellType.Select,
    'multiselect': CellType.MultiSelect,
    'date': CellType.Date,
    'datetime': CellType.Date, // 暂时映射到 Date
    'checkbox': CellType.Boolean,
    'url': CellType.Link,
    'email': CellType.Text, // 暂时映射到 Text
    'phone': CellType.Text, // 暂时映射到 Text
    'attachment': CellType.Attachment,
    'link': CellType.Link,
    'user': CellType.User,
    'rating': CellType.Rating,
    'formula': CellType.Formula,
  };

  return mapping[fieldType] || CellType.Text;
}

// 字段选项映射函数
function mapFieldOptions(field: any): any {
  if (field.type === 'select' || field.type === 'multiselect') {
    return {
      choices: field.options?.choices || [],
    };
  }
  return {};
}

export interface GridData {
  columns: IGridColumn[];
  data: Record<string, any>[];
  getCellContent: (cell: ICellItem) => ICell;
}

export function useGridAdapter(fields: any[], records: any[]): GridData {
  const columns: IGridColumn[] = useMemo(() => 
    fields.map(field => ({
      id: field.id,
      name: field.name,
      type: mapFieldType(field.type),
      width: 150,
      resizable: true,
      sortable: true,
      editable: true,
      options: mapFieldOptions(field),
    }))
  , [fields]);

  const data = useMemo(() => 
    records.map(record => ({
      id: record.id,
      ...record.data
    }))
  , [records]);

  // Grid 组件需要的 getCellContent 函数
  const getCellContent = useCallback((cell: ICellItem): ICell => {
    const record = data[cell.rowIndex];
    const field = fields[cell.colIndex];
    const value = record?.[field?.id] || '';
    
    return {
      type: mapFieldType(field?.type || 'text'),
      value: value,
      options: mapFieldOptions(field),
    };
  }, [data, fields]);

  return { columns, data, getCellContent };
}
