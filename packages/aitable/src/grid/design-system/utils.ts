/**
 * Design System 工具函数
 */

import { clsx, type ClassValue } from 'clsx';

/**
 * 合并 className（类似 shadcn/ui 的 cn 函数）
 * 
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500')
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Hex 转 RGBA
 */
export function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 根据背景色自动计算文本颜色（确保可读性）
 */
export function getContrastText(backgroundColor: string): string {
  // 简单的亮度计算
  const rgb = backgroundColor.match(/\d+/g);
  if (!rgb || rgb.length < 3) {return '#000000';}
  
  const [r, g, b] = rgb.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * 生成渐变背景
 */
export function gradientBackground(from: string, to: string, angle = 135): string {
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

/**
 * 响应式尺寸计算
 */
export function responsive(baseSize: number, scale = 1): string {
  return `clamp(${baseSize * 0.875}px, ${baseSize * scale}px, ${baseSize * 1.125}px)`;
}

