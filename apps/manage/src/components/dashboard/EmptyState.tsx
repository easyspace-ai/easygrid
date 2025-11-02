/**
 * EmptyState - 极简空状态
 * 
 * 设计原则：
 * 1. 清晰的视觉引导
 * 2. 简洁的文案
 * 3. 明确的行动点
 */

import { Folder, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  type: 'spaces' | 'bases'
  onAction?: () => void
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === 'spaces') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* 图标 */}
        <div className="relative mb-6 animate-in zoom-in-95 duration-500 delay-100">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <Folder className="h-10 w-10 text-gray-400" />
          </div>
          
          {/* 装饰性小图标 */}
          <div className="absolute -right-1 -top-1 animate-[wiggle_2s_ease-in-out_infinite]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
        </div>

        {/* 文案 */}
        <div className="text-center animate-in fade-in duration-300 delay-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            开始您的第一个项目
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            创建一个空间来组织您的数据库和表格
          </p>
        </div>

        {/* 行动按钮 */}
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
          <Button 
            size="lg" 
            onClick={onAction}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>创建第一个空间</span>
          </Button>
        </div>

        {/* 快捷键提示 */}
        <div className="mt-8 flex items-center gap-2 text-xs text-gray-400 animate-in fade-in duration-300 delay-[400ms]">
          <span>快捷键：</span>
          <kbd className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono">
            ⌘ N
          </kbd>
        </div>
      </div>
    )
  }

  // 空间内无数据库的状态
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-200">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-900 mb-4">
        <Folder className="h-8 w-8 text-gray-400" />
      </div>
      
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        该空间暂无数据库
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        创建您的第一个数据库开始使用
      </p>

      <Button 
        size="sm" 
        variant="outline"
        onClick={onAction}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>创建数据库</span>
      </Button>
    </div>
  )
}

