/**
 * 根据字段类型与值构建网格单元格内容（含正确的 CellType 与编辑器行为）
 */

import { FieldType } from '../types/field';
import { CellType } from '../grid/renderers/cell-renderer/interface';
import type {
  IInnerCell,
  ITextCell,
  INumberCell,
  ISelectCell,
  IDateCell,
  IUserCell,
  ILinkCell,
  IAttachmentCell,
  IRatingCell,
  IBooleanCell,
} from '../grid/renderers/cell-renderer/interface';
import { getCellTypeFromFieldType, isReadonlyField } from './field-mapping';

export interface IFieldMeta {
  type: FieldType;
  options?: unknown;
  readonly?: boolean;
}

export function buildCellFromField(field: IFieldMeta, value: unknown): IInnerCell {
  const cellType = getCellTypeFromFieldType(field.type);
  const readonly = Boolean(field.readonly) || isReadonlyField(field.type);

  switch (cellType) {
    case CellType.Text: {
      // ✅ 显式转换为字符串，而不是只做类型断言
      const text = value == null ? '' : String(value);
      
      return {
        type: CellType.Text,
        data: text,
        displayData: text,
        readonly,
        isEditingOnClick: true,
      } as ITextCell;
    }
    case CellType.Number: {
      const num = (value ?? null) as number | null | undefined;
      return {
        type: CellType.Number,
        data: num,
        displayData: num == null ? '' : String(num),
        readonly,
        isEditingOnClick: true,
      } as INumberCell;
    }
    case CellType.Select: {
      // 兼容单/多选：value 允许为字符串或 { id,title }
      const arr = Array.isArray(value) ? value : value != null ? [value] : [];
      const display = arr.map((v: any) => (typeof v === 'string' ? v : v?.title)).filter(Boolean);
      
      return {
        type: CellType.Select,
        data: arr as any,
        displayData: display as string[],
        isMultiple: field.type === FieldType.MultipleSelect,
        isEditingOnClick: true,
        readonly,
      } as unknown as ISelectCell;
    }
    case CellType.Date: {
      const text = (value ?? '') as string;
      return {
        type: CellType.Date,
        data: text,
        displayData: text,
        readonly,
        isEditingOnClick: true,
      } as IDateCell;
    }
    case CellType.User: {
      const users = (Array.isArray(value) ? value : value ? [value] : []);
      return {
        type: CellType.User,
        data: users as any,
        displayData: users.map((u) => u?.name).filter(Boolean).join(', '),
        readonly,
      } as unknown as IUserCell;
    }
    case CellType.Link: {
      // 处理链接数据：支持字符串、对象或数组格式
      let url = '';
      let title: string | undefined;
      let text: string | undefined;
      let displayData: string;
      
      if (Array.isArray(value)) {
        // 如果是数组，取第一个元素
        const firstItem = value[0];
        if (typeof firstItem === 'string') {
          url = firstItem;
          text = firstItem;
          displayData = firstItem;
        } else if (firstItem && typeof firstItem === 'object') {
          const item = firstItem;
          url = item.url || item.text || item.toString?.() || '';
          title = item.title || item.text;
          text = item.text || item.title || item.toString?.() || '';
          displayData = item.title || item.text || item.url || item.toString?.() || '';
        } else {
          displayData = '';
        }
      } else if (typeof value === 'string') {
        url = value;
        text = value;
        displayData = value;
      } else if (value && typeof value === 'object') {
        const obj = value as any;
        url = obj.url || obj.text || obj.toString?.() || '';
        title = obj.title || obj.text;
        text = obj.text || obj.title || obj.url || obj.toString?.() || '';
        displayData = obj.title || obj.text || obj.url || obj.toString?.() || '';
      } else {
        displayData = '';
      }
      
      return {
        type: CellType.Link,
        url,
        title,
        text,
        data: { url, title, text },
        displayData: displayData,
        readonly,
        isEditingOnClick: true,
      } as ILinkCell;
    }
    case CellType.Attachment: {
      const files = (Array.isArray(value) ? value : value ? [value] : []) as string[];
      return {
        type: CellType.Attachment,
        data: files,
        displayData: files,
        readonly,
      } as IAttachmentCell;
    }
    case CellType.Rating: {
      const score = (value as number) ?? 0;
      return {
        type: CellType.Rating,
        data: score,
        icon: 'star',
        readonly,
      } as IRatingCell;
    }
    case CellType.Boolean: {
      const boolVal = Boolean(value);
      return {
        type: CellType.Boolean,
        data: boolVal,
        readonly,
      } as IBooleanCell;
    }
    default: {
      // ✅ 显式转换为字符串，而不是只做类型断言
      const text = value == null ? '' : String(value);
      return {
        type: CellType.Text,
        data: text,
        displayData: text,
        readonly,
      } as ITextCell;
    }
  }
}


