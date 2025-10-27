import React, { useState, useEffect } from 'react';
import { tokens, transitions, elevation } from '../../grid/design-system';
import { X, Save, Eye, EyeOff, Settings, Palette, Hash, Calendar, CheckSquare } from 'lucide-react';

export interface FieldConfig {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked?: boolean;
  required?: boolean;
  description?: string;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface EditFieldDialogProps {
  isOpen: boolean;
  field: FieldConfig | null;
  onClose: () => void;
  onSave: (fieldId: string, updates: Partial<FieldConfig>) => void;
}

export function EditFieldDialog({ isOpen, field, onClose, onSave }: EditFieldDialogProps) {
  const [formData, setFormData] = useState<Partial<FieldConfig>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'options' | 'validation'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    }
  }, [field]);

  const handleSave = async () => {
    if (!field || !formData.name?.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(field.id, formData);
      onClose();
    } catch (error: any) {
      console.error('❌ 字段保存失败:', error);
      setSaveError(error.message || '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const updateFormData = (updates: Partial<FieldConfig>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const addOption = () => {
    const newOptions = [...(formData.options || []), ''];
    updateFormData({ options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = value;
    updateFormData({ options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = (formData.options || []).filter((_, i) => i !== index);
    updateFormData({ options: newOptions });
  };

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
          zIndex: 70,
        }}
        onClick={onClose}
      />

      {/* 对话框 */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          maxHeight: '80vh',
          backgroundColor: tokens.colors.surface.base,
          border: `1px solid ${tokens.colors.border.subtle}`,
          borderRadius: '12px',
          boxShadow: elevation.xl,
          zIndex: 71,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 对话框标题 */}
        <div
          style={{
            padding: '20px 24px 0',
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
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: transitions.presets.all,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} style={{ color: tokens.colors.text.secondary }} />
          </button>
        </div>

        {/* 标签页导航 */}
        <div
          style={{
            padding: '16px 24px 0',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            display: 'flex',
            gap: '24px',
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
                  padding: '8px 0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? tokens.colors.border.accent : 'transparent'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? tokens.colors.text.accent : tokens.colors.text.secondary,
                  transition: transitions.presets.all,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = tokens.colors.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = tokens.colors.text.secondary;
                  }
                }}
              >
                <IconComponent size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 对话框内容 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'basic' && (
            <div style={{ padding: '24px' }}>
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
                  字段名称
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  onKeyDown={handleKeyPress}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: tokens.colors.text.primary,
                    backgroundColor: tokens.colors.surface.base,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: '8px',
                    outline: 'none',
                    transition: transitions.presets.all,
                    boxSizing: 'border-box',
                  }}
                />
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
                  placeholder="可选，描述字段用途"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: tokens.colors.text.primary,
                    backgroundColor: tokens.colors.surface.base,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: '8px',
                    outline: 'none',
                    resize: 'vertical',
                    transition: transitions.presets.all,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* 字段选项 */}
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
                      style={{ cursor: 'pointer' }}
                    />
                    必填字段
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
                      style={{ cursor: 'pointer' }}
                    />
                    {formData.visible !== false ? (
                      <>
                        <Eye size={16} />
                        显示字段
                      </>
                    ) : (
                      <>
                        <EyeOff size={16} />
                        隐藏字段
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'options' && (
            <div style={{ padding: '24px' }}>
              {['singleSelect', 'multipleSelect'].includes(field.type) && (
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
                              fontSize: '14px',
                              color: tokens.colors.text.primary,
                              backgroundColor: tokens.colors.surface.base,
                              border: `1px solid ${tokens.colors.border.subtle}`,
                              borderRadius: '6px',
                              outline: 'none',
                              transition: transitions.presets.all,
                            }}
                          />
                          <button
                            onClick={() => removeOption(index)}
                            style={{
                              padding: '8px',
                              backgroundColor: tokens.colors.surface.destructive,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: transitions.presets.all,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                tokens.colors.surface.destructive;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                tokens.colors.surface.destructive;
                            }}
                          >
                            <X size={14} style={{ color: tokens.colors.text.inverse }} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addOption}
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          color: tokens.colors.text.accent,
                          backgroundColor: tokens.colors.surface.accent,
                          border: `1px solid ${tokens.colors.border.accent}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: transitions.presets.all,
                          alignSelf: 'flex-start',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = tokens.colors.surface.accent;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = tokens.colors.surface.accent;
                        }}
                      >
                        + 添加选项
                      </button>
                    </div>
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
                  placeholder="可选，设置字段默认值"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: tokens.colors.text.primary,
                    backgroundColor: tokens.colors.surface.base,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: '8px',
                    outline: 'none',
                    transition: transitions.presets.all,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'validation' && (
            <div style={{ padding: '24px' }}>
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
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: tokens.colors.text.primary,
                        backgroundColor: tokens.colors.surface.base,
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        borderRadius: '8px',
                        outline: 'none',
                        transition: transitions.presets.all,
                        boxSizing: 'border-box',
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
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: tokens.colors.text.primary,
                        backgroundColor: tokens.colors.surface.base,
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        borderRadius: '8px',
                        outline: 'none',
                        transition: transitions.presets.all,
                        boxSizing: 'border-box',
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
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: tokens.colors.text.primary,
                      backgroundColor: tokens.colors.surface.base,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                      borderRadius: '8px',
                      outline: 'none',
                      transition: transitions.presets.all,
                      boxSizing: 'border-box',
                    }}
                  />
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
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span>{saveError}</span>
            </div>
          </div>
        )}

        {/* 对话框底部按钮 */}
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
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: tokens.colors.text.secondary,
              backgroundColor: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: transitions.presets.all,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
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
            onMouseEnter={(e) => {
              if (formData.name?.trim() && !isSaving) {
                e.currentTarget.style.backgroundColor = tokens.colors.primary[700];
              }
            }}
            onMouseLeave={(e) => {
              if (formData.name?.trim() && !isSaving) {
                e.currentTarget.style.backgroundColor = tokens.colors.primary[600];
              }
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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
