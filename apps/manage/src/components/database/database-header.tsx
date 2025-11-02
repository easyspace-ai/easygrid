"use client"

import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  ChevronRight,
  Database,
  Table,
  Eye,
  Settings,
  Share,
  Download,
} from 'lucide-react'
import type { Base, Table as TableType, View } from '@easygrid/sdk'

interface DatabaseHeaderProps {
  base?: Base | null
  currentTable?: TableType | null
  currentView?: View | null
  loading?: boolean
}

export function DatabaseHeader({
  base,
  currentTable,
  currentView,
  loading = false
}: DatabaseHeaderProps) {
  const navigate = useNavigate()
  const { baseId, tableId, viewId } = useParams<{
    baseId: string
    tableId?: string
    viewId?: string
  }>()

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-4">
        {/* 左侧：面包屑导航 */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Button>
          
          <Separator orientation="vertical" className="h-4" />
          
          <nav className="flex items-center space-x-2 text-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">数据库</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{base?.name || '加载中...'}</span>
            
            {currentTable && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-primary" />
                  <span className="font-medium">{currentTable.name}</span>
                </div>
              </>
            )}
            
            {currentView && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="font-medium">{currentView.name}</span>
                </div>
              </>
            )}
          </nav>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Share className="h-4 w-4" />
            分享
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            导出
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            设置
          </Button>
        </div>
      </div>
    </div>
  )
}
