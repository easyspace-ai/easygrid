import React from "react"
import { flexRender } from "@tanstack/react-table"
import { DataGridRow } from "./data-grid-row"
import { DataGridColumnHeader } from "./data-grid-column-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DataGridProps } from "@/types/data-grid"

export function DataGrid<TData>({
  table,
  dataGridRef,
  headerRef,
  footerRef,
  rowMapRef,
  rowVirtualizer,
  height = 600,
  searchState,
  columnSizeVars,
  onRowAdd,
}: DataGridProps<TData>) {
  const { rows } = table.getRowModel()

  return (
    <div className="w-full">
      {/* Header */}
      <div
        ref={headerRef}
        className="sticky top-0 z-10 bg-gray-100 border-b border-gray-300"
        style={columnSizeVars}
      >
        <div className="flex">
          {table.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => (
              <div
                key={header.id}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-800 border-r border-gray-300 relative group"
                style={{
                  width: `${header.getSize()}px`,
                }}
              >
                <DataGridColumnHeader header={header} table={table} />
                {/* Column resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    const startX = e.clientX
                    const startWidth = header.getSize()
                    
                    const handleMouseMove = (e: MouseEvent) => {
                      const newWidth = Math.max(50, startWidth + (e.clientX - startX))
                      header.column.setSize(newWidth)
                    }
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove)
                      document.removeEventListener('mouseup', handleMouseUp)
                    }
                    
                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Data Grid */}
      <div
        ref={dataGridRef}
        className="relative overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            if (!row) return null

            return (
              <DataGridRow
                key={row.id}
                row={row}
                rowMapRef={rowMapRef}
                virtualRowIndex={virtualRow.index}
                rowVirtualizer={rowVirtualizer}
                rowHeight="normal"
                focusedCell={null} // Will be managed by parent
              />
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        ref={footerRef}
        className="sticky bottom-0 z-10 bg-white border-t border-gray-300"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-sm text-gray-600">
            {table.getFilteredRowModel().rows.length} of{" "}
            {table.getCoreRowModel().rows.length} row(s) total
          </div>
          <div className="flex items-center space-x-2">
            {onRowAdd && (
              <Button onClick={onRowAdd} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add row
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
