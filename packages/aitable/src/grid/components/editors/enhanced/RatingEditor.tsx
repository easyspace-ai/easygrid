import React, { useState, useMemo, forwardRef, type FC } from 'react';
import type { RatingIcon } from '../../../../types/field';

/**
 * Rating图标映射
 */
const RATING_ICON_COMPONENT: Record<string, FC<{ className?: string; style?: React.CSSProperties }>> = {
  star: ({ className, style }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  moon: ({ className, style }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  sun: ({ className, style }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  heart: ({ className, style }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  flame: ({ className, style }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  zap: ({ className, style }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  ),
  'thumb-up': ({ className, style }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  apple: ({ className, style }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2c2 0 3 1 3 1s1-1 3-1c3 0 5 2.5 5 5 0 5-5 10-8 13-3-3-8-8-8-13 0-2.5 2-5 5-5zM12 2c-1-2-3-2-4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

/**
 * 颜色值转换
 */
const getColorValue = (color: string): string => {
  // 如果是颜色名称，转换为实际颜色值
  const colorMap: Record<string, string> = {
    'yellowBright': '#fbbf24',
    'redBright': '#ef4444',
    'tealBright': '#14b8a6',
    'yellow': '#f59e0b',
    'red': '#dc2626',
    'teal': '#0d9488',
  };
  return colorMap[color] || color;
};

export interface IRatingEditorProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  onSave?: () => void;
  onCancel?: () => void;
  readonly?: boolean;
  options?: {
    icon?: RatingIcon | string;
    color?: string;
    max?: number;
  };
  className?: string;
  style?: React.CSSProperties;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const RatingEditor = forwardRef<HTMLDivElement, IRatingEditorProps>((props, ref) => {
  const { value, options = {}, readonly, className, style, onChange } = props;
  const { icon = 'star', color: colorKey = 'yellow', max = 5 } = options;
  const [hoverIndex, setHoverIndex] = useState(-1);

  const IconComponent = RATING_ICON_COMPONENT[icon] || RATING_ICON_COMPONENT.star;
  const color = useMemo(() => getColorValue(colorKey), [colorKey]);
  const hoveredColor = useMemo(() => {
    // 将hex颜色转换为rgba，透明度30%
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
  }, [color]);

  const onChangeInner = (index: number) => {
    if (readonly) {return;}
    const finalValue = index + 1 === value ? null : index + 1;
    onChange?.(finalValue);
  };

  const onHoverIndexChange = (index: number) => {
    if (readonly) {return;}
    setHoverIndex(index);
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '32px',
        padding: '0 8px',
        ...style,
      }}
    >
      {Array.from({ length: max }).map((_, index) => {
        let iconStyle: React.CSSProperties = {
          fill: '#d1d5db',
          color: '#d1d5db',
        };

        if (value != null && index < value) {
          iconStyle = { fill: color, color };
        } else if (index <= hoverIndex) {
          iconStyle = { fill: hoveredColor, color: hoveredColor };
        }

        return (
          <span
            key={index}
            style={{
              display: 'inline-flex',
              cursor: readonly ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={() => onHoverIndexChange(index)}
            onMouseLeave={() => onHoverIndexChange(-1)}
            onClick={() => onChangeInner(index)}
          >
            <IconComponent
              className="rating-icon"
              style={{
                width: '24px',
                height: '24px',
                marginRight: '8px',
                borderRadius: '4px',
                transition: 'all 0.15s',
                ...iconStyle,
              }}
            />
          </span>
        );
      })}
    </div>
  );
});

RatingEditor.displayName = 'GridRatingEditor';

