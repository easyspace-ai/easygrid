/**
 * 协作者管理客户端
 * 处理 Space 和 Base 的协作者管理功能
 */

import { HttpClient } from '../core/http-client.js';
import type {
  Collaborator,
  SpaceCollaborator,
  BaseCollaborator,
  AddCollaboratorRequest,
  UpdateCollaboratorRequest,
  CollaboratorRole,
  ResourceType,
} from '../types/index.js';

export class CollaboratorClient {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  // ==================== Space 协作者管理 ====================

  /**
   * 获取 Space 协作者列表
   * GET /api/v1/spaces/:spaceId/collaborators
   */
  public async listSpaceCollaborators(spaceId: string): Promise<SpaceCollaborator[]> {
    return this.httpClient.get<SpaceCollaborator[]>(`/api/v1/spaces/${spaceId}/collaborators`);
  }

  /**
   * 添加 Space 协作者
   * POST /api/v1/spaces/:spaceId/collaborators
   */
  public async addSpaceCollaborator(
    spaceId: string,
    data: AddCollaboratorRequest
  ): Promise<SpaceCollaborator> {
    // 转换字段名为服务器端期望的格式
    const requestData = {
      principal_id: data.principalId,
      principal_type: data.principalType,
      role: data.role
    };
    return this.httpClient.post<SpaceCollaborator>(`/api/v1/spaces/${spaceId}/collaborators`, requestData);
  }

  /**
   * 更新 Space 协作者
   * PATCH /api/v1/spaces/:spaceId/collaborators/:collaboratorId
   */
  public async updateSpaceCollaborator(
    spaceId: string,
    collaboratorId: string,
    data: UpdateCollaboratorRequest
  ): Promise<SpaceCollaborator> {
    return this.httpClient.patch<SpaceCollaborator>(
      `/api/v1/spaces/${spaceId}/collaborators/${collaboratorId}`,
      data
    );
  }

  /**
   * 移除 Space 协作者
   * DELETE /api/v1/spaces/:spaceId/collaborators/:collaboratorId
   */
  public async removeSpaceCollaborator(spaceId: string, collaboratorId: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/spaces/${spaceId}/collaborators/${collaboratorId}`);
  }

  // ==================== Base 协作者管理 ====================

  /**
   * 获取 Base 协作者列表
   * GET /api/v1/bases/:baseId/collaborators
   */
  public async listBaseCollaborators(baseId: string): Promise<BaseCollaborator[]> {
    return this.httpClient.get<BaseCollaborator[]>(`/api/v1/bases/${baseId}/collaborators`);
  }

  /**
   * 添加 Base 协作者
   * POST /api/v1/bases/:baseId/collaborators
   */
  public async addBaseCollaborator(
    baseId: string,
    data: AddCollaboratorRequest
  ): Promise<BaseCollaborator> {
    // 转换字段名为服务器端期望的格式
    const requestData = {
      principal_id: data.principalId,
      principal_type: data.principalType,
      role: data.role
    };
    return this.httpClient.post<BaseCollaborator>(`/api/v1/bases/${baseId}/collaborators`, requestData);
  }

  /**
   * 更新 Base 协作者
   * PATCH /api/v1/bases/:baseId/collaborators/:collaboratorId
   */
  public async updateBaseCollaborator(
    baseId: string,
    collaboratorId: string,
    data: UpdateCollaboratorRequest
  ): Promise<BaseCollaborator> {
    return this.httpClient.patch<BaseCollaborator>(
      `/api/v1/bases/${baseId}/collaborators/${collaboratorId}`,
      data
    );
  }

  /**
   * 移除 Base 协作者
   * DELETE /api/v1/bases/:baseId/collaborators/:collaboratorId
   */
  public async removeBaseCollaborator(baseId: string, collaboratorId: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/bases/${baseId}/collaborators/${collaboratorId}`);
  }

  // ==================== 通用协作者管理 ====================

  /**
   * 获取协作者列表（通用方法）
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   */
  public async listCollaborators(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<Collaborator[]> {
    if (resourceType === 'space') {
      return this.listSpaceCollaborators(resourceId);
    } else if (resourceType === 'base') {
      return this.listBaseCollaborators(resourceId);
    } else {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  /**
   * 添加协作者（通用方法）
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param data 协作者数据
   */
  public async addCollaborator(
    resourceType: ResourceType,
    resourceId: string,
    data: AddCollaboratorRequest
  ): Promise<Collaborator> {
    if (resourceType === 'space') {
      return this.addSpaceCollaborator(resourceId, data);
    } else if (resourceType === 'base') {
      return this.addBaseCollaborator(resourceId, data);
    } else {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  /**
   * 更新协作者（通用方法）
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param collaboratorId 协作者ID
   * @param data 更新数据
   */
  public async updateCollaborator(
    resourceType: ResourceType,
    resourceId: string,
    collaboratorId: string,
    data: UpdateCollaboratorRequest
  ): Promise<Collaborator> {
    if (resourceType === 'space') {
      return this.updateSpaceCollaborator(resourceId, collaboratorId, data);
    } else if (resourceType === 'base') {
      return this.updateBaseCollaborator(resourceId, collaboratorId, data);
    } else {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  /**
   * 移除协作者（通用方法）
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param collaboratorId 协作者ID
   */
  public async removeCollaborator(
    resourceType: ResourceType,
    resourceId: string,
    collaboratorId: string
  ): Promise<void> {
    if (resourceType === 'space') {
      return this.removeSpaceCollaborator(resourceId, collaboratorId);
    } else if (resourceType === 'base') {
      return this.removeBaseCollaborator(resourceId, collaboratorId);
    } else {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  // ==================== 协作者查询和过滤 ====================

  /**
   * 根据角色获取协作者
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param role 角色
   */
  public async getCollaboratorsByRole(
    resourceType: ResourceType,
    resourceId: string,
    role: CollaboratorRole
  ): Promise<Collaborator[]> {
    const response = await this.listCollaborators(resourceType, resourceId);
    const collaborators = response || [];
    return collaborators.filter((collaborator: any) => collaborator.role === role);
  }

  /**
   * 检查用户是否为协作者
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param userId 用户ID
   */
  public async isCollaborator(
    resourceType: ResourceType,
    resourceId: string,
    userId: string
  ): Promise<boolean> {
    const response = await this.listCollaborators(resourceType, resourceId);
    const collaborators = response || [];
    return collaborators.some((collaborator: any) => collaborator.userId === userId);
  }

  /**
   * 获取用户的协作者角色
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param userId 用户ID
   */
  public async getUserRole(
    resourceType: ResourceType,
    resourceId: string,
    userId: string
  ): Promise<CollaboratorRole | null> {
    const response = await this.listCollaborators(resourceType, resourceId);
    const collaborators = response || [];
    const collaborator = collaborators.find((c: any) => c.userId === userId);
    return collaborator?.role || null;
  }

  /**
   * 检查用户权限
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @param userId 用户ID
   * @param requiredRole 所需角色
   */
  public async hasPermission(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    requiredRole: CollaboratorRole
  ): Promise<boolean> {
    const userRole = await this.getUserRole(resourceType, resourceId, userId);
    if (!userRole) {
      return false;
    }

    // 角色权限等级：owner > creator > editor > viewer
    const roleHierarchy: Record<CollaboratorRole, number> = {
      owner: 4,
      creator: 3,
      editor: 2,
      viewer: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}
