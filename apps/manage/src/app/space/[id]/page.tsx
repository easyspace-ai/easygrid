import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BaseLayout } from '@/components/layouts/base-layout';
import luckdb from '@/lib/luckdb';
import type { Space, Base } from '@easygrid/sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Database, MoreHorizontal, Plus, Star, Users } from 'lucide-react';

export default function SpaceDetailPage() {
  const { id: spaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [bases, setBases] = useState<Base[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBaseName, setNewBaseName] = useState('');
  const [newBaseDescription, setNewBaseDescription] = useState('');

  useEffect(() => {
    if (spaceId) {
      loadSpaceAndBases();
    }
  }, [spaceId]);

  const loadSpaceAndBases = async () => {
    if (!spaceId) return;

    try {
      setLoading(true);
      const [spaceData, basesData] = await Promise.all([
        luckdb.spaces.getOne(spaceId),
        luckdb.bases.getList({ spaceId }),
      ]);

      setSpace(spaceData);
      setBases(basesData);
    } catch (error: any) {
      console.error('Failed to load space:', error);
      toast.error(error?.message || '加载空间失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBase = async () => {
    if (!newBaseName.trim() || !spaceId) {
      toast.error('请输入数据库名称');
      return;
    }

    try {
      setCreating(true);
      const newBase = await luckdb.bases.create({
        spaceId,
        name: newBaseName.trim(),
        description: newBaseDescription.trim() || undefined,
      });

      toast.success('创建数据库成功');
      setCreateDialogOpen(false);
      setNewBaseName('');
      setNewBaseDescription('');
      
      // 不刷新，直接添加到列表
      setBases([...bases, newBase]);
    } catch (error: any) {
      console.error('Failed to create base:', error);
      toast.error(error?.message || '创建数据库失败');
    } finally {
      setCreating(false);
    }
  };

  const handleBaseClick = async (baseId: string) => {
    try {
      const tables = await luckdb.tables.getList({ baseId });
      if (tables.length === 0) {
        toast.error('该数据库中没有表格');
        return;
      }

      const firstTable = tables[0];
      const views = await luckdb.views.getList(firstTable.id);
      if (views.length === 0) {
        toast.error('该表格中没有视图');
        return;
      }

      const firstView = views[0];
      navigate(`/base/${baseId}/${firstTable.id}/${firstView.id}`);
    } catch (error: any) {
      console.error('Failed to navigate to base:', error);
      toast.error(error?.message || '打开数据库失败');
    }
  };

  if (loading) {
    return (
      <BaseLayout>
        <div className="px-4 lg:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </BaseLayout>
    );
  }

  if (!space) {
    return (
      <BaseLayout>
        <div className="px-4 lg:px-6 py-6">
          <div className="text-center text-muted-foreground">空间不存在</div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 py-6">
        {/* Space 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{space.name}</h1>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Star className="h-4 w-4" />
            </Button>
            <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
              免费版
            </span>
            <Button variant="link" className="h-auto p-0 text-sm">
              升级
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  创建数据库
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建数据库</DialogTitle>
                  <DialogDescription>
                    在 "{space.name}" 空间中创建一个新的数据库
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
                      disabled={creating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base-description">描述（可选）</Label>
                    <Textarea
                      id="base-description"
                      placeholder="简要描述这个数据库的用途"
                      value={newBaseDescription}
                      onChange={(e) => setNewBaseDescription(e.target.value)}
                      disabled={creating}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    disabled={creating}
                  >
                    取消
                  </Button>
                  <Button onClick={handleCreateBase} disabled={creating}>
                    {creating ? '创建中...' : '创建'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              邀请
            </Button>
            
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 数据库网格 */}
        {bases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Database className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">暂无数据库</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个数据库
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bases.map((base) => (
              <Card
                key={base.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleBaseClick(base.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Database className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{base.name}</h3>
                      {base.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {base.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BaseLayout>
  );
}
