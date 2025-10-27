/**
 * 动画系统
 * 
 * 精心设计的微动画，提升用户体验
 * 
 * 参考：
 * - Framer Motion
 * - Radix UI
 * - Linear
 */

/**
 * 淡入淡出动画
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: [0.4, 0.0, 0.2, 1] },
};

/**
 * 缩放淡入（弹窗、下拉菜单）
 */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] },
};

/**
 * 从上滑入
 */
export const slideInFromTop = {
  initial: { y: -8, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -8, opacity: 0 },
  transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] },
};

/**
 * 从下滑入
 */
export const slideInFromBottom = {
  initial: { y: 8, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 8, opacity: 0 },
  transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] },
};

/**
 * 从左滑入
 */
export const slideInFromLeft = {
  initial: { x: -8, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -8, opacity: 0 },
  transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] },
};

/**
 * 从右滑入
 */
export const slideInFromRight = {
  initial: { x: 8, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 8, opacity: 0 },
  transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] },
};

/**
 * 弹性动画（特殊场景）
 */
export const spring = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 25,
  },
};

/**
 * Tailwind 动画类（无需 JS）
 */
export const tailwindAnimations = {
  // 淡入
  fadeIn: 'animate-in fade-in-0 duration-150',
  
  // 缩放淡入
  scaleIn: 'animate-in fade-in-0 zoom-in-95 duration-200',
  
  // 从上滑入
  slideInFromTop: 'animate-in fade-in-0 slide-in-from-top-2 duration-200',
  
  // 从下滑入
  slideInFromBottom: 'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
  
  // 从左滑入
  slideInFromLeft: 'animate-in fade-in-0 slide-in-from-left-2 duration-200',
  
  // 从右滑入
  slideInFromRight: 'animate-in fade-in-0 slide-in-from-right-2 duration-200',
  
  // 脉冲（loading）
  pulse: 'animate-pulse',
  
  // 旋转（loading spinner）
  spin: 'animate-spin',
  
  // Ping（通知提示）
  ping: 'animate-ping',
  
  // Bounce（强调）
  bounce: 'animate-bounce',
};

/**
 * CSS Keyframes（自定义动画）
 */
export const customKeyframes = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes slide-up-fade {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slide-down-fade {
    0% {
      opacity: 0;
      transform: translateY(-8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes scale-in {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

/**
 * Hover 过渡效果
 */
export const hoverTransitions = {
  // 标准 hover（按钮、卡片）
  standard: 'transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]',
  
  // 颜色变化（背景、文字）
  colors: 'transition-colors duration-150 ease-out',
  
  // 阴影变化
  shadow: 'transition-shadow duration-200 ease-out',
  
  // Transform（位置、缩放、旋转）
  transform: 'transition-transform duration-200 ease-out',
  
  // Opacity
  opacity: 'transition-opacity duration-150 ease-out',
};

/**
 * Focus 状态样式
 */
export const focusStyles = {
  // 标准 focus ring
  standard: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  
  // 无 offset（紧凑布局）
  compact: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  
  // 粗 ring（强调）
  bold: 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  
  // 内部 ring（特殊场景）
  inset: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
};

/**
 * Loading 状态样式
 */
export const loadingStyles = {
  // Spinner
  spinner: 'inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent',
  
  // Dots
  dots: 'inline-flex gap-1',
  
  // Skeleton
  skeleton: 'animate-pulse bg-gray-200 rounded',
  
  // Shimmer
  shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
};

/**
 * 导出所有动画
 */
export const animations = {
  // Motion variants
  fadeIn,
  scaleIn,
  slideInFromTop,
  slideInFromBottom,
  slideInFromLeft,
  slideInFromRight,
  spring,
  
  // Tailwind classes
  tailwind: tailwindAnimations,
  
  // Hover transitions
  hover: hoverTransitions,
  
  // Focus styles
  focus: focusStyles,
  
  // Loading states
  loading: loadingStyles,
  
  // Custom keyframes
  keyframes: customKeyframes,
};

