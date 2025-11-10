import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTableConfig } from '../../context/TableConfigContext'
import { luckdbClient } from '../../config/client'
import { DataGrid } from '../data-grid/data-grid'
import { DataGridToolbar } from '../data-grid/data-grid-toolbar'
import { AddRecordDialog } from '../data-grid/add-record-dialog'
import { useDataGrid } from '../../hooks/use-data-grid'
import type { FilterCondition } from '../data-grid/data-grid-filter-menu'
import { applyFilters } from '../../utils/data-grid-filter'
import { toast } from 'sonner'
import { mapFieldTypeToCellVariant, mapFieldOptionsToCellOptions, mapCellVariantToFieldType } from '../../services/fieldMapper'
import { buildCellType } from '../../services/cellTypeHelper'
import { useShareDBSync } from '../../hooks/use-sharedb-sync'
import { ViewTabs } from './ViewTabs'

type Row = { id: string; [key: string]: unknown }

export interface EasyGridViewProps {
  height?: number | 'auto'
  allowCreateRecord?: boolean
}

export function EasyGridView(props: EasyGridViewProps) {
  const { height, allowCreateRecord = false } = props
  const effectiveHeight = height === 'auto' ? 'auto' : (height ?? 600)
  const { tableId } = useTableConfig()

  const [data, setData] = React.useState<Row[]>([])
  const [columns, setColumns] = React.useState<ColumnDef<Row>[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [filterConditions, setFilterConditions] = React.useState<FilterCondition[]>([])
  const [fieldMapping, setFieldMapping] = React.useState<Map<string, string>>(new Map())
  const [columnToFieldMapping, setColumnToFieldMapping] = React.useState<Map<string, string>>(new Map())
  const [, setRecordVersions] = React.useState<Map<string, number>>(new Map())
  const [fields, setFields] = React.useState<any[]>([])
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = React.useState(false)

  // 使用 fieldMapping 参数加载记录（用于在 loadFields 中调用）
  const loadRecordsWithMapping = React.useCallback(async (tId: string, fMapping: Map<string, string>) => {
    if (!tId || fMapping.size === 0) {
      console.log('[EasyGridView] loadRecordsWithMapping: 跳过，tableId:', tId, 'fieldMapping.size:', fMapping.size)
      return
    }
    console.log('[EasyGridView] loadRecordsWithMapping: 开始加载记录，tableId:', tId, 'fieldMapping.size:', fMapping.size)
    setIsLoading(true)
    try {
      const records = await luckdbClient.records.getFullList(tId)
      console.log('[EasyGridView] loadRecordsWithMapping: 获取到记录数量:', records?.length || 0)
      const tableData = records.map((record: any) => {
        const obj: Row = { id: record.id }
        fMapping.forEach((columnId, fieldId) => {
          if (record.data && fieldId in record.data) {
            obj[columnId] = record.data[fieldId]
          }
        })
        setRecordVersions((prev) => {
          const next = new Map(prev)
          next.set(record.id, record.version || 0)
          return next
        })
        return obj
      })
      console.log('[EasyGridView] loadRecordsWithMapping: 处理后的数据数量:', tableData.length)
      setData(tableData)
    } catch (e) {
      console.error('[EasyGridView] loadRecordsWithMapping: 加载记录失败', e)
      toast.error('加载记录失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadFields = React.useCallback(async () => {
    if (!tableId) return
    setIsLoading(true)
    try {
      const fieldsList = await luckdbClient.fields.getFullList(tableId)
      setFields(fieldsList)
      const newFieldMapping = new Map<string, string>()
      const newColumnToFieldMapping = new Map<string, string>()
      const newColumns: ColumnDef<Row>[] = fieldsList.map((field: any) => {
        const columnId = field.id
        newFieldMapping.set(field.id, columnId)
        newColumnToFieldMapping.set(columnId, field.id)
        const cellVariant = mapFieldTypeToCellVariant(field.type as string, field.options)
        const cellOptions = mapFieldOptionsToCellOptions(field.options as any)
        const cellConfig = buildCellType(cellVariant, cellOptions)
        return {
          id: columnId,
          accessorKey: columnId,
          header: field.name,
          meta: { cell: cellConfig },
          minSize: 150
        }
      })
      setColumns(newColumns)
      setFieldMapping(newFieldMapping)
      setColumnToFieldMapping(newColumnToFieldMapping)
      
      // 字段加载完成后，立即加载记录（不等待完成，让 loadRecordsWithMapping 自己管理加载状态）
      if (newFieldMapping.size > 0) {
        console.log('[EasyGridView] loadFields: 字段加载完成，开始加载记录，tableId:', tableId, 'fieldMapping.size:', newFieldMapping.size)
        // 使用新的 fieldMapping 加载记录
        // 注意：这里不等待 loadRecordsWithMapping 完成，让它自己管理加载状态
        loadRecordsWithMapping(tableId, newFieldMapping).catch((e) => {
          // 错误已经在 loadRecordsWithMapping 中处理了
          console.error('[EasyGridView] loadFields: 加载记录失败', e)
        })
      } else {
        console.log('[EasyGridView] loadFields: 字段映射为空，跳过记录加载')
        setIsLoading(false)
      }
    } catch (e) {
      setIsLoading(false)
      toast.error('加载字段失败')
    }
  }, [tableId, loadRecordsWithMapping])

  const loadRecords = React.useCallback(async () => {
    if (!tableId || fieldMapping.size === 0) return
    loadRecordsWithMapping(tableId, fieldMapping)
  }, [tableId, fieldMapping, loadRecordsWithMapping])

  React.useEffect(() => {
    loadFields()
  }, [loadFields])

  // 当 fieldMapping 更新后，立即加载记录（使用 fields.length 作为依赖，因为 React 可以检测数组长度变化）
  React.useEffect(() => {
    if (tableId && fields.length > 0 && fieldMapping.size > 0) {
      loadRecords()
    }
  }, [tableId, fields.length, loadRecords])

  const recordIds = React.useMemo(() => data.map((r) => r.id), [data])

  useShareDBSync({
    tableId: tableId || '',
    recordIds,
    onRecordUpdate: (recordId: string, payload: { data?: Record<string, unknown> }) => {
      const shareDBFields = payload.data || {}
      setData((prev) => {
        const idx = prev.findIndex((r) => r.id === recordId)
        if (idx === -1) {
          const row: Row = { id: recordId }
          Object.keys(shareDBFields).forEach((fid) => (row[fid] = shareDBFields[fid]))
          return [...prev, row]
        }
        const updated = [...prev]
        const row = { ...updated[idx] }
        Object.keys(shareDBFields).forEach((fid) => (row[fid] = shareDBFields[fid]))
        updated[idx] = row
        return updated
      })
    },
    enabled: !!tableId
  })

  const filteredData = React.useMemo(() => {
    return applyFilters({
      data,
      conditions: filterConditions,
      getFieldValue: (row, fieldId) => (row as any)[fieldId]
    })
  }, [data, filterConditions])

  const { table, ...gridProps } = useDataGrid<Row>({
    columns,
    data: filteredData,
    onDataChange: async (newData) => {
      if (!tableId) return
      console.log('[EasyGridView] onDataChange: 开始处理数据变更，新数据行数:', newData.length)
      // 保存旧数据，用于错误恢复
      const oldData = [...data]
      const oldMap = new Map(data.map((r) => [r.id, r]))
      const updates: Array<{ id: string; fields: Record<string, unknown> }> = []
      for (const row of newData) {
        const old = oldMap.get(row.id)
        if (!old) continue
        const fields: Record<string, unknown> = {}
        columnToFieldMapping.forEach((fieldId, columnId) => {
          if ((row as any)[columnId] !== (old as any)[columnId]) {
            fields[fieldId] = (row as any)[columnId]
          }
        })
        if (Object.keys(fields).length > 0) {
          updates.push({ id: (row as any).id, fields })
        }
      }
      if (updates.length > 0) {
        console.log('[EasyGridView] onDataChange: 准备更新', updates.length, '条记录', updates)
        try {
          // 先更新本地数据，提供即时反馈
          setData(newData)
          // 调用 API 更新，使用正确的格式 { records: [...] }
          await luckdbClient.records.batchUpdate(tableId, { records: updates })
          console.log('[EasyGridView] onDataChange: 更新成功')
        } catch (e) {
          console.error('[EasyGridView] onDataChange: 更新失败', e)
          // 如果更新失败，恢复旧数据
          setData(oldData)
          toast.error('保存失败: ' + (e instanceof Error ? e.message : '未知错误'))
        }
      }
    },
    onRowAdd: async () => {
      if (!tableId) return { rowIndex: data.length, columnId: columns[0]?.id || '' }
      const rec = await luckdbClient.records.create(tableId, { data: {} })
      setData((prev) => [...prev, { id: rec.id }])
      return { rowIndex: data.length, columnId: columns[0]?.id || '' }
    },
    onRowsDelete: async (rows, rowIndices) => {
      if (!tableId || !rows || rows.length === 0) return
      console.log('[EasyGridView] onRowsDelete: 开始删除行，数量:', rows.length, 'rowIndices:', rowIndices)
      try {
        const ids = rows.map((r) => (r as any).id).filter((id) => id) // 过滤掉无效的 id
        if (ids.length === 0) {
          console.warn('[EasyGridView] onRowsDelete: 没有有效的记录 ID')
          return
        }
        console.log('[EasyGridView] onRowsDelete: 要删除的记录 ID:', ids)
        await luckdbClient.records.batchDelete(tableId, { recordIds: ids })
        console.log('[EasyGridView] onRowsDelete: 删除成功，更新本地数据')
        setData((prev) => prev.filter((r) => !ids.includes((r as any).id)))
        toast.success(`成功删除 ${ids.length} 条记录`)
      } catch (e) {
        console.error('[EasyGridView] onRowsDelete: 删除失败', e)
        toast.error('删除记录失败: ' + (e instanceof Error ? e.message : '未知错误'))
      }
    },
    onAddColumn: async (cfg) => {
      if (!tableId) return
      const name = cfg.name || `字段 ${columns.length + 1}`
      // 使用 mapCellVariantToFieldType 统一处理类型映射，确保所有类型都正确映射
      // 传入 options 参数以区分关联字段和 URL 链接字段
      const fieldType = mapCellVariantToFieldType(cfg.type as any, cfg.options)
      const field = await luckdbClient.fields.create(tableId, { name, type: fieldType, options: cfg.options })
      const columnId = field.id
      const cellVariant = mapFieldTypeToCellVariant(field.type, field.options)
      const cellOptions = mapFieldOptionsToCellOptions(field.options)
      const cellConfig = buildCellType(cellVariant, cellOptions)
      const newColumn: ColumnDef<Row> = { id: columnId, accessorKey: columnId, header: field.name, meta: { cell: cellConfig }, minSize: 150 }
      setColumns((prev) => [...prev, newColumn])
      setFieldMapping((prev) => new Map(prev).set(field.id, columnId))
      setColumnToFieldMapping((prev) => new Map(prev).set(columnId, field.id))
    },
    enableSearch: true
  })

  const handleAddRecord = React.useCallback(() => {
    setIsAddRecordDialogOpen(true)
  }, [])

  const handleSubmitRecord = React.useCallback(async (recordData: Record<string, unknown>) => {
    if (!tableId) return
    try {
      // 分离附件字段和其他字段
      const attachmentFields: Record<string, Array<{ file: File; name: string; url: string }>> = {}
      const processedData = { ...recordData }
      
      for (const [fieldId, value] of Object.entries(processedData)) {
        const field = fields.find(f => f.id === fieldId)
        if (field?.type === 'attachment' && Array.isArray(value)) {
          // 收集需要上传的文件
          const filesToUpload: Array<{ file: File; name: string; url: string }> = []
          const existingFiles: Array<{ name: string; url: string }> = []
          
          for (const item of value) {
            if (item && typeof item === 'object' && 'file' in item) {
              const file = (item as any).file as File
              if (file) {
                filesToUpload.push({ file, name: file.name, url: (item as any).url || '' })
              } else {
                existingFiles.push({
                  name: (item as any).name || '',
                  url: (item as any).url || '',
                })
              }
            } else {
              existingFiles.push(item as { name: string; url: string })
            }
          }
          
          if (filesToUpload.length > 0) {
            attachmentFields[fieldId] = filesToUpload
            // 先设置为空数组，上传后再更新
            processedData[fieldId] = existingFiles
          } else {
            processedData[fieldId] = existingFiles
          }
        }
      }
      
      // 先创建记录（不包含附件）
      const rec = await luckdbClient.records.create(tableId, { data: processedData })
      
      // 如果有附件需要上传，上传后再更新记录
      if (Object.keys(attachmentFields).length > 0) {
        const updatedData = { ...processedData }
        
        for (const [fieldId, files] of Object.entries(attachmentFields)) {
          const uploadedFiles: Array<{ name: string; url: string }> = []
          
          // 先添加已有文件
          if (Array.isArray(processedData[fieldId])) {
            uploadedFiles.push(...(processedData[fieldId] as Array<{ name: string; url: string }>))
          }
          
          // 上传新文件
          for (const { file, name } of files) {
            try {
              const attachment = await luckdbClient.attachments.upload({
                table_id: tableId,
                field_id: fieldId,
                record_id: rec.id,
              }, file, name)
              
              uploadedFiles.push({
                name: attachment.name || name,
                url: attachment.url || attachment.path || '',
              })
            } catch (uploadError: any) {
              console.error('文件上传失败:', uploadError)
              toast.error(`文件 ${name} 上传失败: ${uploadError?.message || '未知错误'}`)
              // 继续上传其他文件
            }
          }
          
          updatedData[fieldId] = uploadedFiles
        }
        
        // 更新记录，包含附件信息
        await luckdbClient.records.update(rec.id, { data: updatedData })
        
        // 更新本地数据
        const obj: Row = { id: rec.id }
        fieldMapping.forEach((columnId, fieldId) => {
          if (updatedData[fieldId] !== undefined) {
            obj[columnId] = updatedData[fieldId]
          }
        })
        setData((prev) => {
          const index = prev.findIndex(r => r.id === rec.id)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = obj
            return updated
          }
          return [...prev, obj]
        })
      } else {
        // 没有附件，直接更新本地数据
        const obj: Row = { id: rec.id }
        fieldMapping.forEach((columnId, fieldId) => {
          if (processedData[fieldId] !== undefined) {
            obj[columnId] = processedData[fieldId]
          }
        })
        setData((prev) => [...prev, obj])
      }
      
      toast.success('记录创建成功')
      setIsAddRecordDialogOpen(false)
    } catch (error: any) {
      console.error('Failed to create record:', error)
      toast.error(error?.message || '创建记录失败')
      throw error
    }
  }, [tableId, fieldMapping, fields])

  // 处理字段更新
  const handleUpdateField = React.useCallback(async (
    fieldId: string,
    config: { type: string; name?: string; options?: any }
  ) => {
    if (!tableId) return
    try {
      // 将 Dice 单元格类型映射回 SDK 字段类型
      // 传入 options 参数以区分关联字段和 URL 链接字段
      const fieldType = mapCellVariantToFieldType(config.type as any, config.options)
      
      // 构建更新请求
      const updateData: any = {}
      if (config.name !== undefined) {
        updateData.name = config.name
      }
      if (config.type !== undefined) {
        updateData.type = fieldType
      }
      if (config.options !== undefined) {
        // 处理选项转换：将 Dice 格式的 options 转换为 SDK 格式
        const sdkOptions: any = { ...config.options }
        
        // 如果是选择字段，需要将 options.options 转换为 choices
        if (config.type === 'select' || config.type === 'multi-select') {
          if (Array.isArray(sdkOptions.options)) {
            sdkOptions.choices = sdkOptions.options.map((opt: any) => ({
              id: opt.id || opt.value,
              name: opt.name || opt.label || opt.value,
              color: opt.color,
            }))
            delete sdkOptions.options
          }
        }
        
        updateData.options = sdkOptions
      }

      // 调用 API 更新字段
      const updatedField = await luckdbClient.fields.update(fieldId, updateData)
      
      // 更新本地状态
      setFields((prev) => {
        const index = prev.findIndex((f: any) => f.id === fieldId)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = { ...updated[index], ...updatedField }
          return updated
        }
        return prev
      })

      // 更新列定义
      setColumns((prev) => {
        const index = prev.findIndex((col) => col.id === fieldId)
        if (index >= 0) {
          const updated = [...prev]
          const cellVariant = mapFieldTypeToCellVariant(updatedField.type, updatedField.options)
          const cellOptions = mapFieldOptionsToCellOptions(updatedField.options)
          const cellConfig = buildCellType(cellVariant, cellOptions)
          updated[index] = {
            ...updated[index],
            header: updatedField.name,
            meta: { cell: cellConfig },
          }
          return updated
        }
        return prev
      })

      toast.success('字段更新成功')
    } catch (error: any) {
      console.error('Failed to update field:', error)
      toast.error(error?.message || '更新字段失败')
      throw error
    }
  }, [tableId])

  // 获取字段信息
  const getFieldInfo = React.useCallback((columnId: string) => {
    const field = fields.find((f: any) => f.id === columnId)
    if (!field) return null

    // 将 SDK 字段类型映射到 Dice 单元格类型
    const cellVariant = mapFieldTypeToCellVariant(field.type, field.options)
    
    return {
      name: field.name,
      type: cellVariant,
      options: field.options,
    }
  }, [fields])

  // 处理字段删除
  const handleDeleteField = React.useCallback(async (fieldId: string) => {
    if (!tableId) return
    try {
      // 调用 API 删除字段
      await luckdbClient.fields.delete(fieldId)
      
      // 更新本地状态：从 fields 中移除
      setFields((prev) => prev.filter((f: any) => f.id !== fieldId))
      
      // 更新列定义：从 columns 中移除
      setColumns((prev) => prev.filter((col) => col.id !== fieldId))
      
      // 更新映射关系
      setFieldMapping((prev) => {
        const newMap = new Map(prev)
        newMap.delete(fieldId)
        return newMap
      })
      setColumnToFieldMapping((prev) => {
        const newMap = new Map(prev)
        // 找到对应的 columnId 并删除
        for (const [columnId, mappedFieldId] of newMap.entries()) {
          if (mappedFieldId === fieldId) {
            newMap.delete(columnId)
            break
          }
        }
        return newMap
      })
      
      // 从数据中移除该列的数据
      setData((prev) => {
        return prev.map((row) => {
          const newRow = { ...row }
          delete (newRow as any)[fieldId]
          return newRow
        })
      })
      
      toast.success('字段删除成功')
    } catch (error: any) {
      console.error('Failed to delete field:', error)
      toast.error(error?.message || '删除字段失败')
      throw error
    }
  }, [tableId])

  const containerClass = height === 'auto' ? 'flex-1 min-h-0 flex flex-col' : 'flex flex-col'

  return (
    <div className={`${containerClass} rounded-md border`}>
      {/* Row 1: 视图管理 */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {tableId && (
            <ViewTabs
              tableId={tableId}
              table={table}
              filterConditions={filterConditions}
              onFilterConditionsChange={setFilterConditions}
            />
          )}
        </div>
      </div>

      {/* Row 2: Toolbar */}
      {allowCreateRecord && (
        <div className="flex items-center border-b bg-background px-4 py-2">
          <div className="flex-1">
            <DataGridToolbar
              table={table}
              filterConditions={filterConditions}
              onFilterConditionsChange={setFilterConditions}
              onAddRecord={handleAddRecord}
            />
          </div>
        </div>
      )}

      {/* Row 3: 内容 */}
      {allowCreateRecord && (
        <AddRecordDialog
          open={isAddRecordDialogOpen}
          onOpenChange={setIsAddRecordDialogOpen}
          fields={fields}
          onSubmit={handleSubmitRecord}
        />
      )}
      <DataGrid 
        {...gridProps} 
        table={table} 
        height={effectiveHeight}
        onDeleteField={handleDeleteField}
        onUpdateField={handleUpdateField}
        getFieldInfo={getFieldInfo}
      />

      {/* Row 4: 统计 + 添加新记录 */}
      {allowCreateRecord && (
        <div className="flex items-center justify-between border-t bg-background px-4 py-2 text-sm">
          <div className="text-muted-foreground">共 {filteredData.length} 条记录</div>
          <button
            className="inline-flex h-8 items-center gap-2 rounded-md border px-3 hover:bg-accent"
            onClick={handleAddRecord}
          >
            <span>+</span>
            <span>添加新记录</span>
          </button>
        </div>
      )}
    </div>
  )
}


