export { GridErrorBoundary } from './GridErrorBoundary';
export { FeatureErrorBoundary } from './FeatureErrorBoundary';

// 错误类型定义
export interface GridError extends Error {
  code?: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

// 错误分类
export enum GridErrorType {
  RENDER_ERROR = 'RENDER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  STATE_ERROR = 'STATE_ERROR',
  PERFORMANCE_ERROR = 'PERFORMANCE_ERROR',
}

// 错误处理器
export class GridErrorHandler {
  private static instance: GridErrorHandler;
  private errorCallbacks: Array<(error: GridError) => void> = [];

  static getInstance(): GridErrorHandler {
    if (!GridErrorHandler.instance) {
      GridErrorHandler.instance = new GridErrorHandler();
    }
    return GridErrorHandler.instance;
  }

  addErrorListener(callback: (error: GridError) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  handleError(error: Error, context?: Record<string, unknown>): void {
    const gridError: GridError = {
      ...error,
      timestamp: new Date(),
      context,
    };

    this.errorCallbacks.forEach(callback => {
      try {
        callback(gridError);
      } catch (callbackError) {
        console.warn('Error in error callback:', callbackError);
      }
    });

    // 开发环境打印
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Grid Error');
      console.error('Error:', error);
      if (context) {
        console.error('Context:', context);
      }
      console.groupEnd();
    }
  }
}

// 导出单例
export const gridErrorHandler = GridErrorHandler.getInstance();
