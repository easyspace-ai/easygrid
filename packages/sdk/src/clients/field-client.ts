/**
 * 字段客户端（完全匹配EasyDB API v1）
 * 处理字段的 CRUD 操作、验证、批量操作等功能
 */

import { HttpClient } from '../core/http-client';
import type { 
  Field,
  CreateFieldRequest,
  UpdateFieldRequest,
  FieldType,
  FieldOptions,
  PaginatedResponse,
  PaginationParams
} from '../types/index.js';

export class FieldClient {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  // ==================== 基础字段管理 ====================

  /**
   * 创建字段（POST /api/v1/tables/:tableId/fields）
   */
  public async createField(fieldData: CreateFieldRequest): Promise<Field> {
    const { tableId, ...rest } = fieldData;  // ✅ 使用 camelCase
    return this.httpClient.post<Field>(`/api/v1/tables/${tableId}/fields`, { tableId, ...rest });
  }

  /**
   * 获取字段列表（GET /api/v1/fields 或 GET /api/v1/tables/:tableId/fields）
   * ⚠️ 后端返回直接数组，不是分页格式
   */
  /**
   * 获取字段列表（GET /api/v1/tables/:tableId/fields）
   * 注意：Fields 列表不分页，返回指定Table下的所有字段
   */
  public async listFields(params?: { tableId?: string }): Promise<Field[]> {
    if (params?.tableId) {
      // Fields API 返回直接数组
      return this.httpClient.get<Field[]>(`/api/v1/tables/${params.tableId}/fields`);
    }
    // 全局字段列表（如果存在）
    return this.httpClient.get<Field[]>('/api/v1/fields', params);
  }

  /**
   * 获取数据表的字段列表（GET /api/v1/tables/:tableId/fields）
   * @deprecated 使用 listFields 替代
   */
  public async listTableFields(tableId: string): Promise<Field[]> {
    return this.httpClient.get<Field[]>(`/api/v1/tables/${tableId}/fields`);
  }

  /**
   * 获取字段详情（GET /api/v1/fields/:id）
   */
  public async getField(fieldId: string): Promise<Field> {
    return this.httpClient.get<Field>(`/api/v1/fields/${fieldId}`);
  }

  /**
   * 更新字段（PUT /api/v1/fields/:id）
   */
  public async updateField(fieldId: string, updates: UpdateFieldRequest): Promise<Field> {
    return this.httpClient.patch<Field>(`/api/v1/fields/${fieldId}`, updates);
  }

  /**
   * 删除字段（DELETE /api/v1/fields/:id）
   */
  public async deleteField(fieldId: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/fields/${fieldId}`);
  }

  // ==================== 字段类型管理 ====================

  /**
   * 获取支持的字段类型
   * 注：当前API可能未实现，仅预留接口
   */
  public async getFieldTypes(): Promise<Array<{
    type: FieldType;
    name: string;
    description: string;
    icon: string;
    supported_options: string[];
  }>> {
    return this.httpClient.get('/api/v1/fields/types');
  }

  /**
   * 获取特定字段类型的信息
   * 注：当前API可能未实现，仅预留接口
   */
  public async getFieldTypeInfo(fieldType: FieldType): Promise<{
    type: FieldType;
    name: string;
    description: string;
    icon: string;
    supported_options: string[];
    default_options: FieldOptions;
    validation_rules: string[];
  }> {
    return this.httpClient.get(`/api/v1/fields/types/${fieldType}`);
  }

  // ==================== 字段验证 ====================

  /**
   * 验证字段值
   * 注：当前API可能未实现，仅预留接口
   */
  public async validateFieldValue(fieldId: string, value: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    return this.httpClient.post(`/api/v1/fields/${fieldId}/validate`, { value });
  }

  // ==================== 字段排序 ====================

  /**
   * 重新排序字段
   * 注：当前API可能未实现，仅预留接口
   */
  public async reorderFields(tableId: string, fieldIds: string[]): Promise<Field[]> {
    return this.httpClient.patch<Field[]>(`/api/v1/tables/${tableId}/fields/reorder`, { fieldIds });
  }

  // ==================== 批量操作 ====================

  /**
   * 批量创建字段
   * 注：当前API可能未实现，仅预留接口
   */
  public async bulkCreateFields(fields: CreateFieldRequest[]): Promise<Field[]> {
    return this.httpClient.post<Field[]>('/api/v1/fields/bulk', { fields });
  }

  /**
   * 批量更新字段
   * 注：当前API可能未实现，仅预留接口
   */
  public async bulkUpdateFields(updates: Array<{ fieldId: string; updates: UpdateFieldRequest }>): Promise<Field[]> {
    return this.httpClient.patch<Field[]>('/api/v1/fields/bulk', { updates });
  }

  /**
   * 批量删除字段
   * 注：当前API可能未实现，仅预留接口
   */
  public async bulkDeleteFields(fieldIds: string[]): Promise<void> {
    await this.httpClient.post('/api/v1/fields/bulk-delete', { fieldIds });
  }

  // ==================== 便捷方法 ====================

  /**
   * 在指定表格中创建字段（便捷方法）
   */
  public async createFieldInTable(tableId: string, fieldData: Omit<CreateFieldRequest, 'tableId'>): Promise<Field> {
    return this.createField({ ...fieldData, tableId });  // ✅ 使用 camelCase
  }

  /**
   * 获取表格的所有字段（便捷方法）
   */
  public async getTableFields(tableId: string): Promise<Field[]> {
    return this.listTableFields(tableId);
  }

  /**
   * 批量创建表格字段（便捷方法）
   */
  public async bulkCreateFieldsInTable(
    tableId: string, 
    fieldsData: Array<Omit<CreateFieldRequest, 'tableId'>>
  ): Promise<Field[]> {
    const fields = fieldsData.map(field => ({ ...field, tableId }));  // ✅ 使用 camelCase
    return this.bulkCreateFields(fields);
  }
}

