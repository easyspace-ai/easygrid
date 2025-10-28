import React from "react"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { DataGridRowHeightMenuProps, RowHeightValue } from "@/types/data-grid"

export function DataGridRowHeightMenu<TData>({ table }: DataGridRowHeightMenuProps<TData>) {
  const handleRowHeightChange = (height: RowHeightValue) => {
    // This would be handled by the parent component
    console.log("Row height changed to:", height)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <MoreHorizontal className="h-4 w-4 mr-2" />
          Row height
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={() => handleRowHeightChange("compact")}>
          Compact
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleRowHeightChange("normal")}>
          Normal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleRowHeightChange("comfortable")}>
          Comfortable
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


