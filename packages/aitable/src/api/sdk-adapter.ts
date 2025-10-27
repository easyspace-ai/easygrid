/**
 * SDK Adapter - 统一 LuckDB SDK 和 ApiClient 接口
 * 
 * 这个适配器允许 Grid 组件接受外部的 SDK 实例，
 * 而不需要自己维护 SDK 的初始化和登录状态。
 * 
 * 使用场景：
 * 1. 外部系统已经有一个登录好的 SDK 实例
 * 2. 直接传入 Grid 组件，无需重复初始化
 * 3. Grid 组件通过适配器统一访问
 */

import type { LuckDB } from '@easygrid/sdk';
import type { ApiClient } from './client';
import type {
  IBase,
  ITable,
  IField,
  IRecord,
  IView,
  ICreateTableRo,
  ICreateFieldRo,
  ICreateRecordRo,
  ICreateViewRo,
  IUpdateTableRo,
  IUpdateFieldRo,
  IUpdateRecordRo,
  IUpdateViewRo,
  IGetRecordsRo,
  PaginatedResponse,
  ITablePermission,
} from './types';

/**
 * SDK 适配器接口
 * 定义了 Grid 组件所需的所有 API 方法
 */
export interface ISDKAdapter {
  // Base APIs
  getBases(): Promise<IBase[]>;
  getBase(id: string): Promise<IBase>;

  // Table APIs
  getTables(baseId: string): Promise<ITable[]>;
  getTable(tableId: string): Promise<ITable>;
  createTable(baseId: string, data: ICreateTableRo): Promise<ITable>;
  updateTable(tableId: string, data: IUpdateTableRo): Promise<ITable>;
  deleteTable(tableId: string): Promise<void>;
  getTablePermission(tableId: string): Promise<ITablePermission>;

  // Field APIs
  getFields(tableId: string): Promise<IField[]>;
  getField(tableId: string, fieldId: string): Promise<IField>;
  createField(tableId: string, data: ICreateFieldRo): Promise<IField>;
  updateField(tableId: string, fieldId: string, data: IUpdateFieldRo): Promise<IField>;
  deleteField(tableId: string, fieldId: string): Promise<void>;

  // Record APIs
  getRecords(tableId: string, params?: IGetRecordsRo): Promise<PaginatedResponse<IRecord>>;
  getRecord(tableId: string, recordId: string): Promise<IRecord>;
  createRecord(tableId: string, data: ICreateRecordRo): Promise<IRecord>;
  updateRecord(tableId: string, recordId: string, fieldId: string, value: any): Promise<IRecord>;
  deleteRecord(tableId: string, recordId: string): Promise<void>;

  // View APIs
  getViews(tableId: string): Promise<IView[]>;
  getView(tableId: string, viewId: string): Promise<IView>;
  createView(tableId: string, data: ICreateViewRo): Promise<IView>;
  updateView(tableId: string, viewId: string, data: IUpdateViewRo): Promise<IView>;
  deleteView(tableId: string, viewId: string): Promise<void>;
}

/**
 * LuckDB SDK 适配器
 * 将 LuckDB SDK 实例适配为 Grid 组件所需的接口
 */
export class LuckDBAdapter implements ISDKAdapter {
  constructor(private sdk: LuckDB) {}

  // ==================== Base APIs ====================

  async getBases(): Promise<IBase[]> {
    return this.sdk.listBases({}) as Promise<IBase[]>;
  }

  async getBase(id: string): Promise<IBase> {
    return this.sdk.getBase(id) as Promise<IBase>;
  }

  // ==================== Table APIs ====================

  async getTables(baseId: string): Promise<ITable[]> {
    return this.sdk.listTables({ baseId }) as Promise<ITable[]>;
  }

  async getTable(tableId: string): Promise<ITable> {
    return this.sdk.getTable(tableId) as Promise<ITable>;
  }

  async createTable(baseId: string, data: ICreateTableRo): Promise<ITable> {
    return this.sdk.createTable({
      baseId,
      name: data.name,
      ...data,
    }) as Promise<ITable>;
  }

  async updateTable(tableId: string, data: IUpdateTableRo): Promise<ITable> {
    return this.sdk.updateTable(tableId, data) as Promise<ITable>;
  }

  async deleteTable(tableId: string): Promise<void> {
    await this.sdk.deleteTable(tableId);
  }

  async getTablePermission(tableId: string): Promise<ITablePermission> {
    // LuckDB SDK 可能没有这个方法，需要通过其他方式获取
    // 这里暂时返回默认权限
    console.warn('LuckDB SDK does not support getTablePermission yet');
    return {
      canEdit: true,
      canDelete: true,
      canCreate: true,
    } as ITablePermission;
  }

  // ==================== Field APIs ====================

  async getFields(tableId: string): Promise<IField[]> {
    return this.sdk.listFields({ tableId }) as Promise<IField[]>;
  }

  async getField(tableId: string, fieldId: string): Promise<IField> {
    return this.sdk.getField(fieldId) as Promise<IField>;
  }

  async createField(tableId: string, data: ICreateFieldRo): Promise<IField> {
    return this.sdk.createField({
      tableId,
      ...data,
    }) as Promise<IField>;
  }

  async updateField(
    tableId: string,
    fieldId: string,
    data: IUpdateFieldRo
  ): Promise<IField> {
    return this.sdk.updateField(fieldId, data) as Promise<IField>;
  }

  async deleteField(tableId: string, fieldId: string): Promise<void> {
    await this.sdk.deleteField(fieldId);
  }

  // ==================== Record APIs ====================

  async getRecords(
    tableId: string,
    params?: IGetRecordsRo
  ): Promise<PaginatedResponse<IRecord>> {
    const result = await this.sdk.listRecords({
      tableId,
      ...params,
    });
    
    // 适配返回格式 - 新 SDK 可能返回不同的结构
    return {
      data: result.data || result || [],
      total: result.total || (Array.isArray(result) ? result.length : 0),
      page: params?.page || 1,
      pageSize: params?.pageSize || 50,
    } as PaginatedResponse<IRecord>;
  }

  async getRecord(tableId: string, recordId: string): Promise<IRecord> {
    return this.sdk.getRecord(tableId, recordId) as Promise<IRecord>;
  }

  async createRecord(tableId: string, data: ICreateRecordRo): Promise<IRecord> {
    return this.sdk.createRecord({
      tableId,
      data: data.fields || data,
    }) as Promise<IRecord>;
  }

  async updateRecord(
    tableId: string,
    recordId: string,
    fieldId: string,
    value: any
  ): Promise<IRecord> {
    return this.sdk.updateRecord(tableId, recordId, {
      data: { [fieldId]: value },
    }) as Promise<IRecord>;
  }

  async deleteRecord(tableId: string, recordId: string): Promise<void> {
    await this.sdk.deleteRecord(tableId, recordId);
  }

  // ==================== View APIs ====================

  async getViews(tableId: string): Promise<IView[]> {
    return this.sdk.listViews({ tableId }) as Promise<IView[]>;
  }

  async getView(tableId: string, viewId: string): Promise<IView> {
    return this.sdk.getView(viewId) as Promise<IView>;
  }

  async createView(tableId: string, data: ICreateViewRo): Promise<IView> {
    return this.sdk.createView({
      tableId,
      ...data,
    }) as Promise<IView>;
  }

  async updateView(
    tableId: string,
    viewId: string,
    data: IUpdateViewRo
  ): Promise<IView> {
    return this.sdk.updateView(viewId, data) as Promise<IView>;
  }

  async deleteView(tableId: string, viewId: string): Promise<void> {
    await this.sdk.deleteView(viewId);
  }
}

/**
 * ApiClient 适配器（向后兼容）
 * 将现有的 ApiClient 适配为统一接口
 */
export class ApiClientAdapter implements ISDKAdapter {
  constructor(private client: ApiClient) {}

  // 直接代理所有方法到 ApiClient
  async getBases(): Promise<IBase[]> {
    return this.client.getBases();
  }

  async getBase(id: string): Promise<IBase> {
    return this.client.getBase(id);
  }

  async getTables(baseId: string): Promise<ITable[]> {
    return this.client.getTables(baseId);
  }

  async getTable(tableId: string): Promise<ITable> {
    return this.client.getTable(tableId);
  }

  async createTable(baseId: string, data: ICreateTableRo): Promise<ITable> {
    return this.client.createTable(baseId, data);
  }

  async updateTable(tableId: string, data: IUpdateTableRo): Promise<ITable> {
    return this.client.updateTable(tableId, data);
  }

  async deleteTable(tableId: string): Promise<void> {
    return this.client.deleteTable(tableId);
  }

  async getTablePermission(tableId: string): Promise<ITablePermission> {
    return this.client.getTablePermission(tableId);
  }

  async getFields(tableId: string): Promise<IField[]> {
    return this.client.getFields(tableId);
  }

  async getField(tableId: string, fieldId: string): Promise<IField> {
    return this.client.getField(tableId, fieldId);
  }

  async createField(tableId: string, data: ICreateFieldRo): Promise<IField> {
    return this.client.createField(tableId, data);
  }

  async updateField(
    tableId: string,
    fieldId: string,
    data: IUpdateFieldRo
  ): Promise<IField> {
    return this.client.updateField(tableId, fieldId, data);
  }

  async deleteField(tableId: string, fieldId: string): Promise<void> {
    return this.client.deleteField(tableId, fieldId);
  }

  async getRecords(
    tableId: string,
    params?: IGetRecordsRo
  ): Promise<PaginatedResponse<IRecord>> {
    return this.client.getRecords(tableId, params);
  }

  async getRecord(tableId: string, recordId: string): Promise<IRecord> {
    return this.client.getRecord(tableId, recordId);
  }

  async createRecord(tableId: string, data: ICreateRecordRo): Promise<IRecord> {
    return this.client.createRecord(tableId, data);
  }

  async updateRecord(
    tableId: string,
    recordId: string,
    fieldId: string,
    value: any
  ): Promise<IRecord> {
    return this.client.updateRecord(tableId, recordId, fieldId, value);
  }

  async deleteRecord(tableId: string, recordId: string): Promise<void> {
    return this.client.deleteRecord(tableId, recordId);
  }

  async getViews(tableId: string): Promise<IView[]> {
    return this.client.getViews(tableId);
  }

  async getView(tableId: string, viewId: string): Promise<IView> {
    return this.client.getView(tableId, viewId);
  }

  async createView(tableId: string, data: ICreateViewRo): Promise<IView> {
    return this.client.createView(tableId, data);
  }

  async updateView(
    tableId: string,
    viewId: string,
    data: IUpdateViewRo
  ): Promise<IView> {
    return this.client.updateView(tableId, viewId, data);
  }

  async deleteView(tableId: string, viewId: string): Promise<void> {
    return this.client.deleteView(tableId, viewId);
  }
}

/**
 * 创建适配器工厂函数
 * 自动识别传入的是 SDK 还是 ApiClient
 */
export function createAdapter(sdkOrClient: LuckDB | ApiClient): ISDKAdapter {
  // 检查是否是 LuckDB SDK
  if ('login' in sdkOrClient && 'auth' in sdkOrClient) {
    return new LuckDBAdapter(sdkOrClient as LuckDB);
  }
  
  // 否则当作 ApiClient
  return new ApiClientAdapter(sdkOrClient as ApiClient);
}

/**
 * 类型守卫 - 检查是否是 LuckDB SDK
 */
export function isLuckDBSDK(sdkOrClient: any): sdkOrClient is LuckDB {
  return 'login' in sdkOrClient && 'auth' in sdkOrClient;
}

/**
 * 类型守卫 - 检查是否是 ApiClient
 */
export function isApiClient(sdkOrClient: any): sdkOrClient is ApiClient {
  return 'setToken' in sdkOrClient && 'clearToken' in sdkOrClient;
}
