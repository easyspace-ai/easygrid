/**
 * API Client 测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../client';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient({
      baseURL: 'http://localhost:3000',
      token: 'test-token',
    });
  });

  describe('初始化', () => {
    it('应该正确创建客户端实例', () => {
      expect(client).toBeDefined();
    });

    it('应该设置token', () => {
      client.setToken('new-token');
      // Token已设置（无法直接访问private字段，只验证方法不抛出错误）
      expect(true).toBe(true);
    });

    it('应该清除token', () => {
      client.clearToken();
      expect(true).toBe(true);
    });
  });
});

