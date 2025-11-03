"use client"

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  ChevronRight,
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
  loading = false
}: DatabaseSidebarProps) {
  const navigate = useNavigate()
  const { baseId } = useParams<{ baseId: string }>()
  const [creatingTable, setCreatingTable] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [newTableDescription, setNewTableDescription] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      toast.error('请输入表格名称')
      return
    }

    try {
      setCreatingTable(true)
      await onTableCreate(newTableName.trim(), newTableDescription.trim() || undefined)
      
      // 清空表单并关闭对话框
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
      <div className="w-64 bg-muted/20 p-4" style={{ borderRight: '4px solid #eeeeee' }}>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-muted/20 flex flex-col" style={{ borderRight: '1px solidrgba(239, 229, 229, 0.73)' }}>
      {/* 数据库信息 */}
      <div className="p-3 border-b bg-muted/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{base?.name || '数据库'}</h2>
            {base?.description && (
              <p className="text-xs text-muted-foreground truncate">{base.description}</p>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
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
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">数据表</h3>
            {tables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Table className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无数据表</p>
              </div>
            ) : (
              <div className="space-y-1">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className={cn(
                      'group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
                      'hover:bg-muted/50',
                      selectedTableId === table.id && 'bg-primary/10 text-primary'
                    )}
                    onClick={() => onTableSelect(table)}
                  >
                    <Table className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-xs truncate flex-1">{table.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                                    // 刷新页面以显示新表
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
                                variant="destructive"
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
          {selectedTableId && views.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">视图</h3>
                <div className="space-y-1">
                  {views.map((view) => (
                    <div
                      key={view.id}
                      className="group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => {
                        navigate(`/base/${baseId}/${selectedTableId}/${view.id}`)
                      }}
                    >
                      <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-xs truncate flex-1">{view.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* 底部设置 */}
      <div className="border-t p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
          <Settings className="h-3 w-3" />
          数据库设置
        </Button>
      </div>
    </div>
  )
}
