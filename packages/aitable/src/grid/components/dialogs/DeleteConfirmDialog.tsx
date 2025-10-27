/**
 * Delete Confirmation Dialog Component
 * 删除确认对话框组件
 * 用于确认删除字段或行操作
 */

import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import type { ForwardRefRenderFunction } from 'react';

export type DeleteType = 'column' | 'row';

export interface IDeleteConfirmDialogRef {
  show: (type: DeleteType, itemName: string, itemIndex: number) => void;
  hide: () => void;
}

export interface IDeleteConfirmDialogProps {
  onConfirm?: (type: DeleteType, itemIndex: number) => void;
  onCancel?: () => void;
}

const DeleteConfirmDialogBase: ForwardRefRenderFunction<
  IDeleteConfirmDialogRef,
  IDeleteConfirmDialogProps
> = ({ onConfirm, onCancel }, ref) => {
  const [visible, setVisible] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>('column');
  const [itemName, setItemName] = useState('');
  const [itemIndex, setItemIndex] = useState(-1);
  const modalRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    show: (type: DeleteType, name: string, index: number) => {
      setDeleteType(type);
      setItemName(name);
      setItemIndex(index);
      setVisible(true);
    },
    hide: () => {
      setVisible(false);
    },
  }));

  // 全局点击关闭菜单
  useEffect(() => {
    if (!visible) {return;}

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setVisible(false);
        onCancel?.();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false);
        onCancel?.();
      }
    };

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onCancel]);

  const handleConfirm = () => {
    onConfirm?.(deleteType, itemIndex);
    setVisible(false);
  };

  const handleCancel = () => {
    setVisible(false);
    onCancel?.();
  };

  if (!visible) {return null;}

  const typeLabel = deleteType === 'column' ? '字段' : '记录';
  const typeIcon = deleteType === 'column' ? '📋' : '📝';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10002,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '0',
          minWidth: '400px',
          maxWidth: '500px',
          width: 'max-content',
          maxHeight: '80vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid #f3f4f6',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}>
              ⚠️
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: 600, 
                color: '#111827'
              }}>
                确认删除{typeLabel}
              </h3>
              <p style={{ 
                margin: '4px 0 0', 
                fontSize: '14px', 
                color: '#6b7280' 
              }}>
                此操作无法撤销
              </p>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '16px',
          }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#374151',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>{typeIcon}</span>
              <strong>即将删除的{typeLabel}：</strong>
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 500,
              color: '#111827',
              fontFamily: deleteType === 'column' ? 'inherit' : 'monospace',
              wordBreak: 'break-all'
            }}>
              {itemName}
            </div>
          </div>

          <div style={{
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '6px',
            border: '1px solid #f59e0b',
          }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#92400e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px', marginTop: '2px' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                  删除{typeLabel}会：
                </div>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '16px',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}>
                  {deleteType === 'column' ? (
                    <>
                      <li>永久删除此字段及其所有数据</li>
                      <li>删除所有依赖此字段的公式和关联</li>
                      <li>影响使用此字段的视图和筛选器</li>
                    </>
                  ) : (
                    <>
                      <li>永久删除此记录及其所有数据</li>
                      <li>删除所有与此记录相关的关联</li>
                      <li>此操作无法撤销</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={{
          padding: '16px 24px 24px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#dc2626',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};

export const DeleteConfirmDialog = forwardRef(DeleteConfirmDialogBase);

