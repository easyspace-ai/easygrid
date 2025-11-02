/**
 * useTableData Hook - 表格数据管理
 * 整合HTTP API和ShareDB实时更新
 */

import { useState, useEffect, useCallback } from 'react'
import { EasyGridSDK } from '@easygrid/sdk'
import { config } from '../config'

export interface Field {
  id: string
  name: string
  type: string
  options?: any
}

export interface Record {
  id: string
  fields: Record<string, any>
  createdTime?: string
  lastModifiedTime?: string
}

export interface TableData {
  fields: Field[]
  records: Record[]
  isLoading: boolean
  error: string | null
}

export interface UseTableDataReturn extends TableData {
  refreshData: () => Promise<void>
  addRecord: (fields: Record<string, any>) => Promise<Record | null>
  updateRecord: (recordId: string, fields: Record<string, any>) => Promise<boolean>
  deleteRecord: (recordId: string) => Promise<boolean>
  addField: (field: Omit<Field, 'id'>) => Promise<Field | null>
  updateField: (fieldId: string, updates: Partial<Field>) => Promise<boolean>
  deleteField: (fieldId: string) => Promise<boolean>
}

export function useTableData(sdk: EasyGridSDK | null, tableId: string): UseTableDataReturn {
  const [data, setData] = useState<TableData>({
    fields: [],
    records: [],
    isLoading: false,
    error: null
  })

  // 加载表格数据
  const loadTableData = useCallback(async () => {
    if (!sdk || !tableId) return

    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 并行加载字段和记录
      const [fieldsResponse, recordsResponse] = await Promise.all([
        sdk.fields.listTableFields(tableId),
        sdk.records.listTableRecords(tableId)
      ])

      // 确保数据结构正确
      const fields = Array.isArray(fieldsResponse) ? fieldsResponse : []
      const records = Array.isArray(recordsResponse.data) ? recordsResponse.data : []
      
      // 确保每个记录都有fields属性，从data属性映射
      const normalizedRecords = records.map(record => ({
        ...record,
        fields: record.data || {} // 使用data属性而不是fields
      }))

      setData(prev => ({
        ...prev,
        fields,
        records: normalizedRecords,
        isLoading: false,
        error: null
      }))

      console.log('✅ 表格数据加载成功:', {
        fields: fieldsResponse.data?.length || 0,
        records: recordsResponse.data?.length || 0
      })
      
      console.log('🔍 调试 - 字段数据:', fields)
      console.log('🔍 调试 - 记录数据:', normalizedRecords)
      console.log('🔍 调试 - 第一条记录详情:', normalizedRecords[0])
      console.log('🔍 调试 - 原始API响应:', { fieldsResponse, recordsResponse })
      console.log('🔍 调试 - 原始记录数据结构:', records[0])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载数据失败'
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      
      console.error('❌ 表格数据加载失败:', error)
    }
  }, [sdk, tableId])

  // 刷新数据
  const refreshData = useCallback(async () => {
    await loadTableData()
  }, [loadTableData])

  // 添加记录
  const addRecord = useCallback(async (fields: Record<string, any>): Promise<Record | null> => {
    if (!sdk || !tableId) return null

    try {
      const response = await sdk.records.create(tableId, { fields })
      
      if (response) {
        setData(prev => ({
          ...prev,
          records: [...prev.records, response]
        }))
        
        console.log('✅ 记录添加成功:', response.id)
        return response
      }
      
      return null
    } catch (error) {
      console.error('❌ 添加记录失败:', error)
      return null
    }
  }, [sdk, tableId])

  // 更新记录
  const updateRecord = useCallback(async (recordId: string, fields: Record<string, any>): Promise<boolean> => {
    if (!sdk || !tableId) return false

    try {
      await sdk.records.update(tableId, recordId, { fields })
      
      // 更新本地状态
      setData(prev => ({
        ...prev,
        records: prev.records.map(record => 
          record.id === recordId 
            ? { ...record, fields: { ...record.fields, ...fields } }
            : record
        )
      }))
      
      console.log('✅ 记录更新成功:', recordId)
      return true
    } catch (error) {
      console.error('❌ 更新记录失败:', error)
      return false
    }
  }, [sdk, tableId])

  // 删除记录
  const deleteRecord = useCallback(async (recordId: string): Promise<boolean> => {
    if (!sdk || !tableId) return false

    try {
      await sdk.records.delete(tableId, recordId)
      
      // 更新本地状态
      setData(prev => ({
        ...prev,
        records: prev.records.filter(record => record.id !== recordId)
      }))
      
      console.log('✅ 记录删除成功:', recordId)
      return true
    } catch (error) {
      console.error('❌ 删除记录失败:', error)
      return false
    }
  }, [sdk, tableId])

  // 添加字段
  const addField = useCallback(async (field: Omit<Field, 'id'>): Promise<Field | null> => {
    if (!sdk || !tableId) return null

    try {
      const response = await sdk.fields.createFieldInTable(tableId, field)
      
      if (response) {
        setData(prev => ({
          ...prev,
          fields: [...prev.fields, response]
        }))
        
        console.log('✅ 字段添加成功:', response.id)
        return response
      }
      
      return null
    } catch (error) {
      console.error('❌ 添加字段失败:', error)
      return null
    }
  }, [sdk, tableId])

  // 更新字段
  const updateField = useCallback(async (fieldId: string, updates: Partial<Field>): Promise<boolean> => {
    if (!sdk || !tableId) return false

    try {
      await sdk.fields.updateField(tableId, fieldId, updates)
      
      // 更新本地状态
      setData(prev => ({
        ...prev,
        fields: prev.fields.map(field => 
          field.id === fieldId 
            ? { ...field, ...updates }
            : field
        )
      }))
      
      console.log('✅ 字段更新成功:', fieldId)
      return true
    } catch (error) {
      console.error('❌ 更新字段失败:', error)
      return false
    }
  }, [sdk, tableId])

  // 删除字段
  const deleteField = useCallback(async (fieldId: string): Promise<boolean> => {
    if (!sdk || !tableId) return false

    try {
      await sdk.fields.deleteField(tableId, fieldId)
      
      // 更新本地状态
      setData(prev => ({
        ...prev,
        fields: prev.fields.filter(field => field.id !== fieldId)
      }))
      
      console.log('✅ 字段删除成功:', fieldId)
      return true
    } catch (error) {
      console.error('❌ 删除字段失败:', error)
      return false
    }
  }, [sdk, tableId])

  // 初始加载
  useEffect(() => {
    loadTableData()
  }, [loadTableData])

  return {
    ...data,
    refreshData,
    addRecord,
    updateRecord,
    deleteRecord,
    addField,
    updateField,
    deleteField
  }
}
