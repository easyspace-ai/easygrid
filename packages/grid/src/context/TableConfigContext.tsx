import * as React from 'react'

export interface TableConfigContextValue {
  tableId?: string
  spaceId?: string
  baseId?: string
}

const TableConfigContext = React.createContext<TableConfigContextValue | undefined>(undefined)

export function useTableConfig(): TableConfigContextValue {
  const ctx = React.useContext(TableConfigContext)
  if (!ctx) throw new Error('useTableConfig must be used within TableConfigProvider')
  return ctx
}

export function TableConfigProvider(props: { value: TableConfigContextValue; children: React.ReactNode }) {
  const { value, children } = props
  return <TableConfigContext.Provider value={value}>{children}</TableConfigContext.Provider>
}


