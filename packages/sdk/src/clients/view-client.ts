/**
 * 视图客户端（完全匹配EasyDB API v1）
 * 处理各种视图类型的管理和配置
 */

import { HttpClient } from '../core/http-client';
import type { 
  View,
  CreateViewRequest,
  UpdateViewRequest,
  PaginatedResponse,
  PaginationParams
} from '../types/index.js';

export class ViewClient {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  // ==================== 基础视图管理 ====================

  /**
   * 创建视图（POST /api/v1/tables/:tableId/views）
   */
  public async create(viewData: CreateViewRequest): Promise<View> {
    const { tableId, ...rest } = viewData;  // ✅ 使用 camelCase
    // ✅ 不在请求体中发送tableId，Handler会从URL路径提取
    return this.httpClient.post<View>(`/api/v1/tables/${tableId}/views`, rest);
  }

  /**
   * 获取视图列表（GET /api/v1/tables/:tableId/views）
   */
  /**
   * 获取视图列表（GET /api/v1/tables/:tableId/views）
   * 注意：Views 列表不分页，返回指定Table下的所有视图
   */
  public async list(params?: { tableId?: string }): Promise<View[]> {
    if (params?.tableId) {
      return this.httpClient.get<View[]>(`/api/v1/tables/${params.tableId}/views`);
    }
    return this.httpClient.get<View[]>('/api/v1/views', params);
  }

  /**
   * 获取数据表的视图列表（GET /api/v1/tables/:tableId/views）
   * @deprecated 使用 list 替代
   */
  public async listTableViews(tableId: string): Promise<View[]> {
    return this.httpClient.get<View[]>(`/api/v1/tables/${tableId}/views`);
  }

  /**
   * 获取视图总数（GET /api/v1/tables/:tableId/views/count）
   */
  public async countTableViews(tableId: string): Promise<number> {
    const result = await this.httpClient.get<{ count: number }>(`/api/v1/tables/${tableId}/views/count`);
    return result.count;
  }

  /**
   * 获取视图详情（GET /api/v1/views/:id）
   */
  public async get(viewId: string): Promise<View> {
    return this.httpClient.get<View>(`/api/v1/views/${viewId}`);
  }

  /**
   * 更新视图（PUT /api/v1/views/:id）
   */
  public async update(viewId: string, updates: UpdateViewRequest): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}`, updates);
  }

  /**
   * 删除视图（DELETE /api/v1/views/:id）
   */
  public async delete(viewId: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/views/${viewId}`);
  }

  /**
   * 复制视图（POST /api/v1/views/:id/duplicate）
   */
  public async duplicate(viewId: string, newName?: string): Promise<View> {
    return this.httpClient.post<View>(`/api/v1/views/${viewId}/duplicate`, { name: newName });
  }

  // ==================== 视图配置管理 ====================

  /**
   * 更新视图过滤器（PUT /api/v1/views/:id/filter）
   */
  public async updateFilter(viewId: string, filter: any): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}/filter`, { filter });
  }

  /**
   * 更新视图排序（PUT /api/v1/views/:id/sort）
   */
  public async updateSort(viewId: string, sort: any): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}/sort`, { sort });
  }

  /**
   * 更新视图分组（PUT /api/v1/views/:id/group）
   */
  public async updateGroup(viewId: string, group: any): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}/group`, { group });
  }

  /**
   * 更新视图列元数据（PATCH /api/v1/views/:id/column-meta）
   * 
   * @param viewId 视图ID
   * @param columnMeta 列配置数组，每个元素包含 fieldId, width, visible, order 等属性
   * @returns 更新后的视图对象
   * 
   * @example
   * ```typescript
   * // 更新列宽
   * await sdk.views.updateColumnMeta('view_123', [
   *   {
   *     fieldId: 'fld_xxx',
   *     width: 200,
   *     visible: true,
   *     order: 0
   *   }
   * ]);
   * ```
   */
  public async updateColumnMeta(
    viewId: string, 
    columnMeta: Array<{
      fieldId: string;
      width?: number;
      visible?: boolean;
      order?: number;
    }>
  ): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}/column-meta`, { columnMeta });
  }

  /**
   * 便捷方法：设置列宽度
   * 
   * @param viewId 视图ID
   * @param fieldId 字段ID
   * @param width 列宽度（像素）
   * @returns 更新后的视图对象
   */
  public async setColumnWidth(viewId: string, fieldId: string, width: number): Promise<View> {
    // 先获取当前视图配置
    const currentView = await this.get(viewId);
    const currentColumnMeta = currentView.columnMeta || [];
    
    // 查找并更新指定列的宽度
    const updatedColumnMeta = [...currentColumnMeta];
    const existingIndex = updatedColumnMeta.findIndex((col: any) => col.fieldId === fieldId);
    
    if (existingIndex >= 0) {
      updatedColumnMeta[existingIndex] = {
        ...updatedColumnMeta[existingIndex],
        width
      };
    } else {
      updatedColumnMeta.push({
        fieldId,
        width,
        visible: true,
        order: updatedColumnMeta.length
      });
    }
    
    return this.updateColumnMeta(viewId, updatedColumnMeta);
  }

  /**
   * 便捷方法：设置列可见性
   * 
   * @param viewId 视图ID
   * @param fieldId 字段ID
   * @param visible 是否可见
   * @returns 更新后的视图对象
   */
  public async setColumnVisible(viewId: string, fieldId: string, visible: boolean): Promise<View> {
    // 先获取当前视图配置
    const currentView = await this.get(viewId);
    const currentColumnMeta = currentView.columnMeta || [];
    
    // 查找并更新指定列的可见性
    const updatedColumnMeta = [...currentColumnMeta];
    const existingIndex = updatedColumnMeta.findIndex((col: any) => col.fieldId === fieldId);
    
    if (existingIndex >= 0) {
      updatedColumnMeta[existingIndex] = {
        ...updatedColumnMeta[existingIndex],
        visible
      };
    } else {
      updatedColumnMeta.push({
        fieldId,
        width: 150, // 默认宽度
        visible,
        order: updatedColumnMeta.length
      });
    }
    
    return this.updateColumnMeta(viewId, updatedColumnMeta);
  }

  /**
   * 便捷方法：重新排序列
   * 
   * @param viewId 视图ID
   * @param fieldIds 字段ID数组，按新的顺序排列
   * @returns 更新后的视图对象
   */
  public async reorderColumns(viewId: string, fieldIds: string[]): Promise<View> {
    // 先获取当前视图配置
    const currentView = await this.get(viewId);
    const currentColumnMeta = currentView.columnMeta || [];
    
    // 创建字段ID到配置的映射
    const columnMap = new Map();
    currentColumnMeta.forEach((col: any) => {
      columnMap.set(col.fieldId, col);
    });
    
    // 按新顺序重新排列
    const updatedColumnMeta = fieldIds.map((fieldId, index) => {
      const existingCol = columnMap.get(fieldId);
      return {
        fieldId,
        width: existingCol?.width || 150,
        visible: existingCol?.visible ?? true,
        order: index
      };
    });
    
    return this.updateColumnMeta(viewId, updatedColumnMeta);
  }

  /**
   * 更新视图选项（PUT /api/v1/views/:id/options）
   */
  public async updateOptions(viewId: string, options: any): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}/options`, { options });
  }

  /**
   * 部分更新视图选项（PATCH /api/v1/views/:id/options）
   */
  public async patchOptions(viewId: string, options: any): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}/options`, { options });
  }

  /**
   * 更新视图顺序（PUT /api/v1/views/:id/order）
   */
  public async updateOrder(viewId: string, order: number): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}/order`, { order });
  }

  // ==================== 视图共享 ====================

  /**
   * 启用视图分享（POST /api/v1/views/:id/enable-share）
   */
  public async enableShare(viewId: string, password?: string): Promise<View> {
    return this.httpClient.post<View>(`/api/v1/views/${viewId}/enable-share`, { password });
  }

  /**
   * 禁用视图分享（POST /api/v1/views/:id/disable-share）
   */
  public async disableShare(viewId: string): Promise<View> {
    return this.httpClient.post<View>(`/api/v1/views/${viewId}/disable-share`);
  }

  /**
   * 刷新分享ID（POST /api/v1/views/:id/refresh-share-id）
   */
  public async refreshShareId(viewId: string): Promise<View> {
    return this.httpClient.post<View>(`/api/v1/views/${viewId}/refresh-share-id`);
  }

  /**
   * 更新分享元数据（PUT /api/v1/views/:id/share-meta）
   */
  public async updateShareMeta(viewId: string, shareMeta: any): Promise<View> {
    return this.httpClient.patch<View>(`/api/v1/views/${viewId}/share-meta`, { shareMeta });
  }

  /**
   * 通过分享ID获取视图（GET /api/v1/share/views/:shareId）
   */
  public async getByShareId(shareId: string): Promise<View> {
    return this.httpClient.get<View>(`/api/v1/share/views/${shareId}`);
  }

  // ==================== 视图锁定 ====================

  /**
   * 锁定视图（POST /api/v1/views/:id/lock）
   */
  public async lock(viewId: string): Promise<View> {
    return this.httpClient.post<View>(`/api/v1/views/${viewId}/lock`);
  }

  /**
   * 解锁视图（POST /api/v1/views/:id/unlock）
   */
  public async unlock(viewId: string): Promise<View> {
    return this.httpClient.post<View>(`/api/v1/views/${viewId}/unlock`);
  }

  // ==================== 视图统计功能 ====================

  /**
   * 获取视图总数（GET /api/v1/tables/:tableId/views/count）
   */
  public async countViews(tableId: string): Promise<number> {
    const result = await this.httpClient.get<{ count: number }>(`/api/v1/tables/${tableId}/views/count`);
    return result.count;
  }

  // ==================== 数据操作（未实现部分标记）====================

  /**
   * 以下方法为未实现接口，仅预留
   */

  public async getGridData(viewId: string, params?: PaginationParams): Promise<any> {
    return this.httpClient.get(`/api/v1/views/${viewId}/grid/data`, params);
  }

  public async getKanbanData(viewId: string): Promise<any> {
    return this.httpClient.get(`/api/v1/views/${viewId}/kanban/data`);
  }

  public async getCalendarData(viewId: string, params?: any): Promise<any> {
    return this.httpClient.get(`/api/v1/views/${viewId}/calendar/data`, params);
  }

  public async getGalleryData(viewId: string, params?: PaginationParams): Promise<any> {
    return this.httpClient.get(`/api/v1/views/${viewId}/gallery/data`, params);
  }
}
