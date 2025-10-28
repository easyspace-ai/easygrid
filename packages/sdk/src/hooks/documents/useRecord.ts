/**
 * useRecord Hook
 * 订阅单条记录
 */

import { useEffect, useState, useMemo } from 'react'
import { useConnection } from '../connection/useConnection.js'
import type { ShareDBSnapshot } from '../../core/EasyGridClient.js'

export interface UseRecordReturn {
  record: any | null
  loading: boolean
  error: Error | null
  snapshot?: ShareDBSnapshot
  refetch: () => Promise<void>
}

export function useRecord(tableId: string, recordId: string | undefined): UseRecordReturn {
  const { connection, isConnected } = useConnection()
  const [record, setRecord] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [snapshot, setSnapshot] = useState<ShareDBSnapshot>()

  const collection = useMemo(() => `rec_${tableId}`, [tableId])

  const refetch = async () => {
    if (!recordId || !isConnected) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const newSnapshot = await connection!.fetch(collection, recordId)
      setSnapshot(newSnapshot)
      setRecord(newSnapshot.data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isConnected || !recordId) {
      setLoading(false)
      setRecord(null)
      setSnapshot(undefined)
      return
    }

    setLoading(true)
    setError(null)

    // 订阅文档
    const unsubscribe = connection!.subscribe(collection, recordId, (snapshot: any) => {
      setSnapshot(snapshot)
      setRecord(snapshot.data)
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [connection, isConnected, collection, recordId])

  return {
    record,
    loading,
    error,
    snapshot,
    refetch
  }
}
