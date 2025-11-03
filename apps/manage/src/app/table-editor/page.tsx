import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EasyGridPro } from '@easygrid/grid';
import { TableEditorLayout } from '@/components/layouts/table-editor-layout';
import luckdb from '@/lib/luckdb';

export default function TableEditor() {
  const navigate = useNavigate();
  const { baseId, tableId } = useParams<{
    baseId: string;
    tableId?: string;
    viewId?: string;
  }>();

  // 当只有 baseId 时，自动跳转到第一个表与视图
  useEffect(() => {
    const autoRedirect = async () => {
      if (!baseId || tableId) return;
      try {
        const tablesRes = await luckdb.tables.getList(baseId, 1, 200);
        const tables = Array.isArray(tablesRes) ? tablesRes : tablesRes.items;
        if (!tables || tables.length === 0) return;
        const firstTable = tables[0] as { id: string; defaultViewId?: string };
        // 优先 defaultViewId
        if (firstTable?.defaultViewId) {
          navigate(`/base/${baseId}/${firstTable.id}/${firstTable.defaultViewId}`, { replace: true });
          return;
        }
        const viewsRes = await luckdb.views.getList(firstTable.id, 1, 200);
        const views = Array.isArray(viewsRes) ? viewsRes : viewsRes.items;
        if (views && views.length > 0) {
          navigate(`/base/${baseId}/${firstTable.id}/${views[0].id}`, { replace: true });
        }
      } catch {
        // 静默失败，保持当前页面
      }
    };
    void autoRedirect();
  }, [baseId, tableId, navigate]);

  return (
    <TableEditorLayout>
      <div className="h-full flex flex-col">
        {tableId ? (
          <EasyGridPro
            client={luckdb}
            tableId={tableId}
            height={600}
            showShareDBBadge={true}
            enableAddRecordDialog={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">正在定位第一个表和视图…</p>
          </div>
        )}
      </div>
    </TableEditorLayout>
  );
}