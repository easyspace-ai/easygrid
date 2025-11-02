/**
 * useAuth Hook - 基于EasyGridSDK的认证管理
 */

import { useState, useEffect, useCallback } from 'react'
import { EasyGridSDK } from '@easygrid/sdk'
import { config } from '../config'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface AuthState {
  isLoggedIn: boolean
  isLoading: boolean
  user: User | null
  error: string | null
  sdk: EasyGridSDK | null
}

export interface UseAuthReturn extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    isLoading: false,
    user: null,
    error: null,
    sdk: null
  })

  // 初始化SDK
  useEffect(() => {
    const sdk = new EasyGridSDK({
      baseURL: config.baseURL,
      wsUrl: config.wsUrl,
      debug: config.debug
    })

    setState(prev => ({ ...prev, sdk }))
  }, [])

  // 登录函数
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!state.sdk) {
      setState(prev => ({ ...prev, error: 'SDK未初始化' }))
      return false
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const authResponse = await state.sdk.login({ email, password })
      
      setState(prev => ({
        ...prev,
        isLoggedIn: true,
        isLoading: false,
        user: {
          id: authResponse.user.id,
          name: authResponse.user.name,
          email: authResponse.user.email,
          avatar: authResponse.user.avatar
        },
        error: null
      }))

      console.log('✅ 登录成功:', authResponse.user.name)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败'
      setState(prev => ({
        ...prev,
        isLoggedIn: false,
        isLoading: false,
        error: errorMessage
      }))
      
      console.error('❌ 登录失败:', error)
      return false
    }
  }, [state.sdk])

  // 登出函数
  const logout = useCallback(() => {
    if (state.sdk) {
      state.sdk.logout()
    }

    setState(prev => ({
      ...prev,
      isLoggedIn: false,
      user: null,
      error: null
    }))

    console.log('👋 用户已登出')
  }, [state.sdk])

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    login,
    logout,
    clearError
  }
}
