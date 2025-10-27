/**
 * Grid 坐标管理 Hook
 * 提取Grid.tsx中的坐标计算逻辑
 */
import { useMemo, useCallback } from 'react';
import { CoordinateManager } from '../../managers';
import { LinearRowType } from '../../types/grid';
import type { IGridColumn, ILinearRow, IGroupCollection } from '../../types/grid';
import { GRID_DEFAULT } from '../../configs';

const defaultColumnWidth = (GRID_DEFAULT as any).defaultColumnWidth || GRID_DEFAULT.columnWidth || 100;
const defaultRowHeight = (GRID_DEFAULT as any).defaultRowHeight || GRID_DEFAULT.rowHeight || 32;
const defaultColumnHeaderHeight = (GRID_DEFAULT as any).defaultColumnHeaderHeight || GRID_DEFAULT.columnHeadHeight || 40;

interface UseGridCoordinateProps {
  columns: IGridColumn[];
  rowCount: number;
  pureRowCount: number;
  width: number;
  height: number;
  freezeColumnCount: number;
  rowHeight?: number;
  columnHeaderHeight?: number;
  columnStatisticHeight?: number;
  groupCollection?: IGroupCollection | null;
  collapsedGroupIds?: Set<string> | null;
  hasColumnStatistics?: boolean;
}

export function useGridCoordinate(props: UseGridCoordinateProps) {
  const {
    columns,
    rowCount,
    pureRowCount,
    width,
    height,
    freezeColumnCount,
    rowHeight = defaultRowHeight,
    columnHeaderHeight = defaultColumnHeaderHeight,
    columnStatisticHeight = 0,
    groupCollection,
    collapsedGroupIds,
    hasColumnStatistics,
  } = props;

  const containerHeight = hasColumnStatistics ? height - columnStatisticHeight : height;
  const columnCount = columns.length;
  const actualFreezeColumnCount = Math.min(freezeColumnCount, columnCount);

  // 列初始尺寸
  const columnInitSize = useMemo(() => {
    return actualFreezeColumnCount > 0 ? 0 : 50;
  }, [actualFreezeColumnCount]);

  // 默认行信息
  const defaultRowsInfo = useMemo(() => {
    if (groupCollection == null) {
      return {
        rowCount: pureRowCount,
        pureRowCount,
        rowHeightMap: {},
        linearRows: [],
        real2LinearRowMap: null,
      };
    }
    return null;
  }, [groupCollection, pureRowCount]);

  // 分组行信息（简化版，完整逻辑在原Grid.tsx）
  const groupRowsInfo = useMemo(() => {
    if (!groupCollection || !collapsedGroupIds) return {};
    
    // 实际的分组计算逻辑在原Grid.tsx中，这里只是提取结构
    return {
      rowHeightMap: {},
      linearRows: [],
      real2LinearRowMap: {},
    };
  }, [groupCollection, collapsedGroupIds]);

  // 合并行信息
  const rowsInfo = useMemo(() => {
    return { ...defaultRowsInfo, ...groupRowsInfo };
  }, [defaultRowsInfo, groupRowsInfo]);

  // 获取线性行
  const getLinearRow = useCallback(
    (index: number): ILinearRow => {
      const { linearRows } = rowsInfo;
      if (!linearRows || !linearRows.length) {
        return (
          index >= pureRowCount
            ? {
                type: LinearRowType.Append,
                realIndex: index - 1,
                value: null,
              }
            : {
                type: LinearRowType.Row,
                displayIndex: index + 1,
                realIndex: index,
              }
        ) as ILinearRow;
      }
      return linearRows[index] ?? ({ type: LinearRowType.Row, realIndex: -2 } as ILinearRow);
    },
    [rowsInfo, pureRowCount]
  );

  // 真实行索引转换
  const real2RowIndex = useCallback(
    (index: number): number => {
      const { real2LinearRowMap } = rowsInfo;
      if (real2LinearRowMap == null) {return index;}
      return real2LinearRowMap[index] ?? index;
    },
    [rowsInfo]
  );

  // 列宽映射
  const columnWidthMap = useMemo(() => {
    return columns.reduce(
      (acc, column, index) => ({
        ...acc,
        [index]: column.width || defaultColumnWidth,
      }),
      {}
    );
  }, [columns]);

  // 坐标管理器实例
  const coordInstance = useMemo<CoordinateManager>(() => {
    return new CoordinateManager({
      rowHeight,
      columnWidth: defaultColumnWidth,
      pureRowCount,
      rowCount: rowsInfo.rowCount ?? rowCount,
      columnCount,
      containerWidth: width,
      containerHeight,
      rowInitSize: columnHeaderHeight,
      columnInitSize,
      freezeColumnCount: actualFreezeColumnCount,
      columnWidthMap,
      rowHeightMap: rowsInfo.rowHeightMap ?? {},
    });
  }, [
    rowHeight,
    pureRowCount,
    rowsInfo,
    rowCount,
    columnCount,
    width,
    containerHeight,
    columnHeaderHeight,
    columnInitSize,
    actualFreezeColumnCount,
    columnWidthMap,
  ]);

  return {
    coordInstance,
    getLinearRow,
    real2RowIndex,
    columnWidthMap,
    containerHeight,
    columnCount,
    actualFreezeColumnCount,
    rowsInfo,
  };
}

