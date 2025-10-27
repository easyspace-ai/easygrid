/**
 * ShareDB 调试测试
 * 专门用于调试当前的问题和验证功能
 */

import { test, expect, Page } from '@playwright/test';

test.describe('ShareDB 调试测试', () => {
  test('调试登录和连接问题', async ({ page }) => {
    console.log('🔍 开始调试测试...');
    
    // 1. 访问应用
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // 截图：初始状态
    await page.screenshot({ path: 'debug-01-initial.png' });
    
    // 2. 检查页面内容
    const bodyText = await page.textContent('body');
    console.log('📄 页面内容:', bodyText);
    
    // 3. 检查是否有错误信息
    const errorElements = await page.locator('text=错误').all();
    if (errorElements.length > 0) {
      console.log('❌ 发现错误信息');
      for (const error of errorElements) {
        const errorText = await error.textContent();
        console.log('错误详情:', errorText);
      }
    }
    
    // 4. 检查网络请求
    const requests: any[] = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    });
    
    page.on('response', response => {
      console.log(`🌐 响应: ${response.status()} ${response.url()}`);
    });
    
    // 5. 尝试登录
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    if (await emailInput.isVisible()) {
      console.log('📝 找到登录表单，尝试登录...');
      
      await emailInput.fill('admin@126.com');
      await passwordInput.fill('Pmker123');
      await submitButton.click();
      
      // 等待登录完成
      await page.waitForTimeout(3000);
      
      // 截图：登录后状态
      await page.screenshot({ path: 'debug-02-after-login.png' });
      
      // 检查登录结果
      const currentUrl = page.url();
      console.log('🔗 当前URL:', currentUrl);
      
      // 检查是否有错误
      const errorText = await page.locator('text=错误').textContent();
      if (errorText) {
        console.log('❌ 登录后仍有错误:', errorText);
      }
      
      // 检查 ShareDB 连接状态
      const connectionIndicator = page.locator('.w-2.h-2.rounded-full');
      if (await connectionIndicator.isVisible()) {
        const connectionColor = await connectionIndicator.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        console.log('🔌 连接指示器颜色:', connectionColor);
      }
      
      // 检查控制台日志
      const consoleLogs = await page.evaluate(() => {
        return (window as any).consoleLogs || [];
      });
      console.log('📝 控制台日志:', consoleLogs);
      
    } else {
      console.log('❌ 未找到登录表单');
    }
    
    // 6. 检查 localStorage
    const localStorage = await page.evaluate(() => {
      return {
        accessToken: localStorage.getItem('accessToken'),
        user: localStorage.getItem('user'),
        allKeys: Object.keys(localStorage)
      };
    });
    console.log('💾 localStorage:', localStorage);
    
    // 7. 检查网络请求详情
    console.log('🌐 网络请求:', requests);
  });
  
  test('测试 API 连接', async ({ page }) => {
    console.log('🔍 测试 API 连接...');
    
    // 直接测试 API 端点
    const response = await page.request.get('http://localhost:2345/api/health');
    console.log('🏥 健康检查响应:', response.status());
    
    if (response.status() === 200) {
      const healthData = await response.json();
      console.log('✅ 后端服务正常:', healthData);
    } else {
      console.log('❌ 后端服务异常:', response.status());
    }
    
    // 测试认证端点
    try {
      const authResponse = await page.request.post('http://localhost:2345/api/v1/auth/login', {
        data: {
          email: 'admin@126.com',
          password: 'Pmker123'
        }
      });
      
      console.log('🔐 认证测试响应:', authResponse.status());
      
      if (authResponse.status() === 200) {
        const authData = await authResponse.json();
        console.log('✅ 认证成功:', authData);
      } else {
        const errorData = await authResponse.text();
        console.log('❌ 认证失败:', errorData);
      }
    } catch (error) {
      console.log('❌ 认证请求失败:', error);
    }
  });
});
