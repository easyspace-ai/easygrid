import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type PaginationState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import type {
  FocusedCell,
  EditingCell,
  SelectedCells,
  SearchMatch,
  RowHeightValue,
  DataGridCellVariantProps,
} from "@/types/data-grid"

export function useDataGrid<TData>({
  data,
  columns,
  onDataChange,
}: {
  data: TData[]
  columns: ColumnDef<TData>[]
  onDataChange?: (data: TData[]) => void
}) {
  // Refs
  const dataGridRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const rowMapRef = useRef<Map<string, HTMLDivElement>>(new Map())

  // State
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // Cell state
  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [selectedCells, setSelectedCells] = useState<SelectedCells>({})

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([])
  const [matchIndex, setMatchIndex] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)

  // Row height
  const [rowHeight, setRowHeight] = useState<RowHeightValue>("normal")

  // Table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  })

  // Virtualization
  const { rows } = table.getRowModel()
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => dataGridRef.current,
    estimateSize: () => {
      switch (rowHeight) {
        case "compact":
          return 40
        case "comfortable":
          return 64
        default:
          return 48
      }
    },
    overscan: 5,
  })

  // Column size variables
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      colSizes[`--header-${header.id}-size`] = `${header.getSize()}px`
      colSizes[`--col-${header.column.id}-size`] = `${header.column.getSize()}px`
    }
    return colSizes
  }, [table.getFlatHeaders()])

  // Search functionality
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchMatches([])
        setMatchIndex(0)
        return
      }

      const matches: SearchMatch[] = []
      const lowerQuery = query.toLowerCase()

      rows.forEach((row, rowIndex) => {
        row.getVisibleCells().forEach((cell) => {
          const value = String(cell.getValue() || "").toLowerCase()
          const startIndex = value.indexOf(lowerQuery)
          if (startIndex !== -1) {
            matches.push({
              rowIndex,
              columnId: cell.column.id,
              text: String(cell.getValue() || ""),
              startIndex,
              endIndex: startIndex + query.length,
            })
          }
        })
      })

      setSearchMatches(matches)
      setMatchIndex(0)
    },
    [rows]
  )

  // Navigation functions
  const navigateToNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return
    const nextIndex = (matchIndex + 1) % searchMatches.length
    setMatchIndex(nextIndex)
    const match = searchMatches[nextIndex]
    setFocusedCell({ rowIndex: match.rowIndex, columnId: match.columnId })
  }, [searchMatches, matchIndex])

  const navigateToPrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return
    const prevIndex = matchIndex === 0 ? searchMatches.length - 1 : matchIndex - 1
    setMatchIndex(prevIndex)
    const match = searchMatches[prevIndex]
    setFocusedCell({ rowIndex: match.rowIndex, columnId: match.columnId })
  }, [searchMatches, matchIndex])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!focusedCell) return

      const { key, ctrlKey, metaKey } = event
      const isCtrlOrCmd = ctrlKey || metaKey

      // Search shortcuts
      if (isCtrlOrCmd && key === "f") {
        event.preventDefault()
        setSearchOpen(true)
        return
      }

      if (key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false)
          return
        }
        if (editingCell) {
          setEditingCell(null)
          return
        }
        setFocusedCell(null)
        return
      }

      // Navigation
      switch (key) {
        case "ArrowUp":
          event.preventDefault()
          if (focusedCell.rowIndex > 0) {
            setFocusedCell({
              rowIndex: focusedCell.rowIndex - 1,
              columnId: focusedCell.columnId,
            })
          }
          break
        case "ArrowDown":
          event.preventDefault()
          if (focusedCell.rowIndex < rows.length - 1) {
            setFocusedCell({
              rowIndex: focusedCell.rowIndex + 1,
              columnId: focusedCell.columnId,
            })
          }
          break
        case "ArrowLeft":
          event.preventDefault()
          const leftColumnIndex = table
            .getVisibleLeafColumns()
            .findIndex((col) => col.id === focusedCell.columnId)
          if (leftColumnIndex > 0) {
            const leftColumn = table.getVisibleLeafColumns()[leftColumnIndex - 1]
            setFocusedCell({
              rowIndex: focusedCell.rowIndex,
              columnId: leftColumn.id,
            })
          }
          break
        case "ArrowRight":
          event.preventDefault()
          const rightColumnIndex = table
            .getVisibleLeafColumns()
            .findIndex((col) => col.id === focusedCell.columnId)
          if (rightColumnIndex < table.getVisibleLeafColumns().length - 1) {
            const rightColumn = table.getVisibleLeafColumns()[rightColumnIndex + 1]
            setFocusedCell({
              rowIndex: focusedCell.rowIndex,
              columnId: rightColumn.id,
            })
          }
          break
        case "Enter":
          event.preventDefault()
          if (!editingCell) {
            setEditingCell(focusedCell)
          }
          break
        case "Tab":
          event.preventDefault()
          if (editingCell) {
            setEditingCell(null)
          }
          // Move to next cell
          const tabColumnIndex = table
            .getVisibleLeafColumns()
            .findIndex((col) => col.id === focusedCell.columnId)
          if (tabColumnIndex < table.getVisibleLeafColumns().length - 1) {
            const nextColumn = table.getVisibleLeafColumns()[tabColumnIndex + 1]
            setFocusedCell({
              rowIndex: focusedCell.rowIndex,
              columnId: nextColumn.id,
            })
          }
          break
      }
    },
    [focusedCell, editingCell, rows.length, table, searchOpen]
  )

  // Add event listener for keyboard navigation
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Cell editing functions
  const startEditing = useCallback((rowIndex: number, columnId: string) => {
    setEditingCell({ rowIndex, columnId })
    setFocusedCell({ rowIndex, columnId })
  }, [])

  const stopEditing = useCallback(() => {
    setEditingCell(null)
  }, [])

  const updateCellValue = useCallback(
    (rowIndex: number, columnId: string, value: any) => {
      const newData = [...data]
      const row = newData[rowIndex]
      if (row && typeof row === "object") {
        ;(row as any)[columnId] = value
        onDataChange?.(newData)
      }
    },
    [data, onDataChange]
  )

  // Row management
  const addRow = useCallback(() => {
    const newRow = {} as TData
    const newData = [...data, newRow]
    onDataChange?.(newData)
    // Focus the first cell of the new row
    const newRowIndex = newData.length - 1
    const firstColumn = table.getVisibleLeafColumns()[0]
    if (firstColumn) {
      setFocusedCell({ rowIndex: newRowIndex, columnId: firstColumn.id })
      setEditingCell({ rowIndex: newRowIndex, columnId: firstColumn.id })
    }
  }, [data, onDataChange, table])

  const deleteRow = useCallback(
    (rowIndex: number) => {
      const newData = data.filter((_, index) => index !== rowIndex)
      onDataChange?.(newData)
      // Clear focus if deleted row was focused
      if (focusedCell?.rowIndex === rowIndex) {
        setFocusedCell(null)
        setEditingCell(null)
      }
    },
    [data, onDataChange, focusedCell]
  )

  return {
    // Refs
    dataGridRef,
    headerRef,
    footerRef,
    rowMapRef,
    rowVirtualizer,

    // Table
    table,
    rows,
    columnSizeVars,

    // State
    focusedCell,
    editingCell,
    selectedCells,
    rowHeight,

    // Search
    searchQuery,
    searchMatches,
    matchIndex,
    searchOpen,

    // Actions
    setFocusedCell,
    setEditingCell,
    setSelectedCells,
    setRowHeight,
    setSearchQuery,
    setSearchOpen,
    performSearch,
    navigateToNextMatch,
    navigateToPrevMatch,
    startEditing,
    stopEditing,
    updateCellValue,
    addRow,
    deleteRow,
  }
}
