import React, { useEffect, useRef } from "react"
import { DataGridCellWrapper } from "../data-grid-cell-wrapper"
import type { DataGridCellVariantProps } from "@/types/data-grid"

export function LongTextCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: DataGridCellVariantProps<TData>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = React.useState(String(cell.getValue() || ""))

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    table.options.meta?.updateData?.(rowIndex, columnId, value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
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
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full resize-none bg-transparent outline-none"
          rows={3}
        />
      ) : (
        <span className="line-clamp-3">{value}</span>
      )}
    </DataGridCellWrapper>
  )
}


