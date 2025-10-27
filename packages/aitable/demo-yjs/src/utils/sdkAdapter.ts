/**
 * SDK 适配器 - 将现有的 API 调用适配到 LuckDB SDK
 * 
 * 这个适配器将现有的 axios 调用转换为 LuckDB SDK 调用
 */

import { LuckDB } from '@easygrid/sdk';
import axios from 'axios';
import { config } from '../config';

export interface DemoSDKAdapter {
  // 认证相关
  login(email: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  
  // 表格相关
  getTable(tableId: string): Promise<any>;
  getFields(tableId: string): Promise<any[]>;
  getRecords(tableId: string): Promise<any[]>;
  getViews(tableId: string): Promise<any[]>;
  
  // 记录操作
  createRecord(tableId: string, data: Record<string, any>): Promise<any>;
  updateRecord(tableId: string, recordId: string, data: Record<string, any>): Promise<any>;
  deleteRecord(tableId: string, recordId: string): Promise<boolean>;
  
  // 字段操作
  createField(tableId: string, fieldData: any): Promise<any>;
  updateField(tableId: string, fieldId: string, fieldData: any): Promise<any>;
  deleteField(tableId: string, fieldId: string): Promise<boolean>;
  
  // 视图操作
  createView(tableId: string, viewData: any): Promise<any>;
  updateView(tableId: string, viewId: string, viewData: any): Promise<any>;
  deleteView(tableId: string, viewId: string): Promise<boolean>;
}

/**
 * 基于 LuckDB SDK 的适配器实现
 */
export class LuckDBSDKAdapter implements DemoSDKAdapter {
  private sdk: LuckDB;
  private isLoggedIn: boolean = false;

  constructor() {
    this.sdk = new LuckDB({
      baseUrl: config.baseURL,
      debug: true,
    });
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      await this.sdk.login({ email, password });
      this.isLoggedIn = true;
      return true;
    } catch (error) {
      console.error('SDK 登录失败:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    this.isLoggedIn = false;
    // SDK 可能没有 logout 方法，这里只是重置状态
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  async getTable(tableId: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.getTable(tableId);
      return response;
    } catch (error) {
      console.error('获取表格失败:', error);
      throw error;
    }
  }

  async getFields(tableId: string): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.listFields(tableId);
      return response;
    } catch (error) {
      console.error('获取字段失败:', error);
      throw error;
    }
  }

  async getRecords(tableId: string): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.listRecords(tableId);
      return response.data || [];
    } catch (error) {
      console.error('获取记录失败:', error);
      throw error;
    }
  }

  async getViews(tableId: string): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.listViews(tableId);
      return response;
    } catch (error) {
      console.error('获取视图失败:', error);
      throw error;
    }
  }

  async createRecord(tableId: string, data: Record<string, any>): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.createRecord(tableId, { data });
      return response;
    } catch (error) {
      console.error('创建记录失败:', error);
      throw error;
    }
  }

  async updateRecord(tableId: string, recordId: string, data: Record<string, any>): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.updateRecord(tableId, recordId, { data });
      return response;
    } catch (error) {
      console.error('更新记录失败:', error);
      throw error;
    }
  }

  async deleteRecord(tableId: string, recordId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      await this.sdk.deleteRecord(tableId, recordId);
      return true;
    } catch (error) {
      console.error('删除记录失败:', error);
      return false;
    }
  }

  async createField(tableId: string, fieldData: any): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.createField(tableId, fieldData);
      return response;
    } catch (error) {
      console.error('创建字段失败:', error);
      throw error;
    }
  }

  async updateField(tableId: string, fieldId: string, fieldData: any): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.updateField(tableId, fieldId, fieldData);
      return response;
    } catch (error) {
      console.error('更新字段失败:', error);
      throw error;
    }
  }

  async deleteField(tableId: string, fieldId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      await this.sdk.deleteField(tableId, fieldId);
      return true;
    } catch (error) {
      console.error('删除字段失败:', error);
      return false;
    }
  }

  async createView(tableId: string, viewData: any): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.createView(tableId, viewData);
      return response;
    } catch (error) {
      console.error('创建视图失败:', error);
      throw error;
    }
  }

  async updateView(tableId: string, viewId: string, viewData: any): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      const response = await this.sdk.updateView(tableId, viewId, viewData);
      return response;
    } catch (error) {
      console.error('更新视图失败:', error);
      throw error;
    }
  }

  async deleteView(tableId: string, viewId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    try {
      await this.sdk.deleteView(tableId, viewId);
      return true;
    } catch (error) {
      console.error('删除视图失败:', error);
      return false;
    }
  }

  // 获取 SDK 实例（用于直接调用）
  getSDK(): LuckDB {
    return this.sdk;
  }
}

/**
 * 基于传统 API 的适配器实现（向后兼容）
 */
export class ApiClientAdapter implements DemoSDKAdapter {
  private isLoggedIn: boolean = false;
  private accessToken: string | null = null;

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post('/api/v1/auth/login', {
        email,
        password,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data.code === 200000 && response.data.data) {
        const { accessToken, user } = response.data.data;
        this.accessToken = accessToken;
        this.isLoggedIn = true;
        
        // 保存到 localStorage
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('accessToken', accessToken);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('API 登录失败:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    this.isLoggedIn = false;
    this.accessToken = null;
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn;
  }

  private getAuthHeaders() {
    return this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {};
  }

  async getTable(tableId: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.get(`/api/v1/tables/${tableId}`, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`获取表格失败: ${response.data.message}`);
  }

  async getFields(tableId: string): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.get(`/api/v1/tables/${tableId}/fields`, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`获取字段失败: ${response.data.message}`);
  }

  async getRecords(tableId: string): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.get(`/api/v1/tables/${tableId}/records`, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`获取记录失败: ${response.data.message}`);
  }

  async getViews(tableId: string): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.get(`/api/v1/tables/${tableId}/views`, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`获取视图失败: ${response.data.message}`);
  }

  async createRecord(tableId: string, data: Record<string, any>): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.post(`/api/v1/tables/${tableId}/records`, {
      data
    }, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`创建记录失败: ${response.data.message}`);
  }

  async updateRecord(tableId: string, recordId: string, data: Record<string, any>): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.patch(`/api/v1/tables/${tableId}/records/${recordId}`, {
      data
    }, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`更新记录失败: ${response.data.message}`);
  }

  async deleteRecord(tableId: string, recordId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.delete(`/api/v1/tables/${tableId}/records/${recordId}`, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    return response.data.code === 200000;
  }

  async createField(tableId: string, fieldData: any): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.post(`/api/v1/tables/${tableId}/fields`, fieldData, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`创建字段失败: ${response.data.message}`);
  }

  async updateField(tableId: string, fieldId: string, fieldData: any): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.patch(`/api/v1/tables/${tableId}/fields/${fieldId}`, fieldData, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`更新字段失败: ${response.data.message}`);
  }

  async deleteField(tableId: string, fieldId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.delete(`/api/v1/tables/${tableId}/fields/${fieldId}`, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    return response.data.code === 200000;
  }

  async createView(tableId: string, viewData: any): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.post(`/api/v1/tables/${tableId}/views`, viewData, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`创建视图失败: ${response.data.message}`);
  }

  async updateView(tableId: string, viewId: string, viewData: any): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.patch(`/api/v1/tables/${tableId}/views/${viewId}`, viewData, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    if (response.data.code === 200000) {
      return response.data.data;
    }
    throw new Error(`更新视图失败: ${response.data.message}`);
  }

  async deleteView(tableId: string, viewId: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('未登录');
    }
    
    const response = await axios.delete(`/api/v1/tables/${tableId}/views/${viewId}`, {
      withCredentials: true,
      headers: this.getAuthHeaders(),
    });
    
    return response.data.code === 200000;
  }
}

/**
 * 创建适配器实例
 */
export function createDemoAdapter(useSDK: boolean = true): DemoSDKAdapter {
  return useSDK ? new LuckDBSDKAdapter() : new ApiClientAdapter();
}

