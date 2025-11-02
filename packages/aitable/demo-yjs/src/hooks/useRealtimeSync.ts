/**
 * useRealtimeSync Hook - ShareDB实时同步管理
 * 基于SDK的ShareDB连接实现实时协作
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { EasyGridSDK } from '@easygrid/sdk'
import { config } from '../config'

export type RealtimeState = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface RealtimeSyncState {
  state: RealtimeState
  retryCount: number
  error: string | null
}

export interface UseRealtimeSyncReturn extends RealtimeSyncState {
  subscribeToRecord: (recordId: string, onUpdate: (data: any) => void) => () => void
  subscribeToTable: (tableId: string, onUpdate: (data: any) => void) => () => void
  updateRecordField: (recordId: string, fieldId: string, value: any) => Promise<boolean>
  retry: () => void
}

export function useRealtimeSync(sdk: EasyGridSDK | null): UseRealtimeSyncReturn {
  const [state, setState] = useState<RealtimeSyncState>({
    state: 'disconnected',
    retryCount: 0,
    error: null
  })

  const subscriptionsRef = useRef<Map<string, () => void>>(new Map())
  const connectionRef = useRef<any>(null)

  // 检查连接状态
  const checkConnectionState = useCallback(() => {
    if (!sdk) return 'disconnected'
    
    const isConnected = sdk.isShareDBConnected()
    return isConnected ? 'connected' : 'disconnected'
  }, [sdk])

  // 更新连接状态
  const updateConnectionState = useCallback(() => {
    const currentState = checkConnectionState()
    setState(prev => ({
      ...prev,
      state: currentState,
      error: currentState === 'disconnected' ? null : prev.error
    }))
  }, [checkConnectionState])

  // 初始化ShareDB连接
  const initializeConnection = useCallback(async () => {
    if (!sdk) return

    setState(prev => ({ ...prev, state: 'connecting', error: null }))

    try {
      // 确保ShareDB已连接
      if (!sdk.isShareDBConnected()) {
        await sdk.connectShareDB()
      }

      const connection = sdk.getShareDBConnection()
      if (!connection) {
        throw new Error('ShareDB连接获取失败')
      }

      connectionRef.current = connection

      // 监听连接状态变化
      connection.on('state', (newState: string) => {
        console.log('📡 ShareDB状态变化:', newState)
        updateConnectionState()
      })

      connection.on('error', (error: Error) => {
        console.error('❌ ShareDB连接错误:', error)
        setState(prev => ({
          ...prev,
          state: 'error',
          error: error.message,
          retryCount: prev.retryCount + 1
        }))
      })

      setState(prev => ({
        ...prev,
        state: 'connected',
        error: null,
        retryCount: 0
      }))

      console.log('✅ ShareDB连接已建立')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '连接失败'
      setState(prev => ({
        ...prev,
        state: 'error',
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }))
      
      console.error('❌ ShareDB连接失败:', error)
    }
  }, [sdk, updateConnectionState])

  // 订阅记录文档
  const subscribeToRecord = useCallback((recordId: string, onUpdate: (data: any) => void): (() => void) => {
    if (!connectionRef.current) {
      console.warn('⚠️ ShareDB连接未建立，无法订阅记录')
      return () => {}
    }

    const doc = connectionRef.current.get('records', recordId)
    const subscriptionKey = `record:${recordId}`

    // 如果已经订阅，先取消
    if (subscriptionsRef.current.has(subscriptionKey)) {
      subscriptionsRef.current.get(subscriptionKey)?.()
    }

    const unsubscribe = () => {
      doc.unsubscribe()
      subscriptionsRef.current.delete(subscriptionKey)
    }

    doc.subscribe((err: Error | null) => {
      if (err) {
        console.error('❌ 记录订阅失败:', err)
        return
      }

      console.log('✅ 记录订阅成功:', recordId)

      // 监听文档变化
      doc.on('op', (op: any[], source: any) => {
        if (!source) {
          // 来自其他客户端的变更
          console.log('📝 收到记录更新:', recordId, op)
          onUpdate(doc.data)
        }
      })

      // 初始数据
      onUpdate(doc.data)
    })

    subscriptionsRef.current.set(subscriptionKey, unsubscribe)
    return unsubscribe
  }, [])

  // 订阅表格文档
  const subscribeToTable = useCallback((tableId: string, onUpdate: (data: any) => void): (() => void) => {
    if (!connectionRef.current) {
      console.warn('⚠️ ShareDB连接未建立，无法订阅表格')
      return () => {}
    }

    const doc = connectionRef.current.get('tables', tableId)
    const subscriptionKey = `table:${tableId}`

    // 如果已经订阅，先取消
    if (subscriptionsRef.current.has(subscriptionKey)) {
      subscriptionsRef.current.get(subscriptionKey)?.()
    }

    const unsubscribe = () => {
      doc.unsubscribe()
      subscriptionsRef.current.delete(subscriptionKey)
    }

    doc.subscribe((err: Error | null) => {
      if (err) {
        console.error('❌ 表格订阅失败:', err)
        return
      }

      console.log('✅ 表格订阅成功:', tableId)

      // 监听文档变化
      doc.on('op', (op: any[], source: any) => {
        if (!source) {
          // 来自其他客户端的变更
          console.log('📝 收到表格更新:', tableId, op)
          onUpdate(doc.data)
        }
      })

      // 初始数据
      onUpdate(doc.data)
    })

    subscriptionsRef.current.set(subscriptionKey, unsubscribe)
    return unsubscribe
  }, [])

  // 更新记录字段
  const updateRecordField = useCallback(async (recordId: string, fieldId: string, value: any): Promise<boolean> => {
    if (!connectionRef.current) {
      console.warn('⚠️ ShareDB连接未建立，无法更新记录')
      return false
    }

    try {
      const doc = connectionRef.current.get('records', recordId)
      
      // 提交操作
      doc.submitOp([{
        p: ['fields', fieldId],
        oi: value
      }])

      console.log('✅ 记录字段更新提交:', recordId, fieldId, value)
      return true
    } catch (error) {
      console.error('❌ 记录字段更新失败:', error)
      return false
    }
  }, [])

  // 重试连接
  const retry = useCallback(() => {
    console.log('🔄 重试ShareDB连接...')
    initializeConnection()
  }, [initializeConnection])

  // 清理订阅
  const cleanup = useCallback(() => {
    subscriptionsRef.current.forEach(unsubscribe => unsubscribe())
    subscriptionsRef.current.clear()
  }, [])

  // 初始化连接
  useEffect(() => {
    if (sdk && sdk.isAuthenticated()) {
      initializeConnection()
    }

    return () => {
      cleanup()
    }
  }, [sdk, initializeConnection, cleanup])

  // 定期检查连接状态
  useEffect(() => {
    const interval = setInterval(() => {
      updateConnectionState()
    }, 5000)

    return () => clearInterval(interval)
  }, [updateConnectionState])

  return {
    ...state,
    subscribeToRecord,
    subscribeToTable,
    updateRecordField,
    retry
  }
}
