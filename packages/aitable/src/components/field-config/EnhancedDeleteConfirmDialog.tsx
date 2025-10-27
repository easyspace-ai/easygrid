/**
 * Enhanced Delete Confirmation Dialog Component
 * 增强版删除确认对话框组件
 * 提供更好的用户体验和详细的删除影响说明
 */

import React, { useState, useCallback, useEffect } from 'react';
import { tokens, transitions, elevation } from '../../grid/design-system';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';
import { useField } from '../../context/field/FieldContext';

export interface EnhancedDeleteConfirmDialogProps {
  isOpen: boolean;
  fieldId: string | null;
  fieldName: string | null;
  onClose: () => void;
  onConfirm: (fieldId: string) => Promise<void>;
  onError?: (error: Error) => void;
}

export function EnhancedDeleteConfirmDialog({
  isOpen,
  fieldId,
  fieldName,
  onClose,
  onConfirm,
  onError,
}: EnhancedDeleteConfirmDialogProps) {
  const { fields } = useField();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [canDelete, setCanDelete] = useState(false);

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setDeleteError(null);
      setConfirmText('');
      setCanDelete(false);
    }
  }, [isOpen]);

  // 检查是否可以删除
  useEffect(() => {
    if (fieldName && confirmText === fieldName) {
      setCanDelete(true);
    } else {
      setCanDelete(false);
    }
  }, [fieldName, confirmText]);

  // 执行删除
  const handleDelete = useCallback(async () => {
    if (!fieldId || !canDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await onConfirm(fieldId);
      onClose();
    } catch (error: any) {
      console.error('❌ 字段删除失败:', error);
      const errorMessage = error.message || '删除失败，请重试';
      setDeleteError(errorMessage);
      onError?.(error);
    } finally {
      setIsDeleting(false);
    }
  }, [fieldId, canDelete, onConfirm, onClose, onError]);

  // 键盘快捷键
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && canDelete && !isDeleting) {
        e.preventDefault();
        handleDelete();
      }
    },
    [onClose, canDelete, isDeleting, handleDelete]
  );

  if (!isOpen || !fieldId || !fieldName) return null;

  // 查找字段信息
  const field = fields.find((f) => f.id === fieldId);
  const fieldType = field?.type || 'unknown';

  // 获取字段类型的中文名称
  const getFieldTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      singleLineText: '单行文本',
      longText: '长文本',
      number: '数字',
      checkbox: '复选框',
      singleSelect: '单选',
      multipleSelect: '多选',
      date: '日期',
      rating: '评分',
      link: '链接',
      user: '用户',
      attachment: '附件',
      formula: '公式',
      rollup: '汇总',
      count: '计数',
      autoNumber: '自动编号',
      createdTime: '创建时间',
      lastModifiedTime: '最后修改时间',
      createdBy: '创建者',
      lastModifiedBy: '最后修改者',
    };
    return typeMap[type] || type;
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* 对话框主体 */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: elevation.large,
            width: '480px',
            maxWidth: '90vw',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* 头部 */}
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={20} color="#dc2626" />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: tokens.colors.text.primary,
                    margin: 0,
                  }}
                >
                  删除字段
                </h2>
                <p
                  style={{
                    fontSize: '14px',
                    color: tokens.colors.text.secondary,
                    margin: '4px 0 0',
                  }}
                >
                  此操作无法撤销
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              style={{
                background: 'none',
                border: 'none',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                padding: '4px',
                borderRadius: '4px',
                color: tokens.colors.text.secondary,
                transition: transitions.presets.all,
                opacity: isDeleting ? 0.5 : 1,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* 内容区域 */}
          <div style={{ padding: '24px' }}>
            {/* 字段信息 */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: `1px solid ${tokens.colors.border.subtle}`,
                marginBottom: '20px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: tokens.colors.primary[100],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: tokens.colors.primary[700],
                  }}
                >
                  {getFieldTypeName(fieldType).charAt(0)}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: tokens.colors.text.primary,
                    }}
                  >
                    {fieldName}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: tokens.colors.text.secondary,
                    }}
                  >
                    {getFieldTypeName(fieldType)}
                  </div>
                </div>
              </div>
            </div>

            {/* 警告信息 */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #f59e0b',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <AlertCircle size={20} color="#d97706" style={{ marginTop: '2px' }} />
                <div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#92400e',
                      marginBottom: '8px',
                    }}
                  >
                    删除此字段将会：
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '16px',
                      fontSize: '14px',
                      color: '#92400e',
                      lineHeight: '1.6',
                    }}
                  >
                    <li>永久删除此字段及其所有数据</li>
                    <li>删除所有依赖此字段的公式和关联</li>
                    <li>影响使用此字段的视图和筛选器</li>
                    <li>可能导致相关记录的数据丢失</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 确认输入 */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: tokens.colors.text.primary,
                  marginBottom: '8px',
                }}
              >
                请输入字段名称 <span style={{ color: tokens.colors.text.destructive }}>*</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`请输入 "${fieldName}" 来确认删除`}
                disabled={isDeleting}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `1px solid ${canDelete ? tokens.colors.border.subtle : tokens.colors.border.destructive}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: transitions.presets.all,
                  backgroundColor: isDeleting ? tokens.colors.surface.disabled : 'white',
                }}
                onFocus={(e) => {
                  if (!isDeleting) {
                    e.target.style.borderColor = tokens.colors.primary[500];
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = canDelete
                    ? tokens.colors.border.subtle
                    : tokens.colors.border.destructive;
                }}
              />
              {confirmText && !canDelete && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '8px',
                    color: tokens.colors.text.destructive,
                    fontSize: '12px',
                  }}
                >
                  <AlertCircle size={12} />
                  字段名称不匹配
                </div>
              )}
            </div>

            {/* 错误提示 */}
            {deleteError && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#dc2626',
                    fontSize: '14px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{deleteError}</span>
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${tokens.colors.border.subtle}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              onClick={onClose}
              disabled={isDeleting}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: tokens.colors.text.secondary,
                backgroundColor: 'transparent',
                border: `1px solid ${tokens.colors.border.subtle}`,
                borderRadius: '8px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                transition: transitions.presets.all,
                opacity: isDeleting ? 0.5 : 1,
              }}
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete || isDeleting}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: canDelete && !isDeleting ? 'white' : tokens.colors.text.tertiary,
                backgroundColor:
                  canDelete && !isDeleting ? '#dc2626' : tokens.colors.surface.disabled,
                border: 'none',
                borderRadius: '8px',
                cursor: canDelete && !isDeleting ? 'pointer' : 'not-allowed',
                transition: transitions.presets.all,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (canDelete && !isDeleting) {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }
              }}
              onMouseLeave={(e) => {
                if (canDelete && !isDeleting) {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }
              }}
            >
              {isDeleting ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  确认删除
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
