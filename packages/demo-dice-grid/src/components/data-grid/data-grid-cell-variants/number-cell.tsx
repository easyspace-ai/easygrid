import React, { useEffect, useRef } from "react"
import { DataGridCellWrapper } from "../data-grid-cell-wrapper"
import type { DataGridCellVariantProps } from "@/types/data-grid"

export function NumberCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: DataGridCellVariantProps<TData>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = React.useState(String(cell.getValue() || ""))
  
  const meta = cell.column.columnDef.meta as any
  const min = meta?.cell?.min
  const max = meta?.cell?.max
  const step = meta?.cell?.step || 1

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      let finalValue = numValue
      if (min !== undefined) finalValue = Math.max(finalValue, min)
      if (max !== undefined) finalValue = Math.min(finalValue, max)
      table.options.meta?.updateData?.(rowIndex, columnId, finalValue)
    } else {
      setValue(String(cell.getValue() || ""))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleBlur()
      table.options.meta?.stopEditing?.()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      setValue(String(cell.getValue() || ""))
      table.options.meta?.stopEditing?.()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // Allow empty string, numbers, and single decimal point
    if (inputValue === "" || /^\d*\.?\d*$/.test(inputValue)) {
      setValue(inputValue)
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
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-right"
          placeholder="0"
        />
      ) : (
        <span className="text-right">{cell.getValue() || ""}</span>
      )}
    </DataGridCellWrapper>
  )
}


