import React, { useEffect, useRef } from "react"
import { DataGridCellWrapper } from "../data-grid-cell-wrapper"
import { Checkbox } from "@/components/ui/checkbox"
import type { DataGridCellVariantProps } from "@/types/data-grid"

export function CheckboxCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: DataGridCellVariantProps<TData>) {
  const checkboxRef = useRef<HTMLButtonElement>(null)
  const [checked, setChecked] = React.useState(Boolean(cell.getValue()))

  useEffect(() => {
    if (isEditing && checkboxRef.current) {
      checkboxRef.current.focus()
    }
  }, [isEditing])

  const handleCheckedChange = (newChecked: boolean) => {
    setChecked(newChecked)
    table.options.meta?.updateData?.(rowIndex, columnId, newChecked)
    table.options.meta?.stopEditing?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleCheckedChange(!checked)
    }
    if (e.key === "Escape") {
      e.preventDefault()
      setChecked(Boolean(cell.getValue()))
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
      <div className="flex items-center justify-center">
        <Checkbox
          ref={checkboxRef}
          checked={checked}
          onCheckedChange={handleCheckedChange}
          onKeyDown={handleKeyDown}
          className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      </div>
    </DataGridCellWrapper>
  )
}


