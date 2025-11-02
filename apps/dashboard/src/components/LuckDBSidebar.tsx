/**
 * LuckDB 数据侧边栏
 * 集成 SDK，显示 Space/Base/Table 层级结构
 * 设计理念：简洁、高效、专业
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Folder, 
  Table, 
  Search, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  RefreshCw,
  Settings,
  Trash2,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import luckdb from '@/lib/luckdb';

// 类型定义 - 使用 SDK 的真实类型
interface Space {
  id: string;
  name: string;
  description?: string;
  bases?: Base[];
}

interface Base {
  id: string;
  name: string;
  description?: string;
  tables?: Table[];
}

interface Table {
  id: string;
  name: string;
  description?: string;
  recordCount?: number;
}

interface LuckDBSidebarProps {
  onTableSelect: (tableId: string, tableName: string) => void;
  className?: string;
}

export const LuckDBSidebar = ({ onTableSelect, className }: LuckDBSidebarProps) => {
  // 状态管理
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { clearAuth } = useAuthStore();

  // 使用真实的 SDK 调用
  const loadSpaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 检查是否已登录
      const token = localStorage.getItem('luckdb_auth_token');
      if (!token) {
        throw new Error('请先登录 LuckDB');
      }

      // 获取所有 Spaces
      const spacesList = await luckdb.listSpaces();
      
      // 为每个 Space 加载 Bases
      const spacesWithBases = await Promise.all(
        spacesList.map(async (space: any) => {
          try {
            const bases = await luckdb.listBases({ spaceId: space.id });
            
            // 为每个 Base 加载 Tables
            const basesWithTables = await Promise.all(
              bases.map(async (base: any) => {
                try {
                  const tables = await luckdb.listTables({ baseId: base.id });
                  
                  // 为每个 Table 获取记录数量
                  const tablesWithCount = await Promise.all(
                    tables.map(async (table: any) => {
                      try {
                        const records = await luckdb.listRecords({ tableId: table.id, limit: 1 });
                        return {
                          ...table,
                          recordCount: records.total || 0
                        };
                      } catch (err) {
                        console.warn(`获取表格 ${table.name} 记录数量失败:`, err);
                        return {
                          ...table,
                          recordCount: 0
                        };
                      }
                    })
                  );
                  
                  return {
                    ...base,
                    tables: tablesWithCount
                  };
                } catch (err) {
                  console.warn(`获取 Base ${base.name} 的表格失败:`, err);
                  return {
                    ...base,
                    tables: []
                  };
                }
              })
            );
            
            return {
              ...space,
              bases: basesWithTables
            };
          } catch (err) {
            console.warn(`获取 Space ${space.name} 的 Bases 失败:`, err);
            return {
              ...space,
              bases: []
            };
          }
        })
      );
      
      setSpaces(spacesWithBases);
      
      // 默认展开第一个 Space
      if (spacesWithBases.length > 0) {
        setExpandedItems(new Set([spacesWithBases[0].id]));
      }
      
    } catch (err: any) {
      console.error('加载 LuckDB 数据失败:', err);
      
      // 检查是否是认证相关错误
      if (err.message?.includes('Token refresh failed') || 
          err.message?.includes('Authentication') ||
          err.message?.includes('Unauthorized') ||
          err.status === 401) {
        
        // 清除认证状态并显示友好提示
        clearAuth();
        setError('登录已过期，请重新登录');
        toast({
          title: "登录已过期",
          description: "请重新登录以继续使用",
          variant: "destructive",
        });
      } else {
        setError(err.message || '加载数据失败');
        toast({
          title: "加载失败",
          description: err.message || "无法加载 LuckDB 数据，请检查连接",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, clearAuth]);

  // 初始加载
  useEffect(() => {
    // 检查是否有 token，如果有则加载数据
    const token = localStorage.getItem('luckdb_auth_token');
    if (token) {
      loadSpaces();
    }
  }, [loadSpaces]);

  // 切换展开状态
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // 选择表格
  const handleTableSelect = (table: Table) => {
    setSelectedTable(table.id);
    onTableSelect(table.id, table.name);
    
    toast({
      title: "表格已选择",
      description: `已加载表格: ${table.name}`,
    });
  };

  // 过滤数据
  const filteredSpaces = spaces.filter(space => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      space.name.toLowerCase().includes(query) ||
      space.description?.toLowerCase().includes(query) ||
      space.bases.some(base => 
        base.name.toLowerCase().includes(query) ||
        base.description?.toLowerCase().includes(query) ||
        base.tables.some(table => 
          table.name.toLowerCase().includes(query) ||
          table.description?.toLowerCase().includes(query)
        )
      )
    );
  });

  // 渲染加载状态
  if (loading) {
    return (
      <div className={cn("h-full bg-background border-r border-border", className)}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground">LuckDB 数据</h2>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <div className="ml-4 space-y-1">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className={cn("h-full bg-background border-r border-border", className)}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground">LuckDB 数据</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadSpaces}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="p-4 flex flex-col items-center justify-center h-32 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={loadSpaces}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full bg-background border-r border-border flex flex-col", className)}>
      {/* 头部 */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground">
              <Database className="w-3 h-3" />
            </div>
            <h2 className="text-sm font-medium text-foreground">LuckDB 数据</h2>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadSpaces}
              className="h-6 w-6 p-0"
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索 Space、Base 或 Table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* 数据列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredSpaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Database className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? '未找到匹配的数据' : '暂无数据'}
              </p>
              {!searchQuery && (
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  创建 Space
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSpaces.map((space) => (
                <div key={space.id} className="space-y-1">
                  {/* Space 项 */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                      "hover:bg-muted/50 group"
                    )}
                    onClick={() => toggleExpanded(space.id)}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {expandedItems.has(space.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {space.name}
                        </p>
                        {space.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {space.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        title="更多操作"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Base 列表 */}
                  {expandedItems.has(space.id) && (
                    <div className="ml-6 space-y-1">
                      {space.bases.map((base) => (
                        <div key={base.id} className="space-y-1">
                          {/* Base 项 */}
                          <div
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                              "hover:bg-muted/50 group"
                            )}
                            onClick={() => toggleExpanded(base.id)}
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {expandedItems.has(base.id) ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <Database className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {base.name}
                                </p>
                                {base.description && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {base.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                title="更多操作"
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Table 列表 */}
                          {expandedItems.has(base.id) && (
                            <div className="ml-6 space-y-1">
                              {base.tables.map((table) => (
                                <div
                                  key={table.id}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                                    "hover:bg-muted/50 group",
                                    selectedTable === table.id && "bg-primary/10 border border-primary/20"
                                  )}
                                  onClick={() => handleTableSelect(table)}
                                >
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <Table className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {table.name}
                                      </p>
                                      {table.description && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {table.description}
                                        </p>
                                      )}
                                    </div>
                                    {table.recordCount !== undefined && (
                                      <Badge variant="secondary" className="text-xs">
                                        {table.recordCount}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {selectedTable === table.id && (
                                      <CheckCircle className="w-4 h-4 text-primary" />
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      title="更多操作"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 底部状态栏 */}
      <div className="p-2 border-t border-border flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>已连接</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>LuckDB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
