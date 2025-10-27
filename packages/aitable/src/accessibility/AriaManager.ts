/**
 * ARIA 管理器
 * 
 * 为 Grid 组件提供完整的 ARIA 标签和可访问性支持
 */

export interface AriaLabels {
  grid?: string;
  row?: string;
  cell?: string;
  columnHeader?: string;
  rowHeader?: string;
}

export interface AriaAnnouncement {
  message: string;
  priority?: 'polite' | 'assertive';
  timeout?: number;
}

export class AriaManager {
  private liveRegion: HTMLDivElement | null = null;
  private labels: AriaLabels;

  constructor(labels: AriaLabels = {}) {
    this.labels = {
      grid: '数据表格',
      row: '行',
      cell: '单元格',
      columnHeader: '列标题',
      rowHeader: '行标题',
      ...labels,
    };
    this.setupLiveRegion();
  }

  /**
   * 设置 ARIA live region 用于屏幕阅读器公告
   */
  private setupLiveRegion(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(this.liveRegion);
  }

  /**
   * 公告消息给屏幕阅读器
   */
  announce(announcement: AriaAnnouncement): void {
    if (!this.liveRegion) {
      return;
    }

    // 设置优先级
    this.liveRegion.setAttribute(
      'aria-live',
      announcement.priority || 'polite'
    );

    // 清空后设置消息（触发屏幕阅读器）
    this.liveRegion.textContent = '';
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = announcement.message;
      }
    }, 100);

    // 自动清除
    if (announcement.timeout) {
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, announcement.timeout);
    }
  }

  /**
   * 获取 Grid 容器的 ARIA 属性
   */
  getGridAttributes(options: {
    rowCount: number;
    columnCount: number;
    multiSelect?: boolean;
    readonly?: boolean;
  }): Record<string, string> {
    return {
      role: 'grid',
      'aria-label': this.labels.grid || '数据表格',
      'aria-rowcount': String(options.rowCount),
      'aria-colcount': String(options.columnCount),
      'aria-multiselectable': String(options.multiSelect ?? false),
      'aria-readonly': String(options.readonly ?? false),
    };
  }

  /**
   * 获取行的 ARIA 属性
   */
  getRowAttributes(options: {
    rowIndex: number;
    isSelected?: boolean;
    isHeader?: boolean;
  }): Record<string, string> {
    const attrs: Record<string, string> = {
      role: 'row',
      'aria-rowindex': String(options.rowIndex + 1),
    };

    if (options.isSelected !== undefined) {
      attrs['aria-selected'] = String(options.isSelected);
    }

    if (options.isHeader) {
      attrs['aria-label'] = this.labels.rowHeader || '行标题';
    }

    return attrs;
  }

  /**
   * 获取单元格的 ARIA 属性
   */
  getCellAttributes(options: {
    rowIndex: number;
    columnIndex: number;
    isHeader?: boolean;
    isSelected?: boolean;
    isEditing?: boolean;
    isReadonly?: boolean;
    colSpan?: number;
    rowSpan?: number;
  }): Record<string, string> {
    const role = options.isHeader ? 'columnheader' : 'gridcell';
    
    const attrs: Record<string, string> = {
      role,
      'aria-colindex': String(options.columnIndex + 1),
    };

    if (options.isSelected !== undefined) {
      attrs['aria-selected'] = String(options.isSelected);
    }

    if (options.isEditing) {
      attrs['aria-label'] = '正在编辑';
    }

    if (options.isReadonly) {
      attrs['aria-readonly'] = 'true';
    }

    if (options.colSpan && options.colSpan > 1) {
      attrs['aria-colspan'] = String(options.colSpan);
    }

    if (options.rowSpan && options.rowSpan > 1) {
      attrs['aria-rowspan'] = String(options.rowSpan);
    }

    return attrs;
  }

  /**
   * 公告单元格内容
   */
  announceCellContent(options: {
    rowIndex: number;
    columnIndex: number;
    value: unknown;
    columnName?: string;
  }): void {
    const { rowIndex, columnIndex, value, columnName } = options;
    
    const message = [
      columnName || `列 ${columnIndex + 1}`,
      `行 ${rowIndex + 1}`,
      `值: ${this.formatValue(value)}`,
    ].join(', ');

    this.announce({ message, priority: 'polite' });
  }

  /**
   * 公告选择变化
   */
  announceSelection(options: {
    selectedCount: number;
    totalCount: number;
  }): void {
    const { selectedCount, totalCount } = options;
    
    if (selectedCount === 0) {
      this.announce({ message: '清除选择' });
    } else if (selectedCount === totalCount) {
      this.announce({ message: '已选择全部' });
    } else {
      this.announce({ 
        message: `已选择 ${selectedCount} 项，共 ${totalCount} 项` 
      });
    }
  }

  /**
   * 公告编辑状态
   */
  announceEditMode(isEditing: boolean): void {
    const message = isEditing ? '进入编辑模式' : '退出编辑模式';
    this.announce({ message, priority: 'assertive' });
  }

  /**
   * 公告错误
   */
  announceError(error: string): void {
    this.announce({ 
      message: `错误: ${error}`, 
      priority: 'assertive' 
    });
  }

  /**
   * 公告成功操作
   */
  announceSuccess(message: string): void {
    this.announce({ 
      message, 
      priority: 'polite',
      timeout: 3000,
    });
  }

  /**
   * 格式化值为可读文本
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '空';
    }

    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }

    if (typeof value === 'string') {
      return value || '空文本';
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toLocaleDateString('zh-CN');
    }

    if (Array.isArray(value)) {
      return value.length > 0 
        ? `${value.length} 项` 
        : '空列表';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }
}
