/**
 * SpriteManager 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpriteManager } from '../SpriteManager';

describe('SpriteManager', () => {
  let manager: SpriteManager;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    manager = new SpriteManager();
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
    } as any;
  });

  describe('初始化', () => {
    it('应该创建管理器实例', () => {
      expect(manager).toBeDefined();
    });
  });

  describe('基础功能', () => {
    it('应该支持绘制图标', () => {
      // 基础功能测试
      expect(manager.drawSprite).toBeDefined();
    });
  });
});

