import React from 'react';

export interface IColumnStatistic {
  columnId: string;
  columnIndex: number;
  type: 'sum' | 'average' | 'count' | 'min' | 'max' | 'empty' | 'filled' | 'unique';
  value: number | string;
  label?: string;
}

export interface IStatisticsRowProps {
  statistics?: IColumnStatistic[];
  totalRecords?: number;
  selectedRecords?: number;
  onStatisticClick?: (columnIndex: number) => void;
  onToggleStatistics?: () => void;
  width?: number;
}

export const StatisticsRow: React.FC<IStatisticsRowProps> = (props) => {
  const {
    statistics = [],
    totalRecords = 0,
    selectedRecords = 0,
    onStatisticClick,
    onToggleStatistics,
    width = 800,
  } = props;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        minHeight: '32px',
        width: '100%',
      }}
    >
      {/* 左侧：记录统计 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          backgroundColor: '#8b5cf6',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: '500',
          minWidth: '120px',
        }}
      >
        {totalRecords}条记录
        {selectedRecords > 0 && ` (已选${selectedRecords}条)`}
      </div>

      {/* 中间：统计区域 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          fontSize: '13px',
          color: '#6b7280',
          cursor: 'pointer',
        }}
        onClick={() => onStatisticClick?.(0)}
      >
        {statistics.length > 0 ? (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {statistics.map((stat, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ fontWeight: '500' }}>{stat.label || getStatLabel(stat.type)}:</span>
                <span>{formatStatValue(stat.value, stat.type)}</span>
              </div>
            ))}
          </div>
        ) : (
          '点击此行进行统计'
        )}
      </div>

      {/* 右侧：关闭按钮 */}
      <button
        onClick={onToggleStatistics}
        style={{
          padding: '4px 8px',
          margin: '0 8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
        title="隐藏统计行"
      >
        ▼
      </button>
    </div>
  );
};

function getStatLabel(type: IColumnStatistic['type']): string {
  const labels: Record<IColumnStatistic['type'], string> = {
    sum: '总和',
    average: '平均值',
    count: '计数',
    min: '最小值',
    max: '最大值',
    empty: '空值',
    filled: '填充',
    unique: '唯一值',
  };
  return labels[type] || type;
}

function formatStatValue(value: number | string, type: IColumnStatistic['type']): string {
  if (typeof value === 'number') {
    if (type === 'average') {
      return value.toFixed(2);
    }
    return value.toLocaleString();
  }
  return String(value);
}

