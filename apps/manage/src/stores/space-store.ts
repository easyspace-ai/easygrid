import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Space {
  id: string
  name: string
  description?: string
}

interface SpaceStore {
  // 状态
  spaces: Space[]
  selectedSpace: Space | null
  
  // 操作
  setSpaces: (spaces: Space[]) => void
  setSelectedSpace: (space: Space | null) => void
  addSpace: (space: Space) => void
  removeSpace: (spaceId: string) => void
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      spaces: [],
      selectedSpace: null,
      
      // 操作
      setSpaces: (spaces) => set({ spaces }),
      
      setSelectedSpace: (space) => set({ selectedSpace: space }),
      
      addSpace: (space) => set((state) => ({
        spaces: [...state.spaces, space]
      })),
      
      removeSpace: (spaceId) => set((state) => {
        const newSpaces = state.spaces.filter(s => s.id !== spaceId)
        const newSelectedSpace = state.selectedSpace?.id === spaceId ? null : state.selectedSpace
        return {
          spaces: newSpaces,
          selectedSpace: newSelectedSpace
        }
      })
    }),
    {
      name: 'space-store',
      partialize: (state) => ({
        selectedSpace: state.selectedSpace
      })
    }
  )
)
