import * as React from 'react'
import LuckDBClient, { LocalAuthStore } from '@easygrid/sdk'
import { setLuckdbClient } from '../config/client'
import { LuckdbClientProvider } from '../context/LuckdbClientContext'
import { TableConfigProvider } from '../context/TableConfigContext'
import { cn } from '../lib/utils'
import { EasyGridView } from '../components/grid/EasyGridView'

export interface EasyGridProps {
  client?: LuckDBClient
  serverUrl?: string
  locale?: string
  authStore?: LocalAuthStore
  tableId?: string
  spaceId?: string
  baseId?: string
  height?: number | 'auto'
  showShareDBBadge?: boolean
  allowCreateRecord?: boolean
  children?: React.ReactNode
  render?: () => React.ReactNode
}

export function EasyGrid(props: EasyGridProps) {
  const {
    client,
    serverUrl,
    locale = 'zh-CN',
    authStore,
    tableId,
    spaceId,
    baseId,
    height = 'auto',
    showShareDBBadge,
    allowCreateRecord,
    children,
    render
  } = props

  const contextValue = React.useMemo(() => {
    if (client) return { client, locale }
    const resolvedServer =
      serverUrl ||
      (import.meta as any)?.env?.VITE_API_URL ||
      (import.meta as any)?.env?.VITE_LUCKDB_SERVER_URL ||
      'http://localhost:8080'
    const store = authStore || new LocalAuthStore()
    const c = new LuckDBClient(resolvedServer, store, locale)
    return { client: c, locale }
  }, [client, serverUrl, locale, authStore])

  React.useEffect(() => {
    if (contextValue.client) setLuckdbClient(contextValue.client)
  }, [contextValue.client])

  const content = children ?? render?.() ?? (
    <EasyGridView height={height} />
  )

  return (
    <div className={cn(height === 'auto' && 'h-full flex flex-col flex-1 min-h-0')}>
      <LuckdbClientProvider value={contextValue}>
        <TableConfigProvider value={{ tableId, spaceId, baseId }}>
          {content}
        </TableConfigProvider>
      </LuckdbClientProvider>
    </div>
  )
}

export default EasyGrid
