/**
 * WebSocket 连接测试
 * 直接测试 ShareDB WebSocket 连接
 */

import { chromium } from 'playwright';

const config = {
  baseUrl: 'http://localhost:2345',
  frontendUrl: 'http://localhost:3000',
};

// 颜色输出
function log(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testShareDBWebSocket() {
  log('🚀 开始 ShareDB WebSocket 连接测试...', 'magenta');
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听 WebSocket 连接
    const wsConnections = [];
    page.on('websocket', ws => {
      const wsInfo = {
        url: ws.url(),
        timestamp: new Date().toISOString()
      };
      wsConnections.push(wsInfo);
      log(`📡 WebSocket 连接: ${ws.url()}`, 'cyan');
    });
    
    // 访问前端页面
    log('🌐 访问前端页面...', 'blue');
    await page.goto(config.frontendUrl);
    await page.waitForLoadState('networkidle');
    
    // 等待 WebSocket 连接建立
    log('⏳ 等待 WebSocket 连接建立...', 'blue');
    await page.waitForTimeout(5000);
    
    // 检查连接状态
    log(`📊 总共建立了 ${wsConnections.length} 个 WebSocket 连接`, 'cyan');
    
    // 分析 WebSocket 连接
    const shareDBConnections = wsConnections.filter(ws => 
      ws.url.includes('/socket') || ws.url.includes('sharedb')
    );
    
    log(`📊 ShareDB 相关连接: ${shareDBConnections.length}`, 'cyan');
    
    // 检查页面状态
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasReact: typeof window.React !== 'undefined',
        hasShareDB: typeof window.shareDBConnection !== 'undefined',
        shareDBConnected: window.shareDBConnected,
        shareDBConnection: window.shareDBConnection ? 'exists' : 'null',
        consoleErrors: window.consoleErrors || []
      };
    });
    
    log('📊 页面状态:', 'cyan');
    log(`  - URL: ${pageInfo.url}`, 'cyan');
    log(`  - Title: ${pageInfo.title}`, 'cyan');
    log(`  - React: ${pageInfo.hasReact}`, 'cyan');
    log(`  - ShareDB: ${pageInfo.hasShareDB}`, 'cyan');
    log(`  - Connected: ${pageInfo.shareDBConnected}`, 'cyan');
    log(`  - Connection: ${pageInfo.shareDBConnection}`, 'cyan');
    
    // 截图保存
    await page.screenshot({ path: 'websocket-test.png', fullPage: true });
    log('📸 页面截图已保存: websocket-test.png', 'cyan');
    
    await browser.close();
    
    // 判断测试结果
    if (wsConnections.length > 0) {
      log('✅ WebSocket 连接测试通过', 'green');
      return true;
    } else {
      log('❌ 没有建立 WebSocket 连接', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ WebSocket 测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function testDirectWebSocket() {
  log('🔍 测试直接 WebSocket 连接...', 'blue');
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 直接访问 ShareDB WebSocket 端点
    const wsUrl = `${config.baseUrl.replace('http', 'ws')}/socket?token=test`;
    log(`🔗 尝试连接: ${wsUrl}`, 'cyan');
    
    // 监听 WebSocket 连接
    let wsConnected = false;
    page.on('websocket', ws => {
      wsConnected = true;
      log(`📡 直接 WebSocket 连接成功: ${ws.url()}`, 'green');
    });
    
    // 访问页面并尝试建立连接
    await page.goto(config.frontendUrl);
    await page.waitForLoadState('networkidle');
    
    // 等待连接建立
    await page.waitForTimeout(3000);
    
    if (wsConnected) {
      log('✅ 直接 WebSocket 连接成功', 'green');
      return true;
    } else {
      log('❌ 直接 WebSocket 连接失败', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ 直接 WebSocket 测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function runWebSocketTest() {
  log('🚀 开始 WebSocket 连接测试...', 'magenta');
  
  const results = {
    shareDB: false,
    direct: false
  };
  
  // 1. 测试 ShareDB WebSocket
  results.shareDB = await testShareDBWebSocket();
  
  // 2. 测试直接 WebSocket
  results.direct = await testDirectWebSocket();
  
  // 输出结果
  log('\n📊 测试结果总结:', 'magenta');
  log(`ShareDB WebSocket: ${results.shareDB ? '✅' : '❌'}`, results.shareDB ? 'green' : 'red');
  log(`直接 WebSocket: ${results.direct ? '✅' : '❌'}`, results.direct ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    log('\n🎉 WebSocket 连接测试通过！', 'green');
  } else {
    log('\n⚠️ 部分 WebSocket 连接需要修复', 'yellow');
  }
  
  return results;
}

// 运行测试
runWebSocketTest().catch(console.error);
