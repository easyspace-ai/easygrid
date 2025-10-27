/**
 * Demo 配置
 * 
 * 这里配置你的 LuckDB 后端地址和测试账号
 */

export const config = {
  // LuckDB API 地址
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080',

  // WebSocket 地址（可选）
  wsURL: (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8080',

  // 测试账号（仅用于演示）
  demo: {
    email: 'admin@126.com',
    password: 'Pmker123',
  },

  // 测试数据
  testBase: {
    baseId: (import.meta as any).env?.VITE_BASE_ID || 'ece04dea-70bd-43e4-87b8-35af518caa5a',
    tableId: (import.meta as any).env?.VITE_TABLE_ID || 'tbl_oz9EbQgbTZBuF7FSSJvet',
    viewId: (import.meta as any).env?.VITE_VIEW_ID || 'viw_F0SqlG0Y2m2kLX7cqjYX4',
  },

  // 是否启用调试模式
  debug: true,
};
