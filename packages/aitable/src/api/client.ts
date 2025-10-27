/**
 * API Client
 * Main API client for communicating with Teable backend
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
  IBase,
  ITable,
  IField,
  IRecord,
  IView,
  IComment,
  ICreateBaseRo,
  ICreateTableRo,
  ICreateFieldRo,
  ICreateRecordRo,
  ICreateViewRo,
  ICreateCommentRo,
  IUpdateBaseRo,
  IUpdateTableRo,
  IUpdateFieldRo,
  IUpdateRecordRo,
  IUpdateViewRo,
  IUpdateCommentRo,
  IGetRecordsRo,
  PaginatedResponse,
  ITablePermission,
} from './types';

export interface ApiClientConfig {
  baseURL: string;
  token?: string;
  timeout?: number;
  onError?: (error: any) => void;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching
        if (config.params) {
          config.params._t = Date.now();
        } else {
          config.params = { _t: Date.now() };
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.config.onUnauthorized?.();
        }
        
        this.config.onError?.(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Update authorization token
   */
  setToken(token: string): void {
    this.config.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authorization token
   */
  clearToken(): void {
    this.config.token = undefined;
    delete this.client.defaults.headers.common['Authorization'];
  }

  // ==================== Base APIs ====================

  /**
   * Get all bases
   */
  async getBases(): Promise<IBase[]> {
    const response = await this.client.get('/base');
    return response.data;
  }

  /**
   * Get a base by ID
   */
  async getBase(id: string): Promise<IBase> {
    const response = await this.client.get(`/base/${id}`);
    return response.data;
  }

  /**
   * Create a new base
   */
  async createBase(data: ICreateBaseRo): Promise<IBase> {
    const response = await this.client.post('/base', data);
    return response.data;
  }

  /**
   * Update a base
   */
  async updateBase(id: string, data: IUpdateBaseRo): Promise<IBase> {
    const response = await this.client.patch(`/base/${id}`, data);
    return response.data;
  }

  /**
   * Delete a base
   */
  async deleteBase(id: string): Promise<void> {
    await this.client.delete(`/base/${id}`);
  }

  // ==================== Table APIs ====================

  /**
   * Get all tables in a base
   */
  async getTables(baseId: string): Promise<ITable[]> {
    const response = await this.client.get(`/base/${baseId}/table`);
    return response.data;
  }

  /**
   * Get a table by ID
   */
  async getTable(tableId: string): Promise<ITable> {
    const response = await this.client.get(`/table/${tableId}`);
    return response.data;
  }

  /**
   * Create a new table
   */
  async createTable(baseId: string, data: ICreateTableRo): Promise<ITable> {
    const response = await this.client.post(`/base/${baseId}/table`, data);
    return response.data;
  }

  /**
   * Update a table
   */
  async updateTable(tableId: string, data: IUpdateTableRo): Promise<ITable> {
    const response = await this.client.patch(`/table/${tableId}`, data);
    return response.data;
  }

  /**
   * Delete a table
   */
  async deleteTable(tableId: string): Promise<void> {
    await this.client.delete(`/table/${tableId}`);
  }

  /**
   * Get table permissions
   */
  async getTablePermission(tableId: string): Promise<ITablePermission> {
    const response = await this.client.get(`/table/${tableId}/permission`);
    return response.data;
  }

  // ==================== Field APIs ====================

  /**
   * Get all fields in a table
   */
  async getFields(tableId: string): Promise<IField[]> {
    const response = await this.client.get(`/table/${tableId}/field`);
    return response.data;
  }

  /**
   * Get a field by ID
   */
  async getField(tableId: string, fieldId: string): Promise<IField> {
    const response = await this.client.get(`/table/${tableId}/field/${fieldId}`);
    return response.data;
  }

  /**
   * Create a new field
   */
  async createField(tableId: string, data: ICreateFieldRo): Promise<IField> {
    const response = await this.client.post(`/table/${tableId}/field`, data);
    return response.data;
  }

  /**
   * Update a field
   */
  async updateField(
    tableId: string,
    fieldId: string,
    data: IUpdateFieldRo
  ): Promise<IField> {
    const response = await this.client.patch(
      `/table/${tableId}/field/${fieldId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a field
   */
  async deleteField(tableId: string, fieldId: string): Promise<void> {
    await this.client.delete(`/table/${tableId}/field/${fieldId}`);
  }

  /**
   * Convert field type
   */
  async convertField(
    tableId: string,
    fieldId: string,
    newType: string,
    options?: any
  ): Promise<IField> {
    const response = await this.client.patch(
      `/table/${tableId}/field/${fieldId}/convert`,
      { type: newType, options }
    );
    return response.data;
  }

  // ==================== Record APIs ====================

  /**
   * Get records from a table
   */
  async getRecords(
    tableId: string,
    params?: IGetRecordsRo
  ): Promise<PaginatedResponse<IRecord>> {
    const response = await this.client.get(`/table/${tableId}/record`, {
      params,
    });
    return response.data;
  }

  /**
   * Get a single record
   */
  async getRecord(tableId: string, recordId: string): Promise<IRecord> {
    const response = await this.client.get(
      `/table/${tableId}/record/${recordId}`
    );
    return response.data;
  }

  /**
   * Create a new record
   */
  async createRecord(
    tableId: string,
    data: ICreateRecordRo
  ): Promise<IRecord> {
    const response = await this.client.post(`/table/${tableId}/record`, data);
    return response.data;
  }

  /**
   * Update a record
   */
  async updateRecord(
    tableId: string,
    recordId: string,
    fieldId: string,
    value: any
  ): Promise<IRecord> {
    const response = await this.client.patch(
      `/table/${tableId}/record/${recordId}`,
      {
        fieldId,
        value,
      }
    );
    return response.data;
  }

  /**
   * Batch update records
   */
  async batchUpdateRecords(
    tableId: string,
    updates: IUpdateRecordRo[]
  ): Promise<IRecord[]> {
    const response = await this.client.patch(
      `/table/${tableId}/record/batch`,
      { records: updates }
    );
    return response.data;
  }

  /**
   * Delete a record
   */
  async deleteRecord(tableId: string, recordId: string): Promise<void> {
    await this.client.delete(`/table/${tableId}/record/${recordId}`);
  }

  /**
   * Batch delete records
   */
  async batchDeleteRecords(
    tableId: string,
    recordIds: string[]
  ): Promise<void> {
    await this.client.delete(`/table/${tableId}/record/batch`, {
      data: { recordIds },
    });
  }

  // ==================== View APIs ====================

  /**
   * Get all views in a table
   */
  async getViews(tableId: string): Promise<IView[]> {
    const response = await this.client.get(`/table/${tableId}/view`);
    return response.data;
  }

  /**
   * Get a view by ID
   */
  async getView(tableId: string, viewId: string): Promise<IView> {
    const response = await this.client.get(`/table/${tableId}/view/${viewId}`);
    return response.data;
  }

  /**
   * Create a new view
   */
  async createView(tableId: string, data: ICreateViewRo): Promise<IView> {
    const response = await this.client.post(`/table/${tableId}/view`, data);
    return response.data;
  }

  /**
   * Update a view
   */
  async updateView(
    tableId: string,
    viewId: string,
    data: IUpdateViewRo
  ): Promise<IView> {
    const response = await this.client.patch(
      `/table/${tableId}/view/${viewId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a view
   */
  async deleteView(tableId: string, viewId: string): Promise<void> {
    await this.client.delete(`/table/${tableId}/view/${viewId}`);
  }

  // ==================== Comment APIs ====================

  /**
   * Get comments for a record
   */
  async getComments(
    tableId: string,
    recordId: string
  ): Promise<IComment[]> {
    const response = await this.client.get(
      `/table/${tableId}/record/${recordId}/comment`
    );
    return response.data;
  }

  /**
   * Create a comment
   */
  async createComment(
    tableId: string,
    recordId: string,
    data: ICreateCommentRo
  ): Promise<IComment> {
    const response = await this.client.post(
      `/table/${tableId}/record/${recordId}/comment`,
      data
    );
    return response.data;
  }

  /**
   * Update a comment
   */
  async updateComment(
    tableId: string,
    recordId: string,
    commentId: string,
    data: IUpdateCommentRo
  ): Promise<IComment> {
    const response = await this.client.patch(
      `/table/${tableId}/record/${recordId}/comment/${commentId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete a comment
   */
  async deleteComment(
    tableId: string,
    recordId: string,
    commentId: string
  ): Promise<void> {
    await this.client.delete(
      `/table/${tableId}/record/${recordId}/comment/${commentId}`
    );
  }

  // ==================== Utility ====================

  /**
   * Generic GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  /**
   * Generic POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  /**
   * Generic PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}


