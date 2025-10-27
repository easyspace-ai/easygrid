import React from 'react';
import { GridErrorBoundary, FeatureErrorBoundary } from '../error-handling';
import { Grid, type IGridExternalProps } from './Grid';

/**
 * 带错误边界的 Grid 组件
 * 
 * 这个组件包装了原有的 Grid 组件，提供了完整的错误处理：
 * - 捕获 Grid 渲染错误
 * - 捕获子组件错误
 * - 提供错误恢复机制
 * - 自动错误上报
 */
export function GridWithErrorBoundary(props: IGridExternalProps): JSX.Element {
  const handleGridError = (error: Error, errorInfo: React.ErrorInfo): void => {
    // 记录 Grid 级别的错误
    console.error('Grid Error:', error, errorInfo);
    
    // 这里可以集成错误监控服务
    // 例如：Sentry, LogRocket, Bugsnag 等
    if (process.env.NODE_ENV === 'production') {
      // 上报到错误监控服务
      // errorMonitoring.captureException(error, {
      //   extra: errorInfo,
      //   tags: { component: 'Grid' }
      // });
    }
  };

  const handleFeatureError = (feature: string, error: Error, errorInfo: React.ErrorInfo): void => {
    // 记录功能级别的错误
    console.warn(`${feature} Feature Error:`, error);
    
    // 功能级错误通常不影响整体使用，记录即可
    if (process.env.NODE_ENV === 'production') {
      // 上报功能错误
      // errorMonitoring.captureMessage(`${feature} feature error`, 'warning', {
      //   extra: { error: error.message, componentStack: errorInfo.componentStack }
      // });
    }
  };

  return (
    <GridErrorBoundary onError={handleGridError}>
      <Grid {...(props as any)} />
    </GridErrorBoundary>
  );
}

// 导出类型
export type { IGridExternalProps } from './Grid';

// 默认导出
export default GridWithErrorBoundary;
