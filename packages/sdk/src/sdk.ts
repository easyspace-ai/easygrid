/**
 * EasyGrid SDK 全局实例
 * 提供登录认证、HTTP 客户端等核心功能
 * 让第三方应用可以轻松集成
 */

import { HttpClient } from './core/http-client.js'
import { AuthClient } from './clients/auth-client.js'
import { FieldClient } from './clients/field-client.js'
import { RecordClient } from './clients/record-client.js'
import { TableClient } from './clients/table-client.js'
import { ViewClient } from './clients/view-client.js'
import { ShareDBConnection, ShareDBConnectionConfig } from './core/sharedb/connection.js'
import { SDKErrorHandler } from './core/error-handler.js'
import type { LoginRequest, AuthResponse } from './types/index.js'

export interface EasyGridSDKConfig {
  baseURL: string
  wsUrl?: string
  debug?: boolean
  accessToken?: string
}

export class EasyGridSDK {
  private httpClient: HttpClient
  private authClient: AuthClient
  private fieldClient: FieldClient
  private recordClient: RecordClient
  private tableClient: TableClient
  private viewClient: ViewClient
  private shareDBConnection: ShareDBConnection | null = null
  private config: EasyGridSDKConfig

  constructor(config: EasyGridSDKConfig) {
    this.config = config
    
    // 初始化 HTTP 客户端
    this.httpClient = new HttpClient({
      baseUrl: config.baseURL,
      debug: config.debug,
      accessToken: config.accessToken
    })
    
    // 初始化各个客户端
    this.authClient = new AuthClient(this.httpClient)
    this.fieldClient = new FieldClient(this.httpClient)
    this.recordClient = new RecordClient(this.httpClient)
    this.tableClient = new TableClient(this.httpClient)
    this.viewClient = new ViewClient(this.httpClient)
    
    // 初始化 ShareDB 连接（如果提供了 WebSocket URL）
    if (config.wsUrl) {
      this.initializeShareDBConnection()
    }
  }

  /**
   * 获取认证客户端
   */
  get auth() {
    return this.authClient
  }

  /**
   * 获取字段客户端
   */
  get fields() {
    return this.fieldClient
  }

  /**
   * 获取记录客户端
   */
  get records() {
    return this.recordClient
  }

  /**
   * 获取表格客户端
   */
  get tables() {
    return this.tableClient
  }

  /**
   * 获取视图客户端
   */
  get views() {
    return this.viewClient
  }

  /**
   * 获取 HTTP 客户端
   */
  get http() {
    return this.httpClient
  }

  /**
   * 兼容 @easygrid/aitable 的接口
   * 获取表格的所有视图
   */
  async getViews(tableId: string) {
    return this.viewClient.getViews(tableId)
  }

  /**
   * 获取配置
   */
  getConfig() {
    return this.config
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<EasyGridSDKConfig>) {
    this.config = { ...this.config, ...newConfig }
    
    // 重新创建 HTTP 客户端（因为 HttpClient 没有 updateConfig 方法）
    this.httpClient = new HttpClient({
      baseUrl: this.config.baseURL,
      debug: this.config.debug,
      accessToken: this.config.accessToken
    })
    
    // 重新创建各个客户端
    this.authClient = new AuthClient(this.httpClient)
    this.fieldClient = new FieldClient(this.httpClient)
    this.recordClient = new RecordClient(this.httpClient)
    this.tableClient = new TableClient(this.httpClient)
    this.viewClient = new ViewClient(this.httpClient)
    
    // 更新 ShareDB 连接配置
    if (this.config.wsUrl) {
      if (this.shareDBConnection) {
        // 断开现有连接
        this.shareDBConnection.disconnect()
      }
      // 重新初始化连接
      this.initializeShareDBConnection()
    } else if (this.shareDBConnection) {
      // 如果没有 WebSocket URL，断开连接
      this.shareDBConnection.disconnect()
      this.shareDBConnection = null
    }
  }

  /**
   * 用户登录（集成认证和WebSocket连接）
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // 调用认证客户端进行登录
    const authResponse = await this.authClient.login(credentials)
    
    // 更新 SDK 配置中的访问令牌
    this.config.accessToken = authResponse.accessToken
    
    // HTTP 客户端的令牌已经在 authClient.login() 中设置
    
    // 如果配置了 WebSocket URL，自动初始化并连接 ShareDB
    if (this.config.wsUrl) {
      try {
        await this.connectShareDB()
        console.log('✅ 登录成功，WebSocket 连接已建立')
      } catch (error) {
        console.warn('⚠️ 登录成功，但 WebSocket 连接失败:', error)
        // 不抛出错误，因为登录本身是成功的
      }
    }
    
    return authResponse
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    // HttpClient 没有 hasAccessToken 方法，我们通过检查 token 是否存在来判断
    return !!this.httpClient['accessToken']
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): any {
    // HttpClient 没有 getCurrentUser 方法，返回 null
    return null
  }

  /**
   * 登出
   */
  logout(): void {
    this.httpClient.clearTokens()
    this.disconnectShareDB()
  }

  /**
   * 初始化 ShareDB 连接
   */
  private initializeShareDBConnection(): void {
    if (!this.config.wsUrl) {
      throw new Error('WebSocket URL 未配置')
    }

    const shareDBConfig: ShareDBConnectionConfig = {
      wsUrl: this.config.wsUrl,
      accessToken: this.config.accessToken,
      debug: this.config.debug,
      reconnect: {
        maxRetries: 10,
        retryDelay: 1000,
        exponentialBackoff: true
      },
      heartbeat: {
        interval: 30000,
        timeout: 10000
      }
    }

    this.shareDBConnection = new ShareDBConnection(shareDBConfig)
  }

  /**
   * 连接 ShareDB
   */
  async connectShareDB(): Promise<void> {
    if (!this.shareDBConnection) {
      this.initializeShareDBConnection()
    }

    if (!this.shareDBConnection) {
      throw new Error('ShareDB 连接初始化失败')
    }

    try {
      await this.shareDBConnection.connect()
      console.log('✅ ShareDB 连接已建立')
    } catch (error) {
      const sdkError = SDKErrorHandler.handleConnectionError(error)
      throw sdkError
    }
  }

  /**
   * 断开 ShareDB 连接
   */
  disconnectShareDB(): void {
    if (this.shareDBConnection) {
      this.shareDBConnection.disconnect()
      console.log('📡 ShareDB 连接已断开')
    }
  }

  /**
   * 获取 ShareDB 连接
   */
  getShareDBConnection(): ShareDBConnection | null {
    return this.shareDBConnection
  }

  /**
   * 检查 ShareDB 是否已连接
   */
  isShareDBConnected(): boolean {
    return this.shareDBConnection?.isConnected() ?? false
  }

  /**
   * 获取 ShareDB 连接状态
   */
  getShareDBConnectionInfo(): any {
    return this.shareDBConnection?.getConnectionInfo() ?? null
  }
}

// 创建默认实例
let defaultSDK: EasyGridSDK | null = null

/**
 * 初始化 SDK
 */
export function initEasyGridSDK(config: EasyGridSDKConfig): EasyGridSDK {
  defaultSDK = new EasyGridSDK(config)
  return defaultSDK
}

/**
 * 获取默认 SDK 实例
 */
export function getEasyGridSDK(): EasyGridSDK {
  if (!defaultSDK) {
    throw new Error('SDK 未初始化，请先调用 initEasyGridSDK()')
  }
  return defaultSDK
}

// 挂载到全局对象（用于浏览器环境）
if (typeof window !== 'undefined') {
  (window as any).EasyGridSDK = EasyGridSDK as any
  (window as any).initEasyGridSDK = initEasyGridSDK as any
  (window as any).getEasyGridSDK = getEasyGridSDK as any
}
