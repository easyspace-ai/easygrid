import React from 'react';
import { tokens, elevation } from '../../grid/design-system';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * 空状态组件
 * 
 * 设计原则：
 * - 友好而不失专业
 * - 引导用户采取行动
 * - 视觉层次清晰
 */
export function EmptyState({
  title = "暂无数据",
  description = "开始添加第一条记录吧",
  actionLabel = "添加记录",
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center"
      style={{ 
        minHeight: '400px',
        padding: '48px 24px',
      }}
    >
      {/* 图标 */}
      <div
        style={{
          width: '96px',
          height: '96px',
          borderRadius: tokens.radius.xl,
          backgroundColor: tokens.colors.surface.hover,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          border: `1px solid ${tokens.colors.border.subtle}`,
        }}
      >
        {icon || (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke={tokens.colors.text.tertiary}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2H14" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        )}
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

      {/* 描述 */}
      <p
        style={{
          fontSize: '14px',
          color: tokens.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '320px',
          marginBottom: '24px',
          lineHeight: '1.6',
        }}
      >
        {description}
      </p>

      {/* 操作按钮 */}
      {onAction && (
        <button
          onClick={onAction}
          className="group"
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
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px) scale(1)';
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {actionLabel}
        </button>
      )}
    </div>
  );
}


