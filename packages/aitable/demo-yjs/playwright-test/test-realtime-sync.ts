/**
 * ShareDB 实时同步演示测试
 * 使用 Playwright 自动化测试多窗口实时协作功能
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

// 测试配置
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:2345';
const TEST_EMAIL = 'admin@126.com';
const TEST_PASSWORD = 'Pmker123';
const TEST_TABLE_ID = 'tbl_Pweb3NpbtiUb4Fwbi90WP';

// 测试数据
const getTestData = (prefix: string) => `${prefix}_${Date.now()}`;

// 截图目录
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

test.describe('ShareDB 实时同步测试', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async ({ browser }) => {
    // 创建两个独立的浏览器上下文
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    
    // 创建两个页面
    page1 = await context1.newPage();
    page2 = await context2.newPage();
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('步骤 A：单窗口基础测试', async () => {
    console.log('🧪 开始步骤 A：单窗口基础测试');
    
    // 1. 打开浏览器访问应用
    await page1.goto(BASE_URL);
    await page1.waitForLoadState('networkidle');
    
    // 截图：登录页面
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-page.png') });
    
    // 2. 检查是否显示登录表单
    const loginForm = page1.locator('form').first();
    await expect(loginForm).toBeVisible();
    
    // 3. 输入登录信息
    await page1.fill('input[type="email"]', TEST_EMAIL);
    await page1.fill('input[type="password"]', TEST_PASSWORD);
    
    // 4. 点击登录按钮
    await page1.click('button[type="submit"]');
    
    // 5. 等待登录完成，检查是否显示主界面
    await page1.waitForSelector('h1:has-text("EasyGrid Demo")', { timeout: 10000 });
    
    // 截图：登录成功后的主界面
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '02-main-interface.png') });
    
    // 6. 检查 ShareDB 连接状态指示器
    const connectionIndicator = page1.locator('.w-2.h-2.rounded-full');
    await expect(connectionIndicator).toBeVisible();
    
    // 7. 验证连接状态为绿色（已连接）
    const connectionStatus = page1.locator('text=实时连接');
    await expect(connectionStatus).toBeVisible({ timeout: 5000 });
    
    console.log('✅ 步骤 A 完成：单窗口基础测试通过');
  });

  test('步骤 B：数据编辑测试', async () => {
    console.log('🧪 开始步骤 B：数据编辑测试');
    
    // 1. 等待表格加载完成
    await page1.waitForSelector('[data-testid="grid-container"]', { timeout: 10000 });
    
    // 2. 定位第一行第一列的单元格
    const firstCell = page1.locator('[data-testid="cell-0-0"]').first();
    await expect(firstCell).toBeVisible();
    
    // 截图：编辑前的状态
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '03-before-edit.png') });
    
    // 3. 双击进入编辑模式
    await firstCell.dblclick();
    
    // 4. 输入测试数据
    const testData = getTestData('Window1');
    await page1.fill('input[type="text"]', testData);
    
    // 5. 按 Enter 提交
    await page1.press('input[type="text"]', 'Enter');
    
    // 6. 等待数据更新
    await page1.waitForTimeout(1000);
    
    // 截图：编辑后的状态
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '04-after-edit.png') });
    
    // 7. 验证数据已更新
    await expect(firstCell).toContainText(testData);
    
    // 8. 检查控制台日志中的 ShareDB 操作
    const consoleLogs = await page1.evaluate(() => {
      return window.console.logs || [];
    });
    
    const shareDBLogs = consoleLogs.filter((log: string) => 
      log.includes('ShareDB') || log.includes('操作') || log.includes('同步')
    );
    
    console.log('📡 ShareDB 操作日志:', shareDBLogs);
    
    console.log('✅ 步骤 B 完成：数据编辑测试通过');
  });

  test('步骤 C：双窗口实时同步测试', async () => {
    console.log('🧪 开始步骤 C：双窗口实时同步测试');
    
    // 1. 打开第二个浏览器窗口
    await page2.goto(BASE_URL);
    await page2.waitForLoadState('networkidle');
    
    // 2. 在窗口2登录
    await page2.fill('input[type="email"]', TEST_EMAIL);
    await page2.fill('input[type="password"]', TEST_PASSWORD);
    await page2.click('button[type="submit"]');
    
    // 3. 等待窗口2登录完成
    await page2.waitForSelector('h1:has-text("EasyGrid Demo")', { timeout: 10000 });
    await page2.waitForSelector('[data-testid="grid-container"]', { timeout: 10000 });
    
    // 截图：两个窗口都显示表格
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '05-window1-before-sync.png') });
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, '06-window2-before-sync.png') });
    
    // 4. 在窗口1编辑单元格
    const testData1 = getTestData('Window1_Sync');
    const cell1 = page1.locator('[data-testid="cell-0-1"]').first();
    await cell1.dblclick();
    await page1.fill('input[type="text"]', testData1);
    await page1.press('input[type="text"]', 'Enter');
    
    console.log('📝 窗口1编辑完成，等待同步...');
    
    // 5. 等待 ShareDB 同步（最多5秒）
    await page2.waitForTimeout(2000);
    
    // 6. 验证窗口2自动显示更新的值
    const cell2 = page2.locator('[data-testid="cell-0-1"]').first();
    await expect(cell2).toContainText(testData1, { timeout: 5000 });
    
    console.log('✅ 窗口2收到同步更新');
    
    // 截图：同步后的状态
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '07-window1-after-sync.png') });
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, '08-window2-after-sync.png') });
    
    // 7. 在窗口2编辑不同单元格
    const testData2 = getTestData('Window2_Sync');
    const cell2Edit = page2.locator('[data-testid="cell-0-2"]').first();
    await cell2Edit.dblclick();
    await page2.fill('input[type="text"]', testData2);
    await page2.press('input[type="text"]', 'Enter');
    
    console.log('📝 窗口2编辑完成，等待同步...');
    
    // 8. 等待同步
    await page1.waitForTimeout(2000);
    
    // 9. 验证窗口1自动显示更新
    const cell1Receive = page1.locator('[data-testid="cell-0-2"]').first();
    await expect(cell1Receive).toContainText(testData2, { timeout: 5000 });
    
    console.log('✅ 窗口1收到同步更新');
    
    // 截图：最终同步状态
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '09-window1-final-sync.png') });
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, '10-window2-final-sync.png') });
    
    console.log('✅ 步骤 C 完成：双窗口实时同步测试通过');
  });

  test('步骤 D：冲突处理测试', async () => {
    console.log('🧪 开始步骤 D：冲突处理测试');
    
    // 1. 在两个窗口同时编辑同一单元格
    const concurrentData = getTestData('Concurrent');
    
    // 同时开始编辑
    const cell1 = page1.locator('[data-testid="cell-1-0"]').first();
    const cell2 = page2.locator('[data-testid="cell-1-0"]').first();
    
    await cell1.dblclick();
    await cell2.dblclick();
    
    // 快速输入不同的值
    await page1.fill('input[type="text"]', `${concurrentData}_1`);
    await page2.fill('input[type="text"]', `${concurrentData}_2`);
    
    // 几乎同时提交
    await page1.press('input[type="text"]', 'Enter');
    await page2.press('input[type="text"]', 'Enter');
    
    console.log('⚡ 并发编辑完成，观察冲突处理...');
    
    // 2. 等待冲突解决
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);
    
    // 3. 验证最终数据一致性
    const finalValue1 = await cell1.textContent();
    const finalValue2 = await cell2.textContent();
    
    console.log('📊 最终数据对比:', { window1: finalValue1, window2: finalValue2 });
    
    // 截图：冲突处理结果
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, '11-window1-conflict-result.png') });
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, '12-window2-conflict-result.png') });
    
    // 数据应该最终一致（可能不是我们输入的值，但两个窗口应该相同）
    expect(finalValue1).toBe(finalValue2);
    
    console.log('✅ 步骤 D 完成：冲突处理测试通过');
  });

  test('步骤 E：性能监控测试', async () => {
    console.log('🧪 开始步骤 E：性能监控测试');
    
    // 1. 监控网络请求
    const networkRequests = await page1.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('localhost:2345'))
        .map((entry: any) => ({
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize
        }));
    });
    
    console.log('🌐 网络请求统计:', networkRequests);
    
    // 2. 检查 WebSocket 连接状态
    const wsStatus = await page1.evaluate(() => {
      return {
        readyState: window.WebSocket ? 'WebSocket supported' : 'WebSocket not supported',
        connectionCount: document.querySelectorAll('[data-testid="connection-indicator"]').length
      };
    });
    
    console.log('🔌 WebSocket 状态:', wsStatus);
    
    // 3. 检查内存使用
    const memoryUsage = await page1.evaluate(() => {
      if (performance.memory) {
        return {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
      }
      return null;
    });
    
    console.log('💾 内存使用:', memoryUsage);
    
    // 4. 生成最终报告
    const testReport = {
      timestamp: new Date().toISOString(),
      networkRequests: networkRequests.length,
      wsStatus,
      memoryUsage,
      screenshots: [
        '01-login-page.png',
        '02-main-interface.png',
        '03-before-edit.png',
        '04-after-edit.png',
        '05-window1-before-sync.png',
        '06-window2-before-sync.png',
        '07-window1-after-sync.png',
        '08-window2-after-sync.png',
        '09-window1-final-sync.png',
        '10-window2-final-sync.png',
        '11-window1-conflict-result.png',
        '12-window2-conflict-result.png'
      ]
    };
    
    // 保存测试报告
    await page1.evaluate((report) => {
      localStorage.setItem('shareDBTestReport', JSON.stringify(report));
    }, testReport);
    
    console.log('📊 测试报告已生成:', testReport);
    console.log('✅ 步骤 E 完成：性能监控测试通过');
  });
});
