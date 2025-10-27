/**
 * Grid System - Unified Export
 * 
 * This is the refactored grid system that combines the original grid
 * and grid-enhancements into a single, cohesive structure.
 */

// Core Grid Components
export { Grid } from './core/Grid';
export type { IGridRef, IGridProps } from './core/Grid';

// UI Components (includes editors, context menus, etc.)
export * from './components';

// Hooks (primitive + business)
export * from './hooks';

// Renderers
export * from './renderers';

// Managers
export * from './managers';

// Store
export * from './store';

// Configs
export * from './configs';

// Types - be specific to avoid conflicts
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
  IColumnLoading,
  LinearRowType,
  SelectionRegionType,
  DragRegionType,
  RegionType,
  RowControlType,
} from './types/grid';

// Cell renderer types and interfaces
export type {
  ICell,
  IInnerCell,
  ITextCell,
  INumberCell,
  IBooleanCell,
  ISelectCell,
  IMultiSelectCell,
  ILinkCell,
  IImageCell,
  IChartCell,
  IDateCell,
  IUserCell,
  IRatingCell,
  IButtonCell,
  IAttachmentCell,
  ILoadingCell,
  IImageData,
  ICellRenderProps,
  ICellClickProps,
  ICellMeasureProps,
  IInternalCellRenderer,
  IBaseCellRenderer,
  ChartType,
  NumberDisplayType,
} from './renderers/cell-renderer/interface';

// Cell renderer enums (must be value exports)
export { CellType, CellRegionType } from './renderers/cell-renderer/interface';
