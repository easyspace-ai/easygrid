/**
 * Grid Column - 表现层 Grid 列定义
 * 
 * 这是 UI 层使用的列配置
 * 从 FieldModel 转换而来，增加了 UI 相关属性
 */

import type { FieldType } from '../core';

/**
 * Grid 列定义
 */
export interface GridColumn {
  id: string;
  name: string;
  type?: FieldType;
  icon?: string;
  width?: number;
  hasMenu?: boolean;
  readonly?: boolean;
  isPrimary?: boolean;
  description?: string;
  options?: any; // 字段配置选项（用于编辑器）
  statisticLabel?: {
    showAlways: boolean;
    label: string;
  };
  customTheme?: any; // Grid 主题定制
}

