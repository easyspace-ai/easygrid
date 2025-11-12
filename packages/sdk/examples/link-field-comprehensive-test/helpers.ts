/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 安全执行，捕获错误
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  try {
    return await fn()
  } catch (error: any) {
    console.error(errorMessage || '执行失败:', error.message || error)
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2))
    }
    return null
  }
}

/**
 * 验证资源 ID
 */
export function validateId(id: string | undefined, name: string): string {
  if (!id) {
    throw new Error(`${name} ID 不能为空`)
  }
  return id
}

