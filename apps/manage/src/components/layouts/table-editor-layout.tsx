import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DatabaseSidebar, DatabaseHeader } from '@/components/database';
import luckdb from '@/lib/luckdb';
import type { Base, Table as TableType, View } from '@easygrid/sdk';
import { toast } from 'sonner';

interface TableEditorLayoutProps {
  children: ReactNode;
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
    // ✅ 优先使用后端返回的 defaultViewId
    if (table.defaultViewId) {
      navigate(`/base/${baseId}/${table.id}/${table.defaultViewId}`);
      return;
    }

    // ✅ 如果没有 defaultViewId，回退到查询第一个视图（兼容旧数据）
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
      
      // ✅ 自动跳转到新创建的表格的默认视图
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

  // 获取当前表格和视图信息
  const currentTable = tables.find(t => t.id === tableId);
  const currentView = views.find(v => v.id === viewId);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 顶部工具栏 */}
      <DatabaseHeader 
        base={base}
        currentTable={currentTable}
        currentView={currentView}
        loading={loading}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* 简化的侧边栏 */}
        <DatabaseSidebar
          base={base}
          tables={tables}
          views={views}
          selectedTableId={tableId}
          onTableSelect={handleTableSelect}
          onTableCreate={handleTableCreate}
          onTableDelete={handleTableDelete}
          loading={loading}
        />

        {/* 主内容区域 */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
