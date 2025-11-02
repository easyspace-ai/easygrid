/**
 * LuckDB Design System - Design Tokens
 * 极简主义设计语言
 * 
 * 灵感来源：Linear, Vercel, Arc Browser
 */

export const designTokens = {
  // ==================== 间距系统（8px 网格） ====================
  spacing: {
    xs: '0.25rem',    // 4px - 细微间距
    sm: '0.5rem',     // 8px - 小间距
    md: '1rem',       // 16px - 标准间距
    lg: '1.5rem',     // 24px - 大间距
    xl: '2rem',       // 32px - 超大间距
    '2xl': '3rem',    // 48px - 巨大间距
    '3xl': '4rem',    // 64px - 页面级间距
  },

  // ==================== 字体系统 ====================
  typography: {
    // 字体家族
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      mono: '"SF Mono", "Fira Code", "Consolas", monospace',
    },
    
    // 字号（基于 1.25 比例）
    fontSize: {
      xs: '0.75rem',      // 12px - 辅助文本
      sm: '0.875rem',     // 14px - 次要文本
      base: '1rem',       // 16px - 正文
      lg: '1.125rem',     // 18px - 小标题
      xl: '1.25rem',      // 20px - 中标题
      '2xl': '1.5rem',    // 24px - 大标题
      '3xl': '1.875rem',  // 30px - 超大标题
      '4xl': '2.25rem',   // 36px - 页面标题
    },
    
    // 字重
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    // 行高
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
    
    // 字间距
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
    },
  },

  // ==================== 色彩系统 ====================
  colors: {
    // 中性色（极简主义核心）
    gray: {
      50: 'hsl(0, 0%, 98%)',
      100: 'hsl(0, 0%, 96%)',
      200: 'hsl(0, 0%, 93%)',
      300: 'hsl(0, 0%, 88%)',
      400: 'hsl(0, 0%, 71%)',
      500: 'hsl(0, 0%, 52%)',
      600: 'hsl(0, 0%, 42%)',
      700: 'hsl(0, 0%, 32%)',
      800: 'hsl(0, 0%, 23%)',
      900: 'hsl(0, 0%, 13%)',
      950: 'hsl(0, 0%, 8%)',
    },
    
    // 主题色（战略性使用）
    primary: {
      light: 'hsl(221, 83%, 53%)',
      DEFAULT: 'hsl(221, 83%, 48%)',
      dark: 'hsl(221, 83%, 43%)',
    },
    
    // 状态色（微妙但清晰）
    status: {
      success: 'hsl(142, 76%, 36%)',
      warning: 'hsl(38, 92%, 50%)',
      error: 'hsl(0, 84%, 60%)',
      info: 'hsl(199, 89%, 48%)',
    },
  },

  // ==================== 阴影系统 ====================
  shadows: {
    // 微妙的阴影，符合极简美学
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    
    // 悬浮状态
    hover: '0 8px 16px -4px rgb(0 0 0 / 0.12), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
    
    // 焦点状态
    focus: '0 0 0 3px hsl(221, 83%, 48% / 0.1)',
  },

  // ==================== 圆角系统 ====================
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },

  // ==================== 动画系统 ====================
  animations: {
    // 缓动函数（符合自然物理规律）
    easing: {
      ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // 弹性效果
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',         // 锐利效果
    },
    
    // 动画时长
    duration: {
      instant: '50ms',
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },
  },

  // ==================== 尺寸系统 ====================
  sizes: {
    // 图标尺寸
    icon: {
      xs: '1rem',     // 16px
      sm: '1.25rem',  // 20px
      md: '1.5rem',   // 24px
      lg: '2rem',     // 32px
      xl: '2.5rem',   // 40px
    },
    
    // 按钮高度
    button: {
      sm: '2rem',     // 32px
      md: '2.5rem',   // 40px
      lg: '3rem',     // 48px
    },
    
    // 输入框高度
    input: {
      sm: '2rem',     // 32px
      md: '2.5rem',   // 40px
      lg: '3rem',     // 48px
    },
  },

  // ==================== 层级系统 ====================
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    overlay: 1030,
    modal: 1040,
    popover: 1050,
    toast: 1060,
    tooltip: 1070,
  },

  // ==================== 断点系统（响应式） ====================
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const

export type DesignTokens = typeof designTokens

