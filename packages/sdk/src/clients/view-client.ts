import { HttpClient } from '../core/http-client.js'

export interface IView {
  id: string
  name: string
  type: 'grid' | 'form' | 'kanban' | 'gallery' | 'calendar'
  tableId: string
  description?: string
  options?: any
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  lastModifiedTime: string
}

export interface ICreateViewRequest {
  name: string
  type: 'grid' | 'form' | 'kanban' | 'gallery' | 'calendar'
  description?: string
  options?: any
}

export interface IUpdateViewRequest {
  name?: string
  description?: string
  options?: any
}

export interface ListViewsRequest {
  tableId: string
}

export interface GetViewRequest {
  tableId: string
  viewId: string
}

export interface CreateViewRequest {
  tableId: string
  data: ICreateViewRequest
}

export interface UpdateViewRequest {
  tableId: string
  viewId: string
  data: IUpdateViewRequest
}

export interface DeleteViewRequest {
  tableId: string
  viewId: string
}

export class ViewClient {
  constructor(private httpClient: HttpClient) {}

  /**
   * 获取表格的所有视图
   */
  async listViews(request: ListViewsRequest): Promise<IView[]> {
    const response = await this.httpClient.get(`/api/v1/tables/${request.tableId}/views`)
    return response.data?.data || []
  }

  /**
   * 获取单个视图
   */
  async getView(request: GetViewRequest): Promise<IView> {
    const response = await this.httpClient.get(`/api/v1/tables/${request.tableId}/views/${request.viewId}`)
    return response.data?.data
  }

  /**
   * 创建视图
   */
  async createView(request: CreateViewRequest): Promise<IView> {
    const response = await this.httpClient.post(`/api/v1/tables/${request.tableId}/views`, request.data)
    return response.data?.data
  }

  /**
   * 更新视图
   */
  async updateView(request: UpdateViewRequest): Promise<IView> {
    const response = await this.httpClient.patch(`/api/v1/tables/${request.tableId}/views/${request.viewId}`, request.data)
    return response.data?.data
  }

  /**
   * 删除视图
   */
  async deleteView(request: DeleteViewRequest): Promise<void> {
    await this.httpClient.delete(`/api/v1/tables/${request.tableId}/views/${request.viewId}`)
  }

  /**
   * 兼容 @easygrid/aitable 的接口
   */
  async getViews(tableId: string): Promise<IView[]> {
    return this.listViews({ tableId })
  }

  async getViewById(tableId: string, viewId: string): Promise<IView> {
    return this.getView({ tableId, viewId })
  }
}