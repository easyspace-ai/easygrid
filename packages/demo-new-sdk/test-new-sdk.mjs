/**
 * 测试新的简洁 SDK
 */

// 测试 SDK 初始化
console.log('=== 测试 EasyGrid SDK ===')

// 模拟浏览器环境
global.window = {
  EasyGridSDK: null,
  initEasyGridSDK: null,
  getEasyGridSDK: null
}

try {
  // 动态导入 SDK
  const { initEasyGridSDK, getEasyGridSDK } = await import('@easygrid/sdk')
  
  console.log('✅ SDK 导入成功')
  
  // 初始化 SDK
  const sdk = initEasyGridSDK({
    baseURL: 'http://localhost:8080',
    wsUrl: 'ws://localhost:8080/socket',
    debug: true
  })
  
  console.log('✅ SDK 初始化成功')
  console.log('SDK 配置:', sdk.getConfig())
  
  // 测试获取 SDK 实例
  const sdkInstance = getEasyGridSDK()
  console.log('✅ 获取 SDK 实例成功')
  
  // 测试认证状态
  console.log('认证状态:', sdkInstance.isAuthenticated())
  
  console.log('=== SDK 测试完成 ===')
  
} catch (error) {
  console.error('❌ SDK 测试失败:', error.message)
  console.error('错误详情:', error)
}
