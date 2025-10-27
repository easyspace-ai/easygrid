/**
 * 基础功能测试
 * 测试 HTTP API 和 ShareDB 核心功能
 */

import { chromium } from 'playwright';

const config = {
  baseUrl: 'http://localhost:2345',
  frontendUrl: 'http://localhost:3000',
  timeout: 10000,
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

async function testBasicAPI() {
  log('\n🔍 测试基础 API 功能...', 'blue');
  
  try {
    // 1. 测试登录
    const loginResponse = await fetch(`${config.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'Password123!'
      })
    });
    
    if (!loginResponse.ok) {
      log('❌ 登录失败', 'red');
      return false;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    log('✅ 登录成功', 'green');
    
    // 2. 测试获取 spaces 列表
    const spacesResponse = await fetch(`${config.baseUrl}/api/v1/spaces`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!spacesResponse.ok) {
      log('❌ 获取 spaces 列表失败', 'red');
      return false;
    }
    
    const spacesData = await spacesResponse.json();
    const spaces = spacesData.data;
    if (!spaces || spaces.length === 0) {
      log('❌ 没有找到 spaces', 'red');
      log(`spaces 响应: ${JSON.stringify(spacesData)}`, 'red');
      return false;
    }
    
    const spaceId = spaces[0].id;
    log(`✅ 找到 space: ${spaceId}`, 'green');
    
    // 3. 测试获取 bases 列表
    const basesResponse = await fetch(`${config.baseUrl}/api/v1/spaces/${spaceId}/bases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!basesResponse.ok) {
      log('❌ 获取 bases 列表失败', 'red');
      return false;
    }
    
    const basesData = await basesResponse.json();
    const bases = basesData.data;
    if (!bases || bases.length === 0) {
      log('❌ 没有找到 bases', 'red');
      log(`bases 响应: ${JSON.stringify(basesData)}`, 'red');
      return false;
    }
    
    const baseId = bases[0].id;
    log(`✅ 找到 base: ${baseId}`, 'green');
    
    // 4. 测试获取表格列表
    const tablesResponse = await fetch(`${config.baseUrl}/api/v1/bases/${baseId}/tables`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!tablesResponse.ok) {
      log('❌ 获取表格列表失败', 'red');
      return false;
    }
    
    const tablesData = await tablesResponse.json();
    const tables = tablesData.data;
    if (!tables || tables.length === 0) {
      log('❌ 没有找到表格', 'red');
      log(`tables 响应: ${JSON.stringify(tablesData)}`, 'red');
      return false;
    }
    
    const tableId = tables[0].id;
    log(`✅ 找到表格: ${tableId}`, 'green');
    
    // 5. 测试获取记录列表
    const recordsResponse = await fetch(`${config.baseUrl}/api/v1/tables/${tableId}/records`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!recordsResponse.ok) {
      log('❌ 获取记录列表失败', 'red');
      return false;
    }
    
    const recordsData = await recordsResponse.json();
    const records = recordsData.data;
    if (!records || !records.list || records.list.length === 0) {
      log('❌ 没有找到记录', 'red');
      log(`records 响应: ${JSON.stringify(recordsData)}`, 'red');
      return false;
    }
    
    const recordId = records.list[0].id;
    log(`✅ 找到记录: ${recordId}`, 'green');
    
    // 6. 测试更新记录（使用 Teable 格式）
    const updateResponse = await fetch(`${config.baseUrl}/api/v1/tables/${tableId}/records/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          'fld_Z6W8SAQs2ZKrCcmVi0Qys': `API测试_${Date.now()}`
        }
      })
    });
    
    if (updateResponse.ok) {
      log('✅ 记录更新成功（Teable 格式）', 'green');
      return true;
    } else {
      log(`❌ 记录更新失败: ${updateResponse.status}`, 'red');
      const errorText = await updateResponse.text();
      log(`错误详情: ${errorText}`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ API 测试失败: ${error.message}`, 'red');
    log(`错误堆栈: ${error.stack}`, 'red');
    return false;
  }
}

async function testShareDBWebSocket() {
  log('\n🔍 测试 ShareDB WebSocket 连接...', 'blue');
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听 WebSocket 连接
    let wsCount = 0;
    page.on('websocket', ws => {
      wsCount++;
      log(`📡 WebSocket 连接 #${wsCount}`, 'cyan');
    });
    
    // 访问前端页面
    await page.goto(config.frontendUrl);
    await page.waitForLoadState('networkidle');
    
    // 等待一段时间让连接建立
    await page.waitForTimeout(3000);
    
    log(`📊 总共建立了 ${wsCount} 个 WebSocket 连接`, 'cyan');
    
    // 检查页面是否有 ShareDB 相关的全局变量
    const shareDBInfo = await page.evaluate(() => {
      return {
        hasShareDB: typeof window.shareDBConnection !== 'undefined',
        hasShareDBConnected: typeof window.shareDBConnected !== 'undefined',
        shareDBConnected: window.shareDBConnected,
        shareDBConnection: window.shareDBConnection ? 'exists' : 'null'
      };
    });
    
    log(`📊 ShareDB 状态:`, 'cyan');
    log(`  - hasShareDB: ${shareDBInfo.hasShareDB}`, 'cyan');
    log(`  - hasShareDBConnected: ${shareDBInfo.hasShareDBConnected}`, 'cyan');
    log(`  - shareDBConnected: ${shareDBInfo.shareDBConnected}`, 'cyan');
    log(`  - shareDBConnection: ${shareDBInfo.shareDBConnection}`, 'cyan');
    
    await browser.close();
    
    if (wsCount > 0) {
      log('✅ WebSocket 连接正常', 'green');
      return true;
    } else {
      log('❌ 没有建立 WebSocket 连接', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ ShareDB 测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function testRealtimeConnection() {
  log('\n🔍 测试实时连接功能...', 'blue');
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 访问前端页面
    await page.goto(config.frontendUrl);
    await page.waitForLoadState('networkidle');
    
    // 等待页面完全加载
    await page.waitForTimeout(5000);
    
    // 检查页面状态
    const pageStatus = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasReact: typeof window.React !== 'undefined',
        hasShareDB: typeof window.shareDBConnection !== 'undefined',
        shareDBConnected: window.shareDBConnected,
        consoleErrors: window.consoleErrors || []
      };
    });
    
    log(`📊 页面状态:`, 'cyan');
    log(`  - URL: ${pageStatus.url}`, 'cyan');
    log(`  - Title: ${pageStatus.title}`, 'cyan');
    log(`  - React: ${pageStatus.hasReact}`, 'cyan');
    log(`  - ShareDB: ${pageStatus.hasShareDB}`, 'cyan');
    log(`  - Connected: ${pageStatus.shareDBConnected}`, 'cyan');
    
    // 截图保存
    await page.screenshot({ path: 'test-page-status.png', fullPage: true });
    log('📸 页面截图已保存: test-page-status.png', 'cyan');
    
    await browser.close();
    
    if (pageStatus.hasShareDB) {
      log('✅ ShareDB 已初始化', 'green');
      return true;
    } else {
      log('❌ ShareDB 未初始化', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ 实时连接测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function runBasicTest() {
  log('🚀 开始基础功能测试...', 'magenta');
  
  const results = {
    api: false,
    websocket: false,
    realtime: false
  };
  
  // 1. 测试 API
  results.api = await testBasicAPI();
  
  // 2. 测试 WebSocket
  results.websocket = await testShareDBWebSocket();
  
  // 3. 测试实时连接
  results.realtime = await testRealtimeConnection();
  
  // 输出结果
  log('\n📊 测试结果总结:', 'magenta');
  log(`API 功能: ${results.api ? '✅' : '❌'}`, results.api ? 'green' : 'red');
  log(`WebSocket 连接: ${results.websocket ? '✅' : '❌'}`, results.websocket ? 'green' : 'red');
  log(`实时连接: ${results.realtime ? '✅' : '❌'}`, results.realtime ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    log('\n🎉 基础功能测试通过！', 'green');
  } else {
    log('\n⚠️ 部分功能需要修复', 'yellow');
  }
  
  return results;
}

// 运行测试
runBasicTest().catch(console.error);
