/**
 * BaseCard - 极简主义数据库卡片
 * 
 * 设计原则：
 * 1. 点击即可打开，无多余操作
 * 2. 悬浮时显示快捷操作
 * 3. 大图标 + 清晰层级
 * 4. 流畅的动画反馈
 */

import { useState } from 'react'
import { Database, MoreHorizontal, Settings, Trash2, ExternalLink } from 'lucide-react'
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
import type { Base } from '@easygrid/sdk'

interface BaseCardProps {
  base: Base
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function BaseCard({ base, onClick, onEdit, onDelete }: BaseCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      <Card
        className={cn(
          'group relative cursor-pointer overflow-hidden',
          'border border-gray-200 dark:border-gray-800',
          'transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'hover:border-gray-300 dark:hover:border-gray-700',
          'hover:shadow-md hover:-translate-y-0.5',
          'active:shadow-sm active:scale-[0.98]',
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                'bg-gradient-to-br from-primary/10 to-primary/5',
                'transition-all duration-200',
                'group-hover:from-primary/20 group-hover:to-primary/10',
              )}
            >
              <Database className="h-5 w-5 text-primary" />
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors duration-200">
                    {base.name}
                  </h4>
                  {base.description && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {base.description}
                    </p>
                  )}
                </div>

                {/* 更多操作 - 悬浮时显示 */}
                <div
                  className={cn(
                    'transition-all duration-150',
                    isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  )}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onClick?.()
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>打开数据库</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit?.()
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>编辑</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete?.()
                        }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>删除</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* 底部操作提示 - 悬浮时显示 */}
              <div
                className={cn(
                  'mt-2 flex items-center gap-1.5 text-xs text-gray-400 overflow-hidden transition-all duration-150',
                  isHovered ? 'opacity-100 max-h-6' : 'opacity-0 max-h-0'
                )}
              >
                <span>点击打开</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* 悬浮时的左侧高光 */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-0.5 bg-primary transition-all duration-200 origin-center',
            isHovered ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
          )}
        />
      </Card>
    </div>
  )
}

