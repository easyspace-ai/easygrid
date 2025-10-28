/**
 * useFields Hook
 * 订阅多个字段
 */

import { useEffect, useState, useMemo } from 'react'
import { useConnection } from '../connection/useConnection.js'
import type { ShareDBSnapshot } from '../../core/EasyGridClient.js'

export interface UseFieldsReturn {
  fields: any[]
  loading: boolean
  error: Error | null
  snapshots: ShareDBSnapshot[]
  refetch: () => Promise<void>
}

export function useFields(tableId: string): UseFieldsReturn {
  const { connection, isConnected } = useConnection()
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [snapshots, setSnapshots] = useState<ShareDBSnapshot[]>([])

  const collection = useMemo(() => `fld_${tableId}`, [tableId])

  const refetch = async () => {
    if (!isConnected) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 获取所有字段
      const allFields = await connection!.fetch(collection, 'all')
      setSnapshots([allFields])
      setFields(Array.isArray(allFields.data) ? allFields.data : [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isConnected) {
      setLoading(false)
      setFields([])
      setSnapshots([])
      return
    }

    setLoading(true)
    setError(null)

    // 订阅所有字段
    const unsubscribe = connection!.subscribe(collection, 'all', (snapshot: any) => {
      setSnapshots([snapshot])
      setFields(Array.isArray(snapshot.data) ? snapshot.data : [])
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [connection, isConnected, collection])

  return {
    fields,
    loading,
    error,
    snapshots,
    refetch
  }
}
