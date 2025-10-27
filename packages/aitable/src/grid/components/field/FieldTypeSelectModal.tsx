/**
 * Field Type Select Modal Component
 * 字段类型选择弹窗组件
 * 参考 teable-develop 的实现，提供字段类型选择和字段名称输入功能
 */

import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import type { ForwardRefRenderFunction } from 'react';
import { VirtualFieldConfig, type IVirtualFieldConfigRef, type IFormulaFieldConfigOptions, type IRollupFieldConfigOptions } from './VirtualFieldConfig';

export type IFieldTypeModal =
  | 'singleLineText'
  | 'longText'
  | 'number'
  | 'singleSelect'
  | 'multipleSelect'
  | 'date'
  | 'dateTime'
  | 'checkbox'
  | 'user'
  | 'attachment'
  | 'link'
  | 'rating'
  | 'formula'
  | 'rollup'
  | 'autoNumber'
  | 'createdTime'
  | 'lastModifiedTime'
  | 'createdBy'
  | 'lastModifiedBy';

export interface IFieldTypeOption {
  type: IFieldTypeModal;
  name: string;
  icon: string;
  description?: string;
}

export interface IFieldTypeSelectModalRef {
  show: (position?: { x: number; y: number }, mode?: 'create' | 'edit', initialData?: { type?: IFieldTypeModal; name?: string; options?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions }) => void;
  hide: () => void;
}

export interface IFieldTypeSelectModalProps {
  onConfirm?: (data: { type: IFieldTypeModal; name: string; options?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions }) => void;
  onCancel?: () => void;
}

// 基础字段类型分组
const BASE_FIELD_TYPES: IFieldTypeOption[] = [
  { type: 'singleLineText', name: '单行文本', icon: '📝', description: '用于输入短文本内容' },
  { type: 'longText', name: '长文本', icon: '📄', description: '用于输入多行文本内容' },
  { type: 'number', name: '数字', icon: '🔢', description: '用于输入数值' },
  { type: 'singleSelect', name: '单选', icon: '🔘', description: '从预设选项中选择一个' },
  { type: 'multipleSelect', name: '多选', icon: '☑️', description: '从预设选项中选择多个' },
  { type: 'date', name: '日期', icon: '📅', description: '选择日期' },
  { type: 'checkbox', name: '复选框', icon: '☑️', description: '是/否选择' },
  { type: 'user', name: '用户', icon: '👤', description: '选择系统用户' },
  { type: 'rating', name: '评分', icon: '⭐', description: '星级评分' },
];

// 高级字段类型分组
const ADVANCED_FIELD_TYPES: IFieldTypeOption[] = [
  { type: 'attachment', name: '附件', icon: '📎', description: '上传文件附件' },
  { type: 'link', name: '关联', icon: '🔗', description: '关联其他表格记录' },
  { type: 'formula', name: '公式', icon: '🧮', description: '基于其他字段计算得出' },
  { type: 'rollup', name: '汇总', icon: '📊', description: '汇总关联字段的数据' },
  { type: 'autoNumber', name: '自动编号', icon: '#️⃣', description: '自动生成递增数字' },
];

// 系统字段类型分组
const SYSTEM_FIELD_TYPES: IFieldTypeOption[] = [
  { type: 'createdTime', name: '创建时间', icon: '🕒', description: '记录创建时间' },
  { type: 'lastModifiedTime', name: '修改时间', icon: '🕐', description: '记录最后修改时间' },
  { type: 'createdBy', name: '创建者', icon: '👤', description: '记录创建者' },
  { type: 'lastModifiedBy', name: '修改者', icon: '👤', description: '记录最后修改者' },
];

const FieldTypeSelectModalBase: ForwardRefRenderFunction<
  IFieldTypeSelectModalRef,
  IFieldTypeSelectModalProps
> = ({ onConfirm, onCancel }, ref) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedType, setSelectedType] = useState<IFieldTypeModal>('singleLineText');
  const [fieldName, setFieldName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<IFormulaFieldConfigOptions | IRollupFieldConfigOptions | undefined>();
  const modalRef = useRef<HTMLDivElement>(null);
  const virtualFieldConfigRef = useRef<IVirtualFieldConfigRef>(null);
  // 记录待打开的虚拟字段配置类型，避免在子组件尚未挂载时调用 ref
  const [pendingVirtual, setPendingVirtual] = useState<{
    type: 'formula' | 'rollup';
    options?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions;
  } | null>(null);
  // 数字字段配置状态
  const [numberFormatType, setNumberFormatType] = useState<'decimal' | 'percent' | 'currency'>('decimal');
  const [numberPrecision, setNumberPrecision] = useState<number>(2);
  const [numberDefaultValue, setNumberDefaultValue] = useState<string>('');
  const [numberDisplay, setNumberDisplay] = useState<'number' | 'ring' | 'bar'>('number');

  useImperativeHandle(ref, () => ({
    show: (pos = { x: 100, y: 100 }, modalMode = 'create', initialData) => {
      setPosition(pos);
      setMode(modalMode);
      setSelectedType(initialData?.type || 'singleLineText');
      setFieldName(initialData?.name || '');
      setFieldOptions(initialData?.options);
      setIsCreating(false);
      setIsConfiguring(false);
      // 重置数字字段配置
      setNumberFormatType('decimal');
      setNumberPrecision(2);
      setNumberDefaultValue('');
      setNumberDisplay('number');
      setVisible(true);
      // 初次显示时，先用传入位置，渲染后再根据弹窗尺寸进行防遮挡调整
      setAdjustedPosition(pos);
    },
    hide: () => {
      setVisible(false);
      setIsCreating(false);
      setIsConfiguring(false);
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

  // 可视区域防遮挡：在可见且渲染后根据尺寸调整位置
  useEffect(() => {
    if (!visible) {return;}
    const el = modalRef.current;
    if (!el) {return;}
    // 下一帧读取尺寸，避免拿到旧值
    const id = window.requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 12;
      let x = position.x;
      let y = position.y;

      // 如果右侧溢出，向左移；若左侧溢出，贴边
      if (x + rect.width > vw - margin) {x = Math.max(margin, vw - rect.width - margin);}
      if (x < margin) {x = margin;}

      // 如果底部溢出，向上移；若顶部溢出，贴边
      if (y + rect.height > vh - margin) {y = Math.max(margin, vh - rect.height - margin);}
      if (y < margin) {y = margin;}

      // 微调：若仍与右侧很近，给出2px间距防止视觉遮挡
      x = Math.round(x) + 2;
      y = Math.round(y);
      setAdjustedPosition({ x, y });
    });
    return () => window.cancelAnimationFrame(id);
  }, [visible, position]);

  const handleTypeSelect = (type: IFieldTypeModal) => {
    setSelectedType(type);
    
    // 检查是否需要配置虚拟字段
    if (type === 'formula' || type === 'rollup') {
      setIsConfiguring(true);
      setPendingVirtual({ type, options: fieldOptions });
    } else {
      setIsCreating(true);
    }
  };

  const handleBack = () => {
    setIsCreating(false);
    setIsConfiguring(false);
  };

  const handleVirtualFieldConfigConfirm = (options: IFormulaFieldConfigOptions | IRollupFieldConfigOptions) => {
    setFieldOptions(options);
    setIsConfiguring(false);
    setIsCreating(true);
  };

  const handleVirtualFieldConfigCancel = () => {
    setIsConfiguring(false);
    setIsCreating(false);
  };

  // 当进入配置模式且子组件已经挂载时再调用 show，确保可见
  useEffect(() => {
    if (!isConfiguring || !pendingVirtual) {return;}
    const timer = window.requestAnimationFrame(() => {
      virtualFieldConfigRef.current?.show(pendingVirtual.type, pendingVirtual.options);
    });
    return () => window.cancelAnimationFrame(timer);
  }, [isConfiguring, pendingVirtual]);

  const handleConfirm = () => {
    if (fieldName.trim()) {
      let options: any = fieldOptions;
      if (selectedType === 'number') {
        options = {
          formatting: { type: numberFormatType, precision: numberPrecision },
          defaultValue: numberDefaultValue !== '' ? Number(numberDefaultValue) : undefined,
          display: numberDisplay,
        };
      }
      onConfirm?.({ type: selectedType, name: fieldName.trim(), options });
      setVisible(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    onCancel?.();
  };

  const getSelectedTypeInfo = () => {
    const allTypes = [...BASE_FIELD_TYPES, ...ADVANCED_FIELD_TYPES, ...SYSTEM_FIELD_TYPES];
    return allTypes.find(t => t.type === selectedType) || BASE_FIELD_TYPES[0];
  };

  if (!visible) {return null;}

  // 如果正在配置虚拟字段，显示配置组件
  if (isConfiguring) {
    return (
      <VirtualFieldConfig
        ref={virtualFieldConfigRef}
        onConfirm={handleVirtualFieldConfigConfirm}
        onCancel={handleVirtualFieldConfigCancel}
      />
    );
  }

  const selectedTypeInfo = getSelectedTypeInfo();

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '0',
        minWidth: '400px',
        maxWidth: '500px',
        width: 'max-content',
        zIndex: 10000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 头部 */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {isCreating && (
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6b7280',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                ←
              </button>
            )}
            {mode === 'create' ? '添加字段' : '编辑字段'}
          </h3>
          {!isCreating && (
            <p style={{ 
              margin: '4px 0 0', 
              fontSize: '14px', 
              color: '#6b7280' 
            }}>
              选择字段类型
            </p>
          )}
        </div>
          </div>

      {/* 内容区域 */}
      <div style={{ padding: '16px 24px' }}>
        {!isCreating ? (
          // 字段类型选择
          <div>
            {/* 基础字段类型 */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ 
                margin: '0 0 12px', 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#374151' 
              }}>
                基础字段
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '8px' 
              }}>
                {BASE_FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => handleTypeSelect(fieldType.type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{fieldType.icon}</span>
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: '#111827',
                        marginBottom: '2px'
                      }}>
                        {fieldType.name}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280' 
                      }}>
                        {fieldType.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 高级字段类型 */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ 
                margin: '0 0 12px', 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#374151' 
              }}>
                高级字段
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '8px' 
              }}>
                {ADVANCED_FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => handleTypeSelect(fieldType.type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{fieldType.icon}</span>
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: '#111827',
                        marginBottom: '2px'
                      }}>
                        {fieldType.name}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280' 
                      }}>
                        {fieldType.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 系统字段类型 */}
            <div>
              <h4 style={{ 
                margin: '0 0 12px', 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#374151' 
              }}>
                系统字段
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '8px' 
              }}>
                {SYSTEM_FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => handleTypeSelect(fieldType.type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{fieldType.icon}</span>
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: '#111827',
                        marginBottom: '2px'
                      }}>
                        {fieldType.name}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280' 
                      }}>
                        {fieldType.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // 字段名称输入
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: 500,
                color: '#374151'
              }}>
                字段名称
              </label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="请输入字段名称"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              />
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '12px',
            }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#374151',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>{selectedTypeInfo.icon}</span>
                {selectedTypeInfo.name}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                {selectedTypeInfo.description}
              </div>
              {fieldOptions && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#e0f2fe',
                  borderRadius: '4px',
                  border: '1px solid #0ea5e9',
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: '#0c4a6e',
                    marginBottom: '2px'
                  }}>
                    配置信息
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#075985',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {fieldOptions.expression}
                  </div>
                </div>
              )}
            </div>

            {/* 数字字段配置 */}
            {selectedType === 'number' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    格式类型
                  </label>
                  <select
                    value={numberFormatType}
                    onChange={(e) => setNumberFormatType(e.target.value as any)}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="decimal">小数 (1.23)</option>
                    <option value="percent">百分比 (12%)</option>
                    <option value="currency">货币 (¥1.23)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    精度
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={numberPrecision}
                    onChange={(e) => setNumberPrecision(parseInt(e.target.value) || 0)}
                    style={{ width: '120px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    默认值
                  </label>
                  <input
                    type="number"
                    value={numberDefaultValue}
                    onChange={(e) => setNumberDefaultValue(e.target.value)}
                    placeholder="请输入默认值"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    显示样式
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { id: 'number', name: '数字' },
                      { id: 'ring', name: '环形' },
                      { id: 'bar', name: '条形' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setNumberDisplay(opt.id as any)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: numberDisplay === (opt.id as any) ? '2px solid #3b82f6' : '1px solid #d1d5db',
                          background: numberDisplay === (opt.id as any) ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
        {isCreating && (
          <button
            onClick={handleConfirm}
            disabled={!fieldName.trim()}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: fieldName.trim() ? '#3b82f6' : '#d1d5db',
              color: fieldName.trim() ? 'white' : '#9ca3af',
              fontSize: '14px',
              cursor: fieldName.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (fieldName.trim()) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (fieldName.trim()) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            确认
          </button>
        )}
      </div>
    </div>
  );
};

export const FieldTypeSelectModal = forwardRef(FieldTypeSelectModalBase);
