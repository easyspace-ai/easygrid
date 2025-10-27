import React, { useState, useCallback, useRef, useEffect, type FC } from 'react';
import type { ILinkEditorProps } from '../../../types/editor';
import { useGridPopupPosition } from '../../../hooks/business/useGridPopupPosition';

/**
 * Validate URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    // Try with http:// prefix
    try {
      new URL(`http://${url}`);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Normalize URL (add protocol if missing)
 */
const normalizeUrl = (url: string): string => {
  if (!url) {return '';}
  if (url.match(/^https?:\/\//i)) {return url;}
  if (url.match(/^mailto:/i)) {return url;}
  if (url.match(/^tel:/i)) {return url;}
  return `http://${url}`;
};

/**
 * Grid link editor component
 * Enhanced URL input with validation
 */
export const LinkEditor: FC<ILinkEditorProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  readonly = false,
  validateUrl: shouldValidate = true,
  openInNewTab = true,
  className,
  style,
  rect,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setError('');

      if (newValue && shouldValidate && !isValidUrl(newValue)) {
        setError('Please enter a valid URL');
      }

      onChange(newValue || null);
    },
    [onChange, shouldValidate]
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (shouldValidate && inputValue && !isValidUrl(inputValue)) {
      setError('Please enter a valid URL before saving');
      return;
    }

    const normalizedValue = inputValue ? normalizeUrl(inputValue) : null;
    onChange(normalizedValue);
    onSave?.();
  }, [inputValue, shouldValidate, onChange, onSave]);

  // Handle open link
  const handleOpen = useCallback(() => {
    if (!inputValue) {return;}
    
    const url = normalizeUrl(inputValue);
    if (openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }, [inputValue, openInNewTab]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    },
    [handleSave, onCancel]
  );

  // Auto focus input
  // Calculate popup position if rect is provided
  const popupPosition = rect ? useGridPopupPosition(rect, 200) : undefined;

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
        minWidth: '300px',
        ...popupPosition,
        ...style,
      }}
    >
      {/* URL input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
          URL
        </label>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          disabled={readonly}
          style={{
            padding: '8px 10px',
            border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '4px',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        {error && (
          <span style={{ fontSize: '12px', color: '#ef4444' }}>
            {error}
          </span>
        )}
      </div>

      {/* Preview link */}
      {inputValue && isValidUrl(inputValue) && (
        <div
          style={{
            padding: '8px',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#6b7280',
            wordBreak: 'break-all',
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 500 }}>Preview:</div>
          <a
            href={normalizeUrl(inputValue)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#3b82f6',
              textDecoration: 'underline',
            }}
          >
            {normalizeUrl(inputValue)}
          </a>
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <button
          onClick={handleOpen}
          disabled={!inputValue || (shouldValidate && !isValidUrl(inputValue))}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            color: '#3b82f6',
            backgroundColor: '#ffffff',
            border: '1px solid #3b82f6',
            borderRadius: '4px',
            cursor: !inputValue || (shouldValidate && !isValidUrl(inputValue)) ? 'not-allowed' : 'pointer',
            opacity: !inputValue || (shouldValidate && !isValidUrl(inputValue)) ? 0.5 : 1,
          }}
        >
          Open Link
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
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
            onClick={handleSave}
            disabled={readonly || (shouldValidate && !!error)}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              color: '#ffffff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              cursor: readonly || (shouldValidate && !!error) ? 'not-allowed' : 'pointer',
              opacity: readonly || (shouldValidate && !!error) ? 0.5 : 1,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

