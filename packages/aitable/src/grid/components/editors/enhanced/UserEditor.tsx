import React, { useState, useMemo, useCallback, useRef, useEffect, type FC } from 'react';
import Fuse from 'fuse.js';
import type { IUserEditorProps, IUserInfo } from '../../../types/editor';
import { useGridPopupPosition } from '../../../hooks/business/useGridPopupPosition';

/**
 * Get user initials for avatar
 */
const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Generate avatar color based on name
 */
const getAvatarColor = (name: string): string => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e',
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

/**
 * Grid user editor component
 * Supports single/multiple user selection with search
 */
export const UserEditor: FC<IUserEditorProps> = ({
  value,
  users = [], // 添加默认值
  onChange,
  onSave,
  onCancel,
  readonly = false,
  multiple = false,
  searchable = true,
  className,
  style,
  rect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize fuse.js for user search
  const fuse = useMemo(
    () =>
      new Fuse(users || [], { // 添加防御性检查
        keys: ['name', 'email'],
        threshold: 0.3,
        includeScore: true,
      }),
    [users]
  );

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) {return users || [];} // 添加防御性检查
    return fuse.search(searchQuery).map((result) => result.item);
  }, [users, fuse, searchQuery]);

  // Get selected user IDs as array
  const selectedUserIds = useMemo(() => {
    if (!value) {return [];}
    return Array.isArray(value) ? value : [value];
  }, [value]);

  // Get selected users
  const selectedUsers = useMemo(() => {
    return (users || []).filter((user) => selectedUserIds.includes(user.id)); // 添加防御性检查
  }, [users, selectedUserIds]);

  // Check if user is selected
  const isSelected = useCallback(
    (userId: string) => selectedUserIds.includes(userId),
    [selectedUserIds]
  );

  // Handle user selection
  const handleSelect = useCallback(
    (userId: string) => {
      if (readonly) {return;}

      if (multiple) {
        const newValue = isSelected(userId)
          ? selectedUserIds.filter((id) => id !== userId)
          : [...selectedUserIds, userId];
        onChange(newValue.length > 0 ? newValue : null);
      } else {
        onChange(userId);
        onSave?.();
      }
    },
    [readonly, multiple, isSelected, selectedUserIds, onChange, onSave]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredUsers.length === 1) {
          handleSelect(filteredUsers[0].id);
        } else {
          onSave?.();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    },
    [filteredUsers, handleSelect, onSave, onCancel]
  );

  // Calculate popup position if rect is provided
  const popupPosition = rect ? useGridPopupPosition(rect, 340) : undefined;

  // Auto focus search input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        minWidth: '280px',
        maxWidth: '360px',
        ...popupPosition,
        ...style,
      }}
    >
      {/* Selected users */}
      {selectedUsers.length > 0 && multiple && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '8px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
          }}
        >
          {selectedUsers.map((user) => {
            const avatarColor = getAvatarColor(user.name);
            return (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  fontSize: '12px',
                }}
              >
                {/* Avatar */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: avatarColor,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    {getUserInitials(user.name)}
                  </div>
                )}

                <span>{user.name}</span>

                {/* Remove button */}
                {!readonly && (
                  <button
                    onClick={() => handleSelect(user.id)}
                    style={{
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: '50%',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#9ca3af',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Search input */}
      {searchable && (
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search users..."
          disabled={readonly}
          style={{
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      )}

      {/* Users list */}
      <div
        style={{
          maxHeight: '280px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {filteredUsers.map((user) => {
          const selected = isSelected(user.id);
          const avatarColor = getAvatarColor(user.name);

          return (
            <div
              key={user.id}
              onClick={() => handleSelect(user.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: '6px',
                cursor: readonly ? 'not-allowed' : 'pointer',
                backgroundColor: selected ? '#dbeafe' : 'transparent',
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
              {multiple && (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #d1d5db',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? '#3b82f6' : '#ffffff',
                    borderColor: selected ? '#3b82f6' : '#d1d5db',
                    flexShrink: 0,
                  }}
                >
                  {selected && <span style={{ color: '#ffffff', fontSize: '11px' }}>✓</span>}
                </div>
              )}

              {/* Avatar */}
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: avatarColor,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {getUserInitials(user.name)}
                </div>
              )}

              {/* User info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name}
                </div>
                {user.email && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.email}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredUsers.length === 0 && (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '13px',
            }}
          >
            No users found
          </div>
        )}
      </div>

      {/* Action buttons for multiple selection */}
      {multiple && (
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
      )}
    </div>
  );
};

