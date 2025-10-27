/**
 * Record DTO - API 层记录数据传输对象
 */

/**
 * 记录 DTO (从 API 返回)
 */
export interface RecordDTO {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
  lastModifiedTime?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

/**
 * 创建记录请求 DTO
 */
export interface CreateRecordDTO {
  fields: Record<string, any>;
  order?: {
    viewId: string;
    anchorId: string;
    position: 'before' | 'after';
  };
}

/**
 * 更新记录请求 DTO
 */
export interface UpdateRecordDTO {
  recordId: string;
  fieldId: string;
  value: any;
}

/**
 * 批量更新记录请求 DTO
 */
export interface BatchUpdateRecordDTO {
  records: Array<{
    recordId: string;
    fields: Record<string, any>;
  }>;
}

/**
 * 查询记录请求 DTO
 */
export interface GetRecordsDTO {
  viewId?: string;
  filter?: any;
  sort?: any[];
  groupBy?: string[];
  fieldKeyType?: 'id' | 'name';
  cellFormat?: 'text' | 'json';
  skip?: number;
  take?: number;
}

