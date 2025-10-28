import React from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { DataGridViewMenuProps } from "@/types/data-grid"

export function DataGridViewMenu<TData>({ table }: DataGridViewMenuProps<TData>) {
  const columnVisibility = table.getState().columnVisibility

  const handleColumnToggle = (columnId: string) => {
    table.getColumn(columnId)?.toggleVisibility()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {table.getVisibleLeafColumns().map((column) => {
          const isVisible = column.getIsVisible()
          
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={isVisible}
              onCheckedChange={() => handleColumnToggle(column.id)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


