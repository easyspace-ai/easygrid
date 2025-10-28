/**
 * useField Hook
 * 订阅单个字段
 */

import { useEffect, useState, useMemo } from 'react'
import { useConnection } from '../connection/useConnection.js'
import type { ShareDBSnapshot } from '../../core/EasyGridClient.js'

export interface UseFieldReturn {
  field: any | null
  loading: boolean
  error: Error | null
  snapshot?: ShareDBSnapshot
  refetch: () => Promise<void>
}

export function useField(tableId: string, fieldId: string | undefined): UseFieldReturn {
  const { connection, isConnected } = useConnection()
  const [field, setField] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [snapshot, setSnapshot] = useState<ShareDBSnapshot>()

  const collection = useMemo(() => `fld_${tableId}`, [tableId])

  const refetch = async () => {
    if (!fieldId || !isConnected) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const newSnapshot = await connection!.fetch(collection, fieldId)
      setSnapshot(newSnapshot)
      setField(newSnapshot.data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isConnected || !fieldId) {
      setLoading(false)
      setField(null)
      setSnapshot(undefined)
      return
    }

    setLoading(true)
    setError(null)

    // 订阅字段
    const unsubscribe = connection!.subscribe(collection, fieldId, (snapshot: any) => {
      setSnapshot(snapshot)
      setField(snapshot.data)
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [connection, isConnected, collection, fieldId])

  return {
    field,
    loading,
    error,
    snapshot,
    refetch
  }
}
