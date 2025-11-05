/**
 * BaseCard - 极简主义数据库卡片
 * 
 * 设计原则：
 * 1. 点击即可打开，无多余操作
 * 2. 悬浮时显示快捷操作
 * 3. 大图标 + 清晰层级
 * 4. 流畅的动画反馈
 */

import { useState, useRef } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const rightClickRef = useRef(false)

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
        onMouseDown={(e) => {
          // 右键点击
          if (e.button === 2) {
            e.preventDefault()
            e.stopPropagation()
            rightClickRef.current = true
            setMenuOpen(true)
            // 延迟重置标志，防止后续的 click 事件触发
            setTimeout(() => {
              rightClickRef.current = false
            }, 300)
          } else {
            rightClickRef.current = false
          }
        }}
        onClick={(e) => {
          // 如果标志位为 true，说明是右键触发的，不执行点击操作
          if (rightClickRef.current || menuOpen) {
            e.preventDefault()
            e.stopPropagation()
            return
          }
          onClick?.()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
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

                {/* 更多操作（三点） - 悬浮时显示，左键可打开菜单 */}
                <div
                  className={cn(
                    'transition-all duration-150',
                    isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  )}
                >
                  <DropdownMenu 
                    open={menuOpen}
                    onOpenChange={(open) => setMenuOpen(open)}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-muted"
                        aria-label="更多操作"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(false)
                          onClick?.()
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>打开数据库</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(false)
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
                          setMenuOpen(false)
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

