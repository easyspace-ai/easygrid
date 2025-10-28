/**
 * 前端 SDK 测试
 * 测试重构后的 SDK 功能
 */

import React from 'react'
import { render } from 'react-dom'
import {
  EasyGridProvider,
  useConnection,
  useRecord,
  ConnectionIndicator
} from './dist/index'

// 测试组件
function TestComponent() {
  const { state, isConnected, error } = useConnection()
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>EasyGrid SDK 测试</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>连接状态</h2>
        <ConnectionIndicator />
        <p>状态: {state}</p>
        <p>已连接: {isConnected ? '是' : '否'}</p>
        {error && <p style={{ color: 'red' }}>错误: {error.message}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>记录测试</h2>
        <RecordTest />
      </div>
    </div>
  )
}

function RecordTest() {
  const { record, loading, error } = useRecord('test_table', 'test_record')
  
  if (loading) return <p>加载中...</p>
  if (error) return <p style={{ color: 'red' }}>错误: {error.message}</p>
  
  return (
    <div>
      <p>记录数据: {JSON.stringify(record, null, 2)}</p>
    </div>
  )
}

// 测试应用
function TestApp() {
  return (
    <EasyGridProvider
      config={{
        wsUrl: 'ws://localhost:8080/socket',
        accessToken: 'test-token',
        debug: true
      }}
      errorHandler={(error) => {
        console.error('SDK Error:', error)
      }}
      onConnected={() => {
        console.log('✅ SDK 连接成功!')
      }}
      onDisconnected={() => {
        console.log('❌ SDK 连接断开')
      }}
      onStateChange={(state) => {
        console.log('🔄 连接状态变化:', state)
      }}
    >
      <TestComponent />
    </EasyGridProvider>
  )
}

// 渲染测试应用
const container = document.getElementById('root')
if (container) {
  render(<TestApp />, container)
} else {
  console.error('找不到 root 元素')
}

console.log('🚀 EasyGrid SDK 测试启动')
