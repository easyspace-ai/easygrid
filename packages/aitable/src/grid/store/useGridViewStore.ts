import { create } from 'zustand';
import type { CombinedSelection } from '../managers';

export interface IHeaderMenu {
  x: number;
  y: number;
  columnIndex: number;
}

export interface IRecordMenu {
  x: number;
  y: number;
  recordId: string;
  rowIndex: number;
}

export interface IStatisticMenu {
  x: number;
  y: number;
  columnIndex: number;
}

export interface IGroupHeaderMenu {
  x: number;
  y: number;
  groupId: string;
}

interface IGridViewState {
  selection?: CombinedSelection;
  headerMenu?: IHeaderMenu;
  recordMenu?: IRecordMenu;
  statisticMenu?: IStatisticMenu;
  groupHeaderMenu?: IGroupHeaderMenu;
  openHeaderMenu: (props: IHeaderMenu) => void;
  closeHeaderMenu: () => void;
  openRecordMenu: (props: IRecordMenu) => void;
  closeRecordMenu: () => void;
  openStatisticMenu: (props: IStatisticMenu) => void;
  closeStatisticMenu: () => void;
  setSelection: (props: CombinedSelection) => void;
  openGroupHeaderMenu: (props: IGroupHeaderMenu) => void;
  closeGroupHeaderMenu: () => void;
}

export const useGridViewStore = create<IGridViewState>((set) => ({
  openHeaderMenu: (props) => {
    set((state) => ({
      ...state,
      headerMenu: props,
    }));
  },
  closeHeaderMenu: () => {
    set((state) => {
      if (state.headerMenu == null) {
        return state;
      }
      return {
        ...state,
        headerMenu: undefined,
      };
    });
  },
  openRecordMenu: (props) => {
    set((state) => ({
      ...state,
      recordMenu: props,
    }));
  },
  closeRecordMenu: () => {
    set((state) => {
      if (state.recordMenu == null) {
        return state;
      }
      return {
        ...state,
        recordMenu: undefined,
      };
    });
  },
  openStatisticMenu: (props) => {
    set((state) => ({
      ...state,
      statisticMenu: props,
    }));
  },
  closeStatisticMenu: () => {
    set((state) => {
      if (state.statisticMenu == null) {
        return state;
      }
      return {
        ...state,
        statisticMenu: undefined,
      };
    });
  },
  setSelection: (props) => {
    set((state) => ({
      ...state,
      selection: props,
    }));
  },
  openGroupHeaderMenu: (props) => {
    set((state) => ({
      ...state,
      groupHeaderMenu: props,
    }));
  },
  closeGroupHeaderMenu: () => {
    set((state) => ({
      ...state,
      groupHeaderMenu: undefined,
    }));
  },
}));
