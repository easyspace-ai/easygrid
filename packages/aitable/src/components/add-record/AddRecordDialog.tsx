/**
 * AddRecordDialog - 添加记录弹窗
 * 
 * 特性：
 * - Portal 居中显示
 * - ESC 关闭、Tab 捕获
 * - 自动焦点管理
 * - 表单自动渲染
 * - 实时校验
 * - 加载状态
 * - 移动端适配
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn, tokens, elevation } from '../../grid/design-system';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { AddRecordDialogProps, FormValues, FormErrors } from './types';
import { getFieldEditor, isFieldEditable } from './field-editors';
import { validateForm, hasErrors } from './validators';
import { createAdapter } from '../../api/sdk-adapter';

const DEFAULT_LOCALE = {
  title: '添加记录',
  cancel: '取消',
  save: '保存',
  saving: '保存中...',
  required: '此字段为必填项',
  invalidFormat: '格式不正确',
};

export function AddRecordDialog(props: AddRecordDialogProps) {
  const {
    isOpen,
    onClose,
    fields,
    tableId,
    adapter,
    onSuccess,
    onError,
    defaultValues = {},
    customEditors = {},
    transformBeforeSubmit,
    locale: customLocale,
  } = props;

  const locale = { ...DEFAULT_LOCALE, ...customLocale };

  // 状态管理
  const [values, setValues] = useState<FormValues>(defaultValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 重置表单
  const resetForm = useCallback(() => {
    setValues(defaultValues);
    setErrors({});
    setSubmitError(null);
  }, [defaultValues]);

  // 获取可编辑字段（排除锁定和计算字段）
  const editableFields = fields.filter(
    (field) => field.visible !== false && !field.locked && isFieldEditable(field.type)
  );

  // Primary 字段置顶
  const sortedFields = [...editableFields].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return 0;
  });

  // 值变化处理
  const handleValueChange = useCallback((fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    // 清除该字段的错误
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setSubmitError(null);
  }, []);

  // 表单提交
  const handleSubmit = useCallback(async () => {
    // 校验表单
    const validationErrors = validateForm(sortedFields, values, locale);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      return;
    }

    // 没有 adapter，无法提交
    if (!adapter) {
      setSubmitError('未配置数据适配器，无法保存');
      console.error('AddRecordDialog: adapter is required for submission');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 构造提交数据
      let submitData = { ...values };

      // 应用转换函数
      if (transformBeforeSubmit) {
        submitData = transformBeforeSubmit(submitData);
      }

      // 创建适配器实例
      const adapterInstance = createAdapter(adapter);

      // 调用 createRecord API
      const record = await adapterInstance.createRecord(tableId, {
        fields: submitData,
      });

      // 成功回调
      if (onSuccess) {
        onSuccess(record);
      }

      // 关闭弹窗并重置表单
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Failed to create record:', error);
      setSubmitError(error.message || '保存失败，请重试');
      
      // 失败回调
      if (onError) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [sortedFields, values, locale, adapter, tableId, transformBeforeSubmit, onSuccess, onError, onClose, resetForm]);

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // 焦点管理
  useEffect(() => {
    if (isOpen) {
      // 保存当前焦点
      previousActiveElement.current = document.activeElement as HTMLElement;

      // 禁用 body 滚动
      document.body.style.overflow = 'hidden';

      // 聚焦到对话框
      setTimeout(() => {
        const firstInput = dialogRef.current?.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    } else {
      // 恢复 body 滚动
      document.body.style.overflow = '';

      // 恢复焦点
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Tab 捕获（焦点陷阱）
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = dialogRef.current!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Enter 快捷键提交
  const handleFieldEnter = useCallback(() => {
    if (!isSubmitting) {
      handleSubmit();
    }
  }, [isSubmitting, handleSubmit]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="add-record-dialog-title"
    >
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* 对话框内容 */}
      <div
        ref={dialogRef}
        className={cn(
          'relative z-[1001] w-full rounded-lg bg-white',
          'max-w-2xl max-h-[90vh] flex flex-col',
          'shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
        style={{
          backgroundColor: tokens.colors.surface.base,
          boxShadow: elevation.xl,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: tokens.colors.border.subtle }}
        >
          <h3
            id="add-record-dialog-title"
            className="text-lg font-semibold"
            style={{ color: tokens.colors.text.primary }}
          >
            {locale.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={cn(
              'p-1 rounded-md text-gray-500 hover:text-gray-700',
              'hover:bg-gray-100 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              isSubmitting && 'cursor-not-allowed opacity-50'
            )}
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - 表单区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sortedFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无可编辑的字段</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedFields.map((field) => {
                const Editor = customEditors[field.type] || getFieldEditor(field.type);
                const error = errors[field.id];
                const value = values[field.id];

                return (
                  <div key={field.id} className="space-y-1.5">
                    {/* 字段标签 */}
                    <label
                      htmlFor={`field-${field.id}`}
                      className="flex items-center gap-1 text-sm font-medium"
                      style={{ color: tokens.colors.text.primary }}
                    >
                      <span>{field.name}</span>
                      {field.required && (
                        <span className="text-red-500" aria-label="必填">
                          *
                        </span>
                      )}
                      {field.isPrimary && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
                          aria-label="主字段"
                        >
                          主字段
                        </span>
                      )}
                    </label>

                    {/* 字段编辑器 */}
                    <Editor
                      field={field}
                      value={value}
                      onChange={(newValue) => handleValueChange(field.id, newValue)}
                      error={error}
                      autoFocus={sortedFields.indexOf(field) === 0}
                      onEnter={handleFieldEnter}
                    />

                    {/* 错误提示 */}
                    {error && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {error}
                      </p>
                    )}

                    {/* 字段描述 */}
                    {field.description && !error && (
                      <p className="text-xs text-gray-500">{field.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 全局错误提示 */}
          {submitError && (
            <div
              className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2"
              role="alert"
            >
              <AlertCircle size={16} className="text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: tokens.colors.border.subtle }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={cn(
              'px-4 h-9 rounded-md text-sm font-medium',
              'border transition-all',
              'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
              isSubmitting && 'cursor-not-allowed opacity-50'
            )}
            style={{
              borderColor: tokens.colors.border.default,
              color: tokens.colors.text.primary,
            }}
          >
            {locale.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || sortedFields.length === 0}
            className={cn(
              'px-4 h-9 rounded-md text-sm font-medium',
              'bg-blue-600 text-white',
              'hover:bg-blue-700 active:bg-blue-800',
              'transition-all shadow-sm hover:shadow-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="inline-block mr-2 animate-spin" />
                {locale.saving}
              </>
            ) : (
              locale.save
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

