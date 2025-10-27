import React from 'react';
import { tokens } from '../../grid/design-system';

/**
 * 加载状态组件
 * 
 * 设计原则：
 * - 简洁优雅，不抢占注意力
 * - 动画流畅，60fps
 * - 符合品牌调性
 */
export function LoadingState({ message = "正在加载..." }: { message?: string }) {
  return (
    <div 
      className="flex flex-col items-center justify-center"
      style={{ 
        minHeight: '400px',
        color: tokens.colors.text.secondary,
      }}
    >
      {/* 脉动圆圈 */}
      <div className="relative">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: `2px solid ${tokens.colors.primary[500]}`,
              opacity: 0.6 - i * 0.2,
              animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: tokens.colors.primary[50],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: tokens.colors.primary[500],
            }}
          />
        </div>
      </div>

      {/* 加载文本 */}
      <p 
        className="mt-6 text-sm"
        style={{ 
          color: tokens.colors.text.secondary,
          fontWeight: tokens.typography.fontWeight.medium,
        }}
      >
        {message}
      </p>

      {/* 进度点 */}
      <div className="mt-3 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: tokens.colors.primary[400],
              animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.1;
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}


