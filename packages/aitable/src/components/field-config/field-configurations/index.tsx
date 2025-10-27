/**
 * 字段类型专属配置面板
 * 
 * 每种字段类型都有自己的配置项
 */

import React, { useState } from 'react';
import { tokens, transitions } from '../../../grid/design-system';
import { Plus, X, GripVertical } from 'lucide-react';

/**
 * 单选/多选字段配置
 */
export interface SelectFieldConfig {
  options: Array<{
    id: string;
    label: string;
    color: string;
  }>;
  allowOther?: boolean;
}

export function SelectFieldConfiguration({
  config,
  onChange,
  isMultiple = false,
}: {
  config: SelectFieldConfig;
  onChange: (config: SelectFieldConfig) => void;
  isMultiple?: boolean;
}) {
  const [newOption, setNewOption] = useState('');

  const predefinedColors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#64748b',
  ];

  const addOption = () => {
    if (newOption.trim()) {
      const randomColor = predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
      onChange({
        ...config,
        options: [
          ...config.options,
          {
            id: `option-${Date.now()}`,
            label: newOption.trim(),
            color: randomColor,
          },
        ],
      });
      setNewOption('');
    }
  };

  const updateOption = (id: string, updates: Partial<{ label: string; color: string }>) => {
    onChange({
      ...config,
      options: config.options.map(opt =>
        opt.id === id ? { ...opt, ...updates } : opt
      ),
    });
  };

  const removeOption = (id: string) => {
    onChange({
      ...config,
      options: config.options.filter(opt => opt.id !== id),
    });
  };

  const reorderOption = (fromIndex: number, toIndex: number) => {
    const newOptions = [...config.options];
    const [removed] = newOptions.splice(fromIndex, 1);
    newOptions.splice(toIndex, 0, removed);
    onChange({ ...config, options: newOptions });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: tokens.colors.text.primary,
          marginBottom: '8px',
        }}>
          {isMultiple ? '选项列表（可多选）' : '选项列表（单选）'}
        </label>
        <p style={{
          fontSize: '12px',
          color: tokens.colors.text.secondary,
          marginBottom: '12px',
        }}>
          添加选项，用户可以从中选择。拖动可以调整顺序。
        </p>

        {/* 选项列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {config.options.map((option, index) => (
            <div
              key={option.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: tokens.colors.surface.base,
                border: `1px solid ${tokens.colors.border.subtle}`,
                borderRadius: '6px',
                transition: transitions.presets.all,
              }}
            >
              {/* 拖动手柄 */}
              <GripVertical 
                size={16} 
                style={{ 
                  color: tokens.colors.text.tertiary,
                  cursor: 'grab',
                }} 
              />

              {/* 颜色选择器 */}
              <input
                type="color"
                value={option.color}
                onChange={(e) => updateOption(option.id, { color: e.target.value })}
                style={{
                  width: '28px',
                  height: '28px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />

              {/* 选项标签输入 */}
              <input
                type="text"
                value={option.label}
                onChange={(e) => updateOption(option.id, { label: e.target.value })}
                placeholder="选项名称"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '13px',
                  color: tokens.colors.text.primary,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                }}
              />

              {/* 删除按钮 */}
              <button
                onClick={() => removeOption(option.id)}
                style={{
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: transitions.presets.all,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={14} style={{ color: tokens.colors.text.secondary }} />
              </button>
            </div>
          ))}
        </div>

        {/* 添加新选项 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOption();
              }
            }}
            placeholder="输入新选项名称..."
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              color: tokens.colors.text.primary,
              backgroundColor: tokens.colors.surface.base,
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: '6px',
              outline: 'none',
              transition: transitions.presets.all,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = tokens.colors.border.focus;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = tokens.colors.border.subtle;
            }}
          />
          <button
            onClick={addOption}
            disabled={!newOption.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: newOption.trim() ? tokens.colors.text.inverse : tokens.colors.text.tertiary,
              backgroundColor: newOption.trim() ? tokens.colors.primary[500] : tokens.colors.surface.disabled,
              border: 'none',
              borderRadius: '6px',
              cursor: newOption.trim() ? 'pointer' : 'not-allowed',
              transition: transitions.presets.all,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} />
            添加
          </button>
        </div>
      </div>

      {/* 其他选项 */}
      {isMultiple && (
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: tokens.colors.text.primary,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={config.allowOther || false}
              onChange={(e) => onChange({ ...config, allowOther: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            允许用户添加自定义选项
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * 数字字段配置
 */
export interface NumberFieldConfig {
  format?: 'number' | 'currency' | 'percent';
  precision?: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
}

export function NumberFieldConfiguration({
  config,
  onChange,
}: {
  config: NumberFieldConfig;
  onChange: (config: NumberFieldConfig) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 数字格式 */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: tokens.colors.text.primary,
          marginBottom: '8px',
        }}>
          数字格式
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: 'number', label: '数字' },
            { value: 'currency', label: '货币' },
            { value: 'percent', label: '百分比' },
          ].map((format) => (
            <button
              key={format.value}
              onClick={() => onChange({ ...config, format: format.value as any })}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: config.format === format.value ? tokens.colors.text.primary : tokens.colors.text.secondary,
                backgroundColor: config.format === format.value ? tokens.colors.surface.selected : tokens.colors.surface.base,
                border: `1px solid ${config.format === format.value ? tokens.colors.border.focus : tokens.colors.border.subtle}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: transitions.presets.all,
              }}
            >
              {format.label}
            </button>
          ))}
        </div>
      </div>

      {/* 小数位数 */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: tokens.colors.text.primary,
          marginBottom: '8px',
        }}>
          小数位数
        </label>
        <input
          type="number"
          value={config.precision ?? 0}
          onChange={(e) => onChange({ ...config, precision: parseInt(e.target.value) || 0 })}
          min={0}
          max={10}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            color: tokens.colors.text.primary,
            backgroundColor: tokens.colors.surface.base,
            border: `1px solid ${tokens.colors.border.subtle}`,
            borderRadius: '6px',
            outline: 'none',
          }}
        />
      </div>

      {/* 范围限制 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: tokens.colors.text.primary,
            marginBottom: '8px',
          }}>
            最小值（可选）
          </label>
          <input
            type="number"
            value={config.min ?? ''}
            onChange={(e) => onChange({ ...config, min: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="无限制"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              color: tokens.colors.text.primary,
              backgroundColor: tokens.colors.surface.base,
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: '6px',
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: tokens.colors.text.primary,
            marginBottom: '8px',
          }}>
            最大值（可选）
          </label>
          <input
            type="number"
            value={config.max ?? ''}
            onChange={(e) => onChange({ ...config, max: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="无限制"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              color: tokens.colors.text.primary,
              backgroundColor: tokens.colors.surface.base,
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: '6px',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 日期字段配置
 */
export interface DateFieldConfig {
  includeTime?: boolean;
  dateFormat?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  timeFormat?: '24h' | '12h';
}

export function DateFieldConfiguration({
  config,
  onChange,
}: {
  config: DateFieldConfig;
  onChange: (config: DateFieldConfig) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 包含时间 */}
      <div>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: tokens.colors.text.primary,
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={config.includeTime || false}
            onChange={(e) => onChange({ ...config, includeTime: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          包含时间
        </label>
      </div>

      {/* 日期格式 */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: tokens.colors.text.primary,
          marginBottom: '8px',
        }}>
          日期格式
        </label>
        <select
          value={config.dateFormat || 'YYYY-MM-DD'}
          onChange={(e) => onChange({ ...config, dateFormat: e.target.value as any })}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            color: tokens.colors.text.primary,
            backgroundColor: tokens.colors.surface.base,
            border: `1px solid ${tokens.colors.border.subtle}`,
            borderRadius: '6px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="YYYY-MM-DD">2024-10-16</option>
          <option value="MM/DD/YYYY">10/16/2024</option>
          <option value="DD/MM/YYYY">16/10/2024</option>
        </select>
      </div>

      {/* 时间格式 */}
      {config.includeTime && (
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: tokens.colors.text.primary,
            marginBottom: '8px',
          }}>
            时间格式
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { value: '24h', label: '24小时制' },
              { value: '12h', label: '12小时制' },
            ].map((format) => (
              <button
                key={format.value}
                onClick={() => onChange({ ...config, timeFormat: format.value as any })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: config.timeFormat === format.value ? tokens.colors.text.primary : tokens.colors.text.secondary,
                  backgroundColor: config.timeFormat === format.value ? tokens.colors.surface.selected : tokens.colors.surface.base,
                  border: `1px solid ${config.timeFormat === format.value ? tokens.colors.border.focus : tokens.colors.border.subtle}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: transitions.presets.all,
                }}
              >
                {format.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 评分字段配置
 */
export interface RatingFieldConfig {
  maxRating?: number;
  icon?: 'star' | 'heart' | 'thumbsup';
  color?: string;
}

export function RatingFieldConfiguration({
  config,
  onChange,
}: {
  config: RatingFieldConfig;
  onChange: (config: RatingFieldConfig) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 最大评分 */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: tokens.colors.text.primary,
          marginBottom: '8px',
        }}>
          最大评分
        </label>
        <input
          type="number"
          value={config.maxRating ?? 5}
          onChange={(e) => onChange({ ...config, maxRating: parseInt(e.target.value) || 5 })}
          min={1}
          max={10}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            color: tokens.colors.text.primary,
            backgroundColor: tokens.colors.surface.base,
            border: `1px solid ${tokens.colors.border.subtle}`,
            borderRadius: '6px',
            outline: 'none',
          }}
        />
      </div>

      {/* 图标选择 */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: tokens.colors.text.primary,
          marginBottom: '8px',
        }}>
          评分图标
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: 'star', label: '⭐ 星星' },
            { value: 'heart', label: '❤️ 爱心' },
            { value: 'thumbsup', label: '👍 点赞' },
          ].map((icon) => (
            <button
              key={icon.value}
              onClick={() => onChange({ ...config, icon: icon.value as any })}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: config.icon === icon.value ? tokens.colors.text.primary : tokens.colors.text.secondary,
                backgroundColor: config.icon === icon.value ? tokens.colors.surface.selected : tokens.colors.surface.base,
                border: `1px solid ${config.icon === icon.value ? tokens.colors.border.focus : tokens.colors.border.subtle}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: transitions.presets.all,
              }}
            >
              {icon.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

