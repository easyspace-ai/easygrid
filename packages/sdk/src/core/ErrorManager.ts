/**
 * 错误处理器
 * 负责处理和管理客户端错误
 */

export interface ShareDBError {
  code: string
  message: string
  details?: string
  context?: Record<string, any>
}

export interface ErrorStats {
  totalErrors: number
  errorsByCode: Record<string, number>
  lastError?: ShareDBError
  errorRate: number
  timeWindow: number
}

export interface ErrorHandler {
  (error: ShareDBError): void
}

export class ErrorManager {
  private errorHistory: ShareDBError[] = []
  private errorHandlers: ErrorHandler[] = []
  private maxHistorySize: number = 100
  private timeWindow: number = 5 * 60 * 1000 // 5分钟
  private stats: ErrorStats

  constructor(maxHistorySize: number = 100, timeWindow: number = 5 * 60 * 1000) {
    this.maxHistorySize = maxHistorySize
    this.timeWindow = timeWindow
    this.stats = {
      totalErrors: 0,
      errorsByCode: {},
      errorRate: 0,
      timeWindow: this.timeWindow
    }
  }

  /**
   * 处理错误
   */
  handleError(error: ShareDBError): void {
    // 记录错误
    this.recordError(error)
    
    // 更新统计信息
    this.updateStats()
    
    // 调用错误处理器
    this.errorHandlers.forEach(handler => {
      try {
        handler(error)
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError)
      }
    })
  }

  /**
   * 处理原始错误对象
   */
  handleRawError(error: any): void {
    const shareDBError = this.normalizeError(error)
    this.handleError(shareDBError)
  }

  /**
   * 记录错误
   */
  private recordError(error: ShareDBError): void {
    this.errorHistory.push(error)
    
    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }
    
    // 更新统计信息
    this.stats.totalErrors++
    this.stats.errorsByCode[error.code] = (this.stats.errorsByCode[error.code] || 0) + 1
    this.stats.lastError = error
  }

  /**
   * 标准化错误
   */
  private normalizeError(error: any): ShareDBError {
    if (this.isShareDBError(error)) {
      return error
    }

    // 尝试从错误中提取信息
    const code = this.extractErrorCode(error)
    const message = this.extractErrorMessage(error)
    
    return {
      code,
      message,
      details: error.stack || error.toString(),
      context: {
        originalError: error,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 检查是否为 ShareDB 错误
   */
  private isShareDBError(error: any): error is ShareDBError {
    return error && typeof error.code === 'string' && typeof error.message === 'string'
  }

  /**
   * 提取错误代码
   */
  private extractErrorCode(error: any): string {
    if (error.code) {
      return String(error.code)
    }
    
    if (error.name) {
      return error.name
    }
    
    if (error.message) {
      // 尝试从错误消息中提取代码
      const match = error.message.match(/^([A-Z_]+):/)
      if (match) {
        return match[1]
      }
    }
    
    return 'UNKNOWN_ERROR'
  }

  /**
   * 提取错误消息
   */
  private extractErrorMessage(error: any): string {
    if (error.message) {
      return error.message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    return 'Unknown error occurred'
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const now = Date.now()
    const cutoff = now - this.timeWindow
    
    // 计算时间窗口内的错误率
    const recentErrors = this.errorHistory.filter(error => {
      const timestamp = error.context?.timestamp
      if (timestamp) {
        return new Date(timestamp).getTime() > cutoff
      }
      return true // 如果没有时间戳，假设是最近的
    })
    
    this.stats.errorRate = recentErrors.length / (this.timeWindow / 1000) // 每秒错误数
  }

  /**
   * 添加错误处理器
   */
  addErrorHandler(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler)
    
    // 返回移除函数
    return () => {
      const index = this.errorHandlers.indexOf(handler)
      if (index > -1) {
        this.errorHandlers.splice(index, 1)
      }
    }
  }

  /**
   * 获取错误统计信息
   */
  getStats(): ErrorStats {
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ShareDBError[] {
    return [...this.errorHistory]
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count: number = 10): ShareDBError[] {
    return this.errorHistory.slice(-count)
  }

  /**
   * 获取特定代码的错误
   */
  getErrorsByCode(code: string): ShareDBError[] {
    return this.errorHistory.filter(error => error.code === code)
  }

  /**
   * 检查是否有特定错误
   */
  hasError(code: string): boolean {
    return this.errorHistory.some(error => error.code === code)
  }

  /**
   * 检查是否为网络错误
   */
  isNetworkError(error: ShareDBError): boolean {
    const networkErrorCodes = [
      'NETWORK_ERROR',
      'CONNECTION_LOST',
      'CONNECTION_TIMEOUT',
      'CONNECTION_REFUSED',
      'TIMEOUT'
    ]
    
    return networkErrorCodes.includes(error.code)
  }

  /**
   * 检查是否为认证错误
   */
  isAuthError(error: ShareDBError): boolean {
    const authErrorCodes = [
      'UNAUTHORIZED',
      'UNAUTHORIZED_SHARE',
      'TOKEN_EXPIRED',
      'INVALID_TOKEN'
    ]
    
    return authErrorCodes.includes(error.code)
  }

  /**
   * 检查是否为权限错误
   */
  isPermissionError(error: ShareDBError): boolean {
    const permissionErrorCodes = [
      'PERMISSION_DENIED',
      'INSUFFICIENT_PERMISSIONS',
      'ACCESS_DENIED'
    ]
    
    return permissionErrorCodes.includes(error.code)
  }

  /**
   * 检查是否应该重试
   */
  shouldRetry(error: ShareDBError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'CONNECTION_LOST',
      'CONNECTION_TIMEOUT',
      'SERVER_ERROR',
      'SERVER_OVERLOADED',
      'OPERATION_TIMEOUT'
    ]
    
    return retryableCodes.includes(error.code)
  }

  /**
   * 检查是否应该刷新认证
   */
  shouldRefreshAuth(error: ShareDBError): boolean {
    return error.code === 'TOKEN_EXPIRED' || error.code === 'INVALID_TOKEN'
  }

  /**
   * 检查是否应该重定向到登录页
   */
  shouldRedirectToLogin(error: ShareDBError): boolean {
    return error.code === 'UNAUTHORIZED' || error.code === 'UNAUTHORIZED_SHARE'
  }

  /**
   * 获取错误的严重程度
   */
  getErrorSeverity(error: ShareDBError): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'UNAUTHORIZED': 'high',
      'PERMISSION_DENIED': 'high',
      'NETWORK_ERROR': 'medium',
      'CONNECTION_LOST': 'medium',
      'SERVER_ERROR': 'high',
      'QUOTA_EXCEEDED': 'high',
      'DATA_CORRUPTED': 'critical',
      'OPERATION_TIMEOUT': 'medium',
      'UNKNOWN_ERROR': 'medium'
    }
    
    return severityMap[error.code] || 'medium'
  }

  /**
   * 清空错误历史
   */
  clearHistory(): void {
    this.errorHistory = []
    this.stats = {
      totalErrors: 0,
      errorsByCode: {},
      errorRate: 0,
      timeWindow: this.timeWindow
    }
  }

  /**
   * 重置错误管理器
   */
  reset(): void {
    this.clearHistory()
    this.errorHandlers = []
  }
}
