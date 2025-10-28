import React from "react"
import { DataGridCellWrapper } from "./data-grid-cell-wrapper"
import { ShortTextCell } from "./data-grid-cell-variants/short-text-cell"
import { LongTextCell } from "./data-grid-cell-variants/long-text-cell"
import { NumberCell } from "./data-grid-cell-variants/number-cell"
import { SelectCell } from "./data-grid-cell-variants/select-cell"
import { MultiSelectCell } from "./data-grid-cell-variants/multi-select-cell"
import { CheckboxCell } from "./data-grid-cell-variants/checkbox-cell"
import { DateCell } from "./data-grid-cell-variants/date-cell"
import type { DataGridCellProps } from "@/types/data-grid"

export function DataGridCell<TData>({ cell, table }: DataGridCellProps<TData>) {
  const meta = cell.column.columnDef.meta as any
  const variant = meta?.cell?.variant || "short-text"

  const cellProps = {
    cell,
    table,
    rowIndex: cell.row.index,
    columnId: cell.column.id,
    isFocused: false, // Will be set by parent
    isEditing: false, // Will be set by parent
    isSelected: false, // Will be set by parent
  }

  switch (variant) {
    case "long-text":
      return <LongTextCell {...cellProps} />
    case "number":
      return <NumberCell {...cellProps} />
    case "select":
      return <SelectCell {...cellProps} />
    case "multi-select":
      return <MultiSelectCell {...cellProps} />
    case "checkbox":
      return <CheckboxCell {...cellProps} />
    case "date":
      return <DateCell {...cellProps} />
    case "short-text":
    default:
      return <ShortTextCell {...cellProps} />
  }
}


