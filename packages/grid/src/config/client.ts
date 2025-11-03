import LuckDBClient from '@easygrid/sdk'
import { LocalAuthStore } from '@easygrid/sdk'

// 从环境变量获取服务器地址（优先与 apps/manage 对齐）
const SERVER_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_LUCKDB_SERVER_URL ||
  'http://localhost:8080'

// 默认创建一个 SDK 客户端实例（作为后备）
const defaultAuthStore = new LocalAuthStore()
export let luckdbClient: LuckDBClient = new LuckDBClient(
  SERVER_URL,
  defaultAuthStore,
  'zh-CN'
)

// 允许外部注入自定义客户端（例如由第三方应用实例化）
export function setLuckdbClient(client: LuckDBClient) {
  luckdbClient = client
}

// 导出客户端类型
export type { LuckDBClient }

