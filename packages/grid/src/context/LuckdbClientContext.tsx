import * as React from 'react'
import type LuckDBClient from '@easygrid/sdk'

export interface LuckdbClientContextValue {
  client: LuckDBClient | null
  locale: string
}

const LuckdbClientContext = React.createContext<LuckdbClientContextValue | undefined>(undefined)

export function useLuckdbClient(): LuckdbClientContextValue {
  const ctx = React.useContext(LuckdbClientContext)
  if (!ctx) throw new Error('useLuckdbClient must be used within LuckdbClientProvider')
  return ctx
}

export function LuckdbClientProvider(props: { value: LuckdbClientContextValue; children: React.ReactNode }) {
  const { value, children } = props
  return <LuckdbClientContext.Provider value={value}>{children}</LuckdbClientContext.Provider>
}


