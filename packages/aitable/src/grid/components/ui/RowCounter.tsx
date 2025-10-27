import React, { type FC } from 'react';

/**
 * Row counter props
 */
export interface IRowCounterProps {
  totalCount: number;
  selectedCount?: number;
  filteredCount?: number;
  className?: string;
  style?: React.CSSProperties;
  showSelected?: boolean;
  showFiltered?: boolean;
}

/**
 * Row counter component
 * Displays row count information at the bottom of the grid
 */
export const RowCounter: FC<IRowCounterProps> = ({
  totalCount,
  selectedCount = 0,
  filteredCount,
  className,
  style,
  showSelected = true,
  showFiltered = true,
}) => {
  const hasSelection = selectedCount > 0;
  const hasFilter = filteredCount !== undefined && filteredCount !== totalCount;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '8px 16px',
        backgroundColor: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        fontSize: '13px',
        color: '#6b7280',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Total rows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 500 }}>Total:</span>
        <span>{totalCount.toLocaleString()}</span>
        <span>rows</span>
      </div>

      {/* Selected rows */}
      {showSelected && hasSelection && (
        <>
          <div style={{ width: '1px', height: '16px', backgroundColor: '#d1d5db' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
            <span style={{ fontWeight: 500 }}>Selected:</span>
            <span>{selectedCount.toLocaleString()}</span>
            <span>rows</span>
          </div>
        </>
      )}

      {/* Filtered rows */}
      {showFiltered && hasFilter && (
        <>
          <div style={{ width: '1px', height: '16px', backgroundColor: '#d1d5db' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
            <span style={{ fontWeight: 500 }}>Filtered:</span>
            <span>{filteredCount.toLocaleString()}</span>
            <span>of {totalCount.toLocaleString()}</span>
            <span>rows</span>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Compact row counter - shows only numbers
 */
export const CompactRowCounter: FC<Pick<IRowCounterProps, 'totalCount' | 'selectedCount' | 'className' | 'style'>> = ({
  totalCount,
  selectedCount = 0,
  className,
  style,
}) => {
  const text = selectedCount > 0 
    ? `${selectedCount} / ${totalCount}`
    : `${totalCount}`;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#6b7280',
        fontWeight: 500,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

