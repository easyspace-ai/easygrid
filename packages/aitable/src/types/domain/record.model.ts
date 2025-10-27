/**
 * Record Domain Model - 领域层记录模型
 */

/**
 * 记录领域模型
 */
export interface RecordModel {
  id: string;
  fields: Map<string, any>; // 使用 Map 而非 Record，性能更好
  createdTime?: Date;
  lastModifiedTime?: Date;
  createdBy?: string;
  lastModifiedBy?: string;
}

/**
 * 创建记录命令
 */
export interface CreateRecordCommand {
  fields: Map<string, any> | Record<string, any>;
  order?: {
    viewId: string;
    anchorId: string;
    position: 'before' | 'after';
  };
}

/**
 * 更新记录命令
 */
export interface UpdateRecordCommand {
  recordId: string;
  fieldId: string;
  value: any;
}

/**
 * 批量更新记录命令
 */
export interface BatchUpdateRecordCommand {
  records: Array<{
    recordId: string;
    fields: Map<string, any> | Record<string, any>;
  }>;
}

