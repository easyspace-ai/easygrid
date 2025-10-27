/**
 * Generate unique local ID for grid components
 */
export const generateLocalId = (tableId?: string, viewId?: string): string => {
  if (tableId && viewId) {
    return `${tableId}-${viewId}`;
  }
  if (tableId) {
    return tableId;
  }
  // Fallback to timestamp-based ID
  return `grid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Generate random ID
 */
export const generateRandomId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

/**
 * Generate cell ID
 */
export const generateCellId = (rowIndex: number, columnIndex: number): string => {
  return `cell-${rowIndex}-${columnIndex}`;
};

