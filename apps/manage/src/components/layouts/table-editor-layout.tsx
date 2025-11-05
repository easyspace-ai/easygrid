import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DatabaseSidebar } from '@/components/database';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import luckdb from '@/lib/luckdb';
import type { Base, Table as TableType, View } from '@easygrid/sdk';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TableEditorLayoutProps {
  children: ReactNode;
}

// 侧边栏宽度本地存储 key
const SIDEBAR_WIDTH_STORAGE_KEY = 'easygrid-sidebar-width';

// 获取存储的侧边栏宽度，默认 256px (16rem)
function getStoredSidebarWidth(): number {
  if (typeof window === 'undefined') return 256;
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (stored) {
      const width = parseInt(stored, 10);
      // 限制在合理范围内：最小 200px，最大 400px
      return Math.max(200, Math.min(400, width));
    }
  } catch (e) {
    console.error('Failed to read sidebar width from localStorage', e);
  }
  return 256;
}

// 保存侧边栏宽度
function saveSidebarWidth(width: number): void {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, width.toString());
  } catch (e) {
    console.error('Failed to save sidebar width to localStorage', e);
  }
}

export function TableEditorLayout({ children }: TableEditorLayoutProps) {
  const navigate = useNavigate();
  const { baseId, tableId, viewId } = useParams<{ 
    baseId: string; 
    tableId?: string; 
    viewId?: string; 
  }>();
  const [base, setBase] = useState<Base | null>(null);
  const [tables, setTables] = useState<TableType[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(getStoredSidebarWidth);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    recordCount?: number;
  }>({ connected: false });

  // 初始化侧边栏宽度
  useEffect(() => {
    setSidebarWidth(getStoredSidebarWidth());
  }, []);

  // 加载基础数据
  useEffect(() => {
    if (baseId) {
      loadSidebarData();
    }
  }, [baseId]);

  // 当表格ID变化时加载视图
  useEffect(() => {
    if (tableId) {
      loadViews(tableId);
    } else {
      setViews([]);
    }
  }, [tableId]);

  // 定期更新连接状态
  useEffect(() => {
    if (!tableId) return;

    const updateConnectionStatus = async () => {
      try {
        // 这里可以根据实际情况实现连接状态检查
        // 暂时模拟：假设已连接，记录数通过其他方式获取
        setConnectionStatus({
          connected: true,
          recordCount: undefined, // 可以后续从 EasyGrid 组件获取
        });
      } catch (error) {
        setConnectionStatus({ connected: false });
      }
    };

    updateConnectionStatus();
    const interval = setInterval(updateConnectionStatus, 30000); // 每30秒检查一次
    return () => clearInterval(interval);
  }, [tableId]);

  const loadSidebarData = async () => {
    if (!baseId) return;

    try {
      setLoading(true);
      const [baseData, tablesRes] = await Promise.all([
        luckdb.bases.getOne(baseId),
        luckdb.tables.getList(baseId, 1, 200),
      ]);

      setBase(baseData as any);
      setTables((Array.isArray(tablesRes) ? tablesRes : tablesRes.items) as any);
    } catch (error) {
      console.error('Failed to load sidebar data:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadViews = async (tableId: string) => {
    try {
      const res = await luckdb.views.getList(tableId, 1, 200);
      setViews((Array.isArray(res) ? res : res.items) as any);
    } catch (error) {
      console.error('Failed to load views:', error);
      setViews([]);
    }
  };

  const handleTableSelect = async (table: TableType) => {
    // 优先使用后端返回的 defaultViewId
    if (table.defaultViewId) {
      navigate(`/base/${baseId}/${table.id}/${table.defaultViewId}`);
      return;
    }

    // 如果没有 defaultViewId，回退到查询第一个视图（兼容旧数据）
    try {
      const res = await luckdb.views.getList(table.id, 1, 200);
      const list = (Array.isArray(res) ? res : res.items) as any[];
      if (list.length > 0) {
        const firstView = list[0];
        navigate(`/base/${baseId}/${table.id}/${firstView.id}`);
      } else {
        toast.error('该表格没有可用的视图');
      }
    } catch (error) {
      console.error('Failed to load views for table:', error);
      toast.error('加载视图失败');
    }
  };

  const handleTableCreate = async (name: string, description?: string) => {
    if (!baseId) return;

    try {
      const newTable = await luckdb.tables.create(baseId, { name, description });

      setTables(prev => [...prev, newTable as any]);
      
      // 自动跳转到新创建的表格的默认视图
      if (newTable.defaultViewId) {
        navigate(`/base/${baseId}/${newTable.id}/${newTable.defaultViewId}`);
      }
    } catch (error: any) {
      console.error('Failed to create table:', error);
      throw error;
    }
  };

  const handleTableDelete = async (tableId: string) => {
    try {
      await luckdb.tables.delete(tableId);
      setTables(prev => prev.filter(t => t.id !== tableId));
    } catch (error: any) {
      console.error('Failed to delete table:', error);
      throw error;
    }
  };

  const handleTableUpdate = async (tableId: string, updates: Partial<TableType>) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
  };

  // 获取当前表格和视图信息
  const currentTable = tables.find(t => t.id === tableId);
  const currentView = views.find(v => v.id === viewId);

  // 计算侧边栏占比（默认 20%，对应 240px 左右）
  const defaultSidebarSize = 20;
  const minSidebarSize = 15;
  const maxSidebarSize = 35;
  const defaultMainSize = 100 - defaultSidebarSize;

  // 侧边栏宽度变化处理（通过 PanelGroup 的 onResize）
  const handlePanelGroupResize = useCallback(() => {
    // 通过 DOM 元素获取实际宽度
    const sidebarElement = document.querySelector('[data-slot="resizable-panel"]');
    if (sidebarElement) {
      const width = sidebarElement.clientWidth;
      if (width > 0) {
        setSidebarWidth(width);
        saveSidebarWidth(width);
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* 主内容区域 - 使用 ResizablePanelGroup */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden"
        onResize={handlePanelGroupResize}
      >
        {/* 侧边栏 */}
        <ResizablePanel
          defaultSize={defaultSidebarSize}
          minSize={minSidebarSize}
          maxSize={maxSidebarSize}
          className="min-w-[240px]"
        >
          <DatabaseSidebar
            base={base}
            tables={tables}
            views={views}
            selectedTableId={tableId}
            onTableSelect={handleTableSelect}
            onTableCreate={handleTableCreate}
            onTableDelete={handleTableDelete}
            onTableUpdate={handleTableUpdate}
            loading={loading}
          />
        </ResizablePanel>

        {/* 调整手柄 */}
        <ResizableHandle
          withHandle
          className="w-1 bg-border hover:bg-border/80 transition-colors cursor-col-resize active:bg-primary/20"
        />

        {/* 主内容区域 */}
        <ResizablePanel
          defaultSize={defaultMainSize}
          minSize={65}
          className="flex flex-col overflow-hidden min-h-0"
        >
          <div className="flex-1 overflow-hidden bg-background min-h-0">
            {children}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
