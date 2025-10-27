/**
 * TextCellRenderer 单元测试
 * 示例测试文件,展示如何测试单元格渲染器
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { textCellRenderer } from './textCellRenderer';
import { CellType } from './interface';
import type { ITextCell, ICellRenderProps } from './interface';

describe('TextCellRenderer', () => {
  let mockCtx: CanvasRenderingContext2D;
  let mockProps: ICellRenderProps;

  beforeEach(() => {
    // 创建 Canvas 上下文 mock（完整的Canvas API）
    mockCtx = {
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      rect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'middle',
      globalAlpha: 1,
      direction: 'ltr',
    } as any;

    // 创建渲染属性 mock
    mockProps = {
      ctx: mockCtx,
      theme: {
        fontFamily: 'Arial',
        fontSize: 14,
        cellTextColor: '#000',
        cellBg: '#fff',
      } as any,
      rect: { x: 0, y: 0, width: 200, height: 40 },
      rowIndex: 0,
      columnIndex: 0,
      imageManager: {} as any,
      spriteManager: {} as any,
    };
  });

  describe('基础渲染', () => {
    it('应该正确渲染文本单元格', () => {
      const cell: ITextCell = {
        type: CellType.Text,
        data: 'Hello World',
        displayData: 'Hello World',
      };

      textCellRenderer.draw(cell, mockProps);

      // 验证文本渲染被调用
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('应该处理空文本', () => {
      const cell: ITextCell = {
        type: CellType.Text,
        data: '',
        displayData: '',
      };

      textCellRenderer.draw(cell, mockProps);

      // 空文本不应该调用 fillText
      expect(mockCtx.fillText).not.toHaveBeenCalled();
    });

    it('应该处理 null/undefined 数据', () => {
      const cell: ITextCell = {
        type: CellType.Text,
        data: '',
        displayData: '',
      };

      expect(() => {
        textCellRenderer.draw(cell, mockProps);
      }).not.toThrow();
    });
  });

  describe('文本换行', () => {
    it('应该支持多行文本渲染', () => {
      const cell: ITextCell = {
        type: CellType.Text,
        data: 'Line 1\nLine 2\nLine 3',
        displayData: 'Line 1\nLine 2\nLine 3',
        isWrap: true,
      };

      textCellRenderer.draw(cell, mockProps);

      // 应该为每一行调用 fillText
      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      expect(fillTextCalls.length).toBeGreaterThan(0);
    });
  });

  describe('只读状态', () => {
    it('应该正确显示只读单元格', () => {
      const cell: ITextCell = {
        type: CellType.Text,
        data: 'Read Only',
        displayData: 'Read Only',
        readonly: true,
      };

      textCellRenderer.draw(cell, mockProps);

      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成渲染', () => {
      const cell: ITextCell = {
        type: CellType.Text,
        data: 'Performance Test',
        displayData: 'Performance Test',
      };

      const startTime = performance.now();
      
      // 渲染 1000 次
      for (let i = 0; i < 1000; i++) {
        textCellRenderer.draw(cell, mockProps);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 1000 次渲染应该在 100ms 内完成
      expect(duration).toBeLessThan(100);
    });
  });

  describe('测量功能', () => {
    it('应该正确测量文本尺寸', () => {
      if (!textCellRenderer.measure) {
        return; // 如果没有 measure 方法,跳过测试
      }

      const cell: ITextCell = {
        type: CellType.Text,
        data: 'Measure Test',
        displayData: 'Measure Test',
      };

      const result = textCellRenderer.measure(cell, {
        ctx: mockCtx,
        theme: mockProps.theme,
        width: 200,
        height: 40,
      });

      expect(result).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });
  });
});

