/**
 * Enhanced Edit Field Dialog Component
 * 增强版字段编辑对话框组件
 * 集成 FieldContext，提供完整的错误处理和加载状态
 */

import React, { useState, useEffect, useCallback } from 'react';
import { tokens, transitions, elevation } from '../../grid/design-system';
import { X, Save, Eye, EyeOff, Settings, Palette, CheckSquare, AlertCircle } from 'lucide-react';
import { useField } from '../../context/field/FieldContext';
import type { FieldConfig } from './EditFieldDialog';

export interface EnhancedEditFieldDialogProps {
  isOpen: boolean;
  field: FieldConfig | null;
  onClose: () => void;
  onSuccess?: (field: FieldConfig) => void;
  onError?: (error: Error) => void;
}

export function EnhancedEditFieldDialog({
  isOpen,
  field,
  onClose,
  onSuccess,
  onError,
}: EnhancedEditFieldDialogProps) {
  const { updateField } = useField();
  const [formData, setFormData] = useState<Partial<FieldConfig>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'options' | 'validation'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (field) {
      setFormData({
        name: field.name,
        description: field.description,
        required: field.required,
        visible: field.visible,
        options: field.options || [],
        defaultValue: field.defaultValue,
        validation: field.validation || {},
      });
      setSaveError(null);
      setValidationErrors({});
    }
  }, [field]);

  // 表单验证
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = '字段名称不能为空';
    } else if (formData.name.trim().length > 50) {
      errors.name = '字段名称不能超过50个字符';
    }

    if (formData.description && formData.description.length > 200) {
      errors.description = '字段描述不能超过200个字符';
    }

    // 验证选项
    if (formData.options) {
      const emptyOptions = formData.options.filter((option) => !option.trim());
      if (emptyOptions.length > 0) {
        errors.options = '选项不能为空';
      }
    }

    // 验证数值范围
    if (formData.validation?.min !== undefined && formData.validation?.max !== undefined) {
      if (formData.validation.min >= formData.validation.max) {
        errors.validation = '最小值必须小于最大值';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // 保存字段
  const handleSave = useCallback(async () => {
    if (!field || !formData.name?.trim()) return;

    // 验证表单
    if (!validateForm()) {
      setSaveError('请检查表单中的错误');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // 调用 FieldContext 的 updateField 方法
      await updateField(field.id, {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        options: formData.options || [],
        validation: formData.validation || {},
      });

      // 成功回调
      onSuccess?.(field);
      onClose();
    } catch (error: any) {
      console.error('❌ 字段保存失败:', error);
      const errorMessage = error.message || '保存失败，请重试';
      setSaveError(errorMessage);
      onError?.(error);
    } finally {
      setIsSaving(false);
    }
  }, [field, formData, validateForm, updateField, onSuccess, onClose, onError]);

  // 键盘快捷键
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [handleSave, onClose]
  );

  // 更新表单数据
  const updateFormData = useCallback((updates: Partial<FieldConfig>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // 清除相关验证错误
    if (updates.name) setValidationErrors((prev) => ({ ...prev, name: '' }));
    if (updates.description) setValidationErrors((prev) => ({ ...prev, description: '' }));
    if (updates.options) setValidationErrors((prev) => ({ ...prev, options: '' }));
    if (updates.validation) setValidationErrors((prev) => ({ ...prev, validation: '' }));
  }, []);

  // 选项管理
  const addOption = useCallback(() => {
    const newOptions = [...(formData.options || []), ''];
    updateFormData({ options: newOptions });
  }, [formData.options, updateFormData]);

  const updateOption = useCallback(
    (index: number, value: string) => {
      const newOptions = [...(formData.options || [])];
      newOptions[index] = value;
      updateFormData({ options: newOptions });
    },
    [formData.options, updateFormData]
  );

  const removeOption = useCallback(
    (index: number) => {
      const newOptions = (formData.options || []).filter((_, i) => i !== index);
      updateFormData({ options: newOptions });
    },
    [formData.options, updateFormData]
  );

  if (!isOpen || !field) return null;

  const tabs = [
    { id: 'basic', label: '基础设置', icon: Settings },
    { id: 'options', label: '选项配置', icon: Palette },
    { id: 'validation', label: '验证规则', icon: CheckSquare },
  ];

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
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyPress}
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
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: tokens.colors.text.primary,
                margin: 0,
              }}
            >
              编辑字段
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                color: tokens.colors.text.secondary,
                transition: transitions.presets.all,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* 标签页导航 */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
              backgroundColor: tokens.colors.surface.base,
            }}
          >
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isActive ? tokens.colors.primary[600] : tokens.colors.text.secondary,
                    borderBottom: isActive
                      ? `2px solid ${tokens.colors.primary[600]}`
                      : '2px solid transparent',
                    transition: transitions.presets.all,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <IconComponent size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 内容区域 */}
          <div
            style={{
              flex: 1,
              padding: '24px',
              overflow: 'auto',
            }}
          >
            {/* 基础设置 */}
            {activeTab === 'basic' && (
              <div>
                {/* 字段名称 */}
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
                    字段名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    placeholder="请输入字段名称"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.name ? tokens.colors.border.destructive : tokens.colors.border.subtle}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      transition: transitions.presets.all,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = tokens.colors.primary[500];
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = validationErrors.name
                        ? tokens.colors.border.destructive
                        : tokens.colors.border.subtle;
                    }}
                  />
                  {validationErrors.name && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        color: tokens.colors.text.destructive,
                        fontSize: '12px',
                      }}
                    >
                      <AlertCircle size={12} />
                      {validationErrors.name}
                    </div>
                  )}
                </div>

                {/* 字段描述 */}
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
                    字段描述
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    placeholder="请输入字段描述（可选）"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${validationErrors.description ? tokens.colors.border.destructive : tokens.colors.border.subtle}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                      transition: transitions.presets.all,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = tokens.colors.primary[500];
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = validationErrors.description
                        ? tokens.colors.border.destructive
                        : tokens.colors.border.subtle;
                    }}
                  />
                  {validationErrors.description && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        color: tokens.colors.text.destructive,
                        fontSize: '12px',
                      }}
                    >
                      <AlertCircle size={12} />
                      {validationErrors.description}
                    </div>
                  )}
                </div>

                {/* 字段属性 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: tokens.colors.text.primary,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.required || false}
                        onChange={(e) => updateFormData({ required: e.target.checked })}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: tokens.colors.primary[600],
                        }}
                      />
                      <span>必填字段</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: tokens.colors.text.primary,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.visible !== false}
                        onChange={(e) => updateFormData({ visible: e.target.checked })}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: tokens.colors.primary[600],
                        }}
                      />
                      <span>显示字段</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 选项配置 */}
            {activeTab === 'options' && (
              <div>
                {field.type === 'select' && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: tokens.colors.text.primary,
                          marginBottom: '8px',
                        }}
                      >
                        选项列表
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(formData.options || []).map((option, index) => (
                          <div
                            key={index}
                            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                          >
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(index, e.target.value)}
                              placeholder={`选项 ${index + 1}`}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: `1px solid ${tokens.colors.border.subtle}`,
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                            <button
                              onClick={() => removeOption(index)}
                              style={{
                                padding: '8px',
                                border: 'none',
                                background: tokens.colors.surface.destructive,
                                color: tokens.colors.text.inverse,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                      {validationErrors.options && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px',
                            color: tokens.colors.text.destructive,
                            fontSize: '12px',
                          }}
                        >
                          <AlertCircle size={12} />
                          {validationErrors.options}
                        </div>
                      )}
                      <button
                        onClick={addOption}
                        style={{
                          marginTop: '12px',
                          padding: '8px 16px',
                          border: `1px solid ${tokens.colors.border.subtle}`,
                          background: 'transparent',
                          color: tokens.colors.text.primary,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        + 添加选项
                      </button>
                    </div>
                  </>
                )}

                {/* 默认值 */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: tokens.colors.text.primary,
                      marginBottom: '8px',
                    }}
                  >
                    默认值
                  </label>
                  <input
                    type="text"
                    value={formData.defaultValue || ''}
                    onChange={(e) => updateFormData({ defaultValue: e.target.value })}
                    placeholder="请输入默认值（可选）"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${tokens.colors.border.subtle}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            )}

            {/* 验证规则 */}
            {activeTab === 'validation' && (
              <div>
                {field.type === 'number' && (
                  <>
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
                        最小值
                      </label>
                      <input
                        type="number"
                        value={formData.validation?.min || ''}
                        onChange={(e) =>
                          updateFormData({
                            validation: {
                              ...formData.validation,
                              min: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                        placeholder="最小值"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${tokens.colors.border.subtle}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>

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
                        最大值
                      </label>
                      <input
                        type="number"
                        value={formData.validation?.max || ''}
                        onChange={(e) =>
                          updateFormData({
                            validation: {
                              ...formData.validation,
                              max: e.target.value ? Number(e.target.value) : undefined,
                            },
                          })
                        }
                        placeholder="最大值"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${tokens.colors.border.subtle}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </>
                )}

                {field.type === 'text' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: tokens.colors.text.primary,
                        marginBottom: '8px',
                      }}
                    >
                      正则表达式验证
                    </label>
                    <input
                      type="text"
                      value={formData.validation?.pattern || ''}
                      onChange={(e) =>
                        updateFormData({
                          validation: {
                            ...formData.validation,
                            pattern: e.target.value,
                          },
                        })
                      }
                      placeholder="例如：^[a-zA-Z0-9]+$"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                )}

                {validationErrors.validation && (
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
                    {validationErrors.validation}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {saveError && (
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: '#fef2f2',
                borderTop: '1px solid #fecaca',
                borderBottom: '1px solid #fecaca',
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
                <span>{saveError}</span>
              </div>
            </div>
          )}

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
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: tokens.colors.text.secondary,
                backgroundColor: 'transparent',
                border: `1px solid ${tokens.colors.border.subtle}`,
                borderRadius: '6px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: transitions.presets.all,
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name?.trim() || isSaving}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color:
                  formData.name?.trim() && !isSaving
                    ? tokens.colors.text.inverse
                    : tokens.colors.text.tertiary,
                backgroundColor:
                  formData.name?.trim() && !isSaving
                    ? tokens.colors.primary[600]
                    : tokens.colors.surface.disabled,
                border: 'none',
                borderRadius: '6px',
                cursor: formData.name?.trim() && !isSaving ? 'pointer' : 'not-allowed',
                transition: transitions.presets.all,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? (
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
                  保存中...
                </>
              ) : (
                <>
                  <Save size={16} />
                  保存更改
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
