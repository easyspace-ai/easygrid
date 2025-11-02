/**
 * SpaceCard - 极简主义空间卡片
 * 
 * 设计原则：
 * 1. 默认隐藏所有操作按钮，悬浮时才显示
 * 2. 使用大图标和清晰的层级
 * 3. 丝滑的过渡动画
 * 4. 支持键盘导航
 */

import { useState } from 'react'
import { 
  Folder, 
  MoreHorizontal, 
  Plus, 
  Settings, 
  Trash2,
  Users,
  Star,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Space } from '@easygrid/sdk'

interface SpaceCardProps {
  space: Space
  basesCount?: number
  onCreateBase?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onToggleFavorite?: () => void
  isFavorite?: boolean
}

export function SpaceCard({
  space,
  basesCount = 0,
  onCreateBase,
  onEdit,
  onDelete,
  onToggleFavorite,
  isFavorite = false,
}: SpaceCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          'group relative overflow-hidden',
          'border border-gray-200 dark:border-gray-800',
          'transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'hover:border-gray-300 dark:hover:border-gray-700',
          'hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.12),0_4px_8px_-4px_rgba(0,0,0,0.08)]',
        )}
      >
        {/* 顶部区域 - 空间信息 */}
        <div className="relative p-6">
          {/* 图标和标题 */}
          <div className="flex items-start gap-4">
            {/* 大图标 */}
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl',
                'bg-gradient-to-br from-gray-50 to-gray-100',
                'dark:from-gray-900 dark:to-gray-800',
                'transition-all duration-250',
                'group-hover:from-primary/5 group-hover:to-primary/10',
                'group-hover:scale-105',
              )}
            >
              <Folder className="h-7 w-7 text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors duration-250" />
            </div>

            {/* 标题和描述 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate tracking-tight">
                    {space.name}
                  </h3>
                  {space.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {space.description}
                    </p>
                  )}
                </div>

                {/* 收藏按钮 - 始终显示 */}
                <div
                  className={cn(
                    'transition-all duration-150',
                    isHovered || isFavorite ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite?.()
                    }}
                  >
                    <Star
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isFavorite
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400 hover:text-yellow-400'
                      )}
                    />
                  </Button>
                </div>
              </div>

              {/* 元数据 */}
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="font-medium tabular-nums">{basesCount}</span>
                  <span>个数据库</span>
                </span>
                {/* 更多元数据可以在这里添加 */}
              </div>
            </div>
          </div>

          {/* 操作按钮 - 悬浮时显示 */}
          {isHovered && (
            <div
              className="mt-4 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateBase?.()
                  }}
                  className="h-8 gap-1.5 px-3 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>创建数据库</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: 邀请功能
                  }}
                  className="h-8 gap-1.5 px-3 text-xs font-medium"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>邀请</span>
                </Button>

                <div className="flex-1" />

                {/* 更多操作 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={onEdit}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>编辑空间</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>删除空间</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          )}
        </div>

        {/* 悬浮时的底部高光 */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0',
            'transition-all duration-250 origin-center',
            isHovered ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
          )}
        />
      </Card>
    </div>
  )
}

