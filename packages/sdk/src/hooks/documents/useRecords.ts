/**
 * useRecords Hook
 * 订阅多条记录
 */

import { useEffect, useState, useMemo } from 'react'
import { useConnection } from '../connection/useConnection.js'
import type { ShareDBSnapshot } from '../../core/EasyGridClient.js'

export interface QueryOptions {
  filter?: any
  sort?: any
  limit?: number
  skip?: number
  projection?: Record<string, boolean>
  viewId?: string
}

export interface UseRecordsReturn {
  records: any[]
  fields: any[]
  loading: boolean
  error: Error | null
  snapshots: ShareDBSnapshot[]
  refetch: () => Promise<void>
}

export function useRecords(tableId: string, query?: QueryOptions): UseRecordsReturn {
  const { connection, isConnected } = useConnection()
  const [records, setRecords] = useState<any[]>([])
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [snapshots, setSnapshots] = useState<ShareDBSnapshot[]>([])

  const collection = useMemo(() => `rec_${tableId}`, [tableId])

  const refetch = async () => {
    if (!isConnected) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 获取记录数据
      const allRecords = await connection!.fetch(collection, 'all')
      setSnapshots([allRecords])
      setRecords(Array.isArray(allRecords.data) ? allRecords.data : [])
      
      // 获取字段数据
      const fieldsCollection = `fld_${tableId}`
      const allFields = await connection!.fetch(fieldsCollection, 'all')
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
      setRecords([])
      setFields([])
      setSnapshots([])
      return
    }

    setLoading(true)
    setError(null)

    // 订阅记录查询结果
    const unsubscribeRecords = connection!.subscribe(collection, 'query', (snapshot: any) => {
      setSnapshots([snapshot])
      setRecords(Array.isArray(snapshot.data) ? snapshot.data : [])
    })

    // 订阅字段查询结果
    const fieldsCollection = `fld_${tableId}`
    const unsubscribeFields = connection!.subscribe(fieldsCollection, 'query', (snapshot: any) => {
      setFields(Array.isArray(snapshot.data) ? snapshot.data : [])
      setLoading(false)
    })

    return () => {
      unsubscribeRecords()
      unsubscribeFields()
    }
  }, [connection, isConnected, collection, tableId, JSON.stringify(query)])

  return {
    records,
    fields,
    loading,
    error,
    snapshots,
    refetch
  }
}
