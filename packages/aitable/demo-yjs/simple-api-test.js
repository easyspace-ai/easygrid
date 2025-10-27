/**
 * 简单的 API 和 ShareDB 连接测试
 * 不依赖 DOM 操作，直接测试核心功能
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

// 测试结果
const results = {
  backend: false,
  frontend: false,
  login: false,
  shareDB: false,
  api: false,
  realtime: false
};

async function testBackendHealth() {
  log('\n🔍 测试后端服务健康状态...', 'blue');
  
  try {
    const response = await fetch(`${config.baseUrl}/health`);
    if (response.ok) {
      log('✅ 后端服务正常运行', 'green');
      results.backend = true;
      return true;
    } else {
      log(`❌ 后端服务响应异常: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 后端服务连接失败: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontendAccess() {
  log('\n🔍 测试前端服务访问...', 'blue');
  
  try {
    const response = await fetch(config.frontendUrl);
    if (response.ok) {
      log('✅ 前端服务正常运行', 'green');
      results.frontend = true;
      return true;
    } else {
      log(`❌ 前端服务响应异常: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 前端服务连接失败: ${error.message}`, 'red');
    return false;
  }
}

async function testLoginAPI() {
  log('\n🔍 测试登录 API...', 'blue');
  
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'Password123!'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.accessToken) {
        log('✅ 登录 API 正常工作', 'green');
        results.login = true;
        return data.data.accessToken;
      } else {
        log('❌ 登录响应格式异常', 'red');
        return null;
      }
    } else {
      log(`❌ 登录 API 失败: ${response.status}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ 登录 API 错误: ${error.message}`, 'red');
    return null;
  }
}

async function testShareDBConnection(token) {
  log('\n🔍 测试 ShareDB WebSocket 连接...', 'blue');
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听 WebSocket 连接
    let wsConnected = false;
    page.on('websocket', ws => {
      log('📡 WebSocket 连接建立', 'cyan');
      wsConnected = true;
    });
    
    // 访问前端页面
    await page.goto(config.frontendUrl);
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 执行登录
    await page.evaluate(async (token) => {
      localStorage.setItem('access_token', token);
      window.location.reload();
    }, token);
    
    // 等待 ShareDB 连接
    await page.waitForFunction(() => {
      return window.shareDBConnected === true;
    }, { timeout: 10000 });
    
    // 检查 ShareDB 连接状态
    const shareDBStatus = await page.evaluate(() => {
      return {
        connected: window.shareDBConnected,
        connection: window.shareDBConnection,
        documents: window.shareDBDocuments || []
      };
    });
    
    if (shareDBStatus.connected) {
      log('✅ ShareDB 连接成功', 'green');
      results.shareDB = true;
    } else {
      log('❌ ShareDB 连接失败', 'red');
    }
    
    await browser.close();
    return shareDBStatus.connected;
    
  } catch (error) {
    log(`❌ ShareDB 连接测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function testRecordAPI(token) {
  log('\n🔍 测试记录 API...', 'blue');
  
  try {
    // 获取表格列表
    const tablesResponse = await fetch(`${config.baseUrl}/api/v1/tables`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!tablesResponse.ok) {
      log(`❌ 获取表格列表失败: ${tablesResponse.status}`, 'red');
      return false;
    }
    
    const tables = await tablesResponse.json();
    if (tables.length === 0) {
      log('❌ 没有找到表格', 'red');
      return false;
    }
    
    const tableId = tables[0].id;
    log(`📊 使用表格: ${tableId}`, 'cyan');
    
    // 获取记录列表
    const recordsResponse = await fetch(`${config.baseUrl}/api/v1/tables/${tableId}/records`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!recordsResponse.ok) {
      log(`❌ 获取记录列表失败: ${recordsResponse.status}`, 'red');
      return false;
    }
    
    const records = await recordsResponse.json();
    if (records.length === 0) {
      log('❌ 没有找到记录', 'red');
      return false;
    }
    
    const recordId = records[0].id;
    log(`📝 使用记录: ${recordId}`, 'cyan');
    
    // 测试更新记录（使用 Teable 格式）
    const updateResponse = await fetch(`${config.baseUrl}/api/v1/tables/${tableId}/records/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fieldKeyType: 'id',
        record: {
          fields: {
            '测试字段': `API测试_${Date.now()}`
          }
        }
      })
    });
    
    if (updateResponse.ok) {
      log('✅ 记录更新 API 正常工作', 'green');
      results.api = true;
      return true;
    } else {
      log(`❌ 记录更新失败: ${updateResponse.status}`, 'red');
      const errorText = await updateResponse.text();
      log(`错误详情: ${errorText}`, 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ 记录 API 测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function testRealtimeSync(token) {
  log('\n🔍 测试实时同步功能...', 'blue');
  
  try {
    const browser = await chromium.launch();
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // 设置 ShareDB 连接监听
    let page1Connected = false;
    let page2Connected = false;
    let page1ReceivedUpdate = false;
    let page2ReceivedUpdate = false;
    
    page1.on('websocket', ws => {
      log('📡 页面1 WebSocket 连接建立', 'cyan');
    });
    
    page2.on('websocket', ws => {
      log('📡 页面2 WebSocket 连接建立', 'cyan');
    });
    
    // 页面1登录和连接
    await page1.goto(config.frontendUrl);
    await page1.waitForLoadState('networkidle');
    await page1.evaluate(async (token) => {
      localStorage.setItem('access_token', token);
      window.location.reload();
    }, token);
    
    await page1.waitForFunction(() => window.shareDBConnected === true, { timeout: 10000 });
    page1Connected = true;
    log('✅ 页面1 ShareDB 连接成功', 'green');
    
    // 页面2登录和连接
    await page2.goto(config.frontendUrl);
    await page2.waitForLoadState('networkidle');
    await page2.evaluate(async (token) => {
      localStorage.setItem('access_token', token);
      window.location.reload();
    }, token);
    
    await page2.waitForFunction(() => window.shareDBConnected === true, { timeout: 10000 });
    page2Connected = true;
    log('✅ 页面2 ShareDB 连接成功', 'green');
    
    // 监听 ShareDB 操作
    await page1.evaluate(() => {
      window.shareDBOperations = [];
      if (window.shareDBConnection) {
        window.shareDBConnection.on('op', (op) => {
          window.shareDBOperations.push(op);
          console.log('页面1收到ShareDB操作:', op);
        });
      }
    });
    
    await page2.evaluate(() => {
      window.shareDBOperations = [];
      if (window.shareDBConnection) {
        window.shareDBConnection.on('op', (op) => {
          window.shareDBOperations.push(op);
          console.log('页面2收到ShareDB操作:', op);
        });
      }
    });
    
    // 等待一段时间让连接稳定
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    // 检查连接状态
    const page1Status = await page1.evaluate(() => ({
      connected: window.shareDBConnected,
      operations: window.shareDBOperations?.length || 0
    }));
    
    const page2Status = await page2.evaluate(() => ({
      connected: window.shareDBConnected,
      operations: window.shareDBOperations?.length || 0
    }));
    
    log(`📊 页面1状态: 连接=${page1Status.connected}, 操作数=${page1Status.operations}`, 'cyan');
    log(`📊 页面2状态: 连接=${page2Status.connected}, 操作数=${page2Status.operations}`, 'cyan');
    
    if (page1Status.connected && page2Status.connected) {
      log('✅ 实时同步连接测试成功', 'green');
      results.realtime = true;
    } else {
      log('❌ 实时同步连接测试失败', 'red');
    }
    
    await browser.close();
    return page1Status.connected && page2Status.connected;
    
  } catch (error) {
    log(`❌ 实时同步测试失败: ${error.message}`, 'red');
    return false;
  }
}

async function runFullTest() {
  log('🚀 开始全面测试...', 'magenta');
  
  // 1. 测试后端健康状态
  const backendOk = await testBackendHealth();
  if (!backendOk) {
    log('❌ 后端服务不可用，终止测试', 'red');
    return;
  }
  
  // 2. 测试前端访问
  const frontendOk = await testFrontendAccess();
  if (!frontendOk) {
    log('❌ 前端服务不可用，终止测试', 'red');
    return;
  }
  
  // 3. 测试登录 API
  const token = await testLoginAPI();
  if (!token) {
    log('❌ 登录失败，终止测试', 'red');
    return;
  }
  
  // 4. 测试 ShareDB 连接
  const shareDBOk = await testShareDBConnection(token);
  if (!shareDBOk) {
    log('❌ ShareDB 连接失败，终止测试', 'red');
    return;
  }
  
  // 5. 测试记录 API
  const apiOk = await testRecordAPI(token);
  if (!apiOk) {
    log('❌ 记录 API 失败，终止测试', 'red');
    return;
  }
  
  // 6. 测试实时同步
  const realtimeOk = await testRealtimeSync(token);
  
  // 输出测试结果
  log('\n📊 测试结果总结:', 'magenta');
  log(`后端服务: ${results.backend ? '✅' : '❌'}`, results.backend ? 'green' : 'red');
  log(`前端服务: ${results.frontend ? '✅' : '❌'}`, results.frontend ? 'green' : 'red');
  log(`登录API: ${results.login ? '✅' : '❌'}`, results.login ? 'green' : 'red');
  log(`ShareDB连接: ${results.shareDB ? '✅' : '❌'}`, results.shareDB ? 'green' : 'red');
  log(`记录API: ${results.api ? '✅' : '❌'}`, results.api ? 'green' : 'red');
  log(`实时同步: ${results.realtime ? '✅' : '❌'}`, results.realtime ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    log('\n🎉 所有测试通过！ShareDB 功能正常', 'green');
  } else {
    log('\n⚠️ 部分测试失败，请检查相关配置', 'yellow');
  }
}

// 运行测试
runFullTest().catch(console.error);
