/**
 * Demo 配置文件
 * 复用旧 demo 的测试数据
 */

export const config = {
  // API 配置
  apiBaseUrl: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080/socket',
  
  // 测试数据（复用旧 demo）
  testData: {
    baseId: '7ec1e878-91b9-4c1b-ad86-05cdf801318f',
    tableId: 'tbl_Pweb3NpbtiUb4Fwbi90WP',
    viewId: 'viw_FXNR0EDAlNxhxOIPylHZy'
  },
  
  // 测试账号
  testUser: {
    email: 'admin@126.com',
    password: 'Pmker123'
  },
  
  // Canvas 表格配置
  gridConfig: {
    rowHeight: 40,
    headerHeight: 40,
    minColumnWidth: 100,
    maxColumnWidth: 300,
    defaultColumnWidth: 150
  },
  
  // 开发配置
  debug: true,
  enableLogging: true
}

export type Config = typeof config
