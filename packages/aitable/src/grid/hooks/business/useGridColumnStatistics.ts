import { useMemo } from 'react';
import type { AggregationType } from './constant';

/**
 * Column statistics interface
 */
export interface IColumnStatistics {
  [columnId: string]: {
    type: AggregationType;
    value: number | string;
    displayValue: string;
  } | null;
}

/**
 * Statistic function names
 */
export const STATISTIC_FUNC_NAMES: Record<AggregationType, string> = {
  none: 'None',
  sum: 'Sum',
  average: 'Average',
  avg: 'Average',
  min: 'Min',
  max: 'Max',
  count: 'Count',
  empty: 'Empty',
  filled: 'Filled',
  countEmpty: 'Count Empty',
  countNotEmpty: 'Count Not Empty',
  countUnique: 'Count Unique',
  percentEmpty: 'Percent Empty',
  percentNotEmpty: 'Percent Not Empty',
  percentUnique: 'Percent Unique',
};

/**
 * Calculate statistics for a column
 */
const calculateColumnStatistic = (
  values: unknown[],
  type: AggregationType
): { value: number | string; displayValue: string } | null => {
  const numericValues = values
    .filter((v) => v != null && v !== '')
    .map((v) => Number(v))
    .filter((v) => !isNaN(v));

  const totalCount = values.length;
  const filledCount = values.filter((v) => v != null && v !== '').length;
  const emptyCount = totalCount - filledCount;

  switch (type) {
    case 'sum': {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      return { value: sum, displayValue: sum.toLocaleString() };
    }

    case 'avg': {
      if (numericValues.length === 0) {
        return { value: 0, displayValue: '0' };
      }
      const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      return { value: avg, displayValue: avg.toFixed(2) };
    }

    case 'min': {
      if (numericValues.length === 0) {
        return { value: 0, displayValue: '0' };
      }
      const min = Math.min(...numericValues);
      return { value: min, displayValue: min.toLocaleString() };
    }

    case 'max': {
      if (numericValues.length === 0) {
        return { value: 0, displayValue: '0' };
      }
      const max = Math.max(...numericValues);
      return { value: max, displayValue: max.toLocaleString() };
    }

    case 'count': {
      return { value: totalCount, displayValue: totalCount.toLocaleString() };
    }

    case 'empty': {
      return { value: emptyCount, displayValue: emptyCount.toLocaleString() };
    }

    case 'filled': {
      return { value: filledCount, displayValue: filledCount.toLocaleString() };
    }

    default:
      return null;
  }
};

/**
 * Column configuration
 */
export interface IColumnConfig {
  id: string;
  statisticType?: AggregationType;
}

/**
 * Record data
 */
export interface IRecordData {
  [columnId: string]: unknown;
}

/**
 * Hook for calculating column statistics
 */
export const useGridColumnStatistics = (
  columns: IColumnConfig[],
  records: IRecordData[],
  enabledStatistics?: Record<string, AggregationType>
) => {
  const columnStatistics = useMemo((): IColumnStatistics => {
    const statistics: IColumnStatistics = {};

    columns.forEach((column) => {
      const statisticType = enabledStatistics?.[column.id] || column.statisticType;
      
      if (!statisticType) {
        statistics[column.id] = null;
        return;
      }

      // Collect values for this column
      const values = records.map((record) => record[column.id]);

      // Calculate statistic
      const result = calculateColumnStatistic(values, statisticType);
      
      if (result) {
        statistics[column.id] = {
          type: statisticType,
          value: result.value,
          displayValue: `${STATISTIC_FUNC_NAMES[statisticType]}: ${result.displayValue}`,
        };
      } else {
        statistics[column.id] = null;
      }
    });

    return statistics;
  }, [columns, records, enabledStatistics]);

  /**
   * Get statistic for a specific column
   */
  const getColumnStatistic = (columnId: string) => {
    return columnStatistics[columnId];
  };

  /**
   * Check if column has statistics enabled
   */
  const hasStatistic = (columnId: string): boolean => {
    return columnStatistics[columnId] !== null;
  };

  /**
   * Get display value for a column statistic
   */
  const getStatisticDisplay = (columnId: string): string => {
    const stat = columnStatistics[columnId];
    return stat?.displayValue || '';
  };

  return {
    columnStatistics,
    getColumnStatistic,
    hasStatistic,
    getStatisticDisplay,
  };
};

