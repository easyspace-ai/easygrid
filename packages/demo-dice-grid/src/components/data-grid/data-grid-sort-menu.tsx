import React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DataGridSortMenuProps } from "@/types/data-grid"

export function DataGridSortMenu<TData>({ table }: DataGridSortMenuProps<TData>) {
  const sorting = table.getState().sorting

  const handleSort = (columnId: string, desc: boolean) => {
    table.getColumn(columnId)?.toggleSorting(desc)
  }

  const handleClearSorting = () => {
    table.resetSorting()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Sort
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {table.getVisibleLeafColumns().map((column) => {
          if (!column.getCanSort()) return null
          
          const isSorted = column.getIsSorted()
          
          return (
            <div key={column.id}>
              <DropdownMenuItem
                onClick={() => handleSort(column.id, false)}
                className={cn(
                  "flex items-center justify-between",
                  isSorted === "asc" && "bg-accent"
                )}
              >
                <span>{column.id}</span>
                {isSorted === "asc" && <ArrowUp className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSort(column.id, true)}
                className={cn(
                  "flex items-center justify-between",
                  isSorted === "desc" && "bg-accent"
                )}
              >
                <span>{column.id} (desc)</span>
                {isSorted === "desc" && <ArrowDown className="h-4 w-4" />}
              </DropdownMenuItem>
            </div>
          )
        })}
        {sorting.length > 0 && (
          <>
            <div className="border-t my-1" />
            <DropdownMenuItem onClick={handleClearSorting}>
              <X className="h-4 w-4 mr-2" />
              Clear sorting
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


