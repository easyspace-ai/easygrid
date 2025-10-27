import React, { useState } from 'react';
import { tokens, transitions, elevation } from '../../grid/design-system';
import { 
  X, 
  Check, 
  Text, 
  Hash, 
  Calendar, 
  CheckSquare, 
  Image, 
  Link,
  Mail,
  Phone,
  MapPin,
  FileText,
  Star,
  Clock,
  User
} from 'lucide-react';

export interface FieldType {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
}

export interface AddFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fieldName: string, fieldType: string) => void;
  // 编辑模式相关属性
  editMode?: boolean;
  editingField?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

const fieldTypes: FieldType[] = [
  {
    id: 'text',
    name: '文本',
    icon: Text,
    description: '单行文本',
    color: '#3b82f6'
  },
  {
    id: 'longText',
    name: '长文本',
    icon: FileText,
    description: '多行文本',
    color: '#10b981'
  },
  {
    id: 'number',
    name: '数字',
    icon: Hash,
    description: '数字和公式',
    color: '#f59e0b'
  },
  {
    id: 'singleSelect',
    name: '单选',
    icon: CheckSquare,
    description: '单选选项',
    color: '#8b5cf6'
  },
  {
    id: 'multipleSelect',
    name: '多选',
    icon: CheckSquare,
    description: '多选选项',
    color: '#ec4899'
  },
  {
    id: 'date',
    name: '日期',
    icon: Calendar,
    description: '日期和时间',
    color: '#06b6d4'
  },
  {
    id: 'checkbox',
    name: '复选框',
    icon: Check,
    description: '是/否',
    color: '#84cc16'
  },
  {
    id: 'attachment',
    name: '附件',
    icon: Image,
    description: '文件和图片',
    color: '#f97316'
  },
  {
    id: 'link',
    name: '链接',
    icon: Link,
    description: '网址链接',
    color: '#6366f1'
  },
  {
    id: 'email',
    name: '邮箱',
    icon: Mail,
    description: '邮箱地址',
    color: '#14b8a6'
  },
  {
    id: 'phone',
    name: '电话',
    icon: Phone,
    description: '电话号码',
    color: '#ef4444'
  },
  {
    id: 'location',
    name: '地址',
    icon: MapPin,
    description: '地理位置',
    color: '#22c55e'
  },
  {
    id: 'rating',
    name: '评分',
    icon: Star,
    description: '星级评分',
    color: '#eab308'
  },
  {
    id: 'progress',
    name: '进度',
    icon: Clock,
    description: '进度条',
    color: '#a855f7'
  },
  {
    id: 'user',
    name: '用户',
    icon: User,
    description: '用户选择',
    color: '#64748b'
  }
];

export function AddFieldDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  editMode = false,
  editingField = null 
}: AddFieldDialogProps) {
  const [fieldName, setFieldName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('text');

  // 编辑模式时初始化字段数据
  React.useEffect(() => {
    if (editMode && editingField) {
      setFieldName(editingField.name);
      setSelectedType(editingField.type);
    } else {
      // 新建模式时重置
      setFieldName('');
      setSelectedType('text');
    }
  }, [editMode, editingField, isOpen]);

  const handleConfirm = () => {
    if (fieldName.trim()) {
      onConfirm(fieldName.trim(), selectedType);
      setFieldName('');
      setSelectedType('text');
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

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
          zIndex: 60,
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
          width: '480px',
          maxHeight: '70vh',
          backgroundColor: tokens.colors.surface.base,
          border: `1px solid ${tokens.colors.border.subtle}`,
          borderRadius: '8px',
          boxShadow: elevation.lg,
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 对话框标题 */}
        <div
          style={{
            padding: '16px 20px 12px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: tokens.colors.text.primary,
            margin: 0 
          }}>
            {editMode ? '编辑字段' : '新增字段'}
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

        {/* 对话框内容 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* 字段名称输入 */}
          <div style={{ padding: '16px 20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: tokens.colors.text.primary,
              marginBottom: '8px',
            }}>
              字段名称
            </label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="请输入字段名称"
              autoFocus
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
              onFocus={(e) => {
                e.target.style.borderColor = tokens.colors.border.focus;
                e.target.style.boxShadow = `0 0 0 3px ${tokens.colors.border.focus}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = tokens.colors.border.subtle;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* 字段类型选择 */}
          <div style={{ padding: '0 20px 16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: tokens.colors.text.primary,
              marginBottom: '12px',
            }}>
              字段类型
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '6px',
            }}>
              {fieldTypes.map((type) => {
                const IconComponent = type.icon;
                const isSelected = selectedType === type.id;
                
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: isSelected ? tokens.colors.surface.selected : tokens.colors.surface.base,
                      border: `1px solid ${isSelected ? tokens.colors.border.focus : tokens.colors.border.subtle}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: transitions.presets.all,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                        e.currentTarget.style.borderColor = tokens.colors.border.strong;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = tokens.colors.surface.base;
                        e.currentTarget.style.borderColor = tokens.colors.border.subtle;
                      }
                    }}
                  >
                    <IconComponent 
                      size={20} 
                      style={{ color: isSelected ? tokens.colors.text.primary : type.color }} 
                    />
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: tokens.colors.text.primary,
                        marginBottom: '2px',
                      }}>
                        {type.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: tokens.colors.text.secondary,
                      }}>
                        {type.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 对话框底部按钮 */}
        <div
          style={{
            padding: '12px 20px 16px',
            borderTop: `1px solid ${tokens.colors.border.subtle}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
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
            onClick={handleConfirm}
            disabled={!fieldName.trim()}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: fieldName.trim() ? tokens.colors.text.inverse : tokens.colors.text.tertiary,
              backgroundColor: fieldName.trim() ? tokens.colors.primary[500] : tokens.colors.surface.disabled,
              border: 'none',
              borderRadius: '6px',
              cursor: fieldName.trim() ? 'pointer' : 'not-allowed',
              transition: transitions.presets.all,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              if (fieldName.trim()) {
                e.currentTarget.style.backgroundColor = tokens.colors.primary[600];
              }
            }}
            onMouseLeave={(e) => {
              if (fieldName.trim()) {
                e.currentTarget.style.backgroundColor = tokens.colors.primary[500];
              }
            }}
          >
            <Check size={16} />
            {editMode ? '保存修改' : '确认添加'}
          </button>
        </div>
      </div>
    </>
  );
}
