import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件目录（ES 模块兼容）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
const envPath = path.join(__dirname, '.env')
dotenv.config({ path: envPath })

export interface TestConfig {
  serverURL: string
  testEmail: string
  testPassword: string
  debug: boolean
}

export function loadConfig(): TestConfig {
  const serverURL = process.env.SERVER_URL || 'http://localhost:8080'
  const testEmail = process.env.TEST_EMAIL || 'admin@126.com'
  const testPassword = process.env.TEST_PASSWORD || 'Pmker123'
  const debug = process.env.DEBUG === 'true'

  return {
    serverURL,
    testEmail,
    testPassword,
    debug
  }
}

export const config = loadConfig()

