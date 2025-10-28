import React, { useEffect, useRef } from "react"
import { DataGridCellWrapper } from "../data-grid-cell-wrapper"
import type { DataGridCellVariantProps } from "@/types/data-grid"

export function ShortTextCell<TData>({
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

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    table.options.meta?.updateData?.(rowIndex, columnId, value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      table.options.meta?.updateData?.(rowIndex, columnId, value)
      table.options.meta?.stopEditing?.()
    }
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
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none"
        />
      ) : (
        <span className="truncate">{value}</span>
      )}
    </DataGridCellWrapper>
  )
}


