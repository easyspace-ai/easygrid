import type { ColumnDef, Table } from "@tanstack/react-table"

export type RowHeightValue = "compact" | "normal" | "comfortable"

export interface DataGridCellVariantProps<TData> {
  cell: any
  table: Table<TData>
  rowIndex: number
  columnId: string
  isFocused: boolean
  isEditing: boolean
  isSelected: boolean
}

export interface CellMeta {
  cell?: {
    variant?: "short-text" | "long-text" | "number" | "select" | "multi-select" | "checkbox" | "date"
    options?: Array<{ label: string; value: string }>
    min?: number
    max?: number
    step?: number
  }
}

export interface SearchMatch {
  rowIndex: number
  columnId: string
  text: string
  startIndex: number
  endIndex: number
}

export interface FocusedCell {
  rowIndex: number
  columnId: string
}

export interface EditingCell {
  rowIndex: number
  columnId: string
}

export interface SelectedCells {
  [key: string]: boolean
}

export interface DataGridProps<TData> {
  table: Table<TData>
  dataGridRef: React.RefObject<HTMLDivElement>
  headerRef: React.RefObject<HTMLDivElement>
  footerRef: React.RefObject<HTMLDivElement>
  rowMapRef: React.RefObject<Map<string, HTMLDivElement>>
  rowVirtualizer: any
  height?: number
  searchState?: {
    query: string
    matches: SearchMatch[]
    matchIndex: number
  }
  columnSizeVars: Record<string, string>
  onRowAdd?: () => void
}

export interface DataGridColumnHeaderProps<TData> {
  header: any
  table: Table<TData>
}

export interface DataGridCellProps<TData> {
  cell: any
  table: Table<TData>
}

export interface DataGridCellWrapperProps<TData> {
  cell: any
  table: Table<TData>
  rowIndex: number
  columnId: string
  isFocused: boolean
  isEditing: boolean
  isSelected: boolean
  children: React.ReactNode
}

export interface DataGridRowProps<TData> {
  row: any
  rowMapRef: React.RefObject<Map<string, HTMLDivElement>>
  virtualRowIndex: number
  rowVirtualizer: any
  rowHeight: RowHeightValue
  focusedCell: FocusedCell | null
}

export interface DataGridSearchProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  searchMatches: SearchMatch[]
  matchIndex: number
  searchOpen: boolean
  onSearchOpenChange: (open: boolean) => void
  onNavigateToNextMatch: () => void
  onNavigateToPrevMatch: () => void
  onSearch: (query: string) => void
}

export interface DataGridContextMenuProps<TData> {
  table: Table<TData>
}

export interface DataGridSortMenuProps<TData> {
  table: Table<TData>
}

export interface DataGridRowHeightMenuProps<TData> {
  table: Table<TData>
}

export interface DataGridViewMenuProps<TData> {
  table: Table<TData>
}

export interface DataGridKeyboardShortcutsProps {
  enableSearch?: boolean
}

// Skateboard trick data types
export interface SkateTrick {
  id: string
  trickName?: string
  skaterName?: string
  difficulty?: "beginner" | "intermediate" | "advanced" | "expert"
  variant?: "flip" | "grind" | "grab" | "transition" | "manual" | "slide"
  landed?: boolean
  attempts?: number
  bestScore?: number
  location?: string
  dateAttempted?: string
}

export type SkateTrickColumnDef = ColumnDef<SkateTrick>


