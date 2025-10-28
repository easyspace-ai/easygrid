/**
 * 登录表单组件
 * 简洁的登录表单，使用 HTTP API 登录后获取 token
 */

import React, { useState } from 'react'
import axios from 'axios'
import { config } from '../config'

export interface LoginFormProps {
  onLogin: (token: string, user: any) => void
}

export interface LoginResponse {
  success: boolean
  data?: {
    token: string
    user: {
      id: string
      name: string
      email: string
      avatar?: string
    }
  }
  message?: string
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState(config.testUser.email)
  const [password, setPassword] = useState(config.testUser.password)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 调用后端登录 API
      const response = await axios.post<LoginResponse>(
        `${config.apiBaseUrl}/api/v1/auth/login`,
        {
          email,
          password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.data.code === 200000 && response.data.data) {
        const { accessToken: token, user } = response.data.data
        
        // 保存 token 到 localStorage（可选）
        localStorage.setItem('access_token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        // 调用父组件的回调
        onLogin(token, user)
        
        console.log('登录成功:', { user, token: token.substring(0, 20) + '...' })
      } else {
        throw new Error(response.data.message || '登录失败')
      }
    } catch (err) {
      console.error('登录失败:', err)
      
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('邮箱或密码错误')
        } else if (err.response?.status === 500) {
          setError('服务器错误，请稍后重试')
        } else if (err.code === 'ECONNABORTED') {
          setError('请求超时，请检查网络连接')
        } else {
          setError(err.response?.data?.message || '登录失败')
        }
      } else {
        setError('登录失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setEmail(config.testUser.email)
    setPassword(config.testUser.password)
  }

  return (
    <div className="login-form">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          EasyGrid 新 SDK Demo
        </h1>
        <p className="text-gray-600">
          使用新 SDK + Canvas 表格的实时协作演示
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            邮箱
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入邮箱"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            密码
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入密码"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="loading-spinner mr-2"></div>
                登录中...
              </span>
            ) : (
              '登录'
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            使用演示账号
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h3 className="text-sm font-medium text-blue-800 mb-2">演示账号</h3>
          <p className="text-xs text-blue-700">
            邮箱: {config.testUser.email}
          </p>
          <p className="text-xs text-blue-700">
            密码: {config.testUser.password}
          </p>
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">测试说明</h3>
          <p className="text-xs text-yellow-700">
            登录后可以体验 Canvas 表格的实时协作功能
          </p>
          <p className="text-xs text-yellow-700">
            建议打开两个浏览器标签页进行测试
          </p>
        </div>
      </div>
    </div>
  )
}
