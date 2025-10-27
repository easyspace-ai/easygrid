import { useCallback } from 'react';

export interface IUseGridColumnOrderProps<T> {
  columns: T[];
  onColumnOrdered?: (dragColIndexCollection: number[], dropColIndex: number) => void;
}

export function useGridColumnOrder<T extends { id: string }>() {
  const handleColumnOrdered = useCallback(
    (dragColIndexCollection: number[], dropColIndex: number) => {
      // 这里可以添加列重排序的逻辑
    },
    []
  );

  return {
    handleColumnOrdered,
  };
}
