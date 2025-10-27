import React, { useState, useCallback, useMemo, type FC } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import type { IDateEditorProps } from '../../../types/editor';
import { useGridPopupPosition } from '../../../hooks/business/useGridPopupPosition';
import 'react-day-picker/dist/style.css';

/**
 * Grid date editor component
 * Uses react-day-picker for calendar selection
 */
export const DateEditor: FC<IDateEditorProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  readonly = false,
  format: dateFormat = 'yyyy-MM-dd',
  showTime = false,
  timeFormat = 'HH:mm',
  className,
  style,
  rect,
}) => {
  // Parse current date value
  const parseDate = (dateStr: string | null): Date | undefined => {
    if (!dateStr) {return undefined;}
    try {
      const parsedDate = parse(dateStr, dateFormat, new Date());
      return isValid(parsedDate) ? parsedDate : undefined;
    } catch {
      return undefined;
    }
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(parseDate(value));
  const [timeValue, setTimeValue] = useState<string>(() => {
    if (!showTime || !value) {return '00:00';}
    try {
      const date = parseDate(value);
      return date ? format(date, timeFormat) : '00:00';
    } catch {
      return '00:00';
    }
  });

  // Calculate popup position if rect is provided
  const popupPosition = rect ? useGridPopupPosition(rect, 400) : undefined;

  // Handle date selection
  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      setSelectedDate(date);
      
      if (!date) {
        onChange(null);
        return;
      }

      try {
        let formattedDate = format(date, dateFormat);
        
        if (showTime) {
          const [hours, minutes] = timeValue.split(':').map(Number);
          date.setHours(hours, minutes);
          formattedDate = format(date, `${dateFormat} ${timeFormat}`);
        }

        onChange(formattedDate);
      } catch (error) {
        console.error('Date format error:', error);
      }
    },
    [onChange, dateFormat, showTime, timeFormat, timeValue]
  );

  // Handle time change
  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      setTimeValue(newTime);

      if (!selectedDate) {return;}

      try {
        const [hours, minutes] = newTime.split(':').map(Number);
        const newDate = new Date(selectedDate);
        newDate.setHours(hours, minutes);
        
        const formattedDate = format(newDate, `${dateFormat} ${timeFormat}`);
        onChange(formattedDate);
      } catch (error) {
        console.error('Time format error:', error);
      }
    },
    [selectedDate, onChange, dateFormat, timeFormat]
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
      }
    },
    [onSave, onCancel]
  );

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
        minWidth: '280px',
        ...popupPosition,
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        disabled={readonly}
        showOutsideDays
        styles={{
          root: { margin: 0 },
        }}
      />

      {showTime && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
          <label style={{ fontSize: '13px', color: '#6b7280' }}>Time:</label>
          <input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={readonly}
            style={{
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px',
              flex: 1,
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => {
            handleDateSelect(undefined);
            onSave?.();
          }}
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
          Clear
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

