import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef } from 'react';
import Fuse from 'fuse.js';
import type { ISelectCell, IMultiSelectCell } from '../../../renderers/cell-renderer/interface';
import type { IEditorRef } from '../EditorContainer';

export interface ISelectEditorProps {
  cell: ISelectCell | IMultiSelectCell;
  rect?: { x: number; y: number; width: number; height: number };
  theme?: any;
  style?: React.CSSProperties;
  isEditing?: boolean;
  setEditing?: (editing: boolean) => void;
  onChange: (value: any) => void;
}

/**
 * Grid select editor component
 * Supports single/multiple selection with search using fuse.js
 */
const SelectEditorBase: React.ForwardRefRenderFunction<IEditorRef<ISelectCell | IMultiSelectCell>, ISelectEditorProps> = (props, ref) => {
  const { cell, style, isEditing, setEditing, onChange, rect } = props;
  const { data, isMultiple, choiceSorted = [], choiceMap = {}, readonly } = cell;
  
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert choiceSorted to options format
  const options = useMemo(() => {
    return choiceSorted.map((choice: any) => ({
      id: choice.id || choice.name,
      name: choice.name,
      color: choice.color,
      backgroundColor: choice.backgroundColor,
    }));
  }, [choiceSorted]);

  // Initialize fuse.js for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(options, {
        keys: ['name'],
        threshold: 0.3,
        includeScore: true,
      }),
    [options]
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) {return options;}
    return fuse.search(searchQuery).map((result) => result.item);
  }, [options, fuse, searchQuery]);

  // Get selected values as array
  const selectedValues = useMemo(() => {
    if (!data) {return [];}
    if (!Array.isArray(data)) {return [data];}
    // data can be strings or objects with title/id
    return data.map((item: any) => {
      if (typeof item === 'string') {return item;}
      return item.title || item.id || item.name;
    });
  }, [data]);

  // Check if option is selected
  const isSelected = useCallback(
    (optionId: string) => selectedValues.includes(optionId),
    [selectedValues]
  );

  // useImperativeHandle for ref API
  React.useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    setValue: () => {},
    saveValue: () => {},
  }));

  // Handle option selection
  const handleSelect = useCallback(
    (optionId: string) => {
      if (readonly) {return;}

      if (isMultiple) {
        const newValue = isSelected(optionId)
          ? selectedValues.filter((id) => id !== optionId)
          : [...selectedValues, optionId];
        onChange(newValue);
      } else {
        onChange([optionId]);
        setEditing?.(false);
      }
    },
    [readonly, isMultiple, isSelected, selectedValues, onChange, setEditing]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0].id);
        } else if (!isMultiple) {
          setEditing?.(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditing?.(false);
      }
    },
    [filteredOptions, handleSelect, isMultiple, setEditing]
  );

  // Calculate popup position based on rect
  const popupStyle = useMemo(() => {
    if (!rect) {return {};}
    
    const baseStyle = {
      left: rect.x,
      top: rect.y + rect.height,
    };

    // Check if dropdown would overflow viewport
    const viewportHeight = window.innerHeight;
    const maxDropdownHeight = 280; // 240px list + padding/borders
    
    if (baseStyle.top + maxDropdownHeight > viewportHeight) {
      // Show above the cell if no space below
      return {
        left: rect.x,
        top: rect.y - maxDropdownHeight,
      };
    }

    return baseStyle;
  }, [rect]);

  // Auto focus search input
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isEditing) {return;}

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.select-editor-popup')) {
        setEditing?.(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isEditing, setEditing]);

  if (!isEditing) {return null;}

  return (
    <div
      className="select-editor-popup"
      style={{
        position: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 10000,
        minWidth: '200px',
        maxWidth: '300px',
        ...popupStyle,
        ...style,
      }}
    >
      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search options..."
        disabled={readonly}
        style={{
          padding: '6px 8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '13px',
          outline: 'none',
        }}
      />

      {/* Options list */}
      <div
        style={{
          maxHeight: '240px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {filteredOptions.map((option) => {
          const selected = isSelected(option.id);
          return (
            <div
              key={option.id}
              onClick={() => handleSelect(option.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: readonly ? 'not-allowed' : 'pointer',
                backgroundColor: selected ? '#dbeafe' : 'transparent',
                color: selected ? '#1e40af' : '#374151',
                fontSize: '13px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!readonly) {
                  e.currentTarget.style.backgroundColor = selected ? '#bfdbfe' : '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = selected ? '#dbeafe' : 'transparent';
              }}
            >
              {/* Checkbox for multiple selection */}
              {isMultiple && (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #d1d5db',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? '#3b82f6' : '#ffffff',
                    borderColor: selected ? '#3b82f6' : '#d1d5db',
                  }}
                >
                  {selected && <span style={{ color: '#ffffff', fontSize: '10px' }}>✓</span>}
                </div>
              )}

              {/* Color indicator */}
              {option.color && (
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: option.color,
                  }}
                />
              )}

              {/* Option name */}
              <span style={{ flex: 1 }}>{option.name}</span>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredOptions.length === 0 && (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '13px',
            }}
          >
            No options found
          </div>
        )}
      </div>

      {/* Action buttons for multiple selection */}
      {isMultiple && (
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
            onClick={() => setEditing?.(false)}
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
            onClick={() => setEditing?.(false)}
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
      )}
    </div>
  );
};

export const SelectEditor = forwardRef(SelectEditorBase);
