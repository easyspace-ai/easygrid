/**
 * Design Tokens - 设计系统的基础
 * 
 * 灵感来源: Linear, Notion, Radix UI
 * 
 * 这是整个 Grid 组件的设计语言核心
 * 所有组件都应该使用这些 tokens，而不是硬编码值
 */

import colors from 'tailwindcss/colors';

/**
 * 颜色系统 - 语义化命名
 */
export const colorTokens = {
  // Primary - 主色调（用于强调、选中状态）
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // 主色
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Surface - 表面颜色（背景、卡片）
  surface: {
    base: '#ffffff',
    hover: '#f8fafc',
    active: '#f1f5f9',
    selected: '#e0f2fe',
    disabled: '#f9fafb',
    destructive: '#fef2f2', // 危险操作的背景色
    accent: '#eff6ff', // 强调背景色
  },

  // Border - 边框颜色
  border: {
    subtle: '#e5e7eb',
    default: '#d1d5db',
    strong: '#9ca3af',
    focus: '#3b82f6',
    error: '#ef4444',
    accent: '#93c5fd', // 强调边框色
  },

  // Text - 文本颜色
  text: {
    primary: '#0f172a',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
    disabled: '#cbd5e1',
    link: '#2563eb',
    error: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
    accent: '#2563eb', // 强调文本色
    destructive: '#dc2626', // 危险操作的文本色
  },

  // Interactive - 交互元素
  interactive: {
    default: {
      bg: '#ffffff',
      border: '#d1d5db',
      text: '#374151',
    },
    hover: {
      bg: '#f9fafb',
      border: '#9ca3af',
      text: '#111827',
    },
    active: {
      bg: '#f3f4f6',
      border: '#6b7280',
      text: '#030712',
    },
    disabled: {
      bg: '#f9fafb',
      border: '#e5e7eb',
      text: '#d1d5db',
    },
    bg: '#ffffff', // 添加 bg 属性用于兼容性
  },

  // Semantic - 语义颜色
  semantic: {
    info: {
      bg: '#dbeafe',
      border: '#93c5fd',
      text: '#1e40af',
    },
    success: {
      bg: '#dcfce7',
      border: '#86efac',
      text: '#166534',
    },
    warning: {
      bg: '#fef3c7',
      border: '#fcd34d',
      text: '#92400e',
    },
    error: {
      bg: '#fee2e2',
      border: '#fca5a5',
      text: '#991b1b',
    },
  },

  // Cell - 单元格特定颜色
  cell: {
    background: '#ffffff',
    backgroundHover: '#f8fafc',
    backgroundSelected: 'rgba(226, 232, 240, 0.5)',
    backgroundLoading: '#fef3c7',
    border: '#e2e8f0',
    borderActive: '#0f172a',
    text: '#334155',
    textHighlight: '#7c3aed',
  },

  // Column - 列头颜色
  column: {
    background: '#f8fafc',
    backgroundHover: '#f1f5f9',
    backgroundSelected: '#e2e8f0',
    text: '#334155',
    resizeHandle: '#94a3b8',
  },
} as const;

/**
 * 间距系统 - 基于 4px 网格
 */
export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem',  // 8px
  3: '0.75rem', // 12px
  4: '1rem',    // 16px
  5: '1.25rem', // 20px
  6: '1.5rem',  // 24px
  8: '2rem',    // 32px
  10: '2.5rem', // 40px
  12: '3rem',   // 48px
  16: '4rem',   // 64px
  20: '5rem',   // 80px
} as const;

/**
 * 圆角系统
 */
export const radius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  full: '9999px',
} as const;

/**
 * 阴影系统 - 层次感
 */
export const elevation = {
  // 扁平（无阴影）
  flat: 'none',
  
  // 微小阴影（hover 状态）
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  
  // 小阴影（下拉菜单）
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  
  // 中等阴影（卡片、弹窗）
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  
  // 大阴影（模态框）
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  
  // 超大阴影（主要模态框）
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  
  // Focus ring（焦点状态）
  focus: '0 0 0 3px rgba(59, 130, 246, 0.1)',
} as const;

/**
 * 字体系统
 */
export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Fira Code", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
    base: ['0.875rem', { lineHeight: '1.5rem' }], // 14px
    lg: ['1rem', { lineHeight: '1.75rem' }],      // 16px
    xl: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    '2xl': ['1.25rem', { lineHeight: '1.75rem' }], // 20px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.01em',
  },
} as const;

/**
 * 过渡动画系统 - 60fps 流畅度
 */
export const transitions = {
  // 时长
  duration: {
    instant: '0ms',
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  // 缓动函数
  easing: {
    // 标准缓动（大多数情况）
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    
    // 加速（元素离开）
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    
    // 减速（元素进入）
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    
    // 弹性（特殊场景）
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  // 预设 transition
  presets: {
    // 快速淡入淡出（hover）
    fade: 'opacity 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    
    // 颜色变化
    colors: 'background-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1), color 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    
    // 所有属性
    all: 'all 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    
    // 变换（transform）
    transform: 'transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;

/**
 * 图标尺寸系统
 */
export const iconSizes = {
  xs: 14,
  sm: 16,
  base: 20,
  lg: 24,
  xl: 32,
} as const;

/**
 * z-index 层级系统
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;

/**
 * 组合 token - 常用的组件样式
 */
export const componentTokens = {
  // 按钮
  button: {
    height: {
      sm: '28px',
      md: '32px',
      lg: '36px',
    },
    padding: {
      sm: '0 12px',
      md: '0 16px',
      lg: '0 20px',
    },
  },
  
  // 输入框
  input: {
    height: {
      sm: '28px',
      md: '32px',
      lg: '36px',
    },
    padding: {
      sm: '0 8px',
      md: '0 12px',
      lg: '0 16px',
    },
    borderWidth: '1px',
    borderRadius: radius.md,
  },
  
  // 单元格
  cell: {
    minHeight: '36px',
    padding: '0 8px',
    borderWidth: '1px',
  },
  
  // 列头
  columnHeader: {
    height: '40px',
    padding: '0 12px',
  },
} as const;

/**
 * 导出完整的 Design Tokens
 */
export const tokens = {
  colors: colorTokens,
  spacing,
  radius,
  elevation,
  typography,
  transitions,
  iconSizes,
  zIndex,
  components: componentTokens,
} as const;

export type DesignTokens = typeof tokens;

/**
 * 辅助函数：生成 CSS 变量
 */
export function generateCSSVariables(theme: 'light' | 'dark' = 'light') {
  const colors = theme === 'light' ? colorTokens : getDarkColorTokens();
  
  return {
    // Colors
    '--color-primary': colors.primary[500],
    '--color-surface-base': colors.surface.base,
    '--color-surface-hover': colors.surface.hover,
    '--color-border-default': colors.border.default,
    '--color-text-primary': colors.text.primary,
    '--color-text-secondary': colors.text.secondary,
    
    // Spacing
    '--spacing-1': spacing[1],
    '--spacing-2': spacing[2],
    '--spacing-4': spacing[4],
    
    // Radius
    '--radius-md': radius.md,
    '--radius-lg': radius.lg,
    
    // Shadows
    '--elevation-sm': elevation.sm,
    '--elevation-md': elevation.md,
    
    // Transitions
    '--transition-fast': transitions.duration.fast,
    '--transition-base': transitions.duration.base,
  };
}

/**
 * 暗色模式颜色（未来实现）
 */
function getDarkColorTokens() {
  // TODO: 实现暗色模式配色
  return colorTokens;
}

