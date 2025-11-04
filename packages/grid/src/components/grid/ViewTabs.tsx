"use client";

import * as React from 'react'
import type { Table } from '@tanstack/react-table'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Plus, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { luckdbClient } from '../../config/client'
import type { ViewResponse, ViewConfig, ViewFilter } from '@easygrid/sdk'
import type { FilterCondition } from '../data-grid/data-grid-filter-menu'

interface ViewTabsProps<TData> {
  tableId: string
  table: Table<TData>
  filterConditions: FilterCondition[]
  onFilterConditionsChange: (v: FilterCondition[]) => void
  onActiveViewChange?: (viewId: string) => void
}

export function ViewTabs<TData>({ tableId, table, filterConditions, onFilterConditionsChange, onActiveViewChange }: ViewTabsProps<TData>) {
  const [views, setViews] = React.useState<ViewResponse[]>([])
  const [activeId, setActiveId] = React.useState<string | undefined>(undefined)
  const [loading, setLoading] = React.useState(false)
  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState('')

  const loadViews = React.useCallback(async () => {
    if (!tableId) return
    setLoading(true)
    try {
      const list = await luckdbClient.views.getFullList(tableId)
      setViews(list)
      if (!activeId) {
        const first = list[0]
        if (first) {
          setActiveId(first.id)
          applyConfig(first.config)
          onActiveViewChange?.(first.id)
        }
      }
      if (list.length === 0) {
        // create a default view
        const config = readCurrentConfig()
        const created = await luckdbClient.views.create(tableId, { name: '表格视图', type: 'grid', config })
        setViews([created])
        setActiveId(created.id)
        onActiveViewChange?.(created.id)
      }
    } catch {
      toast.error('加载视图失败')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId])

  React.useEffect(() => {
    loadViews()
  }, [loadViews])

  const applyConfig = React.useCallback((config?: ViewConfig) => {
    if (!config) return
    // columns visibility
    const all = table.getAllLeafColumns()
    const visibility: Record<string, boolean> = {}
    const allowed = new Set(config.fields ?? all.map(c => c.id))
    all.forEach(c => { visibility[c.id] = allowed.has(c.id) })
    table.setColumnVisibility(visibility)
    // filters
    if (Array.isArray(config.filters)) {
      const fc: FilterCondition[] = config.filters.map((f: ViewFilter) => ({
        fieldId: f.field,
        operator: f.operator as any,
        value: f.value as any
      }))
      onFilterConditionsChange(fc)
    }
  }, [table, onFilterConditionsChange])

  const readCurrentConfig = React.useCallback((): ViewConfig => {
    const cv = table.getState().columnVisibility as Record<string, boolean>
    const fields = table.getAllLeafColumns().filter(c => cv[c.id] !== false).map(c => c.id)
    const filters: ViewFilter[] = (filterConditions || []).map((f) => ({
      field: (f as any).fieldId,
      operator: (f as any).operator,
      value: (f as any).value,
    }))
    return { fields, filters }
  }, [table, filterConditions])

  const onTabChange = React.useCallback((value: string) => {
    setActiveId(value)
    const v = views.find(v => v.id === value)
    if (v) applyConfig(v.config)
    onActiveViewChange?.(value)
  }, [views, applyConfig, onActiveViewChange])

  const onCreate = React.useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!tableId) return
    try {
      const config = readCurrentConfig() || {}
      const created = await luckdbClient.views.create(tableId, { name: `表格视图${views.length + 1}` , type: 'grid', config })
      // refresh from server to avoid stale state
      const fresh = await luckdbClient.views.getFullList(tableId)
      setViews(fresh)
      setActiveId(created.id)
      toast.success('已创建视图')
    } catch {
      toast.error('创建视图失败')
    }
  }, [tableId, readCurrentConfig, views.length])

  const onSave = React.useCallback(async (id: string) => {
    try {
      const config = readCurrentConfig()
      await luckdbClient.views.update(id, { config })
      toast.success('视图已保存')
    } catch {
      toast.error('保存失败')
    }
  }, [readCurrentConfig])

  const onDuplicate = React.useCallback(async (id: string) => {
    try {
      const name = `${views.find(v => v.id === id)?.name || '视图'} 副本`
      const dup = await luckdbClient.views.duplicate(id, name)
      setViews(prev => [...prev, dup])
      setActiveId(dup.id)
      toast.success('已复制视图')
    } catch {
      toast.error('复制失败')
    }
  }, [views])

  const onDelete = React.useCallback(async (id: string) => {
    try {
      await luckdbClient.views.delete(id)
      setViews(prev => prev.filter(v => v.id !== id))
      if (activeId === id) {
        const next = views.find(v => v.id !== id)
        if (next) {
          setActiveId(next.id)
          applyConfig(next.config)
        } else {
          onCreate()
        }
      }
      toast.success('已删除视图')
    } catch {
      toast.error('删除失败')
    }
  }, [activeId, views, applyConfig, onCreate])

  const beginRename = (v: ViewResponse) => {
    setRenamingId(v.id)
    setRenameValue(v.name)
  }
  const commitRename = async () => {
    const id = renamingId
    if (!id) return
    try {
      const updated = await luckdbClient.views.update(id, { name: renameValue })
      setViews(prev => prev.map(v => v.id === id ? updated : v))
      setRenamingId(null)
      toast.success('已重命名')
    } catch {
      toast.error('重命名失败')
    }
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <Tabs value={activeId} onValueChange={onTabChange} className="shrink-0">
        <TabsList>
          {views.map(v => (
            <div key={v.id} className="group relative flex items-center">
              <TabsTrigger value={v.id} className="px-3">
                {renamingId === v.id ? (
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null) }}
                    className="h-7 w-28"
                    autoFocus
                  />
                ) : (
                  <span className="truncate max-w-[140px]">{v.name}</span>
                )}
              </TabsTrigger>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -ml-2">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onSelect={() => beginRename(v)}>重命名</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onSave(v.id)}>保存</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDuplicate(v.id)}>复制</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => onDelete(v.id)}>删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </TabsList>
      </Tabs>
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={onCreate}>
        <Plus className="size-4" />
      </Button>
    </div>
  )
}

export default ViewTabs


