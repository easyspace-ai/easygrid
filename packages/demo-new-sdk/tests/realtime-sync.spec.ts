/**
 * Playwright 双标签页实时同步测试脚本
 * 测试重构后的 demo-new-sdk (HTML 表格版本)
 */

import { test, expect } from '@playwright/test'

// 测试配置
const TEST_CONFIG = {
  frontend: 'http://localhost:3040',
  backend: 'http://localhost:8080',
  testUser: {
    email: 'admin@126.com',
    password: 'Pmker123'
  },
  testData: {
    tableId: 'tbl_Pweb3NpbtiUb4Fwbi90WP',
    viewId: 'viw_FXNR0EDAlNxhxOIPylHZy'
  },
  timeouts: {
    login: 10000,
    tableLoad: 15000,
    syncWait: 5000,
    screenshot: 2000
  }
}

test.describe('重构后的 Demo-New-SDK 实时协作测试', () => {
  let user1Page: any
  let user2Page: any

  test.beforeAll(async ({ browser }) => {
    // 创建两个浏览器上下文
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    user1Page = await context1.newPage()
    user2Page = await context2.newPage()
  })

  test.afterAll(async () => {
    if (user1Page) await user1Page.close()
    if (user2Page) await user2Page.close()
  })

  test('双标签页实时同步测试', async () => {
    console.log('🚀 开始双标签页实时同步测试')

    // 步骤 1: 两个标签页都登录
    console.log('📋 步骤 1: 用户登录')
    
    await Promise.all([
      loginUser(user1Page, 'User 1'),
      loginUser(user2Page, 'User 2')
    ])

    // 步骤 2: 等待 HTML 表格渲染完成
    console.log('📋 步骤 2: 等待 HTML 表格渲染')
    
    await Promise.all([
      waitForHTMLTable(user1Page, 'User 1'),
      waitForHTMLTable(user2Page, 'User 2')
    ])

    // 步骤 3: 等待 ShareDB 连接建立
    console.log('📋 步骤 3: 等待 ShareDB 连接')
    
    await Promise.all([
      waitForShareDBConnection(user1Page, 'User 1'),
      waitForShareDBConnection(user2Page, 'User 2')
    ])

    // 步骤 4: User 1 编辑单元格
    console.log('📋 步骤 4: User 1 编辑单元格')
    
    const editResult = await editCellInHTMLTable(user1Page, 'User 1', {
      rowIndex: 0,
      columnIndex: 0,
      newValue: 'User1 编辑的内容'
    })

    expect(editResult.success).toBe(true)
    console.log('✅ User 1 编辑成功')

    // 步骤 5: 等待 WebSocket 消息传递
    console.log('📋 步骤 5: 等待消息传递')
    await user1Page.waitForTimeout(TEST_CONFIG.timeouts.syncWait)

    // 步骤 6: 验证 User 2 收到更新
    console.log('📋 步骤 6: 验证 User 2 收到更新')
    
    const syncResult = await verifyCellUpdate(user2Page, 'User 2', {
      rowIndex: 0,
      columnIndex: 0,
      expectedValue: 'User1 编辑的内容'
    })

    expect(syncResult.success).toBe(true)
    console.log('✅ User 2 收到更新')

    // 步骤 7: User 2 编辑另一个单元格
    console.log('📋 步骤 7: User 2 编辑另一个单元格')
    
    const editResult2 = await editCellInHTMLTable(user2Page, 'User 2', {
      rowIndex: 0,
      columnIndex: 1,
      newValue: 'User2 编辑的内容'
    })

    expect(editResult2.success).toBe(true)
    console.log('✅ User 2 编辑成功')

    // 步骤 8: 等待消息传递
    console.log('📋 步骤 8: 等待消息传递')
    await user2Page.waitForTimeout(TEST_CONFIG.timeouts.syncWait)

    // 步骤 9: 验证 User 1 收到更新
    console.log('📋 步骤 9: 验证 User 1 收到更新')
    
    const syncResult2 = await verifyCellUpdate(user1Page, 'User 1', {
      rowIndex: 0,
      columnIndex: 1,
      expectedValue: 'User2 编辑的内容'
    })

    expect(syncResult2.success).toBe(true)
    console.log('✅ User 1 收到更新')

    // 步骤 10: 截图记录测试过程
    console.log('📋 步骤 10: 截图记录')
    
    await Promise.all([
      user1Page.screenshot({ 
        path: 'test-results/user1-final.png',
        fullPage: true 
      }),
      user2Page.screenshot({ 
        path: 'test-results/user2-final.png',
        fullPage: true 
      })
    ])

    console.log('🎉 双标签页实时同步测试完成！')
  })

  test('连接状态测试', async () => {
    console.log('🔍 开始连接状态测试')

    // 登录用户
    await loginUser(user1Page, 'User 1')
    await waitForHTMLTable(user1Page, 'User 1')

    // 检查连接状态
    const connectionStatus = await user1Page.locator('text=ShareDB:').textContent()
    expect(connectionStatus).toContain('已连接')

    // 检查连接指示器
    const indicator = user1Page.locator('text=✅ 已连接')
    await expect(indicator).toBeVisible()

    console.log('✅ 连接状态测试通过')
  })

  test('HTML 表格功能测试', async () => {
    console.log('📊 开始 HTML 表格功能测试')

    // 登录用户
    await loginUser(user1Page, 'User 1')
    await waitForHTMLTable(user1Page, 'User 1')

    // 检查表格是否渲染
    const table = user1Page.locator('table')
    await expect(table).toBeVisible()

    // 检查调试工具栏
    const toolbar = user1Page.locator('.p-2.flex.items-center.gap-2')
    await expect(toolbar).toBeVisible()

    // 检查统计信息
    const stats = user1Page.locator('text=记录:')
    await expect(stats).toBeVisible()

    // 检查字段列表
    const fieldsSection = user1Page.locator('text=字段列表')
    await expect(fieldsSection).toBeVisible()

    console.log('✅ HTML 表格功能测试通过')
  })

  test('登录功能测试', async () => {
    console.log('🔐 开始登录功能测试')

    // 访问登录页面
    await user1Page.goto(TEST_CONFIG.frontend)
    await user1Page.waitForLoadState('networkidle')

    // 检查登录表单
    const emailInput = user1Page.locator('input[type="email"]')
    const passwordInput = user1Page.locator('input[type="password"]')
    const loginButton = user1Page.locator('button:has-text("登录")')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(loginButton).toBeVisible()

    // 填写登录信息
    await emailInput.fill(TEST_CONFIG.testUser.email)
    await passwordInput.fill(TEST_CONFIG.testUser.password)

    // 点击登录
    await loginButton.click()

    // 等待登录成功，检查是否显示表格
    await user1Page.waitForSelector('text=实时表格数据', { 
      timeout: TEST_CONFIG.timeouts.login 
    })

    console.log('✅ 登录功能测试通过')
  })

  test('测试更新按钮功能', async () => {
    console.log('🔧 开始测试更新按钮功能')

    // 登录用户
    await loginUser(user1Page, 'User 1')
    await waitForHTMLTable(user1Page, 'User 1')

    // 查找测试更新按钮
    const testButton = user1Page.locator('button:has-text("测试更新第一条记录")')
    await expect(testButton).toBeVisible()

    // 点击测试按钮
    await testButton.click()

    // 等待更新完成
    await user1Page.waitForTimeout(2000)

    console.log('✅ 测试更新按钮功能通过')
  })
})

/**
 * 登录用户
 */
async function loginUser(page: any, userLabel: string) {
  console.log(`🔐 ${userLabel} 开始登录`)
  
  await page.goto(TEST_CONFIG.frontend)
  await page.waitForLoadState('networkidle')

  // 填写登录表单
  await page.fill('input[type="email"]', TEST_CONFIG.testUser.email)
  await page.fill('input[type="password"]', TEST_CONFIG.testUser.password)

  // 点击登录按钮
  await page.click('button:has-text("登录")')

  // 等待登录成功
  await page.waitForSelector('text=实时表格数据', { 
    timeout: TEST_CONFIG.timeouts.login 
  })

  console.log(`✅ ${userLabel} 登录成功`)
}

/**
 * 等待 HTML 表格渲染完成
 */
async function waitForHTMLTable(page: any, userLabel: string) {
  console.log(`📊 ${userLabel} 等待 HTML 表格渲染`)
  
  // 等待表格元素出现
  await page.waitForSelector('table', { 
    timeout: TEST_CONFIG.timeouts.tableLoad 
  })

  // 等待表格数据加载
  await page.waitForSelector('text=记录:', { 
    timeout: TEST_CONFIG.timeouts.tableLoad 
  })

  console.log(`✅ ${userLabel} HTML 表格渲染完成`)
}

/**
 * 等待 ShareDB 连接建立
 */
async function waitForShareDBConnection(page: any, userLabel: string) {
  console.log(`🔗 ${userLabel} 等待 ShareDB 连接`)
  
  // 等待连接状态指示器
  await page.waitForSelector('text=ShareDB:', { 
    timeout: TEST_CONFIG.timeouts.login 
  })

  // 等待连接成功状态
  await page.waitForSelector('text=✅ 已连接', { 
    timeout: TEST_CONFIG.timeouts.login 
  })

  console.log(`✅ ${userLabel} ShareDB 连接成功`)
}

/**
 * 在 HTML 表格中编辑单元格
 */
async function editCellInHTMLTable(page: any, userLabel: string, options: {
  rowIndex: number
  columnIndex: number
  newValue: string
}) {
  console.log(`✏️ ${userLabel} 编辑单元格 [${options.rowIndex}, ${options.columnIndex}]`)
  
  try {
    // 查找表格中的输入框
    const inputs = page.locator('table input[type="text"]')
    const inputCount = await inputs.count()
    
    if (inputCount === 0) {
      throw new Error('未找到可编辑的输入框')
    }

    // 计算目标输入框索引
    const targetIndex = options.rowIndex * (await page.locator('table th').count() - 1) + options.columnIndex
    
    if (targetIndex >= inputCount) {
      throw new Error(`输入框索引超出范围: ${targetIndex} >= ${inputCount}`)
    }

    // 获取目标输入框
    const targetInput = inputs.nth(targetIndex)
    await expect(targetInput).toBeVisible()

    // 清空并输入新值
    await targetInput.clear()
    await targetInput.fill(options.newValue)

    // 触发 change 事件
    await targetInput.blur()

    // 等待编辑完成
    await page.waitForTimeout(1000)

    console.log(`✅ ${userLabel} 单元格编辑完成`)
    
    return { success: true }
  } catch (error) {
    console.error(`❌ ${userLabel} 单元格编辑失败:`, error)
    return { success: false, error }
  }
}

/**
 * 验证单元格更新
 */
async function verifyCellUpdate(page: any, userLabel: string, options: {
  rowIndex: number
  columnIndex: number
  expectedValue: string
}) {
  console.log(`🔍 ${userLabel} 验证单元格更新 [${options.rowIndex}, ${options.columnIndex}]`)
  
  try {
    // 查找表格中的输入框
    const inputs = page.locator('table input[type="text"]')
    const inputCount = await inputs.count()
    
    if (inputCount === 0) {
      throw new Error('未找到可编辑的输入框')
    }

    // 计算目标输入框索引
    const targetIndex = options.rowIndex * (await page.locator('table th').count() - 1) + options.columnIndex
    
    if (targetIndex >= inputCount) {
      throw new Error(`输入框索引超出范围: ${targetIndex} >= ${inputCount}`)
    }

    // 获取目标输入框
    const targetInput = inputs.nth(targetIndex)
    await expect(targetInput).toBeVisible()

    // 获取当前值
    const currentValue = await targetInput.inputValue()

    console.log(`📊 ${userLabel} 当前值: ${currentValue}, 期望值: ${options.expectedValue}`)
    
    const isMatch = currentValue === options.expectedValue
    
    if (isMatch) {
      console.log(`✅ ${userLabel} 单元格更新验证成功`)
    } else {
      console.log(`❌ ${userLabel} 单元格更新验证失败`)
    }

    return { success: isMatch, currentValue, expectedValue: options.expectedValue }
  } catch (error) {
    console.error(`❌ ${userLabel} 单元格更新验证失败:`, error)
    return { success: false, error }
  }
}

/**
 * 截图记录测试过程
 */
async function takeScreenshot(page: any, userLabel: string, step: string) {
  const timestamp = Date.now()
  const filename = `test-results/${userLabel.toLowerCase().replace(' ', '-')}-${step}-${timestamp}.png`
  
  await page.screenshot({ 
    path: filename,
    fullPage: true 
  })
  
  console.log(`📸 ${userLabel} ${step} 截图保存: ${filename}`)
}
