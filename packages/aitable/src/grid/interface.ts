/**
 * Grid Interface Definitions
 * 统一从 types/grid.ts 导出所有核心类型
 */

// 重新导出所有核心类型和枚举
export type {
  IPosition,
  IRectangle,
  IRange,
  ICellRange,
  IGridColumn,
  IScrollState,
  IMouseState,
  ICellItem,
  IColumnStatistic,
  IColumnStatistics,
  IRowControlItem,
  ICellPosition,
  IActiveCellBound,
  ICollaborator,
} from './types/grid';

export {
  RegionType,
  SelectionRegionType,
  DragRegionType,
  LinearRowType,
  RowControlType,
} from './types/grid';

import type { LinearRowType } from './types/grid';

// 保留 interface.ts 中独特的接口定义
export interface ILayoutDrawerProps {
  textColor?: string;
  textColorSecondary?: string;
  fontSize?: number;
  fontSizeXS?: number;
  fontSizeSM?: number;
  fontFamily?: string;
  accentColor?: string;
  bgColor?: string;
  bgColorHover?: string;
  borderColor?: string;
}

export interface IPositionResult {
  left: number;
  top: number;
  transformOrigin?: string;
}

export interface IVisibleRegion {
  rowStartIndex: number;
  rowStopIndex: number;
  columnStartIndex: number;
  columnStopIndex: number;
}

export interface ILinearRow {
  type: LinearRowType;
  [key: string]: any;
}

export interface IRectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
}

export interface IProcessBarProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  max?: number;
  color?: string;
}

export type { ILayoutDrawerProps as IInteractionLayerProps };
