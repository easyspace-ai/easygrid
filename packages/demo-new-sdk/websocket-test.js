/**
 * WebSocket 连接测试
 */

import WebSocket from 'ws'

console.log('🔍 WebSocket 连接测试')

// 测试 1: 无认证连接
console.log('📋 测试 1: 无认证连接')
const ws1 = new WebSocket('ws://localhost:8080/socket')

ws1.on('open', () => {
  console.log('✅ 无认证连接成功')
  ws1.close()
})

ws1.on('error', (error) => {
  console.log('❌ 无认证连接失败:', error.message)
})

ws1.on('close', () => {
  console.log('🔌 无认证连接已关闭')
})

// 测试 2: 带认证连接
setTimeout(() => {
  console.log('📋 测试 2: 带认证连接')
  
  // 先获取 token
  fetch('http://localhost:8080/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@126.com',
      password: 'Pmker123'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.code === 200000) {
      const token = data.data.accessToken
      console.log('🔑 获取到 token:', token.substring(0, 20) + '...')
      
      // 使用 token 连接 WebSocket
      const ws2 = new WebSocket(`ws://localhost:8080/socket?token=${token}`)
      
      ws2.on('open', () => {
        console.log('✅ 带认证连接成功')
        ws2.close()
      })
      
      ws2.on('error', (error) => {
        console.log('❌ 带认证连接失败:', error.message)
      })
      
      ws2.on('close', () => {
        console.log('🔌 带认证连接已关闭')
      })
    } else {
      console.log('❌ 获取 token 失败')
    }
  })
  .catch(error => {
    console.log('❌ 获取 token 错误:', error.message)
  })
}, 2000)
