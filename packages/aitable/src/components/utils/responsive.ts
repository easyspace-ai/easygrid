/**
 * 响应式工具
 * 
 * 设计原则：
 * - 移动优先
 * - 断点基于实际使用场景
 * - 支持渐进增强
 */

export const breakpoints = {
  xs: 0,      // 手机竖屏
  sm: 640,    // 手机横屏 / 小平板
  md: 768,    // 平板
  lg: 1024,   // 小笔记本
  xl: 1280,   // 桌面
  '2xl': 1536, // 大屏
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * 获取当前设备类型
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  
  if (width < breakpoints.sm) return 'mobile';
  if (width < breakpoints.lg) return 'tablet';
  return 'desktop';
}

/**
 * 检查是否为触摸设备
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - 旧版浏览器支持
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * 生成响应式类名
 */
export function getResponsiveClassName(
  base: string,
  responsive?: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  }
): string {
  let className = base;
  
  if (responsive?.sm) className += ` sm:${responsive.sm}`;
  if (responsive?.md) className += ` md:${responsive.md}`;
  if (responsive?.lg) className += ` lg:${responsive.lg}`;
  if (responsive?.xl) className += ` xl:${responsive.xl}`;
  
  return className;
}

/**
 * 生成响应式内联样式
 */
export function getResponsiveStyles(config: {
  base: React.CSSProperties;
  sm?: React.CSSProperties;
  md?: React.CSSProperties;
  lg?: React.CSSProperties;
}): React.CSSProperties {
  const deviceType = getDeviceType();
  
  let styles = { ...config.base };
  
  if (deviceType === 'mobile' && config.sm) {
    styles = { ...styles, ...config.sm };
  } else if (deviceType === 'tablet' && config.md) {
    styles = { ...styles, ...config.md };
  } else if (deviceType === 'desktop' && config.lg) {
    styles = { ...styles, ...config.lg };
  }
  
  return styles;
}

/**
 * 媒体查询hook（简化版）
 */
export function createMediaQuery(breakpoint: Breakpoint): string {
  return `@media (min-width: ${breakpoints[breakpoint]}px)`;
}


