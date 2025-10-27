/**
 * Toast 通知系统
 * 
 * 设计原则：
 * 1. 微妙但明确的反馈
 * 2. 自动消失（不打断用户）
 * 3. 支持多种状态（success, error, warning, info）
 * 4. 优雅的动画进出
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { cn, tokens, elevation } from '../grid/design-system';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  icon?: React.ReactNode;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  hideToast: (id: string) => void;
}

// 提供一个安全的默认上下文，避免在未包裹 Provider 时崩溃
const defaultToastContext: ToastContextValue = {
  showToast: () => {
    // no-op: 在未提供 Provider 时静默忽略调用，保证 Demo 不崩溃
  },
  hideToast: () => {
    // no-op
  },
};

const ToastContext = createContext<ToastContextValue>(defaultToastContext);

/**
 * Toast Hook - 在组件中使用
 */
export function useToast() {
  // 即使未包裹 Provider 也返回安全的 no-op 实现
  const context = useContext(ToastContext);
  return context;
}

/**
 * Toast 提供者 - 包裹在应用根部
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastItem = {
      id,
      duration: 3000,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);

    // 自动移除
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

/**
 * Toast 容器 - 渲染所有 Toast
 */
interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>,
    document.body
  );
}

/**
 * 单个 Toast 组件
 */
interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 200); // 等待退出动画完成
  }, [toast.id, onClose]);

  // 图标配置
  const iconConfig: Record<ToastType, { icon: React.ReactNode; color: string; bgColor: string }> = {
    success: {
      icon: toast.icon || <CheckCircle size={20} />,
      color: tokens.colors.text.success,
      bgColor: tokens.colors.semantic.success.bg,
    },
    error: {
      icon: toast.icon || <XCircle size={20} />,
      color: tokens.colors.text.error,
      bgColor: tokens.colors.semantic.error.bg,
    },
    warning: {
      icon: toast.icon || <AlertCircle size={20} />,
      color: tokens.colors.text.warning,
      bgColor: tokens.colors.semantic.warning.bg,
    },
    info: {
      icon: toast.icon || <Info size={20} />,
      color: tokens.colors.text.accent,
      bgColor: tokens.colors.semantic.info.bg,
    },
  };

  const config = iconConfig[toast.type];

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto',
        'flex items-start gap-3 p-4 pr-3',
        'min-w-[320px] max-w-[420px]',
        'bg-white rounded-lg border shadow-lg',
        'transition-all duration-200 ease-out',
        // 进入动画
        !isExiting && 'animate-in slide-in-from-right-8 fade-in-0',
        // 退出动画
        isExiting && 'animate-out slide-out-to-right-8 fade-out-0',
      )}
      style={{
        backgroundColor: tokens.colors.surface.base,
        borderColor: tokens.colors.border.subtle,
        boxShadow: elevation.lg,
      }}
    >
      {/* 图标 */}
      <div
        className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full"
        style={{
          color: config.color,
          backgroundColor: config.bgColor,
        }}
      >
        {config.icon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0 pt-0.5">
        {toast.title && (
          <div
            className="font-semibold text-sm mb-0.5"
            style={{ color: tokens.colors.text.primary }}
          >
            {toast.title}
          </div>
        )}
        <div
          className="text-sm leading-relaxed"
          style={{ color: tokens.colors.text.secondary }}
        >
          {toast.message}
        </div>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className={cn(
          'flex-shrink-0 p-1 rounded-md',
          'transition-colors duration-150',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
        )}
        style={{
          color: tokens.colors.text.tertiary,
        }}
        aria-label="关闭通知"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * 便捷方法 - 无需 Hook
 */
let toastEmitter: ToastContextValue | null = null;

export function setToastEmitter(emitter: ToastContextValue) {
  toastEmitter = emitter;
}

export const toast = {
  success: (message: string, title?: string) => {
    toastEmitter?.showToast({ type: 'success', message, title });
  },
  error: (message: string, title?: string) => {
    toastEmitter?.showToast({ type: 'error', message, title });
  },
  warning: (message: string, title?: string) => {
    toastEmitter?.showToast({ type: 'warning', message, title });
  },
  info: (message: string, title?: string) => {
    toastEmitter?.showToast({ type: 'info', message, title });
  },
};

/**
 * 包装 ToastProvider 以支持全局 toast API
 */
export function ToastProviderWithEmitter({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ToastEmitterSetup />
      {children}
    </ToastProvider>
  );
}

function ToastEmitterSetup() {
  const toastContext = useToast();
  
  useEffect(() => {
    setToastEmitter(toastContext);
    return () => {
      setToastEmitter(null);
    };
  }, [toastContext]);
  
  return null;
}

