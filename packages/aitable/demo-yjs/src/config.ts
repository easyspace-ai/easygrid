/**
 * EasyGrid Demo 配置文件
 * 基于新版SDK和API端点
 */

export const config = {
  // API 配置
  baseURL: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080/socket',

  // 调试配置
  debug: true,

  // 测试账户配置
  testCredentials: {
    email: 'admin@126.com',
    password: 'Pmker123'
  },

  // 测试表格配置
  testTable: {
    spaceId: 'spc_rtpLk96gJHLeYTv7JJMlo',
    baseId: '7ec1e878-91b9-4c1b-ad86-05cdf801318f',
    tableId: 'tbl_Pweb3NpbtiUb4Fwbi90WP'
  },
  
  // Grid 配置
  grid: {
    rowHeight: 32,
    columnWidth: 150,
    freezeColumnCount: 1
  },
  
  // ShareDB 配置
  sharedb: {
    reconnect: {
      maxRetries: 10,
      retryDelay: 1000,
      exponentialBackoff: true
    },
    heartbeat: {
      interval: 30000,
      timeout: 10000
    }
  }
}

// 导出便捷访问函数
export function getApiUrl(): string {
  return config.baseURL
}

export function getWsUrl(): string {
  return config.wsUrl
}

export function getTestCredentials() {
  return config.testCredentials
}

export function getTestTable() {
  return config.testTable
}

export function getGridConfig() {
  return config.grid
}

export function getShareDBConfig() {
  return config.sharedb
}

// 打印当前配置（用于调试）
export function printConfig() {
  console.log('📋 EasyGrid Demo 配置:')
  console.log(`  API URL: ${config.baseURL}`)
  console.log(`  WebSocket URL: ${config.wsUrl}`)
  console.log(`  测试邮箱: ${config.testCredentials.email}`)
  console.log(`  调试模式: ${config.debug}`)
  console.log(`  表格ID: ${config.testTable.tableId}`)
  console.log('')
}