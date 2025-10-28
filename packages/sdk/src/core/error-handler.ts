/**
 * SDK 错误处理器
 * 分类错误、自动回滚、友好提示
 */

export interface SDKError extends Error {
  code: string
  message: string
  details?: string
  originalError?: Error
}

export interface ErrorHandlerOptions {
  showToast?: boolean
  autoRetry?: boolean
  maxRetries?: number
  retryDelay?: number
}

/**
 * SDK 错误处理器
 */
export class SDKErrorHandler {
  private static toastHandler?: (message: string, type: 'error' | 'warning' | 'info') => void
  private static retryHandlers: Map<string, () => Promise<any>> = new Map()

  /**
   * 设置 Toast 处理器
   */
  static setToastHandler(handler: (message: string, type: 'error' | 'warning' | 'info') => void) {
    this.toastHandler = handler
  }

  /**
   * 注册重试处理器
   */
  static registerRetryHandler(key: string, handler: () => Promise<any>) {
    this.retryHandlers.set(key, handler)
  }

  /**
   * 处理更新错误
   */
  static async handleUpdateError(
    error: any,
    rollback: () => void,
    options: ErrorHandlerOptions = {}
  ): Promise<void> {
    const sdkError = this.normalizeError(error)
    
    // 自动回滚
    try {
      rollback()
    } catch (rollbackError) {
      console.error('❌ 回滚失败:', rollbackError)
    }

    // 显示错误提示
    if (options.showToast !== false) {
      this.showErrorToast(sdkError)
    }

    // 自动重试
    if (options.autoRetry && this.shouldRetry(sdkError)) {
      await this.retryOperation(sdkError, options)
    }

    throw sdkError
  }

  /**
   * 处理连接错误
   */
  static handleConnectionError(error: any): SDKError {
    const sdkError = this.normalizeError(error)
    
    this.showErrorToast(sdkError)
    
    return sdkError
  }

  /**
   * 处理网络错误
   */
  static handleNetworkError(error: any): SDKError {
    const sdkError = this.normalizeError(error)
    
    // 网络错误通常需要重试
    if (this.shouldRetry(sdkError)) {
      this.showErrorToast({
        ...sdkError,
        message: '网络连接异常，正在重试...'
      })
    } else {
      this.showErrorToast(sdkError)
    }
    
    return sdkError
  }

  /**
   * 处理验证错误
   */
  static handleValidationError(error: any): SDKError {
    const sdkError = this.normalizeError(error)
    
    this.showErrorToast(sdkError)
    
    return sdkError
  }

  /**
   * 处理权限错误
   */
  static handlePermissionError(error: any): SDKError {
    const sdkError = this.normalizeError(error)
    
    this.showErrorToast({
      ...sdkError,
      message: '权限不足，请检查登录状态'
    })
    
    return sdkError
  }

  /**
   * 标准化错误
   */
  private static normalizeError(error: any): SDKError {
    if (this.isSDKError(error)) {
      return error
    }

    // 从 HTTP 错误中提取信息
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

    return {
      code: this.getErrorCodeFromStatus(status),
      message: data?.message || this.getErrorMessageFromStatus(status),
      details: data?.details,
      originalError: error,
      name: 'SDKError'
    }
    }

    // 从网络错误中提取信息
    if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      return {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        originalError: error,
        name: 'SDKError'
      }
    }

    // 默认错误
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || '未知错误',
      originalError: error,
      name: 'SDKError'
    }
  }

  /**
   * 检查是否为 SDK 错误
   */
  private static isSDKError(error: any): error is SDKError {
    return error && typeof error.code === 'string' && typeof error.message === 'string'
  }

  /**
   * 根据 HTTP 状态码获取错误代码
   */
  private static getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST'
      case 401:
        return 'UNAUTHORIZED'
      case 403:
        return 'FORBIDDEN'
      case 404:
        return 'NOT_FOUND'
      case 409:
        return 'CONFLICT'
      case 422:
        return 'VALIDATION_ERROR'
      case 429:
        return 'RATE_LIMITED'
      case 500:
        return 'SERVER_ERROR'
      case 502:
      case 503:
      case 504:
        return 'SERVICE_UNAVAILABLE'
      default:
        return 'HTTP_ERROR'
    }
  }

  /**
   * 根据 HTTP 状态码获取错误消息
   */
  private static getErrorMessageFromStatus(status: number): string {
    switch (status) {
      case 400:
        return '请求参数错误'
      case 401:
        return '未授权，请重新登录'
      case 403:
        return '权限不足'
      case 404:
        return '资源不存在'
      case 409:
        return '数据冲突，请刷新后重试'
      case 422:
        return '数据验证失败'
      case 429:
        return '请求过于频繁，请稍后重试'
      case 500:
        return '服务器内部错误'
      case 502:
      case 503:
      case 504:
        return '服务暂时不可用'
      default:
        return '请求失败'
    }
  }

  /**
   * 判断是否应该重试
   */
  private static shouldRetry(error: SDKError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMITED',
      'HTTP_ERROR'
    ]
    
    return retryableCodes.includes(error.code)
  }

  /**
   * 重试操作
   */
  private static async retryOperation(
    error: SDKError,
    options: ErrorHandlerOptions
  ): Promise<void> {
    const maxRetries = options.maxRetries || 3
    const retryDelay = options.retryDelay || 1000

    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)))
        
        // 这里需要具体的重试逻辑
        // 暂时跳过
        break
        
      } catch (retryError) {
        if (i === maxRetries - 1) {
          throw retryError
        }
      }
    }
  }

  /**
   * 显示错误提示
   */
  private static showErrorToast(error: SDKError): void {
    if (this.toastHandler) {
      this.toastHandler(error.message, 'error')
    } else {
      console.error('❌ SDK 错误:', error)
    }
  }

  /**
   * 显示警告提示
   */
  static showWarning(message: string): void {
    if (this.toastHandler) {
      this.toastHandler(message, 'warning')
    } else {
      console.warn('⚠️ SDK 警告:', message)
    }
  }

  /**
   * 显示信息提示
   */
  static showInfo(message: string): void {
    if (this.toastHandler) {
      this.toastHandler(message, 'info')
    } else {
      console.info('ℹ️ SDK 信息:', message)
    }
  }
}
