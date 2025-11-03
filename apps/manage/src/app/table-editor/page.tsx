import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EasyGridPro } from '@easygrid/grid';
import { TableEditorLayout } from '@/components/layouts/table-editor-layout';
import luckdb from '@/lib/luckdb';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function TableEditor() {
  const navigate = useNavigate();
  const { baseId, tableId, viewId } = useParams<{
    baseId: string;
    tableId?: string;
    viewId?: string;
  }>();
  const [loading, setLoading] = useState(true);

  // 当只有 baseId 时，自动跳转到第一个表与视图
  useEffect(() => {
    const autoRedirect = async () => {
      if (!baseId || tableId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const tablesRes = await luckdb.tables.getList(baseId, 1, 200);
        const tables = Array.isArray(tablesRes) ? tablesRes : tablesRes.items;
        if (!tables || tables.length === 0) {
          setLoading(false);
          return;
        }
        
        const firstTable = tables[0] as { id: string; defaultViewId?: string };
        // 优先 defaultViewId
        if (firstTable?.defaultViewId) {
          navigate(`/base/${baseId}/${firstTable.id}/${firstTable.defaultViewId}`, { replace: true });
          return;
        }
        
        // 否则查询第一个视图
        const viewsRes = await luckdb.views.getList(firstTable.id, 1, 200);
        const views = Array.isArray(viewsRes) ? viewsRes : viewsRes.items;
        if (views && views.length > 0) {
          navigate(`/base/${baseId}/${firstTable.id}/${views[0].id}`, { replace: true });
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auto redirect failed:', error);
        setLoading(false);
      }
    };
    void autoRedirect();
  }, [baseId, tableId, navigate]);

  // 如果没有 tableId，显示加载状态
  if (!tableId || loading) {
    return (
      <TableEditorLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
          </div>
          <p className="text-sm text-muted-foreground">
            正在定位第一个表和视图…
          </p>
        </div>
      </TableEditorLayout>
    );
  }

  return (
    <TableEditorLayout>
      <div className="h-full flex flex-col overflow-hidden min-h-0">
        <EasyGridPro
          key={tableId} // 当 tableId 变化时，强制重新渲染组件
          client={luckdb}
          tableId={tableId}
          height="auto"
          showShareDBBadge={true}
          enableAddRecordDialog={true}
        />
      </div>
    </TableEditorLayout>
  );
}
