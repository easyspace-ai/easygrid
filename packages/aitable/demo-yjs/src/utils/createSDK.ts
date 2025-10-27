/**
 * SDK 实例工厂
 * 用于从 accessToken 创建 SDK 实例
 */

import { config } from '../config';

/**
 * 创建 LuckDB SDK 实例
 */
export function createSDKInstance(accessToken: string | null) {
  if (!accessToken) return null;
  
  // 由于我们使用的是 axios 直接调用，这里创建一个模拟的 SDK 对象
  // 实际项目中应该使用真正的 LuckDB SDK
  const mockSDK = {
    baseURL: config.baseURL,
    token: accessToken,
    
    // 模拟 SDK 方法
    async getTable(tableId: string) {
      const response = await fetch(`${config.baseURL}/api/v1/tables/${tableId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.json();
    },
    
    async getFields(tableId: string) {
      const response = await fetch(`${config.baseURL}/api/v1/tables/${tableId}/fields`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.json();
    },
    
    async getRecords(tableId: string) {
      const response = await fetch(`${config.baseURL}/api/v1/tables/${tableId}/records`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.json();
    },
    
    async getViews(tableId: string) {
      const response = await fetch(`${config.baseURL}/api/v1/tables/${tableId}/views`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.json();
    },
    
    async createField(tableId: string, data: any) {
      const response = await fetch(`${config.baseURL}/api/v1/tables/${tableId}/fields`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    
    async createRecord(tableId: string, data: any) {
      const response = await fetch(`${config.baseURL}/api/v1/tables/${tableId}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    
    async updateRecord(tableId: string, recordId: string, data: any) {
      const response = await fetch(`${config.baseURL}/api/v1/tables/${tableId}/records/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  };
  
  return mockSDK;
}
