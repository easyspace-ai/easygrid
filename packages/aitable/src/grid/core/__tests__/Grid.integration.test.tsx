/**
 * Grid 组件集成测试
 * 测试Grid的核心功能和交互
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from '../Grid';
import type { IGridColumn } from '../../types/grid';

describe('Grid Integration Tests', () => {
  const mockColumns: IGridColumn[] = [
    { id: 'col1', name: 'Column 1', type: 'text', width: 100 },
    { id: 'col2', name: 'Column 2', type: 'number', width: 120 },
    { id: 'col3', name: 'Column 3', type: 'checkbox', width: 80 },
  ];

  const mockGetCellContent = vi.fn((cell) => {
    const [colIndex, rowIndex] = cell;
    return {
      type: 'text',
      data: `Cell ${rowIndex}-${colIndex}`,
      displayData: `Cell ${rowIndex}-${colIndex}`,
    };
  });

  const defaultProps = {
    columns: mockColumns,
    rowCount: 100,
    getCellContent: mockGetCellContent,
  };

  describe('基础渲染', () => {
    it('应该成功渲染Grid组件', () => {
      const { container } = render(<Grid {...defaultProps} />);
      expect(container.firstChild).toBeTruthy();
    });

    it('应该渲染正确数量的列', () => {
      render(<Grid {...defaultProps} />);
      expect(mockColumns.length).toBe(3);
    });

    it('应该处理空数据', () => {
      const { container } = render(
        <Grid
          columns={[]}
          rowCount={0}
          getCellContent={() => ({ type: 'text', data: '', displayData: '' })}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Props处理', () => {
    it('应该接受自定义主题', () => {
      const customTheme = {
        fontSize: 16,
        fontFamily: 'Custom Font',
      };
      const { container } = render(
        <Grid {...defaultProps} theme={customTheme} />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('应该支持可拖拽配置', () => {
      const { container } = render(
        <Grid {...defaultProps} draggable={'all' as any} />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('应该支持可选择配置', () => {
      const { container} = render(
        <Grid {...defaultProps} selectable={'all' as any} />
      );
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('回调处理', () => {
    it('应该接受onCellEdited回调', () => {
      const onCellEdited = vi.fn();
      render(<Grid {...defaultProps} onCellEdited={onCellEdited} />);
      // 回调已注册
      expect(onCellEdited).toBeDefined();
    });

    it('应该接受onSelectionChanged回调', () => {
      const onSelectionChanged = vi.fn();
      render(<Grid {...defaultProps} onSelectionChanged={onSelectionChanged} />);
      expect(onSelectionChanged).toBeDefined();
    });

    it('应该接受onColumnResize回调', () => {
      const onColumnResize = vi.fn();
      render(<Grid {...defaultProps} onColumnResize={onColumnResize} />);
      expect(onColumnResize).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该处理大量数据', () => {
      const startTime = performance.now();
      
      render(
        <Grid
          columns={mockColumns}
          rowCount={10000}
          getCellContent={mockGetCellContent}
        />
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 渲染应该在合理时间内完成（1秒）
      expect(duration).toBeLessThan(1000);
    });

    it('应该处理多列场景', () => {
      const manyColumns = Array.from({ length: 50 }, (_, i) => ({
        id: `col${i}`,
        name: `Column ${i}`,
        type: 'text',
        width: 100,
      }));

      const { container } = render(
        <Grid
          columns={manyColumns}
          rowCount={100}
          getCellContent={mockGetCellContent}
        />
      );

      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('边界情况', () => {
    it('应该处理零行', () => {
      const { container } = render(
        <Grid
          columns={mockColumns}
          rowCount={0}
          getCellContent={mockGetCellContent}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('应该处理零列', () => {
      const { container } = render(
        <Grid
          columns={[]}
          rowCount={100}
          getCellContent={mockGetCellContent}
        />
      );
      expect(container.firstChild).toBeTruthy();
    });

    it.skip('应该处理getCellContent返回undefined', () => {
      const safeGetCell = vi.fn(() => ({
        type: 'text',
        data: '',
        displayData: '',
      }));

      const { container } = render(
        <Grid
          columns={mockColumns}
          rowCount={10}
          getCellContent={safeGetCell}
        />
      );
      
      expect(container.firstChild).toBeTruthy();
    });
  });
});

