/**
 * Virtual Field Configuration Component
 * 虚拟字段配置组件
 * 支持公式字段和汇总字段的配置
 */

import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import type { ForwardRefRenderFunction } from 'react';

export interface IFormulaFieldConfigOptions {
  expression: string;
  formatting?: {
    type?: string;
    precision?: number;
  };
}

export interface IRollupFieldConfigOptions {
  expression: string;
  formatting?: {
    type?: string;
    precision?: number;
  };
}

export interface IVirtualFieldConfigRef {
  show: (fieldType: 'formula' | 'rollup', initialOptions?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions) => void;
  hide: () => void;
}

export interface IVirtualFieldConfigProps {
  onConfirm?: (options: IFormulaFieldConfigOptions | IRollupFieldConfigOptions) => void;
  onCancel?: () => void;
}

// 汇总函数选项
const ROLLUP_FUNCTIONS = [
  { value: 'sum({values})', label: '求和', description: '计算所有值的总和' },
  { value: 'average({values})', label: '平均值', description: '计算所有值的平均值' },
  { value: 'count({values})', label: '计数', description: '计算值的数量' },
  { value: 'max({values})', label: '最大值', description: '找出最大值' },
  { value: 'min({values})', label: '最小值', description: '找出最小值' },
  { value: 'concatenate({values})', label: '连接', description: '连接所有值为文本' },
] as const;

const VirtualFieldConfigBase: ForwardRefRenderFunction<
  IVirtualFieldConfigRef,
  IVirtualFieldConfigProps
> = ({ onConfirm, onCancel }, ref) => {
  const [visible, setVisible] = useState(false);
  const [fieldType, setFieldType] = useState<'formula' | 'rollup'>('formula');
  const [expression, setExpression] = useState('');
  const [formatting, setFormatting] = useState<{ type?: string; precision?: number }>({});
  const modalRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    show: (type: 'formula' | 'rollup', initialOptions) => {
      setFieldType(type);
      if (initialOptions) {
        setExpression(initialOptions.expression || '');
        setFormatting(initialOptions.formatting || {});
      } else {
        setExpression('');
        setFormatting({});
      }
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
    if (expression.trim()) {
      const options = {
        expression: expression.trim(),
        formatting: Object.keys(formatting).length > 0 ? formatting : undefined,
      };
      onConfirm?.(options);
      setVisible(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    onCancel?.();
  };

  const handleRollupFunctionSelect = (func: { value: string; label: string; description: string }) => {
    setExpression(func.value);
  };

  if (!visible) {return null;}

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '0',
        minWidth: '500px',
        maxWidth: '600px',
        width: 'max-content',
        zIndex: 10001,
        maxHeight: '80vh',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 头部 */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#111827',
        }}>
          {fieldType === 'formula' ? '配置公式字段' : '配置汇总字段'}
        </h3>
        <p style={{ 
          margin: '4px 0 0', 
          fontSize: '14px', 
          color: '#6b7280' 
        }}>
          {fieldType === 'formula' ? '设置公式表达式和格式' : '选择汇总函数和格式'}
        </p>
      </div>

      {/* 内容区域 */}
      <div style={{ padding: '20px 24px', maxHeight: '60vh', overflow: 'auto' }}>
        {fieldType === 'formula' ? (
          // 公式字段配置
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: 500,
                color: '#374151'
              }}>
                公式表达式 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="输入公式表达式，例如：{字段1} + {字段2}"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              />
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#6b7280' 
              }}>
                提示：使用 {`{字段名}`} 来引用其他字段
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: 500,
                color: '#374151'
              }}>
                数字格式
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  value={formatting.type || 'decimal'}
                  onChange={(e) => setFormatting({ ...formatting, type: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="decimal">小数</option>
                  <option value="percent">百分比</option>
                  <option value="currency">货币</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formatting.precision || 2}
                  onChange={(e) => setFormatting({ ...formatting, precision: parseInt(e.target.value) })}
                  placeholder="精度"
                  style={{
                    width: '80px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>位小数</span>
              </div>
            </div>
          </div>
        ) : (
          // 汇总字段配置
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: 500,
                color: '#374151'
              }}>
                汇总函数 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '8px' 
              }}>
                {ROLLUP_FUNCTIONS.map((func) => (
                  <button
                    key={func.value}
                    onClick={() => handleRollupFunctionSelect(func)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '4px',
                      padding: '12px',
                      border: expression === func.value ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: expression === func.value ? '#f0f9ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (expression !== func.value) {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (expression !== func.value) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 500, 
                      color: '#111827'
                    }}>
                      {func.label}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280' 
                    }}>
                      {func.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: 500,
                color: '#374151'
              }}>
                数字格式
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  value={formatting.type || 'decimal'}
                  onChange={(e) => setFormatting({ ...formatting, type: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="decimal">小数</option>
                  <option value="percent">百分比</option>
                  <option value="currency">货币</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formatting.precision || 2}
                  onChange={(e) => setFormatting({ ...formatting, precision: parseInt(e.target.value) })}
                  placeholder="精度"
                  style={{
                    width: '80px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>位小数</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div style={{
        padding: '16px 24px 20px',
        borderTop: '1px solid #f3f4f6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          onClick={handleCancel}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white',
            color: '#374151',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          取消
        </button>
        <button
          onClick={handleConfirm}
          disabled={!expression.trim()}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background: expression.trim() ? '#3b82f6' : '#d1d5db',
            color: expression.trim() ? 'white' : '#9ca3af',
            fontSize: '14px',
            cursor: expression.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (expression.trim()) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            if (expression.trim()) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }
          }}
        >
          确认
        </button>
      </div>
    </div>
  );
};

export const VirtualFieldConfig = forwardRef(VirtualFieldConfigBase);
