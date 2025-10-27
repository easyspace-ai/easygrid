/**
 * 基础表（Base）客户端
 * 处理 Base 的创建、查询、更新、删除等操作
 * 从 table-client.ts 中拆分出来，保持功能单一
 */

import { HttpClient } from '../core/http-client';
import type { 
  Base,
  CreateBaseRequest,
  UpdateBaseRequest,
  PaginationParams,
  PaginatedResponse
} from '../types/index.js';
import { adaptPaginatedResponse, type BackendPaginatedResponse } from '../utils/response-adapter';

export class BaseClient {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  // ==================== Base 管理 ====================

  /**
   * 创建基础表（POST /api/v1/spaces/:spaceId/bases）
   */
  public async createBase(baseData: CreateBaseRequest): Promise<Base> {
    const { spaceId, ...rest } = baseData;  // ✅ 使用 camelCase
    return this.httpClient.post<Base>(`/api/v1/spaces/${spaceId}/bases`, rest);
  }

  /**
   * 获取基础表列表（GET /api/v1/spaces/:spaceId/bases）
   * 注意：Base列表不分页，返回指定空间下的所有Bases
   * 如果不提供 spaceId，将先获取所有 spaces，然后聚合所有 bases
   */
  public async listBases(params?: { spaceId?: string }): Promise<Base[]> {
    if (params?.spaceId) {
      // 后端返回直接数组
      return this.httpClient.get<Base[]>(`/api/v1/spaces/${params.spaceId}/bases`);
    }
    
    // ⚠️ 后端不支持 GET /api/v1/bases
    // 需要先获取所有 spaces，然后聚合所有 bases
    try {
      // 1. 获取所有 spaces（不分页）
      const spaces = await this.httpClient.get<any[]>('/api/v1/spaces');
      
      // 2. 聚合所有 spaces 的 bases
      const allBases: Base[] = [];
      for (const space of spaces || []) {
        try {
          const bases = await this.httpClient.get<Base[]>(`/api/v1/spaces/${space.id}/bases`);
          allBases.push(...(bases || []));
        } catch (err) {
          // 某个 space 的 bases 获取失败，继续处理其他 spaces
          console.warn(`Failed to get bases for space ${space.id}:`, err);
        }
      }
      
      return allBases;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取基础表详情（GET /api/v1/bases/:id）
   */
  public async getBase(baseId: string): Promise<Base> {
    return this.httpClient.get<Base>(`/api/v1/bases/${baseId}`);
  }

  /**
   * 更新基础表（PATCH /api/v1/bases/:id）
   */
  public async updateBase(baseId: string, updateData: UpdateBaseRequest): Promise<Base> {
    return this.httpClient.patch<Base>(`/api/v1/bases/${baseId}`, updateData);
  }

  /**
   * 删除基础表（DELETE /api/v1/bases/:id）
   * 注：当前API可能未实现，仅预留接口
   */
  public async deleteBase(baseId: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/bases/${baseId}`);
  }

  /**
   * 复制基础表（POST /api/v1/bases/:id/duplicate）
   * 注：当前API可能未实现，仅预留接口
   */
  public async duplicateBase(baseId: string, data?: { name?: string }): Promise<Base> {
    return this.httpClient.post<Base>(`/api/v1/bases/${baseId}/duplicate`, data);
  }

  /**
   * 获取基础表权限（GET /api/v1/bases/:id/permission）
   */
  public async getBasePermission(baseId: string): Promise<any> {
    return this.httpClient.get(`/api/v1/bases/${baseId}/permission`);
  }

  /**
   * 获取基础表协作者列表（GET /api/v1/bases/:id/collaborators）
   * 注：当前API可能未实现，仅预留接口
   */
  public async getBaseCollaborators(baseId: string): Promise<any[]> {
    return this.httpClient.get<any[]>(`/api/v1/bases/${baseId}/collaborators`);
  }

  /**
   * 添加基础表协作者（POST /api/v1/bases/:id/collaborators）
   * 注：当前API可能未实现，仅预留接口
   */
  public async addBaseCollaborator(baseId: string, data: { userId: string; role: string }): Promise<any> {
    return this.httpClient.post(`/api/v1/bases/${baseId}/collaborators`, data);
  }
}

