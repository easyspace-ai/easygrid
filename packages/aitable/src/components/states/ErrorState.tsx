import React from 'react';
import { tokens, elevation } from '../../grid/design-system';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

/**
 * 错误状态组件
 * 
 * 设计原则：
 * - 诚实地承认错误
 * - 提供明确的恢复路径
 * - 避免技术术语吓跑用户
 */
export function ErrorState({
  title = "出错了",
  message = "加载数据时遇到问题，请稍后重试",
  actionLabel = "重新加载",
  onAction,
  secondaryActionLabel = "联系支持",
  onSecondaryAction,
}: ErrorStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center"
      style={{ 
        minHeight: '400px',
        padding: '48px 24px',
      }}
    >
      {/* 错误图标 */}
      <div
        style={{
          width: '96px',
          height: '96px',
          borderRadius: tokens.radius.xl,
          backgroundColor: tokens.colors.semantic.error.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          border: `1px solid ${tokens.colors.semantic.error.border}`,
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke={tokens.colors.semantic.error.text}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      {/* 标题 */}
      <h3
        style={{
          fontSize: '18px',
          fontWeight: tokens.typography.fontWeight.semibold,
          color: tokens.colors.text.primary,
          marginBottom: '8px',
          letterSpacing: tokens.typography.letterSpacing.tight,
        }}
      >
        {title}
      </h3>

      {/* 错误信息 */}
      <p
        style={{
          fontSize: '14px',
          color: tokens.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '400px',
          marginBottom: '24px',
          lineHeight: '1.6',
        }}
      >
        {message}
      </p>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onAction && (
          <button
            onClick={onAction}
            style={{
              height: '40px',
              padding: '0 24px',
              borderRadius: tokens.radius.md,
              backgroundColor: tokens.colors.primary[500],
              color: 'white',
              fontSize: '14px',
              fontWeight: tokens.typography.fontWeight.medium,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
              boxShadow: elevation.sm,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.primary[600];
              e.currentTarget.style.boxShadow = elevation.md;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.primary[500];
              e.currentTarget.style.boxShadow = elevation.sm;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {actionLabel}
          </button>
        )}

        {onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            style={{
              height: '40px',
              padding: '0 24px',
              borderRadius: tokens.radius.md,
              backgroundColor: 'transparent',
              color: tokens.colors.text.secondary,
              fontSize: '14px',
              fontWeight: tokens.typography.fontWeight.medium,
              border: `1px solid ${tokens.colors.border.default}`,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
              e.currentTarget.style.borderColor = tokens.colors.border.strong;
              e.currentTarget.style.color = tokens.colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = tokens.colors.border.default;
              e.currentTarget.style.color = tokens.colors.text.secondary;
            }}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}


