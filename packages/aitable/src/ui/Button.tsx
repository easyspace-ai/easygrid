/**
 * Button 组件 - 统一的按钮设计系统
 * 
 * 设计原则：
 * 1. 清晰的视觉层级（primary > secondary > ghost）
 * 2. 60fps 流畅动画
 * 3. 完整的可访问性支持
 * 4. 响应式和触摸友好
 */

import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn, tokens, transitions } from '../grid/design-system';
import type { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮变体 - 定义视觉层级
   * - primary: 主要操作（蓝色，最高优先级）
   * - secondary: 次要操作（灰色边框）
   * - ghost: 辅助操作（透明背景）
   * - danger: 危险操作（红色）
   */
  variant?: ButtonVariant;
  
  /**
   * 按钮尺寸
   */
  size?: ButtonSize;
  
  /**
   * 图标 - 支持：
   * - React 组件类型（例如 Lucide 图标：Plus、Settings）
   * - 已创建的 React 元素（<Plus />）
   */
  icon?: React.ElementType | React.ReactNode;
  
  /**
   * 图标位置
   */
  iconPosition?: 'left' | 'right';
  
  /**
   * 加载状态
   */
  loading?: boolean;
  
  /**
   * 全宽按钮
   */
  fullWidth?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 子元素
   */
  children?: React.ReactNode;
}

/**
 * 按钮变体样式配置
 */
const variantStyles: Record<ButtonVariant, {
  base: string;
  hover: string;
  active: string;
  disabled: string;
}> = {
  primary: {
    base: 'bg-blue-600 text-white border-blue-600',
    hover: 'hover:bg-blue-700 hover:border-blue-700 hover:shadow-md',
    active: 'active:bg-blue-800 active:scale-[0.98]',
    disabled: 'disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed',
  },
  secondary: {
    base: 'bg-white text-gray-700 border-gray-300',
    hover: 'hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900',
    active: 'active:bg-gray-100 active:scale-[0.98]',
    disabled: 'disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed',
  },
  ghost: {
    base: 'bg-transparent text-gray-700 border-transparent',
    hover: 'hover:bg-gray-100 hover:text-gray-900',
    active: 'active:bg-gray-200 active:scale-[0.98]',
    disabled: 'disabled:text-gray-400 disabled:cursor-not-allowed',
  },
  danger: {
    base: 'bg-red-600 text-white border-red-600',
    hover: 'hover:bg-red-700 hover:border-red-700 hover:shadow-md',
    active: 'active:bg-red-800 active:scale-[0.98]',
    disabled: 'disabled:bg-gray-300 disabled:border-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed',
  },
};

/**
 * 按钮尺寸样式配置
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-10 px-4 text-base gap-2.5',
};

/**
 * Loading Spinner 组件
 */
const Spinner = ({ size = 14 }: { size?: number }) => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Button 组件
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      disabled = false,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    // 图标尺寸映射
    const iconSizeMap: Record<ButtonSize, number> = {
      sm: 14,
      md: 16,
      lg: 18,
    };

    const iconSize = iconSizeMap[size];

    // 渲染图标
    const renderIcon = () => {
      if (loading) {
        return <Spinner size={iconSize} />;
      }

      if (!icon) return null;

      // 如果传入的是已创建的元素，直接渲染
      if (React.isValidElement(icon)) {
        return icon;
      }

      // 如果传入的是组件类型（函数组件、forwardRef、memo 等）
      const isComponentType =
        typeof icon === 'function' ||
        (typeof icon === 'object' && icon !== null && ('$$typeof' in (icon as any) || 'render' in (icon as any)));

      if (isComponentType) {
        const IconComponent = icon as React.ElementType;
        return <IconComponent size={iconSize} />;
      }

      // 其他情况按节点渲染（字符串等）
      return icon as React.ReactNode;
    };

    const iconElement = renderIcon();

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          // 基础样式
          'inline-flex items-center justify-center',
          'font-medium rounded-md border',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          
          // 变体样式
          variantStyle.base,
          variantStyle.hover,
          variantStyle.active,
          variantStyle.disabled,
          
          // 尺寸样式
          sizeStyle,
          
          // 全宽
          fullWidth && 'w-full',
          
          // 只有图标时的样式
          !children && iconElement && 'aspect-square p-0',
          
          // 自定义类名
          className
        )}
        {...props}
      >
        {/* 左侧图标 */}
        {iconPosition === 'left' && iconElement}
        
        {/* 文本内容 */}
        {children && (
          <span className={cn(
            loading && 'opacity-0'
          )}>
            {children}
          </span>
        )}
        
        {/* 右侧图标 */}
        {iconPosition === 'right' && iconElement}
        
        {/* Loading 状态的 Spinner（居中覆盖） */}
        {loading && children && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size={iconSize} />
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * IconButton - 只有图标的按钮变体
 */
export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children'>>(
  ({ icon, size = 'md', ...props }, ref) => {
    return (
      <Button ref={ref} icon={icon} size={size} {...props} />
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * ButtonGroup - 按钮组容器
 */
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup = ({ children, className }: ButtonGroupProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md',
        '[&>button]:rounded-none',
        '[&>button:first-child]:rounded-l-md',
        '[&>button:last-child]:rounded-r-md',
        '[&>button:not(:first-child)]:border-l-0',
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';

