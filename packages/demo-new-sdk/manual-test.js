/**
 * 手动测试脚本
 * 验证新 SDK + Canvas 表格的功能
 */

console.log('🚀 EasyGrid 新 SDK + Canvas 表格手动测试')
console.log('='.repeat(50))

// 测试配置
const TEST_CONFIG = {
  frontend: 'http://localhost:3040',
  backend: 'http://localhost:8080',
  testUser: {
    email: 'admin@126.com',
    password: 'Pmker123'
  }
}

// 测试步骤
const testSteps = [
  {
    name: '后端健康检查',
    action: async () => {
      const response = await fetch(`${TEST_CONFIG.backend}/health`)
      const data = await response.json()
      console.log('✅ 后端健康检查通过:', data.status)
      return data.status === 'ok'
    }
  },
  {
    name: '前端页面访问',
    action: async () => {
      const response = await fetch(TEST_CONFIG.frontend)
      const html = await response.text()
      const hasReact = html.includes('React')
      console.log('✅ 前端页面访问成功:', hasReact ? 'React 应用' : '静态页面')
      return response.ok
    }
  },
  {
    name: '登录 API 测试',
    action: async () => {
      try {
        const response = await fetch(`${TEST_CONFIG.backend}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(TEST_CONFIG.testUser)
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ 登录 API 测试通过:', data.code === 200000 ? '成功' : '失败')
          return data.code === 200000
        } else {
          console.log('❌ 登录 API 测试失败:', response.status)
          return false
        }
      } catch (error) {
        console.log('❌ 登录 API 测试错误:', error.message)
        return false
      }
    }
  },
  {
    name: 'WebSocket 连接测试',
    action: async () => {
      return new Promise((resolve) => {
        const ws = new WebSocket(`${TEST_CONFIG.backend.replace('http', 'ws')}/socket`)
        
        ws.onopen = () => {
          console.log('✅ WebSocket 连接成功')
          ws.close()
          resolve(true)
        }
        
        ws.onerror = (error) => {
          console.log('❌ WebSocket 连接失败:', error)
          resolve(false)
        }
        
        setTimeout(() => {
          console.log('⏰ WebSocket 连接超时')
          resolve(false)
        }, 5000)
      })
    }
  }
]

// 运行测试
async function runTests() {
  console.log('📋 开始手动测试...\n')
  
  let passed = 0
  let total = testSteps.length
  
  for (const step of testSteps) {
    console.log(`🔍 ${step.name}...`)
    try {
      const result = await step.action()
      if (result) {
        passed++
      }
    } catch (error) {
      console.log(`❌ ${step.name} 失败:`, error.message)
    }
    console.log('')
  }
  
  console.log('='.repeat(50))
  console.log(`📊 测试结果: ${passed}/${total} 通过`)
  console.log('='.repeat(50))
  
  if (passed === total) {
    console.log('🎉 所有测试通过！')
    console.log('')
    console.log('📋 手动测试步骤:')
    console.log('1. 打开浏览器访问: http://localhost:3040')
    console.log('2. 使用演示账号登录:')
    console.log(`   邮箱: ${TEST_CONFIG.testUser.email}`)
    console.log(`   密码: ${TEST_CONFIG.testUser.password}`)
    console.log('3. 等待 Canvas 表格加载')
    console.log('4. 打开第二个浏览器标签页')
    console.log('5. 登录相同账号')
    console.log('6. 在第一个标签页编辑单元格')
    console.log('7. 观察第二个标签页是否实时更新')
    console.log('')
    console.log('🔍 检查项目:')
    console.log('- ✅ 连接状态指示器显示"已连接"')
    console.log('- ✅ Canvas 表格正确渲染')
    console.log('- ✅ 单元格编辑功能正常')
    console.log('- ✅ 双标签页实时同步')
  } else {
    console.log('⚠️  部分测试失败，请检查相关服务')
  }
}

// 启动测试
runTests().catch(console.error)
