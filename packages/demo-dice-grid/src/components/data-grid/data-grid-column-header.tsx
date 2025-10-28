import React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, Type, List, CheckSquare, Hash, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { flexRender } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import type { DataGridColumnHeaderProps } from "@/types/data-grid"

// Get column type icon based on cell variant
function getColumnTypeIcon(variant: string) {
  switch (variant) {
    case "short-text":
    case "long-text":
      return <Type className="h-4 w-4 text-gray-500" />
    case "select":
    case "multi-select":
      return <List className="h-4 w-4 text-gray-500" />
    case "checkbox":
      return <CheckSquare className="h-4 w-4 text-gray-500" />
    case "number":
      return <Hash className="h-4 w-4 text-gray-500" />
    case "date":
      return <Calendar className="h-4 w-4 text-gray-500" />
    case "location":
      return <MapPin className="h-4 w-4 text-gray-500" />
    default:
      return <Type className="h-4 w-4 text-gray-500" />
  }
}

export function DataGridColumnHeader<TData>({
  header,
  table,
}: DataGridColumnHeaderProps<TData>) {
  if (!header.column.getCanSort()) {
    return <div className="h-10"></div>
  }

  // Get cell variant from column meta
  const cellVariant = header.column.columnDef.meta?.cell?.variant || "short-text"

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-auto p-0 font-medium text-gray-800 hover:bg-gray-200"
        onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
      >
        <span>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</span>
        {header.column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4 text-gray-600" />
        ) : header.column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4 text-gray-600" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 text-gray-500" />
        )}
      </Button>
    </div>
  )
}
