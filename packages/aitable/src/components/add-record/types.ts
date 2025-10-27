/**
 * AddRecordDialog 类型定义
 */

import type { FieldType } from '../../api/types';

/**
 * 字段配置（基于 StandardDataView 的 FieldConfig）
 */
export interface FieldConfig {
  id: string;
  name: string;
  type: FieldType | string; // 兼容字符串类型
  visible?: boolean;
  locked?: boolean;
  required?: boolean;
  isPrimary?: boolean;
  description?: string;
  options?: {
    choices?: Array<{ id: string; name: string; color?: string }>;
    dateFormat?: string;
    min?: number;
    max?: number;
    precision?: number;
    icon?: string;
    ratingMax?: number; // rating max value
    [key: string]: any;
  };
}

/**
 * 表单值类型
 */
export type FormValues = Record<string, any>;

/**
 * 表单错误类型
 */
export type FormErrors = Record<string, string>;

/**
 * 字段编辑器 Props
 */
export interface FieldEditorProps {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}

/**
 * AddRecordDialog Props
 */
export interface AddRecordDialogProps {
  /** 是否打开 */
  isOpen: boolean;
  
  /** 关闭回调 */
  onClose: () => void;
  
  /** 字段列表（必填） */
  fields: FieldConfig[];
  
  /** 表格 ID（必填，用于调用 API） */
  tableId: string;
  
  /** SDK/ApiClient 实例（用于提交数据） */
  adapter?: any; // ISDKAdapter
  
  /** 保存成功回调（可用于刷新 Grid） */
  onSuccess?: (record: any) => void;
  
  /** 保存失败回调 */
  onError?: (error: Error) => void;
  
  /** 默认值 */
  defaultValues?: FormValues;
  
  /** 自定义编辑器映射（可选） */
  customEditors?: Record<string, React.ComponentType<FieldEditorProps>>;
  
  /** 提交前数据转换（可选） */
  transformBeforeSubmit?: (values: FormValues) => FormValues;
  
  /** 国际化文案（可选） */
  locale?: {
    title?: string;
    cancel?: string;
    save?: string;
    saving?: string;
    required?: string;
    invalidFormat?: string;
  };
}

/**
 * 校验规则类型
 */
export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  min?: number;
  max?: number;
  validator?: (value: any) => string | null;
}

/**
 * 校验器配置
 */
export type ValidatorMap = Record<FieldType | string, ValidationRule>;

