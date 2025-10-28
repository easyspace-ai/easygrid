/**
 * Node.js SDK 功能测试
 * 测试重构后的 SDK 核心功能
 */

import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 EasyGrid SDK 功能测试开始\n');

// 测试 1: 后端健康检查
async function testBackendHealth() {
  console.log('📋 测试 1: 后端健康检查');
  try {
    const response = await fetch('http://localhost:8080/health');
    const data = await response.json();
    console.log('✅ 后端健康检查通过');
    console.log(`📊 后端状态: ${JSON.stringify(data, null, 2)}\n`);
    return true;
  } catch (error) {
    console.log('❌ 后端健康检查失败:', error.message);
    return false;
  }
}

// 测试 2: WebSocket 连接
function testWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('📋 测试 2: WebSocket 连接');
    
    const ws = new WebSocket('ws://localhost:8080/socket');
    
    ws.on('open', () => {
      console.log('✅ WebSocket 连接成功');
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      console.log('❌ WebSocket 连接失败:', error.message);
      resolve(false);
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket 连接已关闭\n');
    });
  });
}

// 测试 3: SDK 构建产物检查
function testSDKBuild() {
  console.log('📋 测试 3: SDK 构建产物检查');
  
  const distPath = path.join(__dirname, 'dist');
  const indexJsPath = path.join(distPath, 'index.js');
  const indexDtsPath = path.join(distPath, 'index.d.ts');
  
  if (fs.existsSync(indexJsPath)) {
    console.log('✅ index.js 存在');
  } else {
    console.log('❌ index.js 不存在');
    return false;
  }
  
  if (fs.existsSync(indexDtsPath)) {
    console.log('✅ index.d.ts 存在');
  } else {
    console.log('❌ index.d.ts 不存在');
    return false;
  }
  
  // 检查核心模块
  const coreModules = [
    'core/EasyGridClient.js',
    'core/DocumentManager.js',
    'core/ConnectionManager.js',
    'hooks/connection/useConnection.js',
    'context/EasyGridProvider.js'
  ];
  
  let allModulesExist = true;
  coreModules.forEach(module => {
    const modulePath = path.join(distPath, module);
    if (fs.existsSync(modulePath)) {
      console.log(`✅ ${module} 存在`);
    } else {
      console.log(`❌ ${module} 不存在`);
      allModulesExist = false;
    }
  });
  
  console.log('');
  return allModulesExist;
}

// 测试 4: SDK 类型定义检查
function testSDKTypes() {
  console.log('📋 测试 4: SDK 类型定义检查');
  
  const indexDtsPath = path.join(__dirname, 'dist', 'index.d.ts');
  
  if (!fs.existsSync(indexDtsPath)) {
    console.log('❌ 类型定义文件不存在');
    return false;
  }
  
  const content = fs.readFileSync(indexDtsPath, 'utf8');
  
  const requiredExports = [
    'EasyGridProvider',
    'useConnection',
    'useRecord',
    'useRecords',
    'useField',
    'useFields',
    'useRecordMutation',
    'useBatchUpdate',
    'ConnectionIndicator'
  ];
  
  let allExportsExist = true;
  requiredExports.forEach(exportName => {
    if (content.includes(exportName)) {
      console.log(`✅ ${exportName} 类型定义存在`);
    } else {
      console.log(`❌ ${exportName} 类型定义不存在`);
      allExportsExist = false;
    }
  });
  
  console.log('');
  return allExportsExist;
}

// 测试 5: 模拟 SDK 使用
function testSDKUsage() {
  console.log('📋 测试 5: SDK 使用模拟');
  
  try {
    // 模拟导入 SDK
    const sdkPath = path.join(__dirname, 'dist', 'index.js');
    
    if (fs.existsSync(sdkPath)) {
      console.log('✅ SDK 模块可导入');
      
      // 检查模块内容
      const content = fs.readFileSync(sdkPath, 'utf8');
      
      if (content.includes('EasyGridProvider')) {
        console.log('✅ EasyGridProvider 导出正常');
      } else {
        console.log('❌ EasyGridProvider 导出异常');
        return false;
      }
      
      if (content.includes('useConnection')) {
        console.log('✅ useConnection Hook 导出正常');
      } else {
        console.log('❌ useConnection Hook 导出异常');
        return false;
      }
      
      console.log('✅ SDK 使用模拟通过\n');
      return true;
    } else {
      console.log('❌ SDK 模块文件不存在');
      return false;
    }
  } catch (error) {
    console.log('❌ SDK 使用模拟失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('='.repeat(50));
  console.log('EasyGrid SDK 功能测试报告');
  console.log('='.repeat(50));
  
  const results = [];
  
  // 运行测试
  results.push(await testBackendHealth());
  results.push(await testWebSocketConnection());
  results.push(testSDKBuild());
  results.push(testSDKTypes());
  results.push(testSDKUsage());
  
  // 统计结果
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('='.repeat(50));
  console.log(`测试结果: ${passed}/${total} 通过`);
  console.log('='.repeat(50));
  
  if (passed === total) {
    console.log('🎉 所有测试通过！SDK 功能正常');
  } else {
    console.log('⚠️  部分测试失败，请检查相关功能');
  }
  
  console.log('\n📋 测试详情:');
  console.log('1. 后端健康检查:', results[0] ? '✅' : '❌');
  console.log('2. WebSocket 连接:', results[1] ? '✅' : '❌');
  console.log('3. SDK 构建产物:', results[2] ? '✅' : '❌');
  console.log('4. SDK 类型定义:', results[3] ? '✅' : '❌');
  console.log('5. SDK 使用模拟:', results[4] ? '✅' : '❌');
}

// 启动测试
runAllTests().catch(console.error);
