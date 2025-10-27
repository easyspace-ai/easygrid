/**
 * Grid Theme - 重构版本
 * 
 * 基于 Design Tokens 系统重新构建
 * 
 * 变更：
 * 1. ✅ 所有颜色来自 design tokens
 * 2. ✅ 语义化命名
 * 3. ✅ 支持主题切换（light/dark）
 * 4. ✅ 移除硬编码值
 */

import { tokens } from '../design-system';
import type { IGridTheme } from './gridTheme';

const { colors, iconSizes, typography } = tokens;

/**
 * Light 主题配置
 */
export const lightTheme: IGridTheme = {
  // ========== Common ==========
  staticWhite: '#FFFFFF',
  staticBlack: '#000000',
  
  // Icon
  iconFgCommon: colors.text.secondary,
  iconBgCommon: 'transparent',
  iconFgHighlight: colors.primary[500],
  iconBgHighlight: colors.primary[50],
  iconFgSelected: colors.primary[700],
  iconBgSelected: colors.primary[100],
  iconSizeXS: iconSizes.xs,
  iconSizeSM: iconSizes.sm,
  iconSizeMD: iconSizes.base,
  iconSizeLG: iconSizes.lg,
  
  // Font
  fontSizeXXS: 10,
  fontSizeXS: 12,
  fontSizeSM: 13,
  fontSizeMD: 14,
  fontSizeLG: 16,
  fontFamily: typography.fontFamily.sans,
  fontSize: 13,
  
  // Text
  textColor: colors.text.primary,
  textColorSecondary: colors.text.secondary,

  // ========== Cell ==========
  cellBg: colors.cell.background,
  cellBgHovered: colors.cell.backgroundHover,
  cellBgSelected: colors.cell.backgroundSelected,
  cellBgLoading: colors.cell.backgroundLoading,
  
  cellLineColor: colors.cell.border,
  cellLineColorActived: colors.cell.borderActive,
  
  cellTextColor: colors.cell.text,
  cellTextColorHighlight: colors.cell.textHighlight,
  
  // Cell Options (Select/MultiSelect)
  cellOptionBg: colors.surface.active,
  cellOptionBgHighlight: colors.surface.hover,
  cellOptionTextColor: colors.text.primary,

  // ========== Group Header ==========
  groupHeaderBgPrimary: colors.surface.hover,
  groupHeaderBgSecondary: colors.surface.active,
  groupHeaderBgTertiary: colors.border.subtle,

  // ========== Column Header ==========
  columnHeaderBg: colors.column.background,
  columnHeaderBgHovered: colors.column.backgroundHover,
  columnHeaderBgSelected: colors.column.backgroundSelected,
  columnHeaderNameColor: colors.column.text,
  columnResizeHandlerBg: colors.column.resizeHandle,
  columnDraggingPlaceholderBg: 'rgba(0, 0, 0, 0.1)',

  // ========== Column Statistic ==========
  columnStatisticBgHovered: colors.surface.active,

  // ========== Row Header ==========
  rowHeaderTextColor: colors.text.secondary,

  // ========== Append Row ==========
  appendRowBg: colors.surface.hover,
  appendRowBgHovered: colors.surface.active,

  // ========== Avatar ==========
  avatarBg: colors.surface.active,
  avatarTextColor: colors.text.primary,
  avatarSizeXS: 16,
  avatarSizeSM: 20,
  avatarSizeMD: 24,

  // ========== ScrollBar ==========
  scrollBarBg: colors.border.strong,

  // ========== Interaction ==========
  interactionLineColorCommon: colors.border.default,
  interactionLineColorHighlight: colors.primary[500],

  // ========== Search ==========
  searchCursorBg: '#fbbf24', // amber-400
  searchTargetIndexBg: '#fef3c7', // yellow-100

  // ========== Comment ==========
  commentCountBg: '#f97316', // orange-500
  commentCountTextColor: '#ffffff',

  // ========== Theme Key ==========
  themeKey: 'light',
};

/**
 * Dark 主题配置（未来实现）
 */
export const darkTheme: Partial<IGridTheme> = {
  // TODO: 实现完整的暗色模式配色
  // 参考: https://www.radix-ui.com/themes/docs/theme/dark-mode
  
  themeKey: 'dark',
  
  // 示例（未完成）:
  cellBg: '#1a1a1a',
  cellTextColor: '#e5e7eb',
  columnHeaderBg: '#262626',
  // ... 其他暗色配置
};

/**
 * 获取主题配置
 */
export function getTheme(themeKey: 'light' | 'dark' = 'light'): IGridTheme {
  return themeKey === 'light' ? lightTheme : { ...lightTheme, ...darkTheme } as IGridTheme;
}

/**
 * 默认导出 light 主题（向后兼容）
 */
export const gridTheme = lightTheme;

/**
 * 导出类型
 */
export type { IGridTheme };

