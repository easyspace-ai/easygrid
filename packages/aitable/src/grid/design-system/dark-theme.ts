/**
 * Dark Theme - 暗色模式配置
 * 
 * 设计原则：
 * 1. ✅ 保持足够的对比度（WCAG AA 标准）
 * 2. ✅ 减少眼睛疲劳（降低纯白色）
 * 3. ✅ 保持品牌一致性
 * 4. ✅ 优雅的过渡（不要纯黑）
 * 
 * 参考：
 * - Linear Dark Mode
 * - Notion Dark Mode
 * - Radix UI Dark Theme
 */

/**
 * 暗色模式颜色系统
 */
export const darkColorTokens = {
  // Primary - 主色调（略微提亮以增加对比）
  primary: {
    50: '#1e3a8a',
    100: '#1e40af',
    200: '#1d4ed8',
    300: '#2563eb',
    400: '#3b82f6',
    500: '#60a5fa', // 主色（比 light 模式更亮）
    600: '#93c5fd',
    700: '#bfdbfe',
    800: '#dbeafe',
    900: '#eff6ff',
  },

  // Surface - 表面颜色（使用深灰色代替纯黑）
  surface: {
    base: '#0a0a0a',          // 几乎黑，但不是纯黑
    hover: '#171717',         // neutral-900
    active: '#262626',        // neutral-800
    selected: '#1e293b',      // slate-800 with blue tint
    disabled: '#18181b',      // zinc-900
  },

  // Border - 边框颜色（暗色模式下要subtle）
  border: {
    subtle: '#27272a',        // zinc-800
    default: '#3f3f46',       // zinc-700
    strong: '#52525b',        // zinc-600
    focus: '#60a5fa',         // blue-400
    error: '#f87171',         // red-400
  },

  // Text - 文本颜色（暗色模式下不用纯白）
  text: {
    primary: '#f4f4f5',       // zinc-100
    secondary: '#a1a1aa',     // zinc-400
    tertiary: '#71717a',      // zinc-500
    inverse: '#18181b',       // zinc-900
    disabled: '#52525b',      // zinc-600
    link: '#93c5fd',          // blue-300
    error: '#fca5a5',         // red-300
    success: '#86efac',       // green-300
    warning: '#fcd34d',       // yellow-300
  },

  // Interactive - 交互元素
  interactive: {
    default: {
      bg: '#18181b',
      border: '#3f3f46',
      text: '#e4e4e7',
    },
    hover: {
      bg: '#27272a',
      border: '#52525b',
      text: '#f4f4f5',
    },
    active: {
      bg: '#3f3f46',
      border: '#71717a',
      text: '#fafafa',
    },
    disabled: {
      bg: '#18181b',
      border: '#27272a',
      text: '#52525b',
    },
  },

  // Semantic - 语义颜色（暗色模式下降低饱和度）
  semantic: {
    info: {
      bg: '#1e293b',
      border: '#334155',
      text: '#93c5fd',
    },
    success: {
      bg: '#14532d',
      border: '#166534',
      text: '#86efac',
    },
    warning: {
      bg: '#713f12',
      border: '#92400e',
      text: '#fcd34d',
    },
    error: {
      bg: '#7f1d1d',
      border: '#991b1b',
      text: '#fca5a5',
    },
  },

  // Cell - 单元格特定颜色
  cell: {
    background: '#0a0a0a',
    backgroundHover: '#171717',
    backgroundSelected: 'rgba(59, 130, 246, 0.15)',
    backgroundLoading: '#422006',
    border: '#27272a',
    borderActive: '#f4f4f5',
    text: '#e4e4e7',
    textHighlight: '#a78bfa', // violet-400
  },

  // Column - 列头颜色
  column: {
    background: '#171717',
    backgroundHover: '#262626',
    backgroundSelected: '#3f3f46',
    text: '#e4e4e7',
    resizeHandle: '#71717a',
  },
} as const;

/**
 * 完整的暗色主题配置
 */
export const darkTheme = {
  // ========== Common ==========
  staticWhite: '#FFFFFF',
  staticBlack: '#000000',
  
  // Icon
  iconFgCommon: darkColorTokens.text.secondary,
  iconBgCommon: 'transparent',
  iconFgHighlight: darkColorTokens.primary[500],
  iconBgHighlight: darkColorTokens.primary[100],
  iconFgSelected: darkColorTokens.primary[600],
  iconBgSelected: darkColorTokens.primary[200],
  iconSizeXS: 14,
  iconSizeSM: 16,
  iconSizeMD: 20,
  iconSizeLG: 24,
  
  // Font
  fontSizeXXS: 10,
  fontSizeXS: 12,
  fontSizeSM: 13,
  fontSizeMD: 14,
  fontSizeLG: 16,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 13,
  
  // Text
  textColor: darkColorTokens.text.primary,
  textColorSecondary: darkColorTokens.text.secondary,

  // ========== Cell ==========
  cellBg: darkColorTokens.cell.background,
  cellBgHovered: darkColorTokens.cell.backgroundHover,
  cellBgSelected: darkColorTokens.cell.backgroundSelected,
  cellBgLoading: darkColorTokens.cell.backgroundLoading,
  
  cellLineColor: darkColorTokens.cell.border,
  cellLineColorActived: darkColorTokens.cell.borderActive,
  
  cellTextColor: darkColorTokens.cell.text,
  cellTextColorHighlight: darkColorTokens.cell.textHighlight,
  
  cellOptionBg: darkColorTokens.surface.active,
  cellOptionBgHighlight: darkColorTokens.surface.hover,
  cellOptionTextColor: darkColorTokens.text.primary,

  // ========== Group Header ==========
  groupHeaderBgPrimary: darkColorTokens.surface.hover,
  groupHeaderBgSecondary: darkColorTokens.surface.active,
  groupHeaderBgTertiary: darkColorTokens.border.subtle,

  // ========== Column Header ==========
  columnHeaderBg: darkColorTokens.column.background,
  columnHeaderBgHovered: darkColorTokens.column.backgroundHover,
  columnHeaderBgSelected: darkColorTokens.column.backgroundSelected,
  columnHeaderNameColor: darkColorTokens.column.text,
  columnResizeHandlerBg: darkColorTokens.column.resizeHandle,
  columnDraggingPlaceholderBg: 'rgba(255, 255, 255, 0.1)',

  // ========== Column Statistic ==========
  columnStatisticBgHovered: darkColorTokens.surface.active,

  // ========== Row Header ==========
  rowHeaderTextColor: darkColorTokens.text.secondary,

  // ========== Append Row ==========
  appendRowBg: darkColorTokens.surface.hover,
  appendRowBgHovered: darkColorTokens.surface.active,

  // ========== Avatar ==========
  avatarBg: darkColorTokens.surface.active,
  avatarTextColor: darkColorTokens.text.primary,
  avatarSizeXS: 16,
  avatarSizeSM: 20,
  avatarSizeMD: 24,

  // ========== ScrollBar ==========
  scrollBarBg: darkColorTokens.border.strong,

  // ========== Interaction ==========
  interactionLineColorCommon: darkColorTokens.border.default,
  interactionLineColorHighlight: darkColorTokens.primary[500],

  // ========== Search ==========
  searchCursorBg: '#fbbf24', // amber-400
  searchTargetIndexBg: '#713f12', // yellow-900 dark

  // ========== Comment ==========
  commentCountBg: '#f97316', // orange-500
  commentCountTextColor: '#ffffff',

  // ========== Theme Key ==========
  themeKey: 'dark',
} as const;

/**
 * 导出暗色颜色 tokens (already exported at line 19)
 */
// export { darkColorTokens };

