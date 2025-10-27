#!/usr/bin/env node

/**
 * 简单的单用户演示脚本
 * 验证登录、数据加载和基本编辑功能
 */

import { chromium } from 'playwright';

// 配置
const config = {
  frontend: 'http://localhost:3032',
  testUser: {
    email: 'admin@126.com',
    password: 'Pmker123'
  }
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

// 主演示函数
async function runSimpleDemo() {
  log('🚀 开始简单演示...', 'bold');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    // 步骤1: 登录
    log('\n🔐 步骤1: 用户登录', 'blue');
    await page.goto(config.frontend);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', config.testUser.email);
    await page.fill('input[name="password"]', config.testUser.password);
    await page.click('button:has-text("登录")');
    
    await page.waitForSelector('span:has-text("欢迎")', { timeout: 10000 });
    log('✅ 登录成功', 'green');
    
    // 步骤2: 检查 ShareDB 连接
    log('\n🔍 步骤2: 检查 ShareDB 连接', 'blue');
    try {
      await page.waitForSelector('div.w-2.h-2.rounded-full', { timeout: 10000 });
      const isConnected = await page.locator('div.w-2.h-2.rounded-full').evaluate(el => {
        return el.classList.contains('bg-green-500');
      });
      
      if (isConnected) {
        log('✅ ShareDB 连接正常', 'green');
      } else {
        log('⚠️  ShareDB 连接异常', 'yellow');
      }
    } catch (error) {
      log(`⚠️  ShareDB 连接检查失败: ${error.message}`, 'yellow');
    }
    
    // 步骤3: 等待表格数据
    log('\n📊 步骤3: 等待表格数据加载', 'blue');
    
    // 等待 StandardDataViewV3 组件加载
    await page.waitForSelector('[data-testid="grid-container"], .grid-container, .data-view', { timeout: 15000 });
    
    // 等待数据行加载
    await page.waitForSelector('[data-testid="grid-row"], .grid-row, .row', { timeout: 10000 });
    
    // 尝试不同的选择器来获取行数
    let rowCount = 0;
    try {
      rowCount = await page.locator('[data-testid="grid-row"], .grid-row, .row').count();
    } catch (e) {
      // 如果找不到行，尝试其他选择器
      try {
        rowCount = await page.locator('tr, .cell, [role="row"]').count();
      } catch (e2) {
        log('⚠️  无法确定行数，但表格可能已加载', 'yellow');
      }
    }
    
    if (rowCount > 0) {
      log(`✅ 表格数据加载成功 (${rowCount} 行)`, 'green');
    } else {
      log('⚠️  表格可能已加载，但无法确定行数', 'yellow');
    }
    
    // 步骤4: 编辑单元格
    log('\n✏️  步骤4: 编辑单元格', 'blue');
    const testValue = `Test_Edit_${Date.now()}`;
    
    try {
      // 尝试不同的单元格选择器
      const cellSelectors = [
        '.cell',
        '[data-testid="cell"]',
        '.grid-cell',
        'td',
        '[role="cell"]'
      ];
      
      let cellFound = false;
      for (const selector of cellSelectors) {
        try {
          const cells = page.locator(selector);
          const cellCount = await cells.count();
          if (cellCount > 0) {
            const firstCell = cells.nth(1); // 跳过第一列（通常是ID）
            await firstCell.dblclick();
            cellFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!cellFound) {
        log('⚠️  无法找到可编辑的单元格，跳过编辑测试', 'yellow');
      } else {
        // 等待编辑器出现
        await page.waitForSelector('input, textarea, [contenteditable]', { timeout: 5000 });
        
        // 查找编辑器
        const editorSelectors = [
          'input',
          'textarea',
          '[contenteditable]',
          '.cell-editor input',
          '.editor input'
        ];
        
        let editorFound = false;
        for (const selector of editorSelectors) {
          try {
            const editor = page.locator(selector).first();
            if (await editor.isVisible()) {
              await editor.fill('');
              await editor.type(testValue);
              await editor.press('Enter');
              editorFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (editorFound) {
          await sleep(1000);
          log(`✅ 单元格编辑完成: "${testValue}"`, 'green');
        } else {
          log('⚠️  无法找到编辑器，跳过编辑测试', 'yellow');
        }
      }
    } catch (error) {
      log(`⚠️  编辑单元格时发生错误: ${error.message}`, 'yellow');
    }
    
    // 步骤5: 验证编辑结果
    log('\n🔍 步骤5: 验证编辑结果', 'blue');
    try {
      // 尝试获取单元格值进行验证
      const cellSelectors = ['.cell', '[data-testid="cell"]', '.grid-cell', 'td', '[role="cell"]'];
      let cellValue = '';
      
      for (const selector of cellSelectors) {
        try {
          const cells = page.locator(selector);
          const cellCount = await cells.count();
          if (cellCount > 0) {
            cellValue = await cells.nth(1).textContent();
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (cellValue && cellValue.includes(testValue)) {
        log(`✅ 编辑验证成功: "${cellValue}"`, 'green');
      } else {
        log(`⚠️  编辑验证: 期望包含 "${testValue}", 实际 "${cellValue}"`, 'yellow');
      }
    } catch (error) {
      log(`⚠️  验证编辑结果时发生错误: ${error.message}`, 'yellow');
    }
    
    // 步骤6: 截图保存
    log('\n📸 步骤6: 保存截图', 'blue');
    const screenshotPath = `demo-result-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log(`✅ 截图已保存: ${screenshotPath}`, 'green');
    
    // 步骤7: 检查控制台日志
    log('\n📝 步骤7: 检查控制台日志', 'blue');
    const consoleMessages = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    if (consoleMessages.length > 0) {
      log('📋 控制台日志:', 'cyan');
      consoleMessages.forEach(msg => {
        log(`  ${msg.type}: ${msg.text}`, msg.type === 'error' ? 'red' : 'blue');
      });
    }
    
    log('\n🎉 简单演示完成！', 'green');
    log('💡 提示: 要测试实时同步，请打开两个浏览器窗口访问同一页面', 'cyan');
    
  } catch (error) {
    log(`❌ 演示过程中发生错误: ${error.message}`, 'red');
  } finally {
    // 等待用户查看结果
    log('\n⏳ 等待 5 秒后关闭浏览器...', 'yellow');
    await sleep(5000);
    await browser.close();
  }
}

// 运行演示
runSimpleDemo().catch(console.error);
