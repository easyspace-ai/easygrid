import React, { useEffect, useRef } from "react"
import { DataGridCellWrapper } from "../data-grid-cell-wrapper"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DataGridCellVariantProps } from "@/types/data-grid"

export function MultiSelectCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: DataGridCellVariantProps<TData>) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState<string[]>(() => {
    const cellValue = cell.getValue()
    return Array.isArray(cellValue) ? cellValue : []
  })
  
  const meta = cell.column.columnDef.meta as any
  const options = meta?.cell?.options || []

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    
    setValue(newValue)
    table.options.meta?.updateData?.(rowIndex, columnId, newValue)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
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
            <button
              className={cn(
                "flex h-full w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                "min-h-[40px]"
              )}
            >
              <div className="flex flex-wrap gap-1">
                {value.length > 0 ? (
                  value.map((val) => {
                    const option = options.find((opt: any) => opt.value === val)
                    return (
                      <Badge key={val} variant="secondary" className="text-xs">
                        {option?.label || val}
                      </Badge>
                    )
                  })
                ) : (
                  <span className="text-muted-foreground">Select items...</span>
                )}
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No option found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option: any) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(option.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex flex-wrap gap-1">
          {value.length > 0 ? (
            value.map((val) => {
              const option = options.find((opt: any) => opt.value === val)
              return (
                <Badge key={val} variant="secondary" className="text-xs">
                  {option?.label || val}
                </Badge>
              )
            })
          ) : (
            <span className="text-muted-foreground">No items selected</span>
          )}
        </div>
      )}
    </DataGridCellWrapper>
  )
}


