import React, { useState, useCallback, useRef, useEffect, type FC } from 'react';
import type { INumberEditorProps } from '../../../types/editor';
import { useGridPopupPosition } from '../../../hooks/business/useGridPopupPosition';

/**
 * Format number with options
 */
const formatNumber = (
  num: number,
  format: 'decimal' | 'percent' | 'currency',
  precision: number,
  currencySymbol: string,
  thousandsSeparator: boolean
): string => {
  let formatted = num.toFixed(precision);

  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  switch (format) {
    case 'percent':
      return `${formatted}%`;
    case 'currency':
      return `${currencySymbol}${formatted}`;
    default:
      return formatted;
  }
};

/**
 * Parse formatted number string to number
 */
const parseFormattedNumber = (str: string): number | null => {
  const cleaned = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

/**
 * Grid number editor component
 * Enhanced number input with formatting options
 */
export const NumberEditor: FC<INumberEditorProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  readonly = false,
  min,
  max,
  step = 1,
  precision = 0,
  format = 'decimal',
  currencySymbol = '$',
  thousandsSeparator = false,
  className,
  style,
  rect,
}) => {
  const [inputValue, setInputValue] = useState<string>(() =>
    value !== null ? String(value) : ''
  );
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format display value
  const displayValue = useCallback(() => {
    if (isFocused) {
      return inputValue;
    }
    const num = parseFormattedNumber(inputValue);
    return num !== null
      ? formatNumber(num, format, precision, currencySymbol, thousandsSeparator)
      : '';
  }, [inputValue, isFocused, format, precision, currencySymbol, thousandsSeparator]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      const num = parseFormattedNumber(newValue);
      if (num !== null) {
        // Validate min/max
        let validNum = num;
        if (min !== undefined && validNum < min) {validNum = min;}
        if (max !== undefined && validNum > max) {validNum = max;}
        onChange(validNum);
      } else if (newValue === '' || newValue === '-') {
        onChange(null);
      }
    },
    [onChange, min, max]
  );

  // Handle increment/decrement
  const handleIncrement = useCallback(
    (delta: number) => {
      if (readonly) {return;}
      const currentNum = value ?? 0;
      let newNum = currentNum + delta;
      
      if (min !== undefined && newNum < min) {newNum = min;}
      if (max !== undefined && newNum > max) {newNum = max;}
      
      setInputValue(String(newNum));
      onChange(newNum);
    },
    [value, readonly, min, max, onChange]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSave?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleIncrement(step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleIncrement(-step);
      }
    },
    [onSave, onCancel, handleIncrement, step]
  );

  // Calculate popup position if rect is provided
  const popupPosition = rect ? useGridPopupPosition(rect, 240) : undefined;

  // Auto focus input
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        minWidth: '200px',
        ...popupPosition,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Decrement button */}
        <button
          onClick={() => handleIncrement(-step)}
          disabled={readonly || (min !== undefined && value !== null && value <= min)}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            cursor: readonly ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            color: '#6b7280',
          }}
        >
          −
        </button>

        {/* Number input */}
        <input
          ref={inputRef}
          type="text"
          value={displayValue()}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={readonly}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'right',
            outline: 'none',
          }}
        />

        {/* Increment button */}
        <button
          onClick={() => handleIncrement(step)}
          disabled={readonly || (max !== undefined && value !== null && value >= max)}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            cursor: readonly ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            color: '#6b7280',
          }}
        >
          +
        </button>
      </div>

      {/* Format options */}
      <div style={{ display: 'flex', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
        {min !== undefined && <span>Min: {min}</span>}
        {max !== undefined && <span>Max: {max}</span>}
        {step !== 1 && <span>Step: {step}</span>}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={readonly}
          style={{
            padding: '6px 16px',
            fontSize: '13px',
            color: '#ffffff',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            cursor: readonly ? 'not-allowed' : 'pointer',
            opacity: readonly ? 0.5 : 1,
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

