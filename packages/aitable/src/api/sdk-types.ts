/**
 * 类型定义
 * 为 grid 包提供类型定义
 * 注意：避免与 grid 自己的类型冲突，使用命名空间或别名
 */

// 基础类型定义
export interface LuckDBConfig {
  apiUrl: string;
  wsUrl: string;
  token?: string;
}

export interface SDKUser {
  id: string;
  name: string;
  email: string;
}

export interface SDKSpace {
  id: string;
  name: string;
  description?: string;
}

export interface SDKBase {
  id: string;
  name: string;
  description?: string;
  spaceId: string;
}

export interface SDKTable {
  id: string;
  name: string;
  description?: string;
  baseId: string;
}

export interface SDKField {
  id: string;
  name: string;
  type: string;
  tableId: string;
}

export interface SDKRecord {
  id: string;
  fields: Record<string, any>;
  tableId: string;
}

export interface SDKView {
  id: string;
  name: string;
  type: string;
  tableId: string;
}

// 请求类型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
}

export interface CreateBaseRequest {
  name: string;
  description?: string;
  spaceId: string;
}

export interface CreateTableRequest {
  name: string;
  description?: string;
  baseId: string;
}

export interface CreateFieldRequest {
  name: string;
  type: string;
  tableId: string;
}

export interface CreateRecordRequest {
  fields: Record<string, any>;
  tableId: string;
}

export interface CreateViewRequest {
  name: string;
  type: string;
  tableId: string;
}

// 响应类型
export interface AuthResponse {
  token: string;
  user: SDKUser;
}

// 查询类型
export interface FilterExpression {
  field: string;
  operator: string;
  value: any;
}

export interface SortExpression {
  field: string;
  direction: 'asc' | 'desc';
}

// 视图相关
export interface ViewConfig {
  filters?: FilterExpression[];
  sorts?: SortExpression[];
  fields?: string[];
}

// 协作相关
export interface CollaborationSession {
  id: string;
  userId: string;
  tableId: string;
}

export interface Presence {
  userId: string;
  cursor?: CursorPosition;
  lastSeen: Date;
}

export interface CursorPosition {
  row: number;
  column: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface CollaborationMessage {
  type: string;
  sessionId: string;
  data: any;
}

export interface RecordChangeMessage {
  type: 'create' | 'update' | 'delete';
  recordId: string;
  tableId: string;
  data?: any;
}

// 工具类型
export type JsonObject = Record<string, any>;

// 主类定义（简化版）
export class LuckDB {
  constructor(config: LuckDBConfig) {}
  
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    throw new Error('Not implemented');
  }
  
  async getSpaces(): Promise<SDKSpace[]> {
    throw new Error('Not implemented');
  }
  
  async getBases(spaceId: string): Promise<SDKBase[]> {
    throw new Error('Not implemented');
  }
  
  async getTables(baseId: string): Promise<SDKTable[]> {
    throw new Error('Not implemented');
  }
  
  async getFields(tableId: string): Promise<SDKField[]> {
    throw new Error('Not implemented');
  }
  
  async getRecords(tableId: string): Promise<SDKRecord[]> {
    throw new Error('Not implemented');
  }
}

export const LuckDBSDK = LuckDB;

