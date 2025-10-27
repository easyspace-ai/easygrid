/**
 * Cell Renderer Interface Definitions
 */

import type { IGridTheme } from '../../configs';
import type { IRectangle, IPosition } from '../../types/grid';

export enum CellType {
  Text = 'text',
  Number = 'number',
  Boolean = 'boolean',
  Link = 'link',
  Image = 'image',
  Chart = 'chart',
  Date = 'date',
  User = 'user',
  Attachment = 'attachment',
  Rating = 'rating',
  Select = 'select',
  MultiSelect = 'multiSelect',
  Button = 'button',
  Formula = 'formula',
  Lookup = 'lookup',
  Rollup = 'rollup',
  Loading = 'loading',
}

export enum CellRegionType {
  Cell = 'cell',
  CellValue = 'cellValue',
  ActiveCell = 'activeCell',
  ColumnHeader = 'columnHeader',
  RowHeader = 'rowHeader',
  Update = 'update',
  Blank = 'blank',
  Preview = 'preview',
  ToggleEditing = 'toggleEditing',
  Hover = 'hover',
}

export interface ICell {
  value?: any;
  type?: string;
  displayData?: any;
  data?: any;
  id?: string;
  hidden?: boolean;
  locked?: boolean;
}

export interface IInnerCell extends ICell {
  [key: string]: any;
}

export interface ILinkCell extends ICell {
  url: string;
  title?: string;
  text?: string;
  onClick?: (url: string) => void;
}

export interface IChartCell extends ICell {
  chartType?: string;
  data?: any[];
  displayData?: any[];
  color?: string;
}

export interface IImageCell extends ICell {
  url: string;
  width?: number;
  height?: number;
  readonly?: boolean;
  onPreview?: (url: string) => void;
}

export interface ITextCell extends ICell {
  isWrap?: boolean;
}
export interface INumberCell extends ICell {
  showAs?: {
    type?: string;
    color?: string;
    maxValue?: number;
    showValue?: boolean;
  };
  contentAlign?: 'left' | 'center' | 'right';
}
export interface IBooleanCell extends ICell {
  isMultiple?: boolean;
  contentAlign?: 'left' | 'center' | 'right';
  readonly?: boolean;
}

export interface ISelectCell extends ICell {
  options?: Array<{ id: string; name: string; color?: string }>;
  selectedId?: string;
  choiceMap?: Map<string, any>;
  readonly?: boolean;
  isEditingOnClick?: boolean;
  onPreview?: (id: string) => void;
  isMultiple?: boolean;
  choiceSorted?: Array<{id: string; name: string; color?: string}>;
}

export interface IMultiSelectCell extends ICell {
  options?: Array<{ id: string; name: string; color?: string }>;
  selectedIds?: string[];
  choiceMap?: Map<string, any>;
  readonly?: boolean;
  isEditingOnClick?: boolean;
  onPreview?: (id: string) => void;
  isMultiple?: boolean;
  choiceSorted?: Array<{id: string; name: string; color?: string}>;
}

export interface IButtonCell extends ICell {
  label?: string;
  id?: string;
  readonly?: boolean;
  onClick?: () => void;
}

export interface IAttachmentCell extends ICell {
  files?: Array<{
    id: string;
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>;
}

export interface IDateCell extends ICell {
  date?: string | Date;
  format?: string;
}

export interface IUserCell extends ICell {
  userId?: string;
  userName?: string;
  avatar?: string;
}

export interface IRatingCell extends ICell {
  rating?: number;
  max?: number;
  icon?: string;
  color?: string;
  readonly?: boolean;
}

export interface ILoadingCell extends ICell {
  isLoading: boolean;
}

export interface IImageData {
  id?: string;
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export enum ChartType {
  Line = 'line',
  Bar = 'bar',
  Pie = 'pie',
  Area = 'area',
}

export enum NumberDisplayType {
  Number = 'number',
  Percent = 'percent',
  Currency = 'currency',
  Ring = 'ring',
  Bar = 'bar',
}

export interface ICellRenderProps extends IRectangle {
  theme: IGridTheme;
  cell: ICell;
  rowIndex: number;
  columnIndex: number;
  isActive?: boolean;
  isHovered?: boolean;
  ctx?: CanvasRenderingContext2D;
  rect?: IRectangle;
  hoverCellPosition?: IPosition | null;
  imageManager?: any;
  spriteManager?: any;
}

export interface ICellClickProps {
  position: IPosition;
  cell: ICell;
  rowIndex: number;
  columnIndex: number;
  width?: number;
  height?: number;
  theme?: IGridTheme;
  isActive?: boolean;
  hoverCellPosition?: IPosition | null;
  activeCellBound?: IRectangle & { scrollTop?: number };
}

export interface ICellMeasureProps {
  theme: IGridTheme;
  ctx?: CanvasRenderingContext2D;
  width?: number;
  height?: number;
}

export type ICellClickCallback = (props: ICellClickProps) => void;

export interface IInternalCellRenderer<T extends ICell = ICell> {
  type?: string;
  draw?: (cell: T, props: ICellRenderProps) => void | any;
  measure?: (cell: T, props: ICellMeasureProps) => { width: number; height: number; totalHeight?: number };
  onClick?: (cell: T, props: ICellClickProps, callback?: ICellClickCallback) => void;
  onDoubleClick?: ICellClickCallback;
  checkRegion?: (cell: T, props: ICellClickProps, isClick?: boolean) => any;
  getClickRegion?: (props: ICellClickProps & { cell: T }) => any;
  onClickRegion?: (props: ICellClickProps & { cell: T }, callback?: (props: any) => void) => void;
  needsHover?: boolean;
  needsHoverPosition?: boolean;
  needsHoverPositionWhenActive?: boolean;
  needsHoverWhenActive?: boolean;
}

export interface IBaseCellRenderer<T extends ICell = ICell> {
  type?: string;
  draw?: (cell: T, props: ICellRenderProps) => void | any;
  render?: IInternalCellRenderer<T>;
  measure?: (cell: T, props: ICellMeasureProps) => { width: number; height: number };
  needsHover?: boolean;
}

export interface ICellRegionWithData {
  type: CellRegionType;
  data: any;
  position: IPosition;
}
