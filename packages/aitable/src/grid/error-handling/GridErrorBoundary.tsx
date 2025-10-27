import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Grid 组件专用错误边界
 * 
 * 特性：
 * - 捕获 Grid 相关的渲染错误
 * - 提供用户友好的错误界面
 * - 支持错误恢复和重试
 * - 自动上报错误信息
 */
export class GridErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // 错误上报
    this.props.onError?.(error, errorInfo);
    
    // 开发环境打印详细信息
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Grid Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // 生产环境上报到错误监控服务
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // 这里集成你的错误监控服务（如 Sentry, LogRocket 等）
    try {
      // 示例：发送到错误监控服务
      // errorMonitoring.captureException(error, {
      //   extra: {
      //     componentStack: errorInfo.componentStack,
      //     timestamp: new Date().toISOString(),
      //   },
      // });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 自定义错误界面
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误界面
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Grid 渲染出错
            </h3>
          </div>
          
          <p className="text-gray-600 text-center mb-6 max-w-md">
            表格组件遇到了一个错误。这可能是由于数据格式问题或网络连接不稳定导致的。
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              刷新页面
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                开发者信息
              </summary>
              <div className="mt-2 p-4 bg-gray-100 rounded-md text-xs font-mono text-gray-800 overflow-auto">
                <div className="mb-2">
                  <strong>错误信息:</strong>
                  <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
                </div>
                {this.state.error.stack && (
                  <div className="mb-2">
                    <strong>错误堆栈:</strong>
                    <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                  </div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <strong>组件堆栈:</strong>
                    <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
