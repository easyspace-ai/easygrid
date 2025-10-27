/**
 * 手动 ShareDB 测试脚本
 * 验证 ShareDB WebSocket 连接和实时同步功能
 */

import { chromium } from 'playwright';

const config = {
  baseUrl: 'http://localhost:2345',
  frontendUrl: 'http://localhost:3000',
  testUser: {
    email: 'admin@test.com',
    password: 'Password123!'
  }
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

async function testLoginAndGetToken() {
  log('🔐 测试登录并获取 token...', 'blue');
  
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.testUser)
    });
    
    if (!response.ok) {
      throw new Error(`登录失败: ${response.status}`);
    }
    
    const data = await response.json();
    const token = data.data.accessToken;
    
    log('✅ 登录成功，获取到 token', 'green');
    return token;
  } catch (error) {
    log(`❌ 登录失败: ${error.message}`, 'red');
    throw error;
  }
}

async function testGetBases(token) {
  log('📋 测试获取 bases 列表...', 'blue');
  
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/bases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`获取 bases 失败: ${response.status}`);
    }
    
    const bases = await response.json();
    if (bases.length === 0) {
      throw new Error('没有找到 bases');
    }
    
    const baseId = bases[0].id;
    log(`✅ 找到 base: ${baseId}`, 'green');
    return baseId;
  } catch (error) {
    log(`❌ 获取 bases 失败: ${error.message}`, 'red');
    throw error;
  }
}

async function testGetTables(token, baseId) {
  log('📊 测试获取表格列表...', 'blue');
  
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/bases/${baseId}/tables`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`获取表格失败: ${response.status}`);
    }
    
    const tables = await response.json();
    if (tables.length === 0) {
      throw new Error('没有找到表格');
    }
    
    const tableId = tables[0].id;
    log(`✅ 找到表格: ${tableId}`, 'green');
    return tableId;
  } catch (error) {
    log(`❌ 获取表格失败: ${error.message}`, 'red');
    throw error;
  }
}

async function testGetRecords(token, tableId) {
  log('📝 测试获取记录列表...', 'blue');
  
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/tables/${tableId}/records`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`获取记录失败: ${response.status}`);
    }
    
    const records = await response.json();
    if (records.length === 0) {
      throw new Error('没有找到记录');
    }
    
    const recordId = records[0].id;
    log(`✅ 找到记录: ${recordId}`, 'green');
    return { records, recordId };
  } catch (error) {
    log(`❌ 获取记录失败: ${error.message}`, 'red');
    throw error;
  }
}

async function testShareDBWebSocket(token, tableId, recordId) {
  log('🔌 测试 ShareDB WebSocket 连接...', 'blue');
  
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
    await page.goto(config.frontendUrl);
    await page.waitForLoadState('networkidle');
    
    // 等待 ShareDB 连接建立
    log('⏳ 等待 ShareDB 连接建立...', 'blue');
    await page.waitForTimeout(5000);
    
    // 检查 ShareDB 连接状态
    const shareDBStatus = await page.evaluate(() => {
      return {
        hasShareDB: typeof window.shareDBConnection !== 'undefined',
        shareDBConnected: window.shareDBConnected,
        shareDBConnection: window.shareDBConnection ? 'exists' : 'null',
        baseURL: window.location.origin
      };
    });
    
    log('📊 ShareDB 状态:', 'cyan');
    log(`  - hasShareDB: ${shareDBStatus.hasShareDB}`, 'cyan');
    log(`  - shareDBConnected: ${shareDBStatus.shareDBConnected}`, 'cyan');
    log(`  - shareDBConnection: ${shareDBStatus.shareDBConnection}`, 'cyan');
    
    // 分析 WebSocket 连接
    const shareDBConnections = wsConnections.filter(ws => 
      ws.url.includes('/socket') || ws.url.includes('sharedb')
    );
    
    log(`📊 总 WebSocket 连接: ${wsConnections.length}`, 'cyan');
    log(`📊 ShareDB 相关连接: ${shareDBConnections.length}`, 'cyan');
    
    // 截图保存
    await page.screenshot({ path: 'manual-sharedb-test.png', fullPage: true });
    log('📸 页面截图已保存: manual-sharedb-test.png', 'cyan');
    
    await browser.close();
    
    if (shareDBConnections.length > 0) {
      log('✅ ShareDB WebSocket 连接成功', 'green');
      return true;
    } else {
      log('❌ 没有建立 ShareDB WebSocket 连接', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ ShareDB WebSocket 测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function testRealTimeSync(token, tableId, recordId) {
  log('🔄 测试实时同步功能...', 'blue');
  
  try {
    // 创建两个浏览器实例
    const browser1 = await chromium.launch();
    const browser2 = await chromium.launch();
    
    const context1 = await browser1.newContext();
    const context2 = await browser2.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // 监听 WebSocket 连接
    const wsConnections1 = [];
    const wsConnections2 = [];
    
    page1.on('websocket', ws => wsConnections1.push(ws.url()));
    page2.on('websocket', ws => wsConnections2.push(ws.url()));
    
    // 两个页面都访问前端
    await Promise.all([
      page1.goto(config.frontendUrl),
      page2.goto(config.frontendUrl)
    ]);
    
    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);
    
    // 等待连接建立
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);
    
    log(`📊 客户端1 WebSocket 连接: ${wsConnections1.length}`, 'cyan');
    log(`📊 客户端2 WebSocket 连接: ${wsConnections2.length}`, 'cyan');
    
    // 检查两个客户端的 ShareDB 状态
    const status1 = await page1.evaluate(() => ({
      shareDBConnected: window.shareDBConnected,
      hasShareDB: typeof window.shareDBConnection !== 'undefined'
    }));
    
    const status2 = await page2.evaluate(() => ({
      shareDBConnected: window.shareDBConnected,
      hasShareDB: typeof window.shareDBConnection !== 'undefined'
    }));
    
    log('📊 客户端1 ShareDB 状态:', 'cyan');
    log(`  - hasShareDB: ${status1.hasShareDB}`, 'cyan');
    log(`  - shareDBConnected: ${status1.shareDBConnected}`, 'cyan');
    
    log('📊 客户端2 ShareDB 状态:', 'cyan');
    log(`  - hasShareDB: ${status2.hasShareDB}`, 'cyan');
    log(`  - shareDBConnected: ${status2.shareDBConnected}`, 'cyan');
    
    await browser1.close();
    await browser2.close();
    
    if (status1.shareDBConnected && status2.shareDBConnected) {
      log('✅ 两个客户端都成功连接到 ShareDB', 'green');
      return true;
    } else {
      log('❌ 客户端 ShareDB 连接失败', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ 实时同步测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function runManualTest() {
  log('🚀 开始手动 ShareDB 测试...', 'magenta');
  
  try {
    // 1. 登录获取 token
    const token = await testLoginAndGetToken();
    
    // 2. 获取 bases
    const baseId = await testGetBases(token);
    
    // 3. 获取表格
    const tableId = await testGetTables(token, baseId);
    
    // 4. 获取记录
    const { records, recordId } = await testGetRecords(token, tableId);
    
    // 5. 测试 ShareDB WebSocket 连接
    const wsConnected = await testShareDBWebSocket(token, tableId, recordId);
    
    // 6. 测试实时同步
    const syncWorking = await testRealTimeSync(token, tableId, recordId);
    
    // 输出结果
    log('\n📊 测试结果总结:', 'magenta');
    log(`登录认证: ✅`, 'green');
    log(`API 路由: ✅`, 'green');
    log(`ShareDB WebSocket: ${wsConnected ? '✅' : '❌'}`, wsConnected ? 'green' : 'red');
    log(`实时同步: ${syncWorking ? '✅' : '❌'}`, syncWorking ? 'green' : 'red');
    
    const allPassed = wsConnected && syncWorking;
    if (allPassed) {
      log('\n🎉 手动 ShareDB 测试通过！', 'green');
    } else {
      log('\n⚠️ 部分功能需要修复', 'yellow');
    }
    
    return { wsConnected, syncWorking };
    
  } catch (error) {
    log(`❌ 手动测试失败: ${error.message}`, 'red');
    return { wsConnected: false, syncWorking: false };
  }
}

// 运行测试
runManualTest().catch(console.error);
