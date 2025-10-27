/**
 * CoordinateManager 单元测试
 * 测试坐标管理器的核心功能
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateManager } from './CoordinateManager';

describe('CoordinateManager', () => {
  let manager: CoordinateManager;

  beforeEach(() => {
    manager = new CoordinateManager({
      rowHeight: 40,
      columnWidth: 100,
      rowCount: 100,
      pureRowCount: 100,
      columnCount: 50,
      containerWidth: 1000,
      containerHeight: 600,
      rowInitSize: 40,
      columnInitSize: 50,
      freezeColumnCount: 1,
    });
  });

  describe('初始化', () => {
    it('应该正确初始化管理器', () => {
      expect(manager.rowCount).toBe(100);
      expect(manager.columnCount).toBe(50);
      expect(manager.containerWidth).toBe(1000);
      expect(manager.containerHeight).toBe(600);
    });

    it('应该设置正确的冻结列数', () => {
      expect(manager.freezeColumnCount).toBe(1);
    });
  });

  describe('行高计算', () => {
    it('应该返回默认行高', () => {
      expect(manager.getRowHeight(0)).toBe(40);
      expect(manager.getRowHeight(50)).toBe(40);
    });

    it('应该使用自定义行高', () => {
      const customManager = new CoordinateManager({
        rowHeight: 40,
        columnWidth: 100,
        rowCount: 10,
        pureRowCount: 10,
        columnCount: 10,
        containerWidth: 1000,
        containerHeight: 600,
        rowHeightMap: {
          0: 80,
          5: 120,
        },
      });

      expect(customManager.getRowHeight(0)).toBe(80);
      expect(customManager.getRowHeight(5)).toBe(120);
      expect(customManager.getRowHeight(1)).toBe(40);
    });
  });

  describe('列宽计算', () => {
    it('应该返回默认列宽', () => {
      expect(manager.getColumnWidth(0)).toBe(100);
      expect(manager.getColumnWidth(25)).toBe(100);
    });

    it('应该使用自定义列宽', () => {
      const customManager = new CoordinateManager({
        rowHeight: 40,
        columnWidth: 100,
        rowCount: 10,
        pureRowCount: 10,
        columnCount: 10,
        containerWidth: 1000,
        containerHeight: 600,
        columnWidthMap: {
          0: 200,
          3: 150,
        },
      });

      expect(customManager.getColumnWidth(0)).toBe(200);
      expect(customManager.getColumnWidth(3)).toBe(150);
      expect(customManager.getColumnWidth(1)).toBe(100);
    });
  });

  describe('偏移量计算', () => {
    it('应该计算正确的行偏移量', () => {
      const offset0 = manager.getRowOffset(0);
      const offset1 = manager.getRowOffset(1);
      const offset2 = manager.getRowOffset(2);

      expect(offset0).toBe(40); // rowInitSize
      expect(offset1).toBe(80); // rowInitSize + rowHeight
      expect(offset2).toBe(120); // rowInitSize + rowHeight * 2
    });

    it('应该计算正确的列偏移量', () => {
      const offset0 = manager.getColumnOffset(0);
      const offset1 = manager.getColumnOffset(1);
      const offset2 = manager.getColumnOffset(2);

      expect(offset0).toBe(50); // columnInitSize
      expect(offset1).toBe(150); // columnInitSize + columnWidth
      expect(offset2).toBe(250); // columnInitSize + columnWidth * 2
    });
  });

  describe('索引查找', () => {
    it('应该根据滚动位置找到正确的行索引', () => {
      const startIndex = manager.getRowStartIndex(100);
      expect(startIndex).toBeGreaterThanOrEqual(0);
      expect(startIndex).toBeLessThan(manager.rowCount);
    });

    it('应该根据滚动位置找到正确的列索引', () => {
      const startIndex = manager.getColumnStartIndex(300);
      expect(startIndex).toBeGreaterThanOrEqual(0);
      expect(startIndex).toBeLessThan(manager.columnCount);
    });

    it('应该计算正确的停止索引', () => {
      const startIndex = manager.getRowStartIndex(0);
      const stopIndex = manager.getRowStopIndex(startIndex, 0);
      
      expect(stopIndex).toBeGreaterThanOrEqual(startIndex);
      expect(stopIndex).toBeLessThan(manager.rowCount);
    });
  });

  describe('总尺寸计算', () => {
    it('应该计算正确的总高度', () => {
      const totalHeight = manager.totalHeight;
      const expectedHeight = manager.rowInitSize + manager.rowCount * 40;
      
      expect(totalHeight).toBe(expectedHeight);
    });

    it('应该计算正确的总宽度', () => {
      const totalWidth = manager.totalWidth;
      const expectedWidth = manager.columnInitSize + manager.columnCount * 100;
      
      expect(totalWidth).toBe(expectedWidth);
    });
  });

  describe('冻结区域', () => {
    it('应该计算正确的冻结区域宽度', () => {
      const freezeWidth = manager.freezeRegionWidth;
      
      // columnInitSize + freezeColumnCount * columnWidth
      const expectedWidth = 50 + 1 * 100;
      expect(freezeWidth).toBe(expectedWidth);
    });

    it('应该支持动态修改冻结列数', () => {
      manager.freezeColumnCount = 2;
      
      const freezeWidth = manager.freezeRegionWidth;
      const expectedWidth = 50 + 2 * 100;
      
      expect(freezeWidth).toBe(expectedWidth);
    });
  });

  describe('相对偏移量', () => {
    it('应该计算冻结列的相对偏移量', () => {
      const offset = manager.getColumnRelativeOffset(0, 100);
      
      // 冻结列不受滚动影响
      expect(offset).toBe(manager.getColumnOffset(0));
    });

    it('应该计算非冻结列的相对偏移量', () => {
      const scrollLeft = 100;
      const columnIndex = 5;
      
      const offset = manager.getColumnRelativeOffset(columnIndex, scrollLeft);
      const absoluteOffset = manager.getColumnOffset(columnIndex);
      
      // 非冻结列要减去滚动偏移
      expect(offset).toBe(absoluteOffset - scrollLeft);
    });
  });

  describe('刷新维度', () => {
    it('应该支持刷新列维度', () => {
      const newColumnWidthMap = {
        0: 200,
        1: 150,
      };

      manager.refreshColumnDimensions({
        columnCount: 60,
        columnInitSize: 60,
        columnWidthMap: newColumnWidthMap,
      });

      expect(manager.columnCount).toBe(60);
      expect(manager.columnInitSize).toBe(60);
      expect(manager.getColumnWidth(0)).toBe(200);
      expect(manager.getColumnWidth(1)).toBe(150);
    });
  });

  describe('边界情况', () => {
    it('应该处理零尺寸容器', () => {
      const zeroManager = new CoordinateManager({
        rowHeight: 40,
        columnWidth: 100,
        rowCount: 10,
        pureRowCount: 10,
        columnCount: 10,
        containerWidth: 0,
        containerHeight: 0,
      });

      expect(zeroManager.containerWidth).toBe(0);
      expect(zeroManager.containerHeight).toBe(0);
    });

    it('应该处理负索引', () => {
      const offset = manager.getRowOffset(-1);
      
      // 应该返回合理的值而不是抛出错误
      expect(offset).toBeDefined();
    });

    it('应该处理超出范围的索引', () => {
      const largeIndex = 10000;
      const offset = manager.getRowOffset(largeIndex);
      
      expect(offset).toBeDefined();
      expect(offset).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    it('应该快速计算偏移量', () => {
      const startTime = performance.now();
      
      // 计算 10000 次偏移量
      for (let i = 0; i < 10000; i++) {
        manager.getRowOffset(i % manager.rowCount);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 10000 次计算应该在 50ms 内完成
      expect(duration).toBeLessThan(50);
    });
  });
});

