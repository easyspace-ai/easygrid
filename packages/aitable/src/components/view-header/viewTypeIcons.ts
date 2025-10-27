/**
 * 视图类型图标映射
 * 
 * 统一管理所有视图类型的图标和颜色
 */

import { 
  Table, 
  LayoutGrid, 
  Calendar, 
  BarChart3, 
  Image, 
  FileText,
  List,
  type LucideIcon
} from 'lucide-react';

export interface ViewTypeConfig {
  type: string;
  name: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
}

/**
 * 视图类型配置
 */
export const VIEW_TYPE_CONFIGS: Record<string, ViewTypeConfig> = {
  grid: {
    type: 'grid',
    name: '表格视图',
    icon: Table,
    color: '#3b82f6', // blue-500
    gradient: 'from-blue-500 to-blue-600',
  },
  kanban: {
    type: 'kanban',
    name: '看板视图',
    icon: LayoutGrid,
    color: '#10b981', // green-500
    gradient: 'from-green-500 to-green-600',
  },
  calendar: {
    type: 'calendar',
    name: '日历视图',
    icon: Calendar,
    color: '#06b6d4', // cyan-500
    gradient: 'from-cyan-500 to-cyan-600',
  },
  gantt: {
    type: 'gantt',
    name: '甘特视图',
    icon: BarChart3,
    color: '#ec4899', // pink-500
    gradient: 'from-pink-500 to-pink-600',
  },
  gallery: {
    type: 'gallery',
    name: '画册视图',
    icon: Image,
    color: '#8b5cf6', // purple-500
    gradient: 'from-purple-500 to-purple-600',
  },
  form: {
    type: 'form',
    name: '表单视图',
    icon: FileText,
    color: '#f59e0b', // amber-500
    gradient: 'from-amber-500 to-amber-600',
  },
  list: {
    type: 'list',
    name: '列表视图',
    icon: List,
    color: '#6366f1', // indigo-500
    gradient: 'from-indigo-500 to-indigo-600',
  },
};

/**
 * 获取视图类型配置
 */
export function getViewTypeConfig(type?: string): ViewTypeConfig {
  return VIEW_TYPE_CONFIGS[type || 'grid'] || VIEW_TYPE_CONFIGS.grid;
}

/**
 * 获取视图类型图标
 */
export function getViewTypeIcon(type?: string): LucideIcon {
  return getViewTypeConfig(type).icon;
}

/**
 * 获取视图类型颜色
 */
export function getViewTypeColor(type?: string): string {
  return getViewTypeConfig(type).color;
}

/**
 * 获取视图类型名称
 */
export function getViewTypeName(type?: string): string {
  return getViewTypeConfig(type).name;
}

/**
 * 所有视图类型列表
 */
export const ALL_VIEW_TYPES = Object.values(VIEW_TYPE_CONFIGS);

