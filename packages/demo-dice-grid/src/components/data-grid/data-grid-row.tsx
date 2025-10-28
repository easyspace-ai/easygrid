import React from "react"
import { flexRender } from "@tanstack/react-table"
import { DataGridCell } from "./data-grid-cell"
import { DataGridColumnHeader } from "./data-grid-column-header"
import { cn } from "@/lib/utils"
import type { DataGridRowProps } from "@/types/data-grid"

export function DataGridRow<TData>({
  row,
  rowMapRef,
  virtualRowIndex,
  rowVirtualizer,
  rowHeight,
  focusedCell,
}: DataGridRowProps<TData>) {
  const rowRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (rowRef.current) {
      rowMapRef.current?.set(row.id, rowRef.current)
    }
    return () => {
      rowMapRef.current?.delete(row.id)
    }
  }, [row.id, rowMapRef])

  // Get virtual row from the virtualizer
  const virtualItems = rowVirtualizer.getVirtualItems()
  const virtualRow = virtualItems.find(item => item.index === virtualRowIndex)
  if (!virtualRow) return null

  const isFocused = focusedCell?.rowIndex === virtualRowIndex

  return (
    <div
      ref={rowRef}
      className={cn(
        "flex border-b border-gray-200",
        isFocused && "bg-blue-50"
      )}
      style={{
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
      }}
    >
      {row.getVisibleCells().map((cell) => {
        const isCellFocused = isFocused && focusedCell?.columnId === cell.column.id
        const isCellEditing = false // Will be managed by parent
        const isCellSelected = false // Will be managed by parent

        return (
          <div
            key={cell.id}
            className="flex items-center"
            style={{
              width: `${cell.column.getSize()}px`,
            }}
          >
            <DataGridCell
              cell={cell}
              table={cell.getContext().table}
            />
          </div>
        )
      })}
    </div>
  )
}
