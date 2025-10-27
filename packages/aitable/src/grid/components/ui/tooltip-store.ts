import { create } from 'zustand';

/**
 * Tooltip position
 */
export interface ITooltipPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Tooltip info
 */
export interface ITooltipInfo {
  id?: string;
  text: string;
  position?: ITooltipPosition;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
}

/**
 * Tooltip store interface
 */
interface IGridTooltipStore {
  tooltipInfo: ITooltipInfo | null;
  setTooltipInfo: (info: ITooltipInfo | null) => void;
  clearTooltip: () => void;
}

/**
 * Grid tooltip store
 */
export const useGridTooltipStore = create<IGridTooltipStore>((set) => ({
  tooltipInfo: null,
  setTooltipInfo: (info) => set({ tooltipInfo: info }),
  clearTooltip: () => set({ tooltipInfo: null }),
}));

/**
 * Show tooltip
 */
export const showGridTooltip = (info: ITooltipInfo) => {
  useGridTooltipStore.getState().setTooltipInfo(info);
};

/**
 * Hide tooltip
 */
export const hideGridTooltip = () => {
  useGridTooltipStore.getState().clearTooltip();
};

