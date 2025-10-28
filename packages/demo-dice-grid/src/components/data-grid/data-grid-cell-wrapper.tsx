import React from "react"
import { cn } from "@/lib/utils"
import type { DataGridCellWrapperProps } from "@/types/data-grid"

export function DataGridCellWrapper<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
  children,
}: DataGridCellWrapperProps<TData>) {
  const handleClick = () => {
    table.options.meta?.setFocusedCell?.({ rowIndex, columnId })
  }

  const handleDoubleClick = () => {
    table.options.meta?.startEditing?.(rowIndex, columnId)
  }

  return (
    <div
      className={cn(
        "relative flex items-center px-3 py-2 text-sm border-r border-b border-gray-300 bg-white",
        "hover:bg-gray-50",
        isFocused && "ring-2 ring-blue-500 ring-offset-1",
        isEditing && "bg-blue-50",
        isSelected && "bg-blue-50"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        minHeight: "40px",
        width: "100%",
      }}
    >
      {children}
    </div>
  )
}
