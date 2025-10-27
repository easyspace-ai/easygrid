import { create } from 'zustand';

interface IBuildBaseAgentState {
  building: boolean;
  displayFieldIds: string[];
  tableId: string;
  setBuilding: (building: boolean) => void;
  setDisplayFieldIds: (displayFieldIds: string[]) => void;
  setTableId: (tableId: string) => void;
}

export const useBuildBaseAgentStore = create<IBuildBaseAgentState>((set) => ({
  building: false,
  displayFieldIds: [],
  tableId: '',
  setBuilding: (building) => set({ building }),
  setDisplayFieldIds: (displayFieldIds) => set({ displayFieldIds }),
  setTableId: (tableId) => set({ tableId }),
}));
