/**
 * LuckDB SDK 配置和实例
 * 统一管理 SDK 的初始化和配置
 * 完全参考 manage 项目的实现方式
 */

import LuckDB, { LocalAuthStore } from '@easygrid/sdk';

// 创建 SDK 实例（新版 SDK 构造函数签名为 (baseURL: string, authStore?, lang?)）
const baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080';
export const authStore = new LocalAuthStore();
export const luckdb = new LuckDB(baseURL, authStore, 'zh-CN');

export default luckdb;
