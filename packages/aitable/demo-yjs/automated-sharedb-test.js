#!/usr/bin/env node

/**
 * ShareDB 实时同步自动化测试脚本
 * 使用 Playwright 模拟两个客户端同时操作，验证实时同步功能
 */

import { chromium } from 'playwright';

// 测试配置
const config = {
  frontend: 'http://localhost:3030',
  backend: 'http://localhost:2345',
  testUser: {
    email: 'admin@126.com',
    password: 'Pmker123'
  },
  testTimeout: 30000, // 30秒超时
  syncTimeout: 5000,  // 5秒同步等待时间
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 等待函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 登录用户
async function loginUser(page, userIndex) {
  log(`\n🔐 用户 ${userIndex} 开始登录...`, 'blue');
  
  try {
    // 导航到登录页面
    await page.goto(config.frontend);
    await page.waitForLoadState('networkidle');
    
    // 检查是否已经登录
    const isAlreadyLoggedIn = await page.locator('text=欢迎').isVisible();
    if (isAlreadyLoggedIn) {
      log(`✅ 用户 ${userIndex} 已经登录`, 'green');
      return true;
    }
    
    // 填写登录表单
    await page.fill('input[name="email"]', config.testUser.email);
    await page.fill('input[name="password"]', config.testUser.password);
    
    // 点击登录按钮
    await page.click('button:has-text("登录")');
    
    // 等待登录成功，检查是否显示主界面
    await page.waitForSelector('text=欢迎', { timeout: 10000 });
    
    log(`✅ 用户 ${userIndex} 登录成功`, 'green');
    return true;
  } catch (error) {
    log(`❌ 用户 ${userIndex} 登录失败: ${error.message}`, 'red');
    return false;
  }
}

// 检查 ShareDB 连接状态
async function checkShareDBConnection(page, userIndex) {
  log(`\n🔍 检查用户 ${userIndex} 的 ShareDB 连接状态...`, 'blue');
  
  try {
    // 等待连接指示器
    const connectionIndicator = page.locator('text=连接: 已连接');
    await connectionIndicator.waitFor({ timeout: 10000 });
    
    log(`✅ 用户 ${userIndex} ShareDB 连接正常`, 'green');
    return true;
  } catch (error) {
    log(`❌ 用户 ${userIndex} ShareDB 连接检查失败: ${error.message}`, 'red');
    return false;
  }
}

// 等待表格数据加载
async function waitForTableData(page, userIndex) {
  log(`\n📊 等待用户 ${userIndex} 的表格数据加载...`, 'blue');
  
  try {
    // 等待表格容器
    await page.waitForSelector('[role="main"]', { timeout: 15000 });
    
    // 等待状态栏显示记录数
    await page.waitForSelector('text=共', { timeout: 10000 });
    
    // 检查记录数
    const recordText = await page.locator('text=共').textContent();
    const recordCount = recordText.match(/共 (\d+) 条记录/)?.[1];
    
    if (recordCount && parseInt(recordCount) > 0) {
      log(`✅ 用户 ${userIndex} 表格数据加载成功 (${recordCount} 条记录)`, 'green');
      return true;
    } else {
      log(`⚠️  用户 ${userIndex} 表格数据为空`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ 用户 ${userIndex} 表格数据加载失败: ${error.message}`, 'red');
    return false;
  }
}

// 编辑单元格
async function editCell(page, userIndex, testValue) {
  log(`\n✏️  用户 ${userIndex} 编辑单元格为 "${testValue}"...`, 'blue');
  
  try {
    // 查找可编辑的单元格（使用更通用的选择器）
    // 尝试多种可能的选择器
    let cell;
    const selectors = [
      '[role="gridcell"]',
      '[data-testid="grid-cell"]',
      '.grid-cell',
      '.cell',
      'td',
      'div[data-cell]'
    ];
    
    for (const selector of selectors) {
      try {
        cell = page.locator(selector).nth(1);
        await cell.waitFor({ timeout: 1000 });
        break;
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }
    
    if (!cell) {
      throw new Error('无法找到可编辑的单元格');
    }
    
    // 双击进入编辑模式
    await cell.dblclick();
    
    // 等待编辑器出现
    await page.waitForSelector('input, textarea, [contenteditable]', { timeout: 5000 });
    
    // 清空并输入新值
    const editor = page.locator('input, textarea, [contenteditable]').first();
    await editor.fill('');
    await editor.type(testValue);
    
    // 按 Enter 提交
    await editor.press('Enter');
    
    // 等待编辑完成
    await sleep(1000);
    
    log(`✅ 用户 ${userIndex} 编辑完成: "${testValue}"`, 'green');
    return true;
  } catch (error) {
    log(`❌ 用户 ${userIndex} 编辑失败: ${error.message}`, 'red');
    return false;
  }
}

// 验证单元格值
async function verifyCellValue(page, userIndex, expectedValue) {
  log(`\n🔍 验证用户 ${userIndex} 单元格的值...`, 'blue');
  
  try {
    // 使用与 editCell 相同的选择器策略
    let cell;
    const selectors = [
      '[role="gridcell"]',
      '[data-testid="grid-cell"]',
      '.grid-cell',
      '.cell',
      'td',
      'div[data-cell]'
    ];
    
    for (const selector of selectors) {
      try {
        cell = page.locator(selector).nth(1);
        await cell.waitFor({ timeout: 1000 });
        break;
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }
    
    if (!cell) {
      throw new Error('无法找到单元格');
    }
    
    const actualValue = await cell.textContent();
    
    if (actualValue === expectedValue) {
      log(`✅ 用户 ${userIndex} 单元格值正确: "${actualValue}"`, 'green');
      return true;
    } else {
      log(`❌ 用户 ${userIndex} 单元格值不匹配: 期望 "${expectedValue}", 实际 "${actualValue}"`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 用户 ${userIndex} 验证失败: ${error.message}`, 'red');
    return false;
  }
}

// 截图保存
async function takeScreenshot(page, userIndex, step) {
  const filename = `sharedb-test-user-${userIndex}-${step}-${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  log(`📸 用户 ${userIndex} 截图已保存: ${filename}`, 'cyan');
  return filename;
}

// 主测试函数
async function runShareDBTest() {
  log('🚀 开始 ShareDB 实时同步自动化测试...', 'bold');
  
  const browser = await chromium.launch({ 
    headless: false, // 显示浏览器窗口
    slowMo: 1000    // 慢速执行，便于观察
  });
  
  let page1, page2;
  const results = {
    login: { user1: false, user2: false },
    connection: { user1: false, user2: false },
    data: { user1: false, user2: false },
    sync: { success: false }
  };
  
  try {
    // 创建两个浏览器上下文（模拟两个用户）
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    log('\n👥 创建两个用户会话...', 'magenta');
    
    // 用户1登录
    results.login.user1 = await loginUser(page1, 1);
    if (!results.login.user1) return;
    
    // 用户2登录
    results.login.user2 = await loginUser(page2, 2);
    if (!results.login.user2) return;
    
    // 检查 ShareDB 连接
    results.connection.user1 = await checkShareDBConnection(page1, 1);
    results.connection.user2 = await checkShareDBConnection(page2, 2);
    
    // 等待表格数据加载
    results.data.user1 = await waitForTableData(page1, 1);
    results.data.user2 = await waitForTableData(page2, 2);
    
    if (!results.data.user1 || !results.data.user2) {
      log('❌ 表格数据加载失败，无法继续测试', 'red');
      return;
    }
    
    // 截图保存初始状态
    await takeScreenshot(page1, 1, 'initial');
    await takeScreenshot(page2, 2, 'initial');
    
    log('\n🔄 开始实时同步测试...', 'magenta');
    
    // 测试1: 用户1编辑，用户2观察
    const testValue1 = `User1_Edit_${Date.now()}`;
    log(`\n📝 测试1: 用户1编辑单元格为 "${testValue1}"`, 'cyan');
    
    await editCell(page1, 1, testValue1);
    await sleep(config.syncTimeout); // 等待同步
    
    // 验证用户2是否看到更新
    const sync1Success = await verifyCellValue(page2, 2, testValue1);
    if (sync1Success) {
      log('✅ 测试1成功: 用户2实时看到用户1的编辑', 'green');
    } else {
      log('❌ 测试1失败: 用户2未看到用户1的编辑', 'red');
    }
    
    // 截图保存测试1结果
    await takeScreenshot(page1, 1, 'test1-after-edit');
    await takeScreenshot(page2, 2, 'test1-after-sync');
    
    // 测试2: 用户2编辑，用户1观察
    const testValue2 = `User2_Edit_${Date.now()}`;
    log(`\n📝 测试2: 用户2编辑单元格为 "${testValue2}"`, 'cyan');
    
    await editCell(page2, 2, testValue2);
    await sleep(config.syncTimeout); // 等待同步
    
    // 验证用户1是否看到更新
    const sync2Success = await verifyCellValue(page1, 1, testValue2);
    if (sync2Success) {
      log('✅ 测试2成功: 用户1实时看到用户2的编辑', 'green');
    } else {
      log('❌ 测试2失败: 用户1未看到用户2的编辑', 'red');
    }
    
    // 截图保存测试2结果
    await takeScreenshot(page1, 1, 'test2-after-sync');
    await takeScreenshot(page2, 2, 'test2-after-edit');
    
    // 测试3: 并发编辑测试
    log('\n⚡ 测试3: 并发编辑测试', 'cyan');
    const concurrentValue1 = `Concurrent1_${Date.now()}`;
    const concurrentValue2 = `Concurrent2_${Date.now()}`;
    
    // 同时编辑不同单元格
    await Promise.all([
      editCell(page1, 1, concurrentValue1),
      editCell(page2, 2, concurrentValue2)
    ]);
    
    await sleep(config.syncTimeout * 2); // 等待同步
    
    // 验证两个用户都能看到对方的编辑
    const concurrent1Success = await verifyCellValue(page2, 2, concurrentValue1);
    const concurrent2Success = await verifyCellValue(page1, 1, concurrentValue2);
    
    if (concurrent1Success && concurrent2Success) {
      log('✅ 测试3成功: 并发编辑同步正常', 'green');
      results.sync.success = true;
    } else {
      log('❌ 测试3失败: 并发编辑同步异常', 'red');
    }
    
    // 最终截图
    await takeScreenshot(page1, 1, 'final');
    await takeScreenshot(page2, 2, 'final');
    
  } catch (error) {
    log(`❌ 测试过程中发生错误: ${error.message}`, 'red');
  } finally {
    // 关闭浏览器
    await browser.close();
  }
  
  // 输出最终结果
  log('\n📊 测试结果总结:', 'bold');
  log(`用户1登录: ${results.login.user1 ? '✅' : '❌'}`, results.login.user1 ? 'green' : 'red');
  log(`用户2登录: ${results.login.user2 ? '✅' : '❌'}`, results.login.user2 ? 'green' : 'red');
  log(`用户1连接: ${results.connection.user1 ? '✅' : '❌'}`, results.connection.user1 ? 'green' : 'red');
  log(`用户2连接: ${results.connection.user2 ? '✅' : '❌'}`, results.connection.user2 ? 'green' : 'red');
  log(`用户1数据: ${results.data.user1 ? '✅' : '❌'}`, results.data.user1 ? 'green' : 'red');
  log(`用户2数据: ${results.data.user2 ? '✅' : '❌'}`, results.data.user2 ? 'green' : 'red');
  log(`实时同步: ${results.sync.success ? '✅' : '❌'}`, results.sync.success ? 'green' : 'red');
  
  if (results.sync.success) {
    log('\n🎉 ShareDB 实时同步测试成功！', 'green');
  } else {
    log('\n⚠️  ShareDB 实时同步测试存在问题，请检查配置', 'yellow');
  }
  
  return results;
}

// 运行测试
runShareDBTest().catch(console.error);

export { runShareDBTest };
