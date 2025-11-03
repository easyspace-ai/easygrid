"use client"

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  Database,
  Table,
  Eye,
  Settings,
  Share2,
  Download,
  Search,
  Bell,
  CheckCircle2,
  Circle,
  MoreVertical,
  Command,
} from 'lucide-react'
import type { Base, Table as TableType, View } from '@easygrid/sdk'
import { CommandSearch, SearchTrigger } from '@/components/command-search'
import { cn } from '@/lib/utils'

interface DatabaseHeaderProps {
  base?: Base | null
  currentTable?: TableType | null
  currentView?: View | null
  loading?: boolean
  connectionStatus?: {
    connected: boolean
    recordCount?: number
  }
  onShare?: () => void
  onExport?: () => void
  onSettings?: () => void
}

export function DatabaseHeader({
  base,
  currentTable,
  currentView,
  loading = false,
  connectionStatus,
  onShare,
  onExport,
  onSettings,
}: DatabaseHeaderProps) {
  const navigate = useNavigate()
  const { baseId, tableId, viewId } = useParams<{
    baseId: string
    tableId?: string
    viewId?: string
  }>()
  
  const [commandOpen, setCommandOpen] = useState(false)
  
  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K 打开命令面板
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6">
          {/* 左侧：面包屑导航 */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    asChild
                    className="hover:text-foreground transition-colors"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2"
                      onClick={() => navigate('/dashboard')}
                    >
                      <Home className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">首页</span>
                    </Button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                
                {base && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        asChild
                        className="hover:text-foreground transition-colors"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2"
                          onClick={() => navigate(`/base/${baseId}`)}
                        >
                          <Database className="h-3.5 w-3.5 text-primary" />
                          <span className="hidden sm:inline max-w-[120px] truncate">
                            {base.name}
                          </span>
                        </Button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                
                {currentTable && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {currentView ? (
                        <BreadcrumbLink
                          asChild
                          className="hover:text-foreground transition-colors"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2"
                            onClick={() => navigate(`/base/${baseId}/${tableId}`)}
                          >
                            <Table className="h-3.5 w-3.5 text-primary" />
                            <span className="hidden sm:inline max-w-[100px] truncate">
                              {currentTable.name}
                            </span>
                          </Button>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="flex items-center gap-1.5">
                          <Table className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium max-w-[100px] truncate">
                            {currentTable.name}
                          </span>
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </>
                )}
                
                {currentView && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <Badge 
                          variant="secondary" 
                          className="font-medium px-2 py-0.5 h-6"
                        >
                          {currentView.name}
                        </Badge>
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* 中间：搜索框（可选，根据上下文显示） */}
          <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索记录、字段..."
                className="h-9 pl-9 pr-9 bg-muted/50 border-border focus-visible:ring-2"
                onClick={() => setCommandOpen(true)}
                readOnly
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
          </div>

          {/* 右侧：操作按钮和状态 */}
          <div className="flex items-center gap-2">
            {/* 状态指示 */}
            {connectionStatus && (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 border border-border">
                {connectionStatus.connected ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
                )}
                <span className="text-xs text-muted-foreground">
                  {connectionStatus.connected ? '已连接' : '连接中'}
                  {connectionStatus.recordCount !== undefined && (
                    <span className="ml-1">
                      · {connectionStatus.recordCount} 条记录
                    </span>
                  )}
                </span>
              </div>
            )}

            <Separator orientation="vertical" className="h-5 hidden md:block" />

            {/* 主要操作按钮组 */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-3"
                onClick={onShare}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">分享</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-3"
                onClick={onExport}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">导出</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                    <span className="sr-only">更多操作</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onSettings}>
                    <Settings className="h-4 w-4 mr-2" />
                    设置
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell className="h-4 w-4 mr-2" />
                    通知设置
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCommandOpen(true)}>
                    <Command className="h-4 w-4 mr-2" />
                    命令面板
                    <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                      ⌘K
                    </kbd>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* 命令面板 - 已支持可选 spaces 参数 */}
      <CommandSearch
        open={commandOpen}
        onOpenChange={setCommandOpen}
        spaces={[]}
      />
    </>
  )
}
