/**
 * 通用工具函数
 */

/**
 * 日志工具 - 成功信息
 */
export function log(title: string, data?: any) {
  console.log(`\n✅ ${title}`);
  if (data !== undefined) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
}

/**
 * 日志工具 - 错误信息
 */
export function error(title: string, err: any) {
  console.error(`\n❌ ${title}`);
  if (err?.message) {
    console.error('Message:', err.message);
  }
  if (err?.code) {
    console.error('Code:', err.code);
  }
  if (err?.details) {
    console.error('Details:', JSON.stringify(err.details, null, 2));
  }
  if (!err?.message && !err?.code) {
    console.error(err);
  }
}

/**
 * 日志工具 - 信息提示
 */
export function info(title: string, data?: any) {
  console.log(`\nℹ️  ${title}`);
  if (data !== undefined) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
}

/**
 * 日志工具 - 警告信息
 */
export function warn(title: string, data?: any) {
  console.warn(`\n⚠️  ${title}`);
  if (data !== undefined) {
    if (typeof data === 'object') {
      console.warn(JSON.stringify(data, null, 2));
    } else {
      console.warn(data);
    }
  }
}

/**
 * 延时工具
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成随机名称
 */
export function randomName(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 生成随机邮箱
 */
export function randomEmail(): string {
  const random = Math.random().toString(36).substring(2, 10);
  return `test_${random}@example.com`;
}

/**
 * 打印分隔线
 */
export function separator(title?: string) {
  console.log('\n' + '='.repeat(60));
  if (title) {
    console.log(title);
    console.log('='.repeat(60));
  }
}

/**
 * 格式化错误信息
 */
export function formatError(err: any): string {
  if (err?.message) {
    return `${err.message}${err.code ? ` (${err.code})` : ''}`;
  }
  return String(err);
}

/**
 * 安全执行函数（捕获错误）
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    error(errorMessage, err);
    return null;
  }
}

/**
 * 执行并计时
 */
export async function timeExecute<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    info(`${label} - 耗时: ${duration}ms`);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    error(`${label} - 失败 (耗时: ${duration}ms)`, err);
    throw err;
  }
}

