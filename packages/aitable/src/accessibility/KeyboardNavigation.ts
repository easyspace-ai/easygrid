/**
 * 键盘导航管理器
 * 
 * 提供完整的键盘导航支持，让 Grid 可以完全通过键盘操作
 */

export enum NavigationKey {
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  Tab = 'Tab',
  Enter = 'Enter',
  Escape = 'Escape',
  Space = 'Space',
  Home = 'Home',
  End = 'End',
  PageUp = 'PageUp',
  PageDown = 'PageDown',
  Delete = 'Delete',
  Backspace = 'Backspace',
}

export interface CellPosition {
  rowIndex: number;
  columnIndex: number;
}

export interface NavigationOptions {
  wrap?: boolean; // 到边界时是否循环
  skipDisabled?: boolean; // 是否跳过禁用的单元格
  multiSelect?: boolean; // 是否支持多选
}

export class KeyboardNavigationManager {
  private rowCount: number;
  private columnCount: number;
  private options: Required<NavigationOptions>;
  
  private disabledCells: Set<string>;
  private onNavigate?: (position: CellPosition) => void;
  private onSelect?: (positions: CellPosition[]) => void;
  private onEdit?: (position: CellPosition) => void;

  constructor(
    rowCount: number,
    columnCount: number,
    options: NavigationOptions = {}
  ) {
    this.rowCount = rowCount;
    this.columnCount = columnCount;
    this.options = {
      wrap: options.wrap ?? false,
      skipDisabled: options.skipDisabled ?? true,
      multiSelect: options.multiSelect ?? true,
    };
    this.disabledCells = new Set();
  }

  /**
   * 处理键盘事件
   */
  handleKeyDown(
    event: KeyboardEvent,
    currentPosition: CellPosition
  ): CellPosition | null {
    const key = event.key as NavigationKey;
    const hasCtrl = event.ctrlKey || event.metaKey;
    const hasShift = event.shiftKey;

    // 阻止默认行为
    if (this.shouldPreventDefault(key)) {
      event.preventDefault();
    }

    switch (key) {
      case NavigationKey.ArrowUp:
        return this.moveUp(currentPosition, hasCtrl, hasShift);
      
      case NavigationKey.ArrowDown:
        return this.moveDown(currentPosition, hasCtrl, hasShift);
      
      case NavigationKey.ArrowLeft:
        return this.moveLeft(currentPosition, hasCtrl, hasShift);
      
      case NavigationKey.ArrowRight:
        return this.moveRight(currentPosition, hasCtrl, hasShift);
      
      case NavigationKey.Tab:
        return hasShift 
          ? this.movePrevious(currentPosition)
          : this.moveNext(currentPosition);
      
      case NavigationKey.Enter:
        if (!hasShift) {
          this.onEdit?.(currentPosition);
          return null;
        }
        return this.moveUp(currentPosition, false, false);
      
      case NavigationKey.Home:
        return hasCtrl
          ? { rowIndex: 0, columnIndex: 0 }
          : { rowIndex: currentPosition.rowIndex, columnIndex: 0 };
      
      case NavigationKey.End:
        return hasCtrl
          ? { rowIndex: this.rowCount - 1, columnIndex: this.columnCount - 1 }
          : { rowIndex: currentPosition.rowIndex, columnIndex: this.columnCount - 1 };
      
      case NavigationKey.PageUp:
        return this.movePageUp(currentPosition);
      
      case NavigationKey.PageDown:
        return this.movePageDown(currentPosition);
      
      default:
        return null;
    }
  }

  /**
   * 向上移动
   */
  private moveUp(
    current: CellPosition,
    toStart = false,
    withSelection = false
  ): CellPosition | null {
    if (toStart) {
      return { rowIndex: 0, columnIndex: current.columnIndex };
    }

    let newRow = current.rowIndex - 1;
    
    if (newRow < 0) {
      if (this.options.wrap) {
        newRow = this.rowCount - 1;
      } else {
        return null;
      }
    }

    const newPosition = { rowIndex: newRow, columnIndex: current.columnIndex };
    return this.getValidPosition(newPosition, 'up');
  }

  /**
   * 向下移动
   */
  private moveDown(
    current: CellPosition,
    toEnd = false,
    withSelection = false
  ): CellPosition | null {
    if (toEnd) {
      return { rowIndex: this.rowCount - 1, columnIndex: current.columnIndex };
    }

    let newRow = current.rowIndex + 1;
    
    if (newRow >= this.rowCount) {
      if (this.options.wrap) {
        newRow = 0;
      } else {
        return null;
      }
    }

    const newPosition = { rowIndex: newRow, columnIndex: current.columnIndex };
    return this.getValidPosition(newPosition, 'down');
  }

  /**
   * 向左移动
   */
  private moveLeft(
    current: CellPosition,
    toStart = false,
    withSelection = false
  ): CellPosition | null {
    if (toStart) {
      return { rowIndex: current.rowIndex, columnIndex: 0 };
    }

    const newColumn = current.columnIndex - 1;
    
    if (newColumn < 0) {
      if (this.options.wrap) {
        // 换行
        const newRow = current.rowIndex - 1;
        if (newRow < 0) {
          return null;
        }
        return { rowIndex: newRow, columnIndex: this.columnCount - 1 };
      } else {
        return null;
      }
    }

    const newPosition = { rowIndex: current.rowIndex, columnIndex: newColumn };
    return this.getValidPosition(newPosition, 'left');
  }

  /**
   * 向右移动
   */
  private moveRight(
    current: CellPosition,
    toEnd = false,
    withSelection = false
  ): CellPosition | null {
    if (toEnd) {
      return { rowIndex: current.rowIndex, columnIndex: this.columnCount - 1 };
    }

    const newColumn = current.columnIndex + 1;
    
    if (newColumn >= this.columnCount) {
      if (this.options.wrap) {
        // 换行
        const newRow = current.rowIndex + 1;
        if (newRow >= this.rowCount) {
          return null;
        }
        return { rowIndex: newRow, columnIndex: 0 };
      } else {
        return null;
      }
    }

    const newPosition = { rowIndex: current.rowIndex, columnIndex: newColumn };
    return this.getValidPosition(newPosition, 'right');
  }

  /**
   * 移动到下一个单元格（Tab）
   */
  private moveNext(current: CellPosition): CellPosition | null {
    return this.moveRight(current, false, false) || 
           this.moveDown({ ...current, columnIndex: 0 }, false, false);
  }

  /**
   * 移动到上一个单元格（Shift+Tab）
   */
  private movePrevious(current: CellPosition): CellPosition | null {
    return this.moveLeft(current, false, false) || 
           this.moveUp({ ...current, columnIndex: this.columnCount - 1 }, false, false);
  }

  /**
   * 向上翻页
   */
  private movePageUp(current: CellPosition): CellPosition | null {
    const pageSize = 10; // 可以根据视口高度动态计算
    const newRow = Math.max(0, current.rowIndex - pageSize);
    return { rowIndex: newRow, columnIndex: current.columnIndex };
  }

  /**
   * 向下翻页
   */
  private movePageDown(current: CellPosition): CellPosition | null {
    const pageSize = 10; // 可以根据视口高度动态计算
    const newRow = Math.min(this.rowCount - 1, current.rowIndex + pageSize);
    return { rowIndex: newRow, columnIndex: current.columnIndex };
  }

  /**
   * 获取有效位置（跳过禁用的单元格）
   */
  private getValidPosition(
    position: CellPosition,
    direction: 'up' | 'down' | 'left' | 'right'
  ): CellPosition | null {
    if (!this.options.skipDisabled) {
      return position;
    }

    let current = position;
    let attempts = 0;
    const maxAttempts = this.rowCount * this.columnCount;

    while (this.isCellDisabled(current) && attempts < maxAttempts) {
      const next = direction === 'up' ? this.moveUp(current) :
                   direction === 'down' ? this.moveDown(current) :
                   direction === 'left' ? this.moveLeft(current) :
                   this.moveRight(current);
      
      if (!next) {
        return null;
      }
      
      current = next;
      attempts++;
    }

    return this.isCellDisabled(current) ? null : current;
  }

  /**
   * 检查单元格是否禁用
   */
  private isCellDisabled(position: CellPosition): boolean {
    const key = `${position.rowIndex},${position.columnIndex}`;
    return this.disabledCells.has(key);
  }

  /**
   * 禁用单元格
   */
  disableCell(position: CellPosition): void {
    const key = `${position.rowIndex},${position.columnIndex}`;
    this.disabledCells.add(key);
  }

  /**
   * 启用单元格
   */
  enableCell(position: CellPosition): void {
    const key = `${position.rowIndex},${position.columnIndex}`;
    this.disabledCells.delete(key);
  }

  /**
   * 更新行列数
   */
  updateDimensions(rowCount: number, columnCount: number): void {
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }

  /**
   * 设置回调
   */
  setOnNavigate(callback: (position: CellPosition) => void): void {
    this.onNavigate = callback;
  }

  setOnSelect(callback: (positions: CellPosition[]) => void): void {
    this.onSelect = callback;
  }

  setOnEdit(callback: (position: CellPosition) => void): void {
    this.onEdit = callback;
  }

  /**
   * 判断是否应该阻止默认行为
   */
  private shouldPreventDefault(key: NavigationKey): boolean {
    const navigationKeys = [
      NavigationKey.ArrowUp,
      NavigationKey.ArrowDown,
      NavigationKey.ArrowLeft,
      NavigationKey.ArrowRight,
      NavigationKey.Tab,
      NavigationKey.Home,
      NavigationKey.End,
      NavigationKey.PageUp,
      NavigationKey.PageDown,
      NavigationKey.Space,
    ];

    return navigationKeys.includes(key);
  }
}
