import { chromium } from 'playwright';

const config = {
  frontendUrl: 'http://localhost:3000',
  baseUrl: 'http://localhost:2345'
};

async function diagnoseShareDB() {
  console.log('🔍 开始 ShareDB 诊断...');
  
  try {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听控制台消息
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ 控制台错误:', msg.text());
      } else if (msg.text().includes('ShareDB') || msg.text().includes('WebSocket')) {
        console.log('📡 控制台消息:', msg.text());
      }
    });
    
    // 监听网络请求
    page.on('request', request => {
      if (request.url().includes('socket') || request.url().includes('ws')) {
        console.log('🌐 WebSocket 请求:', request.url());
      }
    });
    
    // 访问页面
    console.log('📱 访问前端页面...');
    await page.goto(config.frontendUrl);
    
    // 等待页面加载
    console.log('⏳ 等待页面加载...');
    await page.waitForTimeout(5000);
    
    // 检查页面状态
    const pageStatus = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasReact: typeof window.React !== 'undefined',
        hasShareDB: typeof window.shareDBConnection !== 'undefined',
        shareDBConnected: window.shareDBConnected,
        shareDBConnection: window.shareDBConnection ? 'exists' : 'null',
        consoleErrors: window.consoleErrors || [],
        allConsoleLogs: window.allConsoleLogs || []
      };
    });
    
    console.log('📊 页面状态:', pageStatus);
    
    // 等待更长时间看是否有 ShareDB 连接
    console.log('⏳ 等待 ShareDB 连接...');
    await page.waitForTimeout(10000);
    
    // 再次检查状态
    const finalStatus = await page.evaluate(() => {
      return {
        hasShareDB: typeof window.shareDBConnection !== 'undefined',
        shareDBConnected: window.shareDBConnected,
        shareDBConnection: window.shareDBConnection ? 'exists' : 'null'
      };
    });
    
    console.log('📊 最终状态:', finalStatus);
    
    // 截图
    await page.screenshot({ path: 'diagnose-sharedb.png' });
    console.log('📸 截图已保存: diagnose-sharedb.png');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ 诊断失败:', error.message);
  }
}

diagnoseShareDB();
