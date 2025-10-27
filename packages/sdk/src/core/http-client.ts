/**
 * HTTP 客户端核心实现
 * 提供统一的 HTTP 请求处理、错误处理、重试机制等
 */

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { 
  LuckDBConfig, 
  RequestOptions, 
  APIResponse,          // 新的统一响应格式
} from '../types/index.js';
import {
  LuckDBError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError
} from '../types/index.js';

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private config: LuckDBConfig;
  private accessToken: string | undefined;
  private refreshToken: string | undefined;
  private onTokenRefresh?: (accessToken: string, refreshToken: string) => void;

  constructor(config: LuckDBConfig) {
    this.config = config;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    
    // 检测是否在浏览器环境中
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    
    const baseConfig: any = {
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        // ✅ 浏览器环境不设置 User-Agent（会被阻止）
        ...(!isBrowser && { 'User-Agent': config.userAgent || '@luckdb-sdk/1.0.0' }),
        ...(config.apiKey && { 'X-API-Key': config.apiKey }),
        ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` })
      }
    };

    // 可选禁用代理，避免本机代理劫持 localhost
    if (config.disableProxy) {
      baseConfig.proxy = false;
      // axios 在 Node 环境也会读取 HTTP(S)_PROXY 环境变量；这里显式禁用
      baseConfig.transport = undefined;
    }

    this.axiosInstance = axios.create(baseConfig);

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config: any) => {
        if (this.config.debug) {
          console.log(`[LuckDB SDK] ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data
          });
        }
        return config;
      },
      (error: any) => {
        if (this.config.debug) {
          console.error('[LuckDB SDK] Request error:', error);
        }
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        if (this.config.debug) {
          console.log(`[LuckDB SDK] Response:`, {
            status: response.status,
            data: response.data
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        if (this.config.debug) {
          console.error('[LuckDB SDK] Response error:', error);
        }

        // 处理 401 错误，尝试刷新 token
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            // 重试原始请求
            const originalRequest = error.config;
            if (originalRequest) {
              originalRequest.headers = originalRequest.headers || {} as any;
              originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`;
              return this.axiosInstance.request(originalRequest);
            }
        } catch (refreshError) {
          // 刷新失败，清除 token
          this.clearTokensInternal();
          throw new AuthenticationError('Token refresh failed');
        }
        }

        throw this.handleError(error);
      }
    );
  }

  /**
   * 处理错误响应（完全匹配 EasyDB API响应格式）
   */
  private handleError(error: AxiosError): LuckDBError {
    const response = error.response;
    const status = response?.status;
    const data = response?.data as APIResponse | any;

    // 网络错误
    if (!status) {
      return new LuckDBError(
        error.message || 'Network error',
        'NETWORK_ERROR',
        undefined,
        error
      );
    }

    // 解析LuckDB统一响应格式
    const message = data?.message || data?.error?.details || error.message || 'Unknown error';
    const code = data?.code !== undefined ? String(data.code) : 'UNKNOWN_ERROR';
    const errorDetails = data?.error?.details;

    // 根据HTTP状态码和业务code判断错误类型
    switch (status) {
      case 401:
        // 401000 系列: 认证相关
        return new AuthenticationError(message, status);
      case 403:
        // 403000 系列: 权限相关
        return new AuthorizationError(message, status);
      case 404:
        // 404000 系列: 资源不存在
        return new NotFoundError(message, status);
      case 400:
        // 400000 系列: 请求参数错误
        return new ValidationError(message, errorDetails, status);
      case 429:
        // 429000 系列: 请求频率限制
        return new RateLimitError(message, status);
      case 500:
      case 502:
      case 503:
      case 504:
        // 500000 系列: 服务器错误
        return new ServerError(message, status);
      default:
        return new LuckDBError(message, code, status, errorDetails);
    }
  }

  /**
   * 刷新访问令牌（使用新的API响应格式）
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    try {
      const response = await axios.post(`${this.config.baseUrl}/api/v1/auth/refresh`, {
        refreshToken: this.refreshToken
      });

      const data = response.data as APIResponse<{ accessToken: string; refreshToken: string }>;
      
      // 检查业务状态码
      if (data.code !== 200000) {
        throw new AuthenticationError(data.message || 'Token refresh failed');
      }

      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;

      // 更新默认请求头
      this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;

      // 触发 token 刷新回调
      if (this.onTokenRefresh) {
        this.onTokenRefresh(this.accessToken, this.refreshToken);
      }
    } catch (error) {
      this.clearTokensInternal();
      throw new AuthenticationError('Failed to refresh access token');
    }
  }

  private clearTokensInternal(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    delete this.axiosInstance.defaults.headers['Authorization'];
  }

  public setAccessToken(token: string): void {
    this.accessToken = token;
    this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${token}`;
  }

  public setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  public clearTokens(): void {
    this.clearTokensInternal();
  }

  public setTokenRefreshCallback(callback: (accessToken: string, refreshToken: string) => void): void {
    this.onTokenRefresh = callback;
  }

  public async get<T = any>(
    url: string, 
    params?: globalThis.Record<string, any>, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('GET', url, { params, ...options });
  }

  public async post<T = any>(
    url: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('POST', url, { data, ...options });
  }

  public async put<T = any>(
    url: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PUT', url, { data, ...options });
  }

  public async patch<T = any>(
    url: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PATCH', url, { data, ...options });
  }

  public async delete<T = any>(
    url: string, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('DELETE', url, options);
  }

  /**
   * 统一请求处理（完全匹配LuckDB API响应格式）
   */
  private async request<T = any>(
    method: string,
    url: string,
    config: AxiosRequestConfig & RequestOptions = {}
  ): Promise<T> {
    const { retries = this.config.retries || 0, retryDelay = this.config.retryDelay || 1000, ...axiosConfig } = config;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response: AxiosResponse<APIResponse<T>> = await this.axiosInstance.request({
          method,
          url,
          ...axiosConfig
        });

        const data = response.data;

        // LuckDB统一响应格式: { code, message, data, error?, ... }
        if (data && typeof data === 'object' && 'code' in data) {
          // 检查业务状态码
          // 成功: 2xxxx (200000-299999)
          // 失败: 其他
          const code = data.code;
          
          if (code >= 200000 && code < 300000) {
            // 成功响应，返回 data 字段
            return data.data as T;
          } else {
            // 业务错误
            throw new LuckDBError(
              data.message || 'API request failed',
              String(code),
              response.status,
              data.error?.details
            );
          }
        }

        // 降级处理：直接返回响应体（健康检查等接口）
        return response.data as T;
        
      } catch (error) {
        lastError = error as Error;

        // 如果是最后一次尝试，或者错误不应该重试，直接抛出
        if (attempt === retries || !this.shouldRetry(error as LuckDBError)) {
          throw error;
        }

        // 等待后重试
        if (retryDelay > 0) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数退避
        }
      }
    }

    throw lastError!;
  }

  private shouldRetry(error: LuckDBError): boolean {
    // 网络错误和服务器错误可以重试
    if (error.code === 'NETWORK_ERROR') {
      return true;
    }

    if (error.status && error.status >= 500) {
      return true;
    }

    // 429 错误可以重试
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 文件上传方法
  public async uploadFile<T = any>(
    url: string,
    file: File | any,
    fieldName: string = 'file',
    additionalData?: globalThis.Record<string, any>,
    options?: RequestOptions
  ): Promise<T> {
    const formData = new FormData();
    
    if (file instanceof File) {
      formData.append(fieldName, file);
    } else {
      formData.append(fieldName, new Blob([file]));
    }

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>('POST', url, {
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...options
    });
  }

  // 流式下载方法
  public async downloadFile(
    url: string,
    options?: RequestOptions
  ): Promise<Blob> {
    const response = await this.axiosInstance.get(url, {
      responseType: 'blob',
      ...options
    });

    return response.data;
  }

  // 健康检查
  public async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    return this.get('/health');
  }

  // 获取系统信息
  public async getSystemInfo(): Promise<any> {
    return this.get('/api/info');
  }

  /**
   * 获取基础 URL
   */
  public getBaseUrl(): string {
    return this.config.baseUrl;
  }
}
