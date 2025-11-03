"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Database,
  Table,
  Eye,
  Plus,
  MoreHorizontal,
  Copy,
  Trash2,
  Settings,
  Search,
  GripVertical,
  X,
  Edit,
  Pencil,
} from 'lucide-react'
import luckdb from '@/lib/luckdb'
import type { Base, Table as TableType, View } from '@easygrid/sdk'
import { toast } from 'sonner'

interface DatabaseSidebarProps {
  base?: Base | null
  tables: TableType[]
  views: View[]
  selectedTableId?: string | null
  onTableSelect: (table: TableType) => void
  onTableCreate: (name: string, description?: string) => void
  onTableDelete: (tableId: string) => void
  onTableUpdate?: (tableId: string, updates: Partial<TableType>) => void
  loading?: boolean
}

export function DatabaseSidebar({
  base,
  tables,
  views,
  selectedTableId,
  onTableSelect,
  onTableCreate,
  onTableDelete,
  onTableUpdate,
  loading = false
}: DatabaseSidebarProps) {
  const navigate = useNavigate()
  const { baseId, tableId, viewId } = useParams<{ baseId: string }>()
  const [creatingTable, setCreatingTable] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [newTableDescription, setNewTableDescription] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null)
  const [hoveredViewId, setHoveredViewId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const rightClickRefMap = useRef<Map<string, boolean>>(new Map())

  // 过滤表格和视图
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables
    const query = searchQuery.toLowerCase()
    return tables.filter(table => 
      table.name.toLowerCase().includes(query)
    )
  }, [tables, searchQuery])

  const filteredViews = useMemo(() => {
    if (!searchQuery.trim()) return views
    const query = searchQuery.toLowerCase()
    return views.filter(view => 
      view.name.toLowerCase().includes(query)
    )
  }, [views, searchQuery])

  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      toast.error('请输入表格名称')
      return
    }

    try {
      setCreatingTable(true)
      await onTableCreate(newTableName.trim(), newTableDescription.trim() || undefined)
      
      setNewTableName('')
      setNewTableDescription('')
      setDialogOpen(false)
      
      toast.success('创建表格成功')
    } catch (error: any) {
      toast.error(error?.message || '创建表格失败')
    } finally {
      setCreatingTable(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full min-w-[240px] bg-muted/20 flex flex-col border-r border-border h-full">
        <div className="p-3 border-b border-border bg-muted/30">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-[240px] bg-muted/20 flex flex-col border-r border-border h-full">
      {/* 数据库信息头部 */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{base?.name || '数据库'}</h2>
            {base?.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {base.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索表格或视图..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs bg-background/50 border-border focus-visible:ring-2"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 hover:bg-muted"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* 创建表格按钮 */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={creatingTable}
                className="w-full h-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                size="sm"
              >
                <Plus className="h-3 w-3" />
                {creatingTable ? '创建中...' : '新建表格'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>创建新表格</DialogTitle>
                <DialogDescription>
                  在当前数据库中创建一个新的表格
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="table-name" className="text-right">
                    表格名称
                  </Label>
                  <Input
                    id="table-name"
                    placeholder="例如：客户列表"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    disabled={creatingTable}
                    className="col-span-3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleCreateTable()
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="table-description" className="text-right">
                    描述
                  </Label>
                  <Textarea
                    id="table-description"
                    placeholder="简要描述这个表格的用途（可选）"
                    value={newTableDescription}
                    onChange={(e) => setNewTableDescription(e.target.value)}
                    disabled={creatingTable}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewTableName('')
                    setNewTableDescription('')
                    setDialogOpen(false)
                  }}
                  disabled={creatingTable}
                >
                  取消
                </Button>
                <Button onClick={handleCreateTable} disabled={creatingTable}>
                  {creatingTable ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 表格列表 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                数据表
              </h3>
              {filteredTables.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {filteredTables.length}
                </Badge>
              )}
            </div>
            {filteredTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">未找到匹配的表格</p>
                  </>
                ) : (
                  <>
                    <Table className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">暂无数据表</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTables.map((table) => (
                  <div
                    key={table.id}
                    className={cn(
                      'group relative flex items-center gap-2 p-1.5 rounded-md transition-all duration-150',
                      'hover:bg-muted/70 hover:shadow-sm',
                      selectedTableId === table.id && 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                    )}
                    onMouseEnter={() => setHoveredTableId(table.id)}
                    onMouseLeave={() => setHoveredTableId(null)}
                    onMouseDown={(e) => {
                      // 右键点击
                      if (e.button === 2) {
                        e.preventDefault()
                        e.stopPropagation()
                        rightClickRefMap.current.set(table.id, true)
                        setOpenMenuId(table.id)
                        // 延迟重置标志，防止后续的 click 事件触发
                        setTimeout(() => {
                          rightClickRefMap.current.set(table.id, false)
                        }, 300)
                      } else {
                        rightClickRefMap.current.set(table.id, false)
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <div 
                      className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        // 如果标志位为 true 或菜单已打开，说明是右键触发的，不执行点击操作
                        if (rightClickRefMap.current.get(table.id) || openMenuId === table.id) {
                          e.preventDefault()
                          e.stopPropagation()
                          return
                        }
                        onTableSelect(table)
                      }}
                    >
                      <Table className={cn(
                        "h-3.5 w-3.5 flex-shrink-0 transition-colors",
                        selectedTableId === table.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "font-medium text-xs truncate flex-1 min-w-0",
                        selectedTableId === table.id && "text-primary font-semibold"
                      )} title={table.name}>
                        {table.name}
                      </span>
                    </div>
                    
                    {/* 右键菜单图标提示 */}
                    <div className="flex-shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                    </div>
                    
                    {/* 右键菜单 */}
                    <DropdownMenu 
                      open={openMenuId === table.id}
                      onOpenChange={(open) => setOpenMenuId(open ? table.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="absolute inset-0 opacity-0 pointer-events-none"
                          data-menu-trigger
                          aria-label="右键菜单"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="w-48"
                        sideOffset={4}
                      >
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.stopPropagation()
                            const newName = window.prompt('重命名为：', table.name)
                            if (!newName || !newName.trim() || newName.trim() === table.name) return
                            try {
                              // 尝试使用 updateTable API
                              const updated = await (luckdb.tables as any).updateTable(table.id, { 
                                name: newName.trim() 
                              })
                              // 如果有 onTableUpdate 回调，使用它更新状态
                              if (onTableUpdate) {
                                onTableUpdate(table.id, { name: newName.trim() } as any)
                              }
                              toast.success('重命名成功')
                            } catch (err: any) {
                              // 如果 updateTable 不存在，尝试使用 renameTable
                              try {
                                const updated = await (luckdb.tables as any).renameTable(table.id, { 
                                  name: newName.trim() 
                                })
                                if (onTableUpdate) {
                                  onTableUpdate(table.id, { name: newName.trim() } as any)
                                }
                                toast.success('重命名成功')
                              } catch (err2: any) {
                                console.error('重命名失败:', err2)
                                toast.error(err2?.message || '重命名失败')
                              }
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const usage = await luckdb.tables.getTableUsage(table.id)
                              const percent = (usage.usagePercentage || 0).toFixed(2)
                              toast.info(`数据表用量：${percent}% (记录 ${usage.recordCount}/${usage.maxRecords})`)
                            } catch (err: any) {
                              toast.error(err?.message || '获取用量失败')
                            }
                          }}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          数据表用量
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const duplicated = await luckdb.tables.duplicateTable(table.id, {
                                name: `${table.name} (副本)`,
                                withData: true,
                                withViews: true,
                                withFields: true
                              })
                              toast.success('复制成功')
                              window.location.reload()
                            } catch (err: any) {
                              toast.error(err?.message || '复制失败')
                            }
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          复制数据表
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!window.confirm('确定删除该数据表？此操作不可撤销。')) return
                            try {
                              await onTableDelete(table.id)
                              toast.success('删除成功')
                            } catch (err: any) {
                              toast.error(err?.message || '删除失败')
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除数据表
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 视图列表 */}
          {selectedTableId && (
            <>
              <Separator className="my-2" />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    视图
                  </h3>
                  {filteredViews.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      {filteredViews.length}
                    </Badge>
                  )}
                </div>
                {filteredViews.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    {searchQuery ? (
                      <>
                        <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">未找到匹配的视图</p>
                      </>
                    ) : (
                      <>
                        <Eye className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">暂无视图</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredViews.map((view) => (
                      <div
                        key={view.id}
                        className={cn(
                          'group relative flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-all duration-150',
                          'hover:bg-muted/70 hover:shadow-sm',
                          viewId === view.id && 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                        )}
                        onClick={() => {
                          navigate(`/base/${baseId}/${selectedTableId}/${view.id}`)
                        }}
                        onMouseEnter={() => setHoveredViewId(view.id)}
                        onMouseLeave={() => setHoveredViewId(null)}
                      >
                        <Eye className={cn(
                          "h-3.5 w-3.5 flex-shrink-0 transition-colors",
                          viewId === view.id ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "font-medium text-xs truncate flex-1 min-w-0",
                          viewId === view.id && "text-primary font-semibold"
                        )} title={view.name}>
                          {view.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* 底部设置 */}
      <div className="border-t border-border p-2 bg-muted/30">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-2 h-8 text-xs hover:bg-muted/70"
        >
          <Settings className="h-3.5 w-3.5" />
          数据库设置
        </Button>
      </div>
    </div>
  )
}
