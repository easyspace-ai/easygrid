import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
  onError?: (feature: string, error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 功能级错误边界
 * 
 * 用于包装特定的功能模块（如编辑器、工具栏等），
 * 当某个功能出错时，不影响整个 Grid 的使用。
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error });
    this.props.onError?.(this.props.feature, error, errorInfo);

    // 开发环境记录错误
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🚨 ${this.props.feature} feature error:`, error);
    }
  }

  private handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">
              {this.props.feature} 功能暂时不可用
            </span>
          </div>
          
          <button
            onClick={this.handleDismiss}
            className="text-red-400 hover:text-red-600 focus:outline-none"
            aria-label="关闭错误提示"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
