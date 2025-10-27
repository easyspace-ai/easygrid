/**
 * 可访问性工具导出
 */

export { KeyboardNavigationManager, NavigationKey } from './KeyboardNavigation';
export type { CellPosition, NavigationOptions } from './KeyboardNavigation';

export { AriaManager } from './AriaManager';
export type { AriaLabels, AriaAnnouncement } from './AriaManager';

export { FocusManager } from './FocusManager';
export type { FocusOptions } from './FocusManager';

// React Hook 封装
import { useEffect, useRef, useCallback } from 'react';
import { KeyboardNavigationManager, type CellPosition } from './KeyboardNavigation';
import { AriaManager } from './AriaManager';
import { FocusManager } from './FocusManager';

/**
 * 使用键盘导航
 */
export function useKeyboardNavigation(options: {
  rowCount: number;
  columnCount: number;
  onNavigate?: (position: CellPosition) => void;
  onEdit?: (position: CellPosition) => void;
  enabled?: boolean;
}): {
  handleKeyDown: (event: KeyboardEvent, currentPosition: CellPosition) => CellPosition | null;
  navigationManager: React.MutableRefObject<KeyboardNavigationManager>;
} {
  const navigationManagerRef = useRef(
    new KeyboardNavigationManager(options.rowCount, options.columnCount)
  );

  // 更新尺寸
  useEffect(() => {
    navigationManagerRef.current.updateDimensions(options.rowCount, options.columnCount);
  }, [options.rowCount, options.columnCount]);

  // 设置回调
  useEffect(() => {
    if (options.onNavigate) {
      navigationManagerRef.current.setOnNavigate(options.onNavigate);
    }
    if (options.onEdit) {
      navigationManagerRef.current.setOnEdit(options.onEdit);
    }
  }, [options.onNavigate, options.onEdit]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, currentPosition: CellPosition) => {
      if (!options.enabled) {
        return null;
      }
      return navigationManagerRef.current.handleKeyDown(event, currentPosition);
    },
    [options.enabled]
  );

  return {
    handleKeyDown,
    navigationManager: navigationManagerRef,
  };
}

/**
 * 使用 ARIA 管理
 */
export function useAriaManager(): AriaManager {
  const ariaManagerRef = useRef<AriaManager>();

  if (!ariaManagerRef.current) {
    ariaManagerRef.current = new AriaManager();
  }

  useEffect(() => {
    return () => {
      ariaManagerRef.current?.dispose();
    };
  }, []);

  return ariaManagerRef.current;
}

/**
 * 使用焦点管理
 */
export function useFocusManager(gridRef: React.RefObject<HTMLElement>): FocusManager {
  const focusManagerRef = useRef(new FocusManager());

  useEffect(() => {
    if (gridRef.current) {
      focusManagerRef.current.setGridElement(gridRef.current);
    }
  }, [gridRef]);

  return focusManagerRef.current;
}
