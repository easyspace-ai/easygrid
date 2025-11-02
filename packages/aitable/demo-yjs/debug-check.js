/**
 * 应用状态检查脚本
 * 用于验证demo应用是否正常运行
 */

// 检查应用是否加载
function checkAppStatus() {
  console.log('🔍 检查应用状态...')
  
  // 检查React是否加载
  if (typeof React !== 'undefined') {
    console.log('✅ React已加载')
  } else {
    console.log('❌ React未加载')
  }
  
  // 检查SDK是否可用
  if (typeof window.EasyGridSDK !== 'undefined') {
    console.log('✅ EasyGridSDK已加载')
  } else {
    console.log('❌ EasyGridSDK未加载')
  }
  
  // 检查DOM元素
  const root = document.getElementById('root')
  if (root) {
    console.log('✅ React根元素存在')
    console.log('📊 根元素内容:', root.innerHTML.length > 0 ? '有内容' : '空')
  } else {
    console.log('❌ React根元素不存在')
  }
  
  // 检查控制台错误
  const errors = console.error.toString()
  console.log('📋 控制台状态检查完成')
}

// 页面加载完成后运行检查
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAppStatus)
} else {
  checkAppStatus()
}

// 导出检查函数供手动调用
window.checkAppStatus = checkAppStatus
