import React, { useEffect, useRef } from "react"
import { DataGridCellWrapper } from "../data-grid-cell-wrapper"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DataGridCellVariantProps } from "@/types/data-grid"

export function DateCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: DataGridCellVariantProps<TData>) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(() => {
    const cellValue = cell.getValue()
    if (cellValue) {
      const parsedDate = new Date(cellValue)
      return isNaN(parsedDate.getTime()) ? undefined : parsedDate
    }
    return undefined
  })

  useEffect(() => {
    if (isEditing && buttonRef.current) {
      buttonRef.current.focus()
    }
  }, [isEditing])

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    table.options.meta?.updateData?.(rowIndex, columnId, selectedDate?.toISOString().split('T')[0] || "")
    setOpen(false)
    table.options.meta?.stopEditing?.()
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      table.options.meta?.stopEditing?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      const cellValue = cell.getValue()
      if (cellValue) {
        const parsedDate = new Date(cellValue)
        setDate(isNaN(parsedDate.getTime()) ? undefined : parsedDate)
      } else {
        setDate(undefined)
      }
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
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              ref={buttonRef}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-full border-0 shadow-none",
                !date && "text-muted-foreground"
              )}
              onKeyDown={handleKeyDown}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <span className="truncate">
          {date ? format(date, "PPP") : ""}
        </span>
      )}
    </DataGridCellWrapper>
  )
}


