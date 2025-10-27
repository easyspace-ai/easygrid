import React, { useState, useMemo } from 'react';
import { tokens, transitions, elevation } from '../../grid/design-system';
import {
  X,
  Search,
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
  User,
  List,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  SelectFieldConfiguration,
  NumberFieldConfiguration,
  DateFieldConfiguration,
  RatingFieldConfiguration,
  type SelectFieldConfig,
  type NumberFieldConfig,
  type DateFieldConfig,
  type RatingFieldConfig,
} from './field-configurations';

/**
 * 字段类型分类
 */
export type FieldCategory =
  | 'basic' // 基础类型
  | 'select' // 选择类型
  | 'datetime' // 日期时间
  | 'link' // 链接类型
  | 'advanced' // 高级类型
  | 'collab'; // 协作类型

/**
 * 字段类型定义
 */
export interface FieldType {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  example?: string;
  category: FieldCategory;
  color: string;
  popular?: boolean; // 是否常用
  keywords?: string[]; // 搜索关键词
}

/**
 * 分类配置
 */
const categoryConfig: Record<
  FieldCategory,
  {
    name: string;
    icon: React.ComponentType<any>;
    color: string;
  }
> = {
  basic: {
    name: '基础类型',
    icon: FileText,
    color: '#3b82f6',
  },
  select: {
    name: '选择类型',
    icon: List,
    color: '#8b5cf6',
  },
  datetime: {
    name: '日期时间',
    icon: Calendar,
    color: '#06b6d4',
  },
  link: {
    name: '链接类型',
    icon: Link,
    color: '#10b981',
  },
  advanced: {
    name: '高级类型',
    icon: Sparkles,
    color: '#f59e0b',
  },
  collab: {
    name: '协作类型',
    icon: User,
    color: '#ec4899',
  },
};

/**
 * 字段类型列表（重新组织，更清晰的分类）
 */
const fieldTypes: FieldType[] = [
  // 基础类型
  {
    id: 'text',
    name: '单行文本',
    icon: Text,
    description: '简短的文本内容',
    example: '如：姓名、标题、标签',
    category: 'basic',
    color: '#3b82f6',
    popular: true,
    keywords: ['文本', 'text', '单行'],
  },
  {
    id: 'longText',
    name: '长文本',
    icon: FileText,
    description: '多行文本，支持换行',
    example: '如：描述、备注、说明',
    category: 'basic',
    color: '#10b981',
    popular: true,
    keywords: ['长文本', 'textarea', '多行'],
  },
  {
    id: 'number',
    name: '数字',
    icon: Hash,
    description: '数值和计算',
    example: '如：价格、数量、得分',
    category: 'basic',
    color: '#f59e0b',
    popular: true,
    keywords: ['数字', 'number', '数值'],
  },

  // 选择类型
  {
    id: 'singleSelect',
    name: '单选',
    icon: CheckSquare,
    description: '从多个选项中选择一个',
    example: '如：状态、优先级、类型',
    category: 'select',
    color: '#8b5cf6',
    popular: true,
    keywords: ['单选', 'select', '选项'],
  },
  {
    id: 'multipleSelect',
    name: '多选',
    icon: List,
    description: '可以选择多个选项',
    example: '如：标签、分类、技能',
    category: 'select',
    color: '#ec4899',
    popular: true,
    keywords: ['多选', 'multi', '标签'],
  },
  {
    id: 'checkbox',
    name: '复选框',
    icon: Check,
    description: '是/否 二选一',
    example: '如：已完成、是否启用',
    category: 'select',
    color: '#84cc16',
    keywords: ['复选框', 'checkbox', '是否'],
  },

  // 日期时间
  {
    id: 'date',
    name: '日期',
    icon: Calendar,
    description: '日期和时间',
    example: '如：创建时间、截止日期',
    category: 'datetime',
    color: '#06b6d4',
    popular: true,
    keywords: ['日期', 'date', '时间'],
  },
  {
    id: 'duration',
    name: '时长',
    icon: Clock,
    description: '时间段或持续时间',
    example: '如：工时、时长',
    category: 'datetime',
    color: '#0ea5e9',
    keywords: ['时长', 'duration', '持续'],
  },

  // 链接类型
  {
    id: 'link',
    name: '链接',
    icon: Link,
    description: '网址链接',
    example: '如：网站、文档链接',
    category: 'link',
    color: '#6366f1',
    keywords: ['链接', 'url', '网址'],
  },
  {
    id: 'email',
    name: '邮箱',
    icon: Mail,
    description: '电子邮件地址',
    example: '如：联系邮箱',
    category: 'link',
    color: '#14b8a6',
    keywords: ['邮箱', 'email', '邮件'],
  },
  {
    id: 'phone',
    name: '电话',
    icon: Phone,
    description: '电话号码',
    example: '如：手机号、座机',
    category: 'link',
    color: '#ef4444',
    keywords: ['电话', 'phone', '手机'],
  },
  {
    id: 'location',
    name: '地址',
    icon: MapPin,
    description: '地理位置',
    example: '如：公司地址、配送地址',
    category: 'link',
    color: '#22c55e',
    keywords: ['地址', 'location', '位置'],
  },

  // 高级类型
  {
    id: 'rating',
    name: '评分',
    icon: Star,
    description: '星级评分',
    example: '如：满意度、重要性',
    category: 'advanced',
    color: '#eab308',
    keywords: ['评分', 'rating', '星级'],
  },
  {
    id: 'progress',
    name: '进度',
    icon: Clock,
    description: '百分比进度条',
    example: '如：完成度、进展',
    category: 'advanced',
    color: '#a855f7',
    keywords: ['进度', 'progress', '百分比'],
  },

  // 协作类型
  {
    id: 'user',
    name: '成员',
    icon: User,
    description: '选择用户或成员',
    example: '如：负责人、参与者',
    category: 'collab',
    color: '#64748b',
    keywords: ['用户', 'user', '成员', '人员'],
  },
  {
    id: 'attachment',
    name: '附件',
    icon: Image,
    description: '上传文件和图片',
    example: '如：图片、文档、视频',
    category: 'collab',
    color: '#f97316',
    keywords: ['附件', 'attachment', '文件', '图片'],
  },
];

export interface AddFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fieldName: string, fieldType: string, config?: any) => void;
}

/**
 * 字段配置类型联合
 */
export type FieldTypeConfig =
  | SelectFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | RatingFieldConfig
  | Record<string, any>;

/**
 * Airtable 风格的字段添加对话框
 *
 * 特性：
 * - 两步式创建流程
 * - 智能分类和搜索
 * - 清晰的视觉层次
 * - 流畅的动画效果
 */
export function AddFieldDialog({ isOpen, onClose, onConfirm }: AddFieldDialogProps) {
  // Step 1: 选择类型 | Step 2: 配置详情
  const [step, setStep] = useState<'selectType' | 'configure'>('selectType');

  // 选中的字段类型
  const [selectedType, setSelectedType] = useState<FieldType | null>(null);

  // 字段名称
  const [fieldName, setFieldName] = useState('');

  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('');

  // 选中的分类（用于筛选）
  const [selectedCategory, setSelectedCategory] = useState<FieldCategory | 'all' | 'popular'>(
    'all'
  );

  // 字段配置
  const [fieldConfig, setFieldConfig] = useState<FieldTypeConfig>({});

  // 筛选后的字段类型
  const filteredFieldTypes = useMemo(() => {
    let result = fieldTypes;

    // 按分类筛选
    if (selectedCategory === 'popular') {
      result = result.filter((type) => type.popular);
    } else if (selectedCategory !== 'all') {
      result = result.filter((type) => type.category === selectedCategory);
    }

    // 按搜索词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (type) =>
          type.name.toLowerCase().includes(query) ||
          type.description.toLowerCase().includes(query) ||
          type.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  // 重置对话框状态
  const resetDialog = () => {
    setStep('selectType');
    setSelectedType(null);
    setFieldName('');
    setSearchQuery('');
    setSelectedCategory('all');
    setFieldConfig({});
  };

  // 选择字段类型
  const handleSelectType = (type: FieldType) => {
    setSelectedType(type);
    setFieldName(''); // 清空之前的名称

    // 初始化默认配置
    let defaultConfig: FieldTypeConfig = {};
    if (type.id === 'singleSelect' || type.id === 'multipleSelect') {
      defaultConfig = { options: [] };
    } else if (type.id === 'number') {
      defaultConfig = { format: 'number', precision: 0 };
    } else if (type.id === 'date') {
      defaultConfig = { includeTime: false, dateFormat: 'YYYY-MM-DD' };
    } else if (type.id === 'rating') {
      defaultConfig = { maxRating: 5, icon: 'star' };
    }
    setFieldConfig(defaultConfig);

    setStep('configure');
  };

  // 返回类型选择
  const handleBackToTypeSelection = () => {
    setStep('selectType');
    setSelectedType(null);
  };

  // 确认创建
  const handleConfirm = () => {
    if (selectedType && fieldName.trim()) {
      onConfirm(fieldName.trim(), selectedType.id, fieldConfig);
      resetDialog();
      onClose();
    }
  };

  // 关闭对话框
  const handleClose = () => {
    resetDialog();
    onClose();
  };

  // 键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (step === 'configure') {
        handleBackToTypeSelection();
      } else {
        handleClose();
      }
    } else if (e.key === 'Enter' && step === 'configure') {
      handleConfirm();
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
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 60,
          animation: 'fadeIn 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        }}
        onClick={handleClose}
      />

      {/* 对话框主体 */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: step === 'selectType' ? '720px' : '560px',
          maxHeight: '85vh',
          backgroundColor: tokens.colors.surface.base,
          borderRadius: '16px',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0, 0, 0, 0.3)',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          transition: 'width 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        }}
      >
        {step === 'selectType' ? (
          <TypeSelectionStep
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            filteredTypes={filteredFieldTypes}
            onSelectType={handleSelectType}
            onClose={handleClose}
          />
        ) : (
          <ConfigurationStep
            selectedType={selectedType!}
            fieldName={fieldName}
            onFieldNameChange={setFieldName}
            fieldConfig={fieldConfig}
            onFieldConfigChange={setFieldConfig}
            onBack={handleBackToTypeSelection}
            onConfirm={handleConfirm}
            onClose={handleClose}
            onKeyPress={handleKeyPress}
          />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes slideInStagger {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

/**
 * Step 1: 类型选择界面
 */
interface TypeSelectionStepProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: FieldCategory | 'all' | 'popular';
  onCategoryChange: (category: FieldCategory | 'all' | 'popular') => void;
  filteredTypes: FieldType[];
  onSelectType: (type: FieldType) => void;
  onClose: () => void;
}

function TypeSelectionStep({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  filteredTypes,
  onSelectType,
  onClose,
}: TypeSelectionStepProps) {
  // 按分类分组
  const groupedTypes = useMemo(() => {
    const groups: Record<string, FieldType[]> = {};

    if (selectedCategory === 'all' || selectedCategory === 'popular') {
      // 按分类分组
      filteredTypes.forEach((type) => {
        if (!groups[type.category]) {
          groups[type.category] = [];
        }
        groups[type.category].push(type);
      });
    } else {
      // 只显示选中的分类
      groups[selectedCategory] = filteredTypes;
    }

    return groups;
  }, [filteredTypes, selectedCategory]);

  const categories: Array<{
    id: FieldCategory | 'all' | 'popular';
    name: string;
    icon?: React.ComponentType<any>;
  }> = [
    { id: 'all', name: '全部类型' },
    { id: 'popular', name: '常用', icon: Star },
    ...Object.entries(categoryConfig).map(([id, config]) => ({
      id: id as FieldCategory,
      name: config.name,
      icon: config.icon,
    })),
  ];

  return (
    <>
      {/* 头部 */}
      <div
        style={{
          padding: '24px 24px 20px',
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: tokens.colors.text.primary,
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            选择字段类型
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
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
            <X size={20} style={{ color: tokens.colors.text.secondary }} />
          </button>
        </div>

        {/* 搜索框 */}
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: tokens.colors.text.tertiary,
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索字段类型..."
            autoFocus
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
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
              e.target.style.boxShadow = `0 0 0 3px ${tokens.colors.border.focus}15`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = tokens.colors.border.subtle;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* 分类标签 */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          backgroundColor: tokens.colors.surface.hover,
        }}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          const IconComponent = category.icon;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: isSelected ? 500 : 400,
                color: isSelected ? tokens.colors.text.primary : tokens.colors.text.secondary,
                backgroundColor: isSelected ? tokens.colors.surface.base : 'transparent',
                border: `1px solid ${isSelected ? tokens.colors.border.default : 'transparent'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: transitions.presets.all,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isSelected ? elevation.xs : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = tokens.colors.surface.base;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {IconComponent && <IconComponent size={14} />}
              {category.name}
            </button>
          );
        })}
      </div>

      {/* 字段类型列表 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {Object.keys(groupedTypes).length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: tokens.colors.text.secondary,
            }}
          >
            <Search
              size={48}
              style={{ color: tokens.colors.text.tertiary, marginBottom: '16px' }}
            />
            <div style={{ fontSize: '14px' }}>没有找到匹配的字段类型</div>
            <div style={{ fontSize: '13px', marginTop: '8px', color: tokens.colors.text.tertiary }}>
              试试其他关键词
            </div>
          </div>
        ) : (
          Object.entries(groupedTypes).map(([category, types], groupIndex) => (
            <div key={category} style={{ marginBottom: '16px' }}>
              {/* 分类标题 */}
              {(selectedCategory === 'all' || selectedCategory === 'popular') && (
                <div
                  style={{
                    padding: '8px 16px 8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: tokens.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {React.createElement(categoryConfig[category as FieldCategory].icon, {
                    size: 14,
                  })}
                  {categoryConfig[category as FieldCategory].name}
                </div>
              )}

              {/* 字段类型网格 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  padding: '0 8px',
                }}
              >
                {types.map((type, index) => {
                  const IconComponent = type.icon;

                  return (
                    <button
                      key={type.id}
                      onClick={() => onSelectType(type)}
                      style={{
                        padding: '16px',
                        backgroundColor: tokens.colors.surface.base,
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
                        display: 'flex',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden',
                        animation: `slideInStagger 300ms cubic-bezier(0.16, 1, 0.3, 1) ${groupIndex * 100 + index * 40}ms both`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                        e.currentTarget.style.borderColor = tokens.colors.border.strong;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = elevation.sm;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = tokens.colors.surface.base;
                        e.currentTarget.style.borderColor = tokens.colors.border.subtle;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* 图标 */}
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: `${type.color}10`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconComponent size={22} style={{ color: type.color }} />
                      </div>

                      {/* 文字信息 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: tokens.colors.text.primary,
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {type.name}
                          {type.popular && (
                            <Star
                              size={12}
                              style={{
                                color: tokens.colors.text.warning,
                                fill: tokens.colors.text.warning,
                              }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: tokens.colors.text.secondary,
                            lineHeight: '1.4',
                          }}
                        >
                          {type.description}
                        </div>
                      </div>

                      {/* 箭头图标 */}
                      <ChevronRight
                        size={18}
                        style={{
                          color: tokens.colors.text.tertiary,
                          flexShrink: 0,
                          opacity: 0,
                          transition: transitions.presets.all,
                        }}
                        className="arrow-icon"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        button:hover .arrow-icon {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}

/**
 * Step 2: 配置详情界面
 */
interface ConfigurationStepProps {
  selectedType: FieldType;
  fieldName: string;
  onFieldNameChange: (name: string) => void;
  fieldConfig: FieldTypeConfig;
  onFieldConfigChange: (config: FieldTypeConfig) => void;
  onBack: () => void;
  onConfirm: () => void;
  onClose: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

function ConfigurationStep({
  selectedType,
  fieldName,
  onFieldNameChange,
  fieldConfig,
  onFieldConfigChange,
  onBack,
  onConfirm,
  onClose,
  onKeyPress,
}: ConfigurationStepProps) {
  const IconComponent = selectedType.icon;

  // 渲染字段类型专属配置
  const renderFieldConfiguration = () => {
    switch (selectedType.id) {
      case 'singleSelect':
        return (
          <SelectFieldConfiguration
            config={fieldConfig as SelectFieldConfig}
            onChange={onFieldConfigChange}
            isMultiple={false}
          />
        );

      case 'multipleSelect':
        return (
          <SelectFieldConfiguration
            config={fieldConfig as SelectFieldConfig}
            onChange={onFieldConfigChange}
            isMultiple={true}
          />
        );

      case 'number':
        return (
          <NumberFieldConfiguration
            config={fieldConfig as NumberFieldConfig}
            onChange={onFieldConfigChange}
          />
        );

      case 'date':
        return (
          <DateFieldConfiguration
            config={fieldConfig as DateFieldConfig}
            onChange={onFieldConfigChange}
          />
        );

      case 'rating':
        return (
          <RatingFieldConfiguration
            config={fieldConfig as RatingFieldConfig}
            onChange={onFieldConfigChange}
          />
        );

      default:
        // 默认：无额外配置
        return (
          <div
            style={{
              padding: '16px',
              backgroundColor: tokens.colors.surface.hover,
              borderRadius: '8px',
              fontSize: '13px',
              color: tokens.colors.text.secondary,
              textAlign: 'center',
            }}
          >
            此字段类型暂无额外配置项
          </div>
        );
    }
  };

  return (
    <>
      {/* 头部 */}
      <div
        style={{
          padding: '24px 24px 20px',
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 返回按钮 */}
            <button
              onClick={onBack}
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
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
              <ChevronRight
                size={20}
                style={{
                  color: tokens.colors.text.secondary,
                  transform: 'rotate(180deg)',
                }}
              />
            </button>

            {/* 类型图标和名称 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: `${selectedType.color}10`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconComponent size={20} style={{ color: selectedType.color }} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: tokens.colors.text.primary,
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {selectedType.name}
                </h2>
                <div
                  style={{
                    fontSize: '12px',
                    color: tokens.colors.text.secondary,
                    marginTop: '2px',
                  }}
                >
                  {selectedType.description}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
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
            <X size={20} style={{ color: tokens.colors.text.secondary }} />
          </button>
        </div>
      </div>

      {/* 配置内容 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* 字段名称 */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: tokens.colors.text.primary,
              marginBottom: '8px',
            }}
          >
            字段名称 <span style={{ color: tokens.colors.text.error }}>*</span>
          </label>
          <input
            type="text"
            value={fieldName}
            onChange={(e) => onFieldNameChange(e.target.value)}
            onKeyDown={onKeyPress}
            placeholder={`如：${selectedType.example || '请输入字段名称'}`}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              color: tokens.colors.text.primary,
              backgroundColor: tokens.colors.surface.base,
              border: `2px solid ${tokens.colors.border.subtle}`,
              borderRadius: '8px',
              outline: 'none',
              transition: transitions.presets.all,
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = tokens.colors.border.focus;
              e.target.style.boxShadow = `0 0 0 3px ${tokens.colors.border.focus}15`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = tokens.colors.border.subtle;
              e.target.style.boxShadow = 'none';
            }}
          />
          {selectedType.example && (
            <div
              style={{
                fontSize: '12px',
                color: tokens.colors.text.tertiary,
                marginTop: '6px',
              }}
            >
              💡 示例：{selectedType.example}
            </div>
          )}
        </div>

        {/* 字段类型专属配置 */}
        {renderFieldConfiguration()}
      </div>

      {/* 底部按钮 */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${tokens.colors.border.subtle}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: tokens.colors.surface.hover,
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 500,
            color: tokens.colors.text.secondary,
            backgroundColor: 'transparent',
            border: `1px solid ${tokens.colors.border.subtle}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: transitions.presets.all,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = tokens.colors.surface.base;
            e.currentTarget.style.borderColor = tokens.colors.border.default;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = tokens.colors.border.subtle;
          }}
        >
          返回
        </button>

        {/* 临时测试按钮 */}
        <button
          onClick={() => {
            alert('测试按钮被点击了！');
            console.log('🔍 测试按钮被点击');
          }}
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'white',
            backgroundColor: 'red',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          测试按钮
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 创建字段按钮被点击', {
              fieldName,
              fieldNameTrimmed: fieldName.trim(),
              isDisabled: !fieldName.trim(),
              buttonElement: e.target,
              eventType: e.type,
            });
            alert('按钮被点击了！'); // 临时测试
            onConfirm();
          }}
          disabled={false} // 临时禁用禁用状态
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 500,
            color: fieldName.trim() ? tokens.colors.text.inverse : tokens.colors.text.tertiary,
            backgroundColor: fieldName.trim()
              ? tokens.colors.primary[600]
              : tokens.colors.surface.disabled,
            border: 'none',
            borderRadius: '8px',
            cursor: fieldName.trim() ? 'pointer' : 'not-allowed',
            transition: transitions.presets.all,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: fieldName.trim() ? elevation.xs : 'none',
          }}
          onMouseEnter={(e) => {
            if (fieldName.trim()) {
              e.currentTarget.style.backgroundColor = tokens.colors.primary[700];
              e.currentTarget.style.boxShadow = elevation.sm;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (fieldName.trim()) {
              e.currentTarget.style.backgroundColor = tokens.colors.primary[600];
              e.currentTarget.style.boxShadow = elevation.xs;
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <Check size={16} />
          创建字段
        </button>
      </div>
    </>
  );
}
