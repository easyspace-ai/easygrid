import React, { useState, useCallback, type FC } from 'react';
import { useFilePicker } from 'use-file-picker';
import type { IAttachmentEditorProps, IAttachmentFile } from '../../../types/editor';
import { formatFileSize, isImageFile } from '../../../utils/business/imageHandler';
import { useGridPopupPosition } from '../../../hooks/business/useGridPopupPosition';

/**
 * Grid attachment editor component
 * Uses use-file-picker for file selection
 */
export const AttachmentEditor: FC<IAttachmentEditorProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  readonly = false,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = [],
  onUpload,
  className,
  style,
  rect,
}) => {
  const [files, setFiles] = useState<IAttachmentFile[]>(value || []);
  const [isUploading, setIsUploading] = useState(false);

  const { openFilePicker } = useFilePicker({
    readAs: 'DataURL',
    accept: allowedTypes.length > 0 ? allowedTypes : undefined,
    multiple: maxFiles > 1,
    onFilesSuccessfullySelected: async ({ plainFiles }) => {
      // Validate file size
      const oversizedFile = plainFiles.find((file) => file.size > maxSize);
      if (oversizedFile) {
        console.error(`File size exceeds ${formatFileSize(maxSize)}`);
        return;
      }
      if (!onUpload) {return;}

      setIsUploading(true);
      try {
        const uploadedFiles = await onUpload(plainFiles);
        const newFiles = [...files, ...uploadedFiles].slice(0, maxFiles);
        setFiles(newFiles);
        onChange(newFiles.length > 0 ? newFiles : null);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsUploading(false);
      }
    },
  });

  // Handle remove file
  const handleRemove = useCallback(
    (fileId: string) => {
      if (readonly) {return;}
      const newFiles = files.filter((f) => f.id !== fileId);
      setFiles(newFiles);
      onChange(newFiles.length > 0 ? newFiles : null);
    },
    [files, readonly, onChange]
  );

  // Calculate popup position if rect is provided
  const popupPosition = rect ? useGridPopupPosition(rect, 400) : undefined;

  // Handle file preview
  const handlePreview = useCallback((file: IAttachmentFile) => {
    window.open(file.url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        minWidth: '320px',
        maxWidth: '480px',
        ...popupPosition,
        ...style,
      }}
    >
      {/* Files list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '320px',
          overflowY: 'auto',
        }}
      >
        {files.length === 0 && (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '13px',
            }}
          >
            No attachments yet
          </div>
        )}

        {files.map((file) => {
          const isImage = file.type.startsWith('image/');
          return (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: '#f9fafb',
              }}
            >
              {/* Thumbnail */}
              {isImage && file.thumbnailUrl ? (
                <img
                  src={file.thumbnailUrl}
                  alt={file.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    fontSize: '20px',
                    flexShrink: 0,
                  }}
                >
                  📄
                </div>
              )}

              {/* File info */}
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
                  {file.name}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {formatFileSize(file.size)}
                  {file.width && file.height && ` • ${file.width}×${file.height}`}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  onClick={() => handlePreview(file)}
                  title="Preview"
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  👁️
                </button>
                <button
                  onClick={() => handleRemove(file.id)}
                  disabled={readonly}
                  title="Remove"
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    cursor: readonly ? 'not-allowed' : 'pointer',
                    opacity: readonly ? 0.5 : 1,
                    fontSize: '16px',
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload button */}
      {files.length < maxFiles && (
        <button
          onClick={() => openFilePicker()}
          disabled={readonly || isUploading}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#3b82f6',
            backgroundColor: '#ffffff',
            border: '2px dashed #3b82f6',
            borderRadius: '6px',
            cursor: readonly || isUploading ? 'not-allowed' : 'pointer',
            opacity: readonly || isUploading ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          {isUploading ? 'Uploading...' : `📎 Add Attachment (${files.length}/${maxFiles})`}
        </button>
      )}

      {/* File limits info */}
      <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
        Max {maxFiles} files • {formatFileSize(maxSize)} per file
        {allowedTypes.length > 0 && ` • ${allowedTypes.join(', ')}`}
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

