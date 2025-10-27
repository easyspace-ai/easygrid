import React, { useState, useCallback, type FC } from 'react';
import type { IFilePreviewerProps } from '../../../types/editor';
import { formatFileSize } from '../../../utils/business/imageHandler';

/**
 * Grid file previewer component
 * Displays file preview with actions
 */
export const FilePreviewer: FC<IFilePreviewerProps> = ({
  file,
  onClose,
  onDelete,
  onDownload,
}) => {
  const [imageError, setImageError] = useState(false);

  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';
  const canPreview = isImage || isPDF;

  // Handle download
  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload(file);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [file, onDownload]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      onDelete?.(file.id);
    }
  }, [file, onDelete]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    },
    [onClose]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file.name}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              {formatFileSize(file.size)}
              {file.width && file.height && ` • ${file.width}×${file.height}`}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
            <button
              onClick={handleDownload}
              title="Download"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              ⬇️
            </button>

            {onDelete && (
              <button
                onClick={handleDelete}
                title="Delete"
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '18px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                🗑️
              </button>
            )}

            <button
              onClick={onClose}
              title="Close"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            minWidth: '400px',
            minHeight: '300px',
            maxHeight: '70vh',
            overflow: 'auto',
            backgroundColor: '#f3f4f6',
          }}
        >
          {isImage && !imageError ? (
            <img
              src={file.url}
              alt={file.name}
              onError={() => setImageError(true)}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
            />
          ) : isPDF ? (
            <iframe
              src={file.url}
              title={file.name}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '40px',
              }}
            >
              <div
                style={{
                  fontSize: '64px',
                  opacity: 0.5,
                }}
              >
                📄
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
                Preview not available for this file type
              </p>
              <button
                onClick={handleDownload}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#ffffff',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

