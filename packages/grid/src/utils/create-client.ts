import LuckDBClient, { LocalAuthStore } from '@easygrid/sdk'

export interface CreateClientOptions {
  serverUrl?: string
  locale?: string
}

export function createLuckDBClientFromEnv(options: CreateClientOptions = {}) {
  const serverUrl =
    options.serverUrl ||
    // align with apps/manage
    (import.meta as any).env?.VITE_API_URL ||
    (import.meta as any).env?.VITE_LUCKDB_SERVER_URL ||
    'http://localhost:8080'
  const locale = options.locale || 'zh-CN'
  const auth = new LocalAuthStore()
  return new LuckDBClient(serverUrl, auth, locale)
}

export default createLuckDBClientFromEnv

