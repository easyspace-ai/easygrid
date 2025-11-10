import type { RowData } from "@tanstack/react-table";

export type RowHeightValue = "short" | "medium" | "tall" | "extra-tall";

export interface CellSelectOption {
  label: string;
  value: string;
}

/**
 * 关联字段单元格值
 * 参考 teable 的 ILinkCellValue
 */
export interface LinkCellValue {
  id: string;                         // 关联记录的ID（必需）
  title?: string;                     // 显示文本（可选，从 lookup field 提取）
}

export type Cell =
  | {
      variant: "short-text";
    }
  | {
      variant: "long-text";
    }
  | {
      variant: "number";
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      variant: "select";
      options: CellSelectOption[];
    }
  | {
      variant: "multi-select";
      options: CellSelectOption[];
    }
  | {
      variant: "checkbox";
    }
  | {
      variant: "date";
    }
  | {
      variant: "link";
      // 关联字段选项
      foreignTableId?: string;        // 关联表ID
      relationship?: string;           // 关系类型：oneOne, manyMany, oneMany, manyOne
      lookupFieldId?: string;          // 显示字段ID
      allowMultiple?: boolean;          // 是否允许多选
      // 保留 URL 链接的兼容性
      isUrl?: boolean;                  // 是否为 URL 链接（向后兼容）
    }
  | {
      variant: "email";
    }
  | {
      variant: "phone";
    }
  | {
      variant: "rating";
      max?: number; // 默认 5
    }
  | {
      variant: "user";
      options?: Array<{ id: string; name: string; avatar?: string }>;
    }
  | {
      variant: "attachment";
    }
  | {
      variant: "formula";
      expression?: string;
      formatting?: {
        type?: "text" | "number" | "date" | "boolean";
        precision?: number;
        dateFormat?: string;
      };
    }
  | {
      variant: "ai";
      // AI 任务类型
      task?: "generate" | "summarize" | "extract" | "translate" | "classify" | "custom";
      // 自定义提示词（用于 custom 任务）
      prompt?: string;
      // 依赖的字段（字段ID或列头名称列表）
      dependencies?: string[];
      // 触发模式
      trigger?: "auto" | "manual" | "on-create";
      // 是否启用缓存
      cache?: boolean;
      // 最大重试次数
      maxRetries?: number;
    };

export interface UpdateCell {
  rowIndex: number;
  columnId: string;
  value: unknown;
}

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: TData and TValue are used in the ColumnMeta interface
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    cell?: Cell;
  }

  // biome-ignore lint/correctness/noUnusedVariables: TData is used in the TableMeta interface
  interface TableMeta<TData extends RowData> {
    dataGridRef?: React.RefObject<HTMLElement | null>;
    focusedCell?: CellPosition | null;
    editingCell?: CellPosition | null;
    selectionState?: SelectionState;
    searchOpen?: boolean;
    isScrolling?: boolean;
    getIsCellSelected?: (rowIndex: number, columnId: string) => boolean;
    getIsSearchMatch?: (rowIndex: number, columnId: string) => boolean;
    getIsActiveSearchMatch?: (rowIndex: number, columnId: string) => boolean;
    onDataUpdate?: (props: UpdateCell | Array<UpdateCell>) => void;
    onRowsDelete?: (rowIndices: number[]) => void | Promise<void>;
    onColumnClick?: (columnId: string) => void;
    onCellClick?: (
      rowIndex: number,
      columnId: string,
      event?: React.MouseEvent,
    ) => void;
    onCellDoubleClick?: (rowIndex: number, columnId: string) => void;
    onCellMouseDown?: (
      rowIndex: number,
      columnId: string,
      event: React.MouseEvent,
    ) => void;
    onCellMouseEnter?: (
      rowIndex: number,
      columnId: string,
      event: React.MouseEvent,
    ) => void;
    onCellMouseUp?: () => void;
    onCellContextMenu?: (
      rowIndex: number,
      columnId: string,
      event: React.MouseEvent,
    ) => void;
    onCellEditingStart?: (rowIndex: number, columnId: string) => void;
    onCellEditingStop?: (opts?: {
      direction?: NavigationDirection;
      moveToNextRow?: boolean;
    }) => void;
    contextMenu?: ContextMenuState;
    onContextMenuOpenChange?: (open: boolean) => void;
    rowHeight?: RowHeightValue;
    onRowHeightChange?: (value: RowHeightValue) => void;
    onRowSelect?: (
      rowIndex: number,
      checked: boolean,
      shiftKey: boolean,
    ) => void;
  }
}

export interface CellPosition {
  rowIndex: number;
  columnId: string;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

export interface SelectionState {
  selectedCells: Set<string>;
  selectionRange: CellRange | null;
  isSelecting: boolean;
}

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
}

export type NavigationDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "ctrl+home"
  | "ctrl+end"
  | "pageup"
  | "pagedown";

export interface SearchState {
  searchMatches: CellPosition[];
  matchIndex: number;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onNavigateToNextMatch: () => void;
  onNavigateToPrevMatch: () => void;
}
