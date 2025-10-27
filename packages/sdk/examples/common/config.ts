/**
 * 测试环境配置
 * 支持从环境变量和 .env 文件读取配置
 */

// 加载 .env 文件（如果存在）
try {
  const { fileURLToPath } = require('url');
  const path = require('path');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (error) {
  // dotenv 不存在或 .env 文件不存在，使用默认配置
}

export const config = {
  // API 配置
  apiUrl: process.env.API_URL || 'http://localhost:2345',
  apiTimeout: parseInt(process.env.API_TIMEOUT || '30000'),
  
  // 测试账户配置
  testEmail: process.env.TEST_EMAIL || 'admin@126.com',
  testPassword: process.env.TEST_PASSWORD || 'Pmker123',
  
  // 目标资源配置（可选）
  spaceId: process.env.SPACE_ID || 'spc_rtpLk96gJHLeYTv7JJMlo',
  baseId: process.env.BASE_ID || '7ec1e878-91b9-4c1b-ad86-05cdf801318f',
  tableId: process.env.TABLE_ID || 'tbl_Pweb3NpbtiUb4Fwbi90WP',
  
  // 调试配置
  debug: process.env.DEBUG === 'true' || process.env.DEBUG === '1' || true,
  verboseLogging: process.env.VERBOSE_LOGGING === 'true' || process.env.VERBOSE_LOGGING === '1' || false,
  
  // YJS 配置
  yjsEnabled: process.env.YJS_ENABLED !== 'false' && process.env.YJS_ENABLED !== '0',
  yjsDebug: process.env.YJS_DEBUG === 'true' || process.env.YJS_DEBUG === '1' || false,
  
  // SSE 配置
  sseEnabled: process.env.SSE_ENABLED !== 'false' && process.env.SSE_ENABLED !== '0',
  sseReconnectInterval: parseInt(process.env.SSE_RECONNECT_INTERVAL || '5000'),
  sseMaxReconnectAttempts: parseInt(process.env.SSE_MAX_RECONNECT_ATTEMPTS || '10'),
  
  // 测试配置
  testTimeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
  testCleanup: process.env.TEST_CLEANUP !== 'false' && process.env.TEST_CLEANUP !== '0',
  testParallel: process.env.TEST_PARALLEL === 'true' || process.env.TEST_PARALLEL === '1' || false,
};

// 导出方便的访问函数
export function getApiUrl(): string {
  return config.apiUrl;
}

export function getTestCredentials() {
  return {
    email: config.testEmail,
    password: config.testPassword,
  };
}

export function getTargetResources() {
  return {
    spaceId: config.spaceId,
    baseId: config.baseId,
    tableId: config.tableId,
  };
}

export function getYjsConfig() {
  return {
    enabled: config.yjsEnabled,
    debug: config.yjsDebug,
  };
}

export function getSseConfig() {
  return {
    enabled: config.sseEnabled,
    reconnectInterval: config.sseReconnectInterval,
    maxReconnectAttempts: config.sseMaxReconnectAttempts,
  };
}

export function getTestConfig() {
  return {
    timeout: config.testTimeout,
    cleanup: config.testCleanup,
    parallel: config.testParallel,
  };
}

// 打印当前配置（用于调试）
export function printConfig() {
  console.log('📋 当前配置:');
  console.log(`  API URL: ${config.apiUrl}`);
  console.log(`  测试邮箱: ${config.testEmail}`);
  console.log(`  调试模式: ${config.debug}`);
  console.log(`  详细日志: ${config.verboseLogging}`);
  console.log(`  YJS 启用: ${config.yjsEnabled}`);
  console.log(`  YJS 调试: ${config.yjsDebug}`);
  console.log(`  SSE 启用: ${config.sseEnabled}`);
  console.log(`  测试超时: ${config.testTimeout}ms`);
  console.log(`  自动清理: ${config.testCleanup}`);
  console.log(`  目标空间: ${config.spaceId}`);
  console.log(`  目标基础表: ${config.baseId}`);
  console.log(`  目标表格: ${config.tableId}`);
  console.log('');
}

