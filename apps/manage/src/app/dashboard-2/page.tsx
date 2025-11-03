/**
 * Dashboard - 极简主义工作台
 * 
 * 核心特性：
 * 1. 简洁的视觉层级
 * 2. 流畅的动画和微交互
 * 3. 命令式快捷操作 (Cmd+K)
 * 4. 键盘导航支持
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import luckdb from '@/lib/luckdb'
import type { Space, Base } from '@easygrid/sdk'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Database } from 'lucide-react'
import { 
  BaseCard, 
  EmptyState 
} from '@/components/dashboard'
import { useSpaceStore } from '@/stores/space-store'

interface SpaceWithBases extends Space {
  bases?: Base[]
}

export default function Dashboard() {
  const { spaces, selectedSpace, setSpaces, setSelectedSpace, addSpace } = useSpaceStore()
  const [bases, setBases] = useState<Base[]>([])
  const [loading, setLoading] = useState(true)
  const [createBaseDialogOpen, setCreateBaseDialogOpen] = useState(false)
  const [creatingBase, setCreatingBase] = useState(false)
  const [newBaseName, setNewBaseName] = useState('')
  const [newBaseDescription, setNewBaseDescription] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadSpaces();
  }, []);

  useEffect(() => {
    if (selectedSpace) {
      loadBases(selectedSpace.id);
    } else {
      setBases([]);
    }
  }, [selectedSpace]);

  const loadSpaces = async () => {
    try {
      setLoading(true);
      const spacesRes = await luckdb.spaces.getList(1, 200, {} as any);
      const spacesList = Array.isArray(spacesRes) ? spacesRes : spacesRes.items;
      setSpaces(spacesList as any);
      
      // 如果没有选中空间，自动选择第一个
      if ((spacesList as any[]).length > 0 && !selectedSpace) {
        setSelectedSpace((spacesList as any[])[0]);
      }
    } catch (error: any) {
      console.error('Failed to load spaces:', error);
      toast.error(error?.message || '加载空间失败');
    } finally {
      setLoading(false);
    }
  };

  const loadBases = async (spaceId: string) => {
    try {
      const basesRes = await luckdb.bases.getList(spaceId, 1, 200);
      setBases((Array.isArray(basesRes) ? basesRes : basesRes.items) as any);
    } catch (error: any) {
      console.error('Failed to load bases:', error);
      toast.error('加载数据库失败');
      setBases([]);
    }
  };

  const handleCreateBase = async () => {
    if (!newBaseName.trim() || !selectedSpace) {
      toast.error('请输入数据库名称');
      return;
    }

    try {
      setCreatingBase(true);
      const newBase = await luckdb.bases.create(selectedSpace.id, {
        name: newBaseName.trim(),
        description: newBaseDescription.trim() || undefined,
      });

      toast.success('创建数据库成功');
      setCreateBaseDialogOpen(false);
      setNewBaseName('');
      setNewBaseDescription('');
      
      // 重新加载当前空间的数据库
      loadBases(selectedSpace.id);
    } catch (error: any) {
      console.error('Failed to create base:', error);
      toast.error(error?.message || '创建数据库失败');
    } finally {
      setCreatingBase(false);
    }
  };

  const handleBaseClick = (baseId: string) => {
    navigate(`/base/${baseId}`)
  }


  // 监听 Cmd/Ctrl+N 创建数据库
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCreateBaseDialogOpen(true)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // 加载状态 - 极简骨架屏
  if (loading) {
    return (
      <BaseLayout>
        <div className="px-4 lg:px-6 space-y-6">
          {/* 顶部操作栏骨架 */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>

          {/* 空间卡片骨架 */}
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout 
      spaces={spaces}
      onCreateSpace={() => {
        // 重新加载空间列表
        loadSpaces()
      }}
    >
      <div className="px-4 lg:px-6 space-y-8">

        {/* 顶部操作栏 - 极简设计 */}
        <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {selectedSpace ? `${selectedSpace.name} 数据库` : '数据库管理'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedSpace ? `管理 ${selectedSpace.name} 空间中的数据库` : '请选择一个空间来查看数据库'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 命令面板提示 */}
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 animate-in fade-in zoom-in-95 duration-200 delay-100">
              <Database className="h-4 w-4" />
              <span>按</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                ⌘ K
              </kbd>
              <span>快速操作</span>
            </div>

            {/* 创建数据库按钮 */}
            {selectedSpace && (
              <Button
                onClick={() => setCreateBaseDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>创建数据库</span>
              </Button>
            )}
          </div>
        </div>


        {/* 创建数据库对话框 */}
        <Dialog open={createBaseDialogOpen} onOpenChange={setCreateBaseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建数据库</DialogTitle>
              <DialogDescription>
                在 {selectedSpace?.name} 空间中创建一个新的数据库
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="base-name">数据库名称 *</Label>
                <Input
                  id="base-name"
                  placeholder="例如：用户管理"
                  value={newBaseName}
                  onChange={(e) => setNewBaseName(e.target.value)}
                  disabled={creatingBase}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-description">描述（可选）</Label>
                <Textarea
                  id="base-description"
                  placeholder="简要描述这个数据库的用途"
                  value={newBaseDescription}
                  onChange={(e) => setNewBaseDescription(e.target.value)}
                  disabled={creatingBase}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateBaseDialogOpen(false);
                  setNewBaseName('');
                  setNewBaseDescription('');
                }}
                disabled={creatingBase}
              >
                取消
              </Button>
              <Button onClick={handleCreateBase} disabled={creatingBase}>
                {creatingBase ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 数据库列表 - 极简化设计 */}
        {!selectedSpace ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                请选择一个空间
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                从左侧选择空间来查看其中的数据库
              </p>
            </div>
          </div>
        ) : bases.length === 0 ? (
          <EmptyState type="bases" onAction={() => setCreateBaseDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bases.map((base, index) => (
              <div
                key={base.id}
                className="animate-in fade-in zoom-in-95 duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <BaseCard
                  base={base}
                  onClick={() => handleBaseClick(base.id)}
                  onEdit={() => {
                    toast.info('编辑功能开发中')
                  }}
                  onDelete={() => {
                    toast.info('删除功能开发中')
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
