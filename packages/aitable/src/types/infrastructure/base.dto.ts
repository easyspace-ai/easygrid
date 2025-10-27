/**
 * Base DTO - API 层 Base 数据传输对象
 */

/**
 * Base DTO (从 API 返回)
 */
export interface BaseDTO {
  id: string;
  name: string;
  icon?: string;
  spaceId: string;
  createdTime: string;
  lastModifiedTime: string;
}

/**
 * 创建 Base 请求 DTO
 */
export interface CreateBaseDTO {
  name: string;
  icon?: string;
  spaceId: string;
}

/**
 * 更新 Base 请求 DTO
 */
export interface UpdateBaseDTO {
  name?: string;
  icon?: string;
}

