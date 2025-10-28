import React, { useEffect, useRef } from "react"
import { DataGridCellWrapper } from "../data-grid-cell-wrapper"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DataGridCellVariantProps } from "@/types/data-grid"

export function SelectCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: DataGridCellVariantProps<TData>) {
  const selectRef = useRef<HTMLButtonElement>(null)
  const [value, setValue] = React.useState(String(cell.getValue() || ""))
  
  const meta = cell.column.columnDef.meta as any
  const options = meta?.cell?.options || []

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus()
    }
  }, [isEditing])

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    table.options.meta?.updateData?.(rowIndex, columnId, newValue)
    table.options.meta?.stopEditing?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      setValue(String(cell.getValue() || ""))
      table.options.meta?.stopEditing?.()
    }
  }

  return (
    <DataGridCellWrapper
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isFocused={isFocused}
      isEditing={isEditing}
      isSelected={isSelected}
    >
      {isEditing ? (
        <Select value={value} onValueChange={handleValueChange}>
          <SelectTrigger ref={selectRef} className="h-full border-0 shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option: any) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="truncate">
          {options.find((opt: any) => opt.value === value)?.label || value}
        </span>
      )}
    </DataGridCellWrapper>
  )
}


