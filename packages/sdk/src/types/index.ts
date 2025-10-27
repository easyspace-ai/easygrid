/**
 * LuckDB SDK 核心类型定义
 * 基于 Go 后端的数据模型设计
 */

// ==================== 基础类型 ====================

/**
 * 基础实体（响应类型使用camelCase）
 */
export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601 格式 - camelCase
  updatedAt: string; // ISO 8601 格式 - camelCase
  createdBy?: string; // 用户ID - camelCase
  updatedBy?: string; // 用户ID - camelCase
  deletedAt?: string | null; // 软删除时间 - camelCase
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * LuckDB 统一API响应格式（响应使用camelCase）
 * 完全符合 server/pkg/response/response.go 定义
 */
export interface APIResponse<T = any> {
  code: number; // 业务状态码
  message: string; // 响应消息
  data: T; // 响应数据
  error?: ErrorPayload; // 错误详情（仅错误时）
  requestId?: string; // 请求ID（追踪）- camelCase
  timestamp?: string; // 响应时间戳
  durationMs?: number; // 处理耗时（毫秒）- camelCase
  version?: string; // API版本
}

export interface ErrorPayload {
  details?: any; // 错误详细信息
}

/**
 * 分页元数据（响应使用camelCase）
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number; // camelCase
}

/**
 * 分页响应格式
 */
export interface PaginatedAPIResponse<T = any> extends APIResponse<T[]> {
  pagination?: PaginationMeta;
}

/**
 * @deprecated 使用 APIResponse 代替
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * @deprecated 使用 ErrorPayload 代替
 */
export interface ApiError {
  error: string;
  code: string;
  details?: string;
  trace_id?: string;
}

// ==================== 用户相关类型 ====================

/**
 * 用户实体（响应类型使用camelCase）
 */
export interface User extends BaseEntity {
  name: string;
  email: string;
  password?: never; // 永不返回密码
  avatar?: string;
  isActive: boolean; // 账户激活状态 - camelCase
  lastLoginAt?: string | null; // camelCase
  lastLoginIp?: string; // camelCase
  emailVerifiedAt?: string | null; // camelCase
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  notifications?: NotificationSettings;
}

export interface NotificationSettings {
  emailNotifications: boolean; // camelCase
  pushNotifications: boolean; // camelCase
  collaborationNotifications: boolean; // camelCase
  systemNotifications: boolean; // camelCase
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * 认证响应（响应类型使用camelCase）
 */
export interface AuthResponse {
  user: User;
  accessToken: string; // camelCase
  refreshToken: string; // camelCase
  expiresIn?: number; // camelCase
  tokenType?: string; // camelCase
}

// ==================== 空间相关类型 ====================

/**
 * 空间实体（完全匹配 server/internal/domain/space/entity）
 */
export interface Space extends BaseEntity {
  name: string;
  description?: string;
  icon?: string;
}

// ==================== 协作者相关类型 ====================

export type CollaboratorRole = 'owner' | 'creator' | 'editor' | 'viewer';

export type ResourceType = 'space' | 'base';

export type CollaboratorStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';

export interface Collaborator extends BaseEntity {
  resourceId: string; // camelCase
  resourceType: ResourceType;
  userId: string; // camelCase
  role: CollaboratorRole;
  createdBy: string; // camelCase
  status?: CollaboratorStatus;
}

export interface SpaceCollaborator extends Collaborator {
  spaceId: string; // camelCase
  resourceType: 'space';
  invited_by: string;
  accepted_at?: string;
  revoked_at?: string;
}

export interface BaseCollaborator extends Collaborator {
  baseId: string; // camelCase
  resourceType: 'base';
  invited_by: string;
  accepted_at?: string;
  revoked_at?: string;
}

export interface AddCollaboratorRequest {
  principalId: string; // camelCase
  principalType: 'user' | 'department';
  role: CollaboratorRole;
}

export interface UpdateCollaboratorRequest {
  role: CollaboratorRole;
}

// ==================== 用户配置相关类型 ====================

export interface UserConfig extends BaseEntity {
  userId: string; // camelCase
  theme?: string;
  language?: string;
  notifications?: { [key: string]: any };
  preferences?: { [key: string]: any };
}

export interface UpdateUserConfigRequest {
  theme?: string;
  language?: string;
  notifications?: { [key: string]: any };
  preferences?: { [key: string]: any };
}

// ==================== ShareDB 相关类型 ====================
// 重新导出新的 ShareDB 类型系统

export * from './realtime.js';
export * from './events.js';

// 选择性导出 ShareDB 类型以避免冲突
export type {
  ShareDBMessage,
  OTOperation,
  ShareDBError,
  ShareDBSnapshot,
  ShareDBConnectionState,
  DocumentEventType,
  DocumentEvent,
  OperationEvent,
  DocumentEventHandler,
  OperationEventHandler,
  ShareDBConnectionConfig,
  DocumentConfig,
  OperationBuilderConfig
} from './sharedb.js';

// 保持向后兼容的旧类型
export interface ShareDBConnection {
  id: string;
  state: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastSeen: number;
}


export interface ShareDBPresenceData {
  id: string;
  data: any;
  lastSeen: number;
}

// Teable 风格的集合命名
export const ShareDBCollections = {
  RECORD: (tableId: string) => `rec_${tableId}`,
  FIELD: (fieldId: string) => `fld_${fieldId}`,
  TABLE: (tableId: string) => `tbl_${tableId}`,
  VIEW: (viewId: string) => `viw_${viewId}`,
} as const;

// Teable 风格的文档类型
export const ShareDBDocTypes = {
  RECORD: 'record',
  FIELD: 'field', 
  TABLE: 'table',
  VIEW: 'view',
} as const;

/**
 * 创建空间请求（完全匹配 server/internal/application/dto/space_dto.go）
 */
export interface CreateSpaceRequest {
  name: string;
  description?: string;
  icon?: string;
}

/**
 * 更新空间请求
 */
export interface UpdateSpaceRequest {
  name?: string;
  description?: string;
  icon?: string;
}

export interface AddCollaboratorRequest {
  userId: string; // ✅ 统一使用 camelCase
  role: CollaboratorRole;
}

// ==================== 基础表相关类型 ====================

/**
 * Base实体（响应类型使用camelCase）
 */
export interface Base extends BaseEntity {
  spaceId: string; // camelCase
  name: string;
  description?: string;
  icon?: string;
}

/**
 * 创建Base请求（统一使用camelCase）
 */
export interface CreateBaseRequest {
  spaceId: string; // ✅ 统一使用 camelCase
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateBaseRequest {
  name?: string;
  description?: string;
  icon?: string;
}

// ==================== 数据表相关类型 ====================

/**
 * Table实体（响应类型使用camelCase）
 */
export interface Table extends BaseEntity {
  baseId: string; // camelCase
  name: string;
  description?: string;
  defaultViewId?: string; // ✅ 默认视图ID（由后端自动创建）
  icon?: string;
  dbTableName?: string; // camelCase
  version: number;
  lastModifiedTime?: string | null; // camelCase
}

/**
 * 创建Table请求（完全匹配 server/internal/application/dto/table_dto.go）
 */
export interface CreateTableRequest {
  baseId: string; // ✅ 统一使用 camelCase
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateTableRequest {
  name?: string;
  description?: string;
  icon?: string;
}

/**
 * 重命名表请求
 */
export interface RenameTableRequest {
  name: string;
}

/**
 * 复制表请求
 */
export interface DuplicateTableRequest {
  name: string;
  withData?: boolean; // 是否复制数据
  withViews?: boolean; // 是否复制视图
  withFields?: boolean; // 是否复制字段配置
}

/**
 * 表用量响应
 */
export interface TableUsageResponse {
  recordCount: number; // 记录数量
  maxRecords: number; // 最大记录数限制
  usagePercentage: number; // 使用百分比
  storageSize: number; // 存储大小（字节）
  maxStorageSize: number; // 最大存储限制（字节）
}

/**
 * 表管理菜单响应
 */
export interface TableManagementMenu {
  table: Table;
  usage: TableUsageResponse;
  actions: {
    rename: {
      enabled: boolean;
      label: string;
      icon: string;
    };
    duplicate: {
      enabled: boolean;
      label: string;
      icon: string;
    };
    move: {
      enabled: boolean;
      label: string;
      icon: string;
    };
    delete: {
      enabled: boolean;
      label: string;
      icon: string;
      danger?: boolean;
    };
  };
}

// ==================== 字段相关类型 ====================

/**
 * 字段类型（完全匹配 server/internal/domain/fields/valueobject/field_type.go）
 */
export type FieldType =
  // 基础类型
  | 'singleLineText' // 单行文本
  | 'longText' // 长文本
  | 'text' // 文本（通用）
  | 'number' // 数字
  | 'singleSelect' // 单选
  | 'multipleSelects' // 多选
  | 'select' // 选择（通用）
  | 'multipleSelect' // 多选（别名）
  | 'date' // 日期
  | 'datetime' // 日期时间
  | 'checkbox' // 复选框
  | 'boolean' // 布尔值
  | 'url' // 链接
  | 'email' // 邮箱
  | 'phone' // 电话
  | 'attachment' // 附件
  | 'rating' // 评分
  | 'user' // 用户
  | 'button' // 按钮
  // 关联类型
  | 'link' // 关联记录
  | 'formula' // 公式
  | 'rollup' // 汇总
  | 'count' // 计数
  | 'lookup' // 查找
  // 系统类型
  | 'createdTime' // 创建时间
  | 'lastModifiedTime' // 最后修改时间
  | 'createdBy' // 创建者
  | 'lastModifiedBy' // 最后修改者
  | 'autoNumber'; // 自动编号

export interface FieldOptions {
  placeholder?: string;
  helpText?: string;
  choices?: SelectOption[];
  minValue?: number;
  maxValue?: number;
  decimal?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  dateFormat?: string; // ✅ 统一使用 camelCase
  timeFormat?: string; // ✅ 统一使用 camelCase
  maxFileSize?: number; // ✅ 统一使用 camelCase
  allowedTypes?: string[]; // ✅ 统一使用 camelCase
  linkTableId?: string; // ✅ 统一使用 camelCase
  linkFieldId?: string;
  formula?: string;
  validationRules?: ValidationRule[]; // ✅ 统一使用 camelCase
}

export interface SelectOption {
  id: string;
  name: string;
  color?: string;
}

export interface ValidationRule {
  type: string;
  value: any;
  message?: string;
}

/**
 * Field实体（完全匹配 server/internal/domain/fields/entity）
 */
export interface Field extends BaseEntity {
  tableId: string; // ✅ 统一使用 camelCase
  name: string;
  type: FieldType;
  description?: string;
  required: boolean;
  unique: boolean;
  primary: boolean;
  dbFieldName?: string; // ✅ 统一使用 camelCase
  options?: FieldOptions | null;
  order: number;
  version: number;
  lastModifiedTime?: string | null; // ✅ 统一使用 camelCase
}

/**
 * 创建Field请求（完全匹配 server/internal/application/dto/field_dto.go）
 */
export interface CreateFieldRequest {
  tableId: string; // ✅ 统一使用 camelCase
  name: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  unique?: boolean;
  primary?: boolean;
  options?: FieldOptions | null;
}

export interface UpdateFieldRequest {
  name?: string;
  type?: FieldType;
  description?: string;
  required?: boolean;
  isUnique?: boolean; // ✅ 统一使用 camelCase
  isPrimary?: boolean; // ✅ 统一使用 camelCase
  defaultValue?: string; // ✅ 统一使用 camelCase
  options?: FieldOptions;
  fieldOrder?: number; // ✅ 统一使用 camelCase
}

// ==================== 记录相关类型 ====================

/**
 * Record实体（完全匹配 server/internal/domain/record/entity）
 */
export interface Record extends BaseEntity {
  tableId: string; // ✅ 统一使用 camelCase
  data: JsonObject; // 字段名->值映射
  version: number;
  autoNumber?: number | null; // ✅ 统一使用 camelCase
  lastModifiedTime?: string | null; // ✅ 统一使用 camelCase
}

/**
 * 创建Record请求（完全匹配 server/internal/application/dto/record_dto.go）
 */
export interface CreateRecordRequest {
  tableId: string; // ✅ 统一使用 camelCase
  data: JsonObject;
}

export interface UpdateRecordRequest {
  data: JsonObject;
  version?: number; // ✅ 可选的版本号，用于乐观锁
}

/**
 * 批量创建记录请求
 */
export interface BulkCreateRecordRequest {
  tableId: string; // 这个字段在批量创建时不需要,由路径参数传递
  records: JsonObject[];
}

/**
 * 批量更新记录请求
 */
export interface BulkUpdateRecordRequest {
  tableId: string; // ✅ 添加 tableId 字段，对齐新 API
  records: Array<{
    id: string;
    data: JsonObject;
  }>;
}

/**
 * 批量删除记录请求
 */
export interface BulkDeleteRecordRequest {
  tableId: string; // ✅ 对齐 Teable 架构
  recordIds: string[]; // ✅ 统一使用 camelCase
}

export interface RecordQuery {
  tableId: string; // ✅ 统一使用 camelCase
  filter?: FilterExpression | undefined;
  sort?: SortExpression[] | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface FilterExpression {
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: 'and' | 'or';
  conditions?: FilterExpression[];
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'
  | 'has_any_of'
  | 'has_all_of';

export interface SortExpression {
  field: string;
  direction: 'asc' | 'desc';
}

// ==================== 视图相关类型 ====================

/**
 * 视图类型（完全匹配 server/internal/domain/view/valueobject/view_type.go）
 */
export type ViewType = 'grid' | 'kanban' | 'form' | 'calendar' | 'gallery';

/**
 * View实体（完全匹配 server/internal/domain/view/entity）
 */
export interface View extends BaseEntity {
  tableId: string; // ✅ 统一使用 camelCase
  name: string;
  type: ViewType;
  description?: string;
  filter?: any | null; // JSON filter
  sort?: any | null; // JSON sort
  group?: any | null; // JSON group
  columnMeta?: any | null; // ✅ 统一使用 camelCase
  options?: any | null; // JSON view options
  order: number;
  shareId?: string | null; // ✅ 统一使用 camelCase
  shareEnabled: boolean; // ✅ 统一使用 camelCase
  sharePassword?: string | null; // ✅ 统一使用 camelCase
  lockType?: string | null; // ✅ 统一使用 camelCase
  frozenColumnCount?: number | null; // ✅ 统一使用 camelCase
  lastModifiedTime?: string | null; // ✅ 统一使用 camelCase
}

export interface ViewConfig {
  // 通用配置
  filter?: FilterExpression;
  sort?: SortExpression[];

  // 网格视图配置
  grid?: GridViewConfig;

  // 表单视图配置
  form?: FormViewConfig;

  // 看板视图配置
  kanban?: KanbanViewConfig;

  // 日历视图配置
  calendar?: CalendarViewConfig;

  // 画廊视图配置
  gallery?: GalleryViewConfig;
}

export interface GridViewConfig {
  columns: GridColumn[];
  row_height?: 'short' | 'medium' | 'tall' | undefined;
  show_row_numbers?: boolean | undefined;
  show_column_headers?: boolean | undefined;
}

export interface GridColumn {
  field_id: string;
  width?: number;
  visible?: boolean;
  frozen?: boolean;
}

export interface FormViewConfig {
  fields: FormField[];
  submit_button_text?: string;
  success_message?: string;
  redirect_url?: string;
}

export interface FormField {
  field_id: string;
  required?: boolean | undefined;
  visible?: boolean | undefined;
  order?: number | undefined;
}

export interface KanbanViewConfig {
  group_field_id: string;
  card_fields: string[];
  card_height?: 'short' | 'medium' | 'tall' | undefined;
  show_empty_groups?: boolean | undefined;
}

export interface CalendarViewConfig {
  date_field_id: string;
  title_field_id: string;
  color_field_id?: string | undefined;
  show_weekends?: boolean | undefined;
  start_day_of_week?: number | undefined; // 0-6, 0=Sunday
}

export interface GalleryViewConfig {
  card_fields: string[];
  card_size?: 'small' | 'medium' | 'large' | undefined;
  show_field_names?: boolean | undefined;
  cover_field_id?: string | undefined;
}

/**
 * 创建View请求（完全匹配 server/internal/application/dto/view_dto.go）
 */
export interface CreateViewRequest {
  tableId: string; // ✅ 统一使用 camelCase
  name: string;
  type: ViewType;
  description?: string;
  filter?: any | null;
  sort?: any | null;
  group?: any | null;
  columnMeta?: any | null;
  options?: any | null;
}

/**
 * 更新View请求
 */
export interface UpdateViewRequest {
  name?: string;
  description?: string;
  filter?: any | null;
  sort?: any | null;
  group?: any | null;
  columnMeta?: any | null;
  options?: any | null;
}

export interface ViewShareMeta {
  enabled: boolean;
  shareId?: string;
  password?: string;
  expiresAt?: string;
}

export interface ViewLockMeta {
  locked: boolean;
  lockedBy?: string;
  lockedAt?: string;
}

// ==================== 协作相关类型 ====================

export interface CollaborationSession extends BaseEntity {
  name: string;
  description?: string;
  participants: CollaborationParticipant[];
  is_active: boolean;
}

export interface CollaborationParticipant {
  userId: string; // camelCase
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
  last_activity_at?: string;
}

export interface Presence {
  userId: string; // camelCase
  resource_type: 'table' | 'view' | 'record';
  resource_id: string;
  cursor_position?: CursorPosition;
  last_seen: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  field_id?: string;
  record_id?: string;
}

// ==================== 搜索相关类型 ====================

export interface SearchRequest {
  query: string;
  scope?: 'all' | 'spaces' | 'bases' | 'tables' | 'records';
  filters?: SearchFilter[];
  limit?: number;
  offset?: number;
}

export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface SearchResult<T = any> {
  item: T;
  score: number;
  highlights: string[];
}

export interface SearchResponse<T = any> {
  results: SearchResult<T>[];
  total: number;
  query: string;
  took: number;
}

// ==================== 通知相关类型 ====================

export interface Notification extends BaseEntity {
  userId: string; // camelCase
  type: NotificationType;
  title: string;
  message: string;
  data?: JsonObject;
  is_read: boolean;
  read_at?: string;
  expires_at?: string;
}

export type NotificationType =
  | 'collaboration_invite'
  | 'collaboration_join'
  | 'collaboration_leave'
  | 'record_created'
  | 'record_updated'
  | 'record_deleted'
  | 'comment_added'
  | 'mention'
  | 'system_announcement';

export interface NotificationSubscription extends BaseEntity {
  userId: string; // camelCase
  type: NotificationType;
  resource_type: string;
  resource_id: string;
  is_enabled: boolean;
  channels: NotificationChannel[];
}

export type NotificationChannel = 'email' | 'push' | 'in_app';

// ==================== 附件相关类型 ====================

export interface Attachment extends BaseEntity {
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  metadata?: JsonObject;
}

export interface UploadAttachmentRequest {
  file: File | any;
  filename?: string;
  metadata?: JsonObject;
}

// ==================== WebSocket 相关类型 ====================

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  user_id?: string;
}

export interface CollaborationMessage extends WebSocketMessage {
  type: 'collaboration';
  data: {
    action: 'cursor_move' | 'selection_change' | 'presence_update';
    resource_type: string;
    resource_id: string;
    payload: any;
  };
}

export interface RecordChangeMessage extends WebSocketMessage {
  type: 'record_change';
  data: {
    action: 'create' | 'update' | 'delete';
    table_id: string;
    record_id: string;
    changes?: JsonObject;
  };
}

// ==================== 配置相关类型 ====================

export interface LuckDBConfig {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  userAgent?: string;
  debug?: boolean;
  disableProxy?: boolean;
}

export type JsonObject = { [key: string]: any };

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: globalThis.Record<string, string>;
}

// ==================== 错误相关类型 ====================

export class LuckDBError extends Error {
  public readonly code: string;
  public readonly status: number | undefined;
  public readonly details: any | undefined;

  constructor(message: string, code: string, status?: number, details?: any) {
    super(message);
    this.name = 'LuckDBError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class AuthenticationError extends LuckDBError {
  constructor(message: string = 'Authentication failed', status: number = 401) {
    super(message, 'AUTH_ERROR', status);
  }
}

export class AuthorizationError extends LuckDBError {
  constructor(message: string = 'Insufficient permissions', status: number = 403) {
    super(message, 'AUTHZ_ERROR', status);
  }
}

export class NotFoundError extends LuckDBError {
  constructor(message: string = 'Resource not found', status: number = 404) {
    super(message, 'NOT_FOUND', status);
  }
}

export class ValidationError extends LuckDBError {
  constructor(message: string, details?: any, status: number = 400) {
    super(message, 'VALIDATION_ERROR', status, details);
  }
}

export class RateLimitError extends LuckDBError {
  constructor(message: string = 'Rate limit exceeded', status: number = 429) {
    super(message, 'RATE_LIMIT', status);
  }
}

export class ServerError extends LuckDBError {
  constructor(message: string = 'Internal server error', status: number = 500) {
    super(message, 'SERVER_ERROR', status);
  }
}

export interface TableStats {
  table_id: string;
  total_fields: number;
  total_records: number;
  total_views: number;
  last_activity_at?: string | undefined;
}
