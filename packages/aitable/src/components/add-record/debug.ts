/**
 * AddRecordDialog 调试工具
 */

export function debugAddRecordDialog() {
  console.log('🔍 AddRecordDialog Debug Info:');
  
  // 检查依赖
  console.log('📦 Dependencies:', {
    react: typeof React !== 'undefined' ? '✅' : '❌',
    reactDom: typeof ReactDOM !== 'undefined' ? '✅' : '❌',
    createPortal: typeof ReactDOM?.createPortal === 'function' ? '✅' : '❌',
  });
  
  // 检查组件
  try {
    const { AddRecordDialog } = require('./AddRecordDialog');
    console.log('🎯 AddRecordDialog Component:', AddRecordDialog ? '✅' : '❌');
  } catch (error) {
    console.log('❌ AddRecordDialog Import Error:', error);
  }
  
  // 检查字段编辑器
  try {
    const { getFieldEditor } = require('./field-editors');
    console.log('🛠️ Field Editor Registry:', typeof getFieldEditor === 'function' ? '✅' : '❌');
  } catch (error) {
    console.log('❌ Field Editor Import Error:', error);
  }
  
  // 检查校验器
  try {
    const { validateForm } = require('./validators');
    console.log('✅ Validators:', typeof validateForm === 'function' ? '✅' : '❌');
  } catch (error) {
    console.log('❌ Validators Import Error:', error);
  }
  
  console.log('🎉 Debug complete!');
}

// 在开发环境下自动运行
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(debugAddRecordDialog, 1000);
}
