import { create } from 'zustand';

interface IGridCollapsedGroupState {
  collapsedGroupMap: Record<string, string[]>;
  setCollapsedGroupMap: (key: string, groupIds: string[]) => void;
  getCollapsedGroupIds: (key: string) => string[];
}

export const useGridCollapsedGroupStore = create<IGridCollapsedGroupState>((set, get) => ({
  collapsedGroupMap: {},
  setCollapsedGroupMap: (key, groupIds) =>
    set((state) => ({
      collapsedGroupMap: {
        ...state.collapsedGroupMap,
        [key]: groupIds,
      },
    })),
  getCollapsedGroupIds: (key) => {
    const state = get();
    return state.collapsedGroupMap[key] || [];
  },
}));
