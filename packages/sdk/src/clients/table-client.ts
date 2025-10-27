/**
 * 数据表（Table）客户端
 * 只处理 Table 的创建、查询、更新、删除等操作
 * Base 相关功能已拆分到 base-client.ts
 */

import { HttpClient } from '../core/http-client';
import type { 
  Table,
  CreateTableRequest,
  UpdateTableRequest,
  RenameTableRequest,
  DuplicateTableRequest,
  TableUsageResponse,
  TableManagementMenu,
  PaginationParams,
  PaginatedResponse
} from '../types/index.js';

export class TableClient {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  // ==================== 数据表管理 ====================

  /**
   * 创建数据表（POST /api/v1/bases/:baseId/tables）
   */
  public async createTable(tableData: CreateTableRequest): Promise<Table> {
    const { baseId, ...rest } = tableData;  // ✅ 使用 camelCase
    return this.httpClient.post<Table>(`/api/v1/bases/${baseId}/tables`, { ...rest, baseId });
  }

  /**
   * 在基础表下创建数据表（同上）
   */
  public async createTableInBase(baseId: string, tableData: Omit<CreateTableRequest, 'baseId'>): Promise<Table> {
    return this.httpClient.post<Table>(`/api/v1/bases/${baseId}/tables`, { ...tableData, baseId });  // ✅ 使用 camelCase
  }

  /**
   * 获取数据表列表（GET /api/v1/bases/:baseId/tables）
   * 注意：Tables 列表不分页，返回指定Base下的所有表
   */
  public async listTables(params: { baseId: string }): Promise<Table[]> {
    const { baseId } = params;  // ✅ 使用 camelCase
    // 后端路由: GET /api/v1/bases/:baseId/tables，返回数组
    return this.httpClient.get<Table[]>(`/api/v1/bases/${baseId}/tables`);
  }

  /**
   * 获取基础表下的数据表列表（GET /api/v1/bases/:baseId/tables）
   * @deprecated 使用 listTables 替代
   */
  public async listTablesInBase(baseId: string): Promise<Table[]> {
    return this.httpClient.get<Table[]>(`/api/v1/bases/${baseId}/tables`);
  }

  /**
   * 获取数据表详情（GET /api/v1/tables/:id）
   */
  public async getTable(tableId: string): Promise<Table> {
    return this.httpClient.get<Table>(`/api/v1/tables/${tableId}`);
  }

  /**
   * 更新数据表（PATCH /api/v1/tables/:id）
   */
  public async updateTable(tableId: string, updates: UpdateTableRequest): Promise<Table> {
    return this.httpClient.patch<Table>(`/api/v1/tables/${tableId}`, updates);
  }

  /**
   * 删除数据表（DELETE /api/v1/tables/:id）
   */
  public async deleteTable(tableId: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/tables/${tableId}`);
  }

  // ==================== 表管理功能 ====================

  /**
   * 重命名表（PUT /api/v1/tables/:tableId/rename）
   */
  public async renameTable(tableId: string, request: RenameTableRequest): Promise<Table> {
    return this.httpClient.put<Table>(`/api/v1/tables/${tableId}/rename`, request);
  }

  /**
   * 复制表（POST /api/v1/tables/:tableId/duplicate）
   */
  public async duplicateTable(tableId: string, request: DuplicateTableRequest): Promise<Table> {
    return this.httpClient.post<Table>(`/api/v1/tables/${tableId}/duplicate`, request);
  }

  /**
   * 获取表用量信息（GET /api/v1/tables/:tableId/usage）
   */
  public async getTableUsage(tableId: string): Promise<TableUsageResponse> {
    return this.httpClient.get<TableUsageResponse>(`/api/v1/tables/${tableId}/usage`);
  }

  /**
   * 获取表管理菜单（GET /api/v1/tables/:tableId/menu）
   */
  public async getTableManagementMenu(tableId: string): Promise<TableManagementMenu> {
    return this.httpClient.get<TableManagementMenu>(`/api/v1/tables/${tableId}/menu`);
  }

  /**
   * 获取数据表的字段列表
   * 注：这个方法保留在这里是为了方便，实际字段操作应该使用 FieldClient
   * 如需完整的字段管理功能，请使用 FieldClient
   */
  public async getTableFields(tableId: string): Promise<any[]> {
    return this.httpClient.get<any[]>(`/api/v1/tables/${tableId}/fields`);
  }

  /**
   * 获取数据表的记录列表
   * 注：这个方法保留在这里是为了方便，实际记录操作应该使用 RecordClient
   * 如需完整的记录管理功能，请使用 RecordClient
   */
  public async getTableRecords(tableId: string, params?: PaginationParams): Promise<any[]> {
    return this.httpClient.get<any[]>(`/api/v1/tables/${tableId}/records`, params);
  }

  /**
   * 获取数据表的视图列表
   * 注：这个方法保留在这里是为了方便，实际视图操作应该使用 ViewClient
   * 如需完整的视图管理功能，请使用 ViewClient
   */
  public async getTableViews(tableId: string): Promise<any[]> {
    return this.httpClient.get<any[]>(`/api/v1/tables/${tableId}/views`);
  }

  /**
   * 获取数据表统计信息
   * 注：当前API可能未实现，仅预留接口
   */
  public async getTableStats(tableId: string): Promise<{
    recordCount: number;
    fieldCount: number;
    viewCount: number;
    lastModified: string;
  }> {
    return this.httpClient.get(`/api/v1/tables/${tableId}/stats`);
  }

  /**
   * 导出数据表
   * 注：当前API可能未实现，仅预留接口
   */
  public async exportTable(tableId: string, format: 'csv' | 'json' | 'xlsx' = 'csv'): Promise<Blob> {
    return this.httpClient.get(`/api/v1/tables/${tableId}/export`, { 
      format,
      responseType: 'blob'
    });
  }

  /**
   * 导入数据到表格
   * 注：当前API可能未实现，仅预留接口
   */
  public async importTable(tableId: string, file: File, options?: {
    skipHeader?: boolean;
    delimiter?: string;
  }): Promise<{
    success: boolean;
    importedCount: number;
    failedCount: number;
    errors?: any[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }
    return this.httpClient.post(`/api/v1/tables/${tableId}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
}