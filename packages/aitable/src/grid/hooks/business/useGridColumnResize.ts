import { useCallback } from 'react';

export interface IUseGridColumnResizeProps<T> {
  columns: T[];
  onColumnResize?: (column: T, newSize: number, colIndex: number) => void;
}

export function useGridColumnResize<T extends { id: string }>(_columns: T[]) {
  const handleColumnResize = useCallback(
    (column: T, newSize: number, colIndex: number) => {
      // 这里可以添加列大小调整的逻辑
    },
    []
  );

  return {
    handleColumnResize,
  };
}
