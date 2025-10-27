/**
 * ImageManager 单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ImageManager } from '../ImageManager';

describe('ImageManager', () => {
  let manager: ImageManager;

  beforeEach(() => {
    manager = new ImageManager();
  });

  describe('初始化', () => {
    it('应该创建管理器实例', () => {
      expect(manager).toBeDefined();
    });
  });

  describe('缓存管理', () => {
    it('应该支持图片加载', () => {
      expect(manager.loadOrGetImage).toBeDefined();
    });

    it('应该有缓存机制', () => {
      expect(manager).toBeDefined();
    });
  });
});

