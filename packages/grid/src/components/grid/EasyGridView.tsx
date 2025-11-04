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
import { mapFieldTypeToCellVariant, mapFieldOptionsToCellOptions } from '../../services/fieldMapper'
import { buildCellType } from '../../services/cellTypeHelper'
import { useShareDBSync } from '../../hooks/use-sharedb-sync'
import { ViewTabs } from './ViewTabs'

type Row = { id: string; [key: string]: unknown }

export interface EasyGridViewProps {
  height?: number | 'auto'
}

export function EasyGridView(props: EasyGridViewProps) {
  const { height } = props
  const effectiveHeight = height === 'auto' ? 'auto' : (height ?? 600)
  const { tableId } = useTableConfig()

  const [data, setData] = React.useState<Row[]>([])
  const [columns, setColumns] = React.useState<ColumnDef<Row>[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [filterConditions, setFilterConditions] = React.useState<FilterCondition[]>([])
  const [fieldMapping, setFieldMapping] = React.useState<Map<string, string>>(new Map())
  const [columnToFieldMapping, setColumnToFieldMapping] = React.useState<Map<string, string>>(new Map())
  const [, setRecordVersions] = React.useState<Map<string, number>>(new Map())

  const loadFields = React.useCallback(async () => {
    if (!tableId) return
    setIsLoading(true)
    try {
      const fields = await luckdbClient.fields.getFullList(tableId)
      const newFieldMapping = new Map<string, string>()
      const newColumnToFieldMapping = new Map<string, string>()
      const newColumns: ColumnDef<Row>[] = fields.map((field: any) => {
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
    } finally {
      setIsLoading(false)
    }
  }, [tableId])

  const loadRecords = React.useCallback(async () => {
    if (!tableId || fieldMapping.size === 0) return
    setIsLoading(true)
    try {
      const records = await luckdbClient.records.getAll(tableId)
      const tableData = records.map((record: any) => {
        const obj: Row = { id: record.id }
        fieldMapping.forEach((columnId, fieldId) => {
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
      setData(tableData)
    } catch (e) {
      toast.error('加载记录失败')
    } finally {
      setIsLoading(false)
    }
  }, [tableId, fieldMapping])

  React.useEffect(() => {
    loadFields()
  }, [loadFields])

  React.useEffect(() => {
    loadRecords()
  }, [loadRecords])

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
      const oldMap = new Map(data.map((r) => [r.id, r]))
      const updates: Array<{ id: string; fields: Record<string, unknown> }> = []
      for (const row of newData) {
        const old = oldMap.get(row.id)
        if (!old) continue
        const fields: Record<string, unknown> = {}
        columnToFieldMapping.forEach((fieldId, columnId) => {
          if ((row as any)[columnId] !== (old as any)[columnId]) fields[fieldId] = (row as any)[columnId]
        })
        if (Object.keys(fields).length > 0) updates.push({ id: (row as any).id, fields })
      }
      if (updates.length > 0) {
        setData(newData)
        await luckdbClient.records.batchUpdate(tableId, updates)
      }
    },
    onRowAdd: async () => {
      if (!tableId) return { rowIndex: data.length, columnId: columns[0]?.id || '' }
      const rec = await luckdbClient.records.create(tableId, { data: {} })
      setData((prev) => [...prev, { id: rec.id }])
      return { rowIndex: data.length, columnId: columns[0]?.id || '' }
    },
    onRowsDelete: async (rows) => {
      if (!tableId) return
      const ids = rows.map((r) => (r as any).id)
      await luckdbClient.records.batchDelete(tableId, ids)
      setData((prev) => prev.filter((r) => !ids.includes((r as any).id)))
    },
    onAddColumn: async (cfg) => {
      if (!tableId) return
      const name = cfg.name || `字段 ${columns.length + 1}`
      let type = 'singleLineText'
      if (cfg.type === 'number') type = 'number'
      if (cfg.type === 'checkbox') type = 'checkbox'
      if (cfg.type === 'select') type = 'singleSelect'
      if (cfg.type === 'multi-select') type = 'multipleSelect'
      if (cfg.type === 'date') type = 'date'
      if (cfg.type === 'long-text') type = 'longText'
      if (cfg.type === 'formula') type = 'formula'
      const field = await luckdbClient.fields.create(tableId, { name, type, options: cfg.options })
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
      <div className="flex items-center border-b bg-background px-4 py-2">
        <div className="flex-1">
          <DataGridToolbar
            table={table}
            filterConditions={filterConditions}
            onFilterConditionsChange={setFilterConditions}
            onAddRecord={() => {}}
          />
        </div>
      </div>

      {/* Row 3: 内容 */}
      <AddRecordDialog open={false} onOpenChange={() => {}} fields={[]} onSubmit={async () => {}} />
      <DataGrid {...gridProps} table={table} height={effectiveHeight} />

      {/* Row 4: 统计 + 添加新记录 */}
      <div className="flex items-center justify-between border-t bg-background px-4 py-2 text-sm">
        <div className="text-muted-foreground">共 {filteredData.length} 条记录</div>
        <button
          className="inline-flex h-8 items-center rounded-md border px-3 hover:bg-accent"
          onClick={async () => {
            if (!tableId) return
            const rec = await luckdbClient.records.create(tableId, { data: {} })
            setData((prev) => [...prev, { id: rec.id }])
          }}
        >
          添加新记录
        </button>
      </div>
    </div>
  )
}


