import * as React from 'react'
import LuckDBClient, { LocalAuthStore } from '@easygrid/sdk'
import { setLuckdbClient } from '@/config/client'
import { setTestTableConfig } from '@/config/testTable'
import ProductGridDemo from '@/components/demos/product-demo'

export interface EasyGridProProps {
  client?: LuckDBClient
  server?: string
  locale?: string
  authStore?: LocalAuthStore
  tableId?: string
  spaceId?: string
  baseId?: string
  height?: number
  showShareDBBadge?: boolean
  enableAddRecordDialog?: boolean
}

export default function EasyGridPro(props: EasyGridProProps) {
  const { client, server, locale = 'zh-CN', authStore, tableId, spaceId, baseId, height, showShareDBBadge, enableAddRecordDialog } = props

  React.useEffect(() => {
    if (client) {
      setLuckdbClient(client)
      return
    }

    const resolvedServer =
      server ||
      (import.meta as any)?.env?.VITE_API_URL ||
      (import.meta as any)?.env?.VITE_LUCKDB_SERVER_URL ||
      'http://localhost:8080'

    const store = authStore || new LocalAuthStore()
    const c = new LuckDBClient(resolvedServer, store, locale)
    setLuckdbClient(c)
  }, [client, server, locale, authStore])

  React.useEffect(() => {
    if (tableId || spaceId || baseId) setTestTableConfig({ tableId, spaceId, baseId })
  }, [tableId, spaceId, baseId])

  return (
    <ProductGridDemo
      height={height}
      showShareDBBadge={showShareDBBadge}
      enableAddRecordDialog={enableAddRecordDialog}
    />
  )
}


