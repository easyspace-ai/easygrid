/**
 * 焦点管理器
 * 
 * 管理 Grid 组件中的焦点状态和焦点陷阱
 */

export interface FocusOptions {
  preventScroll?: boolean;
  focusVisible?: boolean;
}

export class FocusManager {
  private gridElement: HTMLElement | null = null;
  private focusStack: HTMLElement[] = [];
  private restoreFocus = true;

  /**
   * 设置 Grid 容器元素
   */
  setGridElement(element: HTMLElement | null): void {
    this.gridElement = element;
  }

  /**
   * 聚焦到单元格
   */
  focusCell(
    rowIndex: number,
    columnIndex: number,
    options: FocusOptions = {}
  ): void {
    if (!this.gridElement) {
      return;
    }

    const cell = this.getCellElement(rowIndex, columnIndex);
    if (cell) {
      this.focus(cell, options);
    }
  }

  /**
   * 聚焦到元素
   */
  focus(element: HTMLElement, options: FocusOptions = {}): void {
    if (!element) {
      return;
    }

    // 保存当前焦点
    if (document.activeElement instanceof HTMLElement) {
      this.focusStack.push(document.activeElement);
    }

    // 设置焦点
    element.focus({
      preventScroll: options.preventScroll ?? false,
    });

    // 设置焦点可见性
    if (options.focusVisible) {
      element.setAttribute('data-focus-visible', 'true');
    } else {
      element.removeAttribute('data-focus-visible');
    }
  }

  /**
   * 恢复焦点
   */
  restorePreviousFocus(): void {
    const previousElement = this.focusStack.pop();
    if (previousElement && this.restoreFocus) {
      previousElement.focus();
    }
  }

  /**
   * 获取单元格元素
   */
  private getCellElement(
    rowIndex: number,
    columnIndex: number
  ): HTMLElement | null {
    if (!this.gridElement) {
      return null;
    }

    const selector = `[role="gridcell"][aria-rowindex="${rowIndex + 1}"][aria-colindex="${columnIndex + 1}"]`;
    return this.gridElement.querySelector<HTMLElement>(selector);
  }

  /**
   * 获取第一个可聚焦元素
   */
  getFirstFocusableElement(): HTMLElement | null {
    if (!this.gridElement) {
      return null;
    }

    const selector = this.getFocusableSelector();
    return this.gridElement.querySelector<HTMLElement>(selector);
  }

  /**
   * 获取最后一个可聚焦元素
   */
  getLastFocusableElement(): HTMLElement | null {
    if (!this.gridElement) {
      return null;
    }

    const selector = this.getFocusableSelector();
    const elements = this.gridElement.querySelectorAll<HTMLElement>(selector);
    return elements.length > 0 ? elements[elements.length - 1] : null;
  }

  /**
   * 创建焦点陷阱
   */
  createFocusTrap(container: HTMLElement): () => void {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = container.querySelectorAll<HTMLElement>(
        this.getFocusableSelector()
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // 返回清理函数
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * 获取可聚焦元素的选择器
   */
  private getFocusableSelector(): string {
    return [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="gridcell"][tabindex="0"]',
    ].join(', ');
  }

  /**
   * 设置是否恢复焦点
   */
  setRestoreFocus(restore: boolean): void {
    this.restoreFocus = restore;
  }

  /**
   * 清空焦点栈
   */
  clearFocusStack(): void {
    this.focusStack = [];
  }
}
