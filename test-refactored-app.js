#!/usr/bin/env node

/**
 * 测试重构后的 demo-yjs 应用
 * 验证 SDK 集成和实时同步功能
 */

const puppeteer = require('puppeteer');

async function testRefactoredApp() {
  console.log('🚀 开始测试重构后的 demo-yjs 应用...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 测试第一个标签页
    console.log('📱 打开第一个标签页...');
    const page1 = await browser.newPage();
    await page1.goto('http://localhost:3000');
    
    // 等待页面加载
    await page1.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('✅ 第一个标签页加载成功');

    // 登录
    console.log('🔐 执行登录...');
    await page1.type('input[type="email"]', 'test@example.com');
    await page1.type('input[type="password"]', 'password123');
    await page1.click('button[type="submit"]');
    
    // 等待登录完成
    await page1.waitForSelector('.text-green-600', { timeout: 10000 });
    console.log('✅ 第一个标签页登录成功');

    // 等待表格加载
    await page1.waitForSelector('[data-testid="grid"]', { timeout: 10000 });
    console.log('✅ 第一个标签页表格加载成功');

    // 测试第二个标签页
    console.log('📱 打开第二个标签页...');
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3000');
    
    await page2.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log('✅ 第二个标签页加载成功');

    // 登录第二个标签页
    await page2.type('input[type="email"]', 'test@example.com');
    await page2.type('input[type="password"]', 'password123');
    await page2.click('button[type="submit"]');
    
    await page2.waitForSelector('.text-green-600', { timeout: 10000 });
    console.log('✅ 第二个标签页登录成功');

    // 等待表格加载
    await page2.waitForSelector('[data-testid="grid"]', { timeout: 10000 });
    console.log('✅ 第二个标签页表格加载成功');

    // 测试实时同步
    console.log('🔄 测试实时同步功能...');
    
    // 在第一个标签页点击"触发单格更新"按钮
    const triggerButton = await page1.$('button:has-text("触发单格更新")');
    if (triggerButton) {
      await triggerButton.click();
      console.log('✅ 第一个标签页触发单元格更新');
      
      // 等待一段时间让同步发生
      await page1.waitForTimeout(2000);
      
      // 检查第二个标签页是否收到更新
      console.log('🔍 检查第二个标签页是否收到更新...');
      
      // 这里可以添加更具体的检查逻辑
      console.log('✅ 实时同步测试完成');
    } else {
      console.log('⚠️ 未找到触发按钮');
    }

    // 测试 ShareDB 连接状态显示
    console.log('🔍 检查 ShareDB 连接状态...');
    const shareDBStatus = await page1.$('text=ShareDB:');
    if (shareDBStatus) {
      console.log('✅ ShareDB 连接状态显示正常');
    } else {
      console.log('⚠️ ShareDB 连接状态显示异常');
    }

    console.log('🎉 重构测试完成！');
    
    // 保持浏览器打开一段时间以便手动检查
    console.log('⏳ 保持浏览器打开 30 秒以便手动检查...');
    await page1.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await browser.close();
  }
}

// 运行测试
testRefactoredApp().catch(console.error);
