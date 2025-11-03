import LuckDB, { LocalAuthStore } from '@easygrid/sdk';

// 创建 SDK 实例（新版 SDK 构造函数签名为 (baseURL: string, authStore?, lang?)）
const baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080';
export const authStore = new LocalAuthStore();
export const luckdb = new LuckDB(baseURL, authStore, 'zh-CN');

export default luckdb;