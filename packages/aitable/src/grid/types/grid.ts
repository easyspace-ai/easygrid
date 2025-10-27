import type { IUser } from '../../types';
import type { IGridTheme } from '../configs/gridTheme';
import type { ICell } from '../renderers/cell-renderer/interface';
export * from '../renderers/cell-renderer/interface';

export interface IScrollState {
  scrollTop: number;
  scrollLeft: number;
  isScrolling: boolean;
}

export interface IPosition {
  x: number;
  y: number;
}

export interface IRegionPosition extends IPosition {
  rowIndex: number;
  columnIndex: number;
}

export interface IRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum SelectionRegionType {
  Rows = 'Rows',
  Columns = 'Columns',
  Cells = 'Cells',
  None = 'None',
}

export enum RegionType {
  Cell = 'Cell',
  ActiveCell = 'ActiveCell',
  CellValue = 'CellValue',
  AppendRow = 'AppendRow',
  AppendColumn = 'AppendColumn',
  ColumnHeader = 'ColumnHeader',
  GroupStatistic = 'GroupStatistic',
  ColumnStatistic = 'ColumnStatistic',
  ColumnHeaderMenu = 'ColumnHeaderMenu',
  ColumnPrimaryIcon = 'ColumnPrimaryIcon',
  ColumnDescription = 'ColumnDescription',
  ColumnResizeHandler = 'ColumnResizeHandler',
  ColumnFreezeHandler = 'ColumnFreezeHandler',
  RowHeaderDragHandler = 'RowHeaderDragHandler',
  RowHeaderExpandHandler = 'RowHeaderExpandHandler',
  RowHeaderCheckbox = 'RowHeaderCheckbox',
  RowGroupControl = 'RowGroupControl',
  RowGroupHeader = 'RowGroupHeader',
  RowCountLabel = 'RowCountLabel',
  RowHeader = 'RowHeader',
  AllCheckbox = 'AllCheckbox',
  FillHandler = 'FillHandler',
  Blank = 'Blank',
  None = 'None',
}

export type ICellRange = [colIndex: number, rowIndex: number]; // The beginning and the end come in pairs
export type IColumnRange = [colStartIndex: number, colEndIndex: number];
export type IRowRange = [rowStartIndex: number, rowEndIndex: number];
export type IRange = ICellRange | IColumnRange | IRowRange;

export interface IMouseState extends IRegionPosition {
  type: RegionType;
  isOutOfBounds: boolean;
}

export interface IColumnStatistics {
  [columnId: string]: IColumnStatistic | null;
}

export interface IColumnStatistic {
  total: string;
  [key: string]: string;
}

export interface IGridColumn {
  id?: string;
  name: string;
  icon?: string;
  width?: number;
  hasMenu?: boolean;
  readonly?: boolean;
  isPrimary?: boolean;
  description?: string;
  type?: string; // 字段类型
  options?: any; // 字段配置选项（用于公式字段、汇总字段等）
  statisticLabel?: {
    showAlways: boolean;
    label: string;
  };
  customTheme?: Partial<IGridTheme>;
}

export interface IColumnResizeState {
  columnIndex: number;
  width: number;
  x: number;
}

export interface IColumnFreezeState {
  sourceIndex: number;
  targetIndex: number;
  isFreezing: boolean;
}

export interface IDragState {
  type: DragRegionType;
  delta: number;
  ranges: IRange[];
  isDragging: boolean;
}

export enum DragRegionType {
  Rows = 'Rows',
  Columns = 'Columns',
  None = 'None',
}

export type IScrollDirection = -1 | 0 | 1;

export enum MouseButtonType {
  Left = 0,
  Center = 1,
  Right = 2,
}

export enum RowControlType {
  Drag = 'Drag',
  Expand = 'Expand',
  Checkbox = 'Checkbox',
}

export interface IRowControlItem {
  type: RowControlType;
  icon?: string;
}

export type ICellItem = [colIndex: number, rowIndex: number];

export type ICollaborator = {
  activeCell?: ICellItem;
  activeCellId: [recordId: string, field: string];
  user: Omit<IUser, 'phone'>;
  borderColor: string;
  timeStamp: number;
}[];

export type ICellPosition = IPosition;

export interface IPositionWithBounds {
  bounds: IRectangle;
  eventPosition: IPosition;
}

export enum DraggableType {
  All = 'all',
  None = 'none',
  Column = 'column',
  Row = 'row',
}

export enum GridCustomIcon {
  Description = 'description',
}

export enum SelectableType {
  All = 'all',
  None = 'none',
  Column = 'column',
  Row = 'row',
  Cell = 'cell',
}

export enum LinearRowType {
  Row = 'ROW',
  Group = 'GROUP',
  GroupTitle = 'GROUP_TITLE',
  AddRow = 'ADD_ROW',
  Append = 'APPEND',
}

export interface IActiveCellBound extends IRectangle {
  rowIndex: number;
  columnIndex: number;
  totalHeight: number;
  scrollTop: number;
  scrollEnable: boolean;
}

// LinearRowType 已在上面定义

export interface IGroupHeaderPoint {
  id: string;
  type: LinearRowType.Group;
  depth: number;
  value?: unknown;
  isCollapsed?: boolean;
}

export interface IGroupRowPoint {
  type: LinearRowType.Row;
  count: number;
}

export interface IGroupAddButtonPoint {
  type: LinearRowType.Append;
}

export type IGroupPoint = IGroupHeaderPoint | IGroupRowPoint | IGroupAddButtonPoint;

export type ILinearRow =
  | {
      type: LinearRowType.Row;
      displayIndex: number;
      realIndex: number;
    }
  | {
      id: string;
      type: LinearRowType.Group;
      value: unknown;
      depth: number;
      realIndex: number;
      isCollapsed: boolean;
    }
  | {
      type: LinearRowType.Append;
      value: unknown;
      realIndex: number;
    };

export interface IGroupCollection {
  groupColumns: IGridColumn[];
  getGroupCell: (cellValue: unknown, depth: number) => ICell;
}

export interface IColumnLoading {
  columnId: string;
  isLoading: boolean;
  index: number;
  progress: number;
  onCancel?: () => void;
}
