/**
 * Base Domain Model - 领域层 Base 模型
 */

/**
 * Base 领域模型
 */
export interface BaseModel {
  id: string;
  name: string;
  icon?: string;
  spaceId: string;
  createdTime: Date;
  lastModifiedTime: Date;
}

/**
 * 创建 Base 命令
 */
export interface CreateBaseCommand {
  name: string;
  icon?: string;
  spaceId: string;
}

/**
 * 更新 Base 命令
 */
export interface UpdateBaseCommand {
  name?: string;
  icon?: string;
}

