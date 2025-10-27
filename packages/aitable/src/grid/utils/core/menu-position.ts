/**
 * Menu Positioning Utilities
 * 菜单定位工具 - 处理边界检测、滚动补偿等
 */

export interface IPosition {
  x: number;
  y: number;
}

export interface ISize {
  width: number;
  height: number;
}

export interface IPositionResult {
  left: number;
  top: number;
  transformOrigin?: string;
}

/**
 * 计算菜单的最佳位置
 * 确保菜单在视口内完全可见
 */
export function calculateMenuPosition(
  triggerPosition: IPosition,
  menuSize: ISize,
  options: {
    offset?: IPosition; // 偏移量
    preferredPlacement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right' | 'left';
    container?: HTMLElement; // 容器元素（用于获取滚动位置）
    padding?: number; // 距离边界的最小距离
  } = {}
): IPositionResult {
  const {
    offset = { x: 0, y: 0 },
    preferredPlacement = 'bottom-start',
    container,
    padding = 8,
  } = options;

  // 获取视口尺寸
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 获取滚动位置
  const scrollX = container ? container.scrollLeft : window.scrollX;
  const scrollY = container ? container.scrollTop : window.scrollY;

  // 计算触发点的绝对位置
  const absoluteX = triggerPosition.x + offset.x;
  const absoluteY = triggerPosition.y + offset.y;

  // 初始位置（根据首选位置）
  let left = absoluteX;
  let top = absoluteY;
  let transformOrigin = 'top left';

  switch (preferredPlacement) {
    case 'bottom-start':
      left = absoluteX;
      top = absoluteY;
      transformOrigin = 'top left';
      break;
    case 'bottom-end':
      left = absoluteX - menuSize.width;
      top = absoluteY;
      transformOrigin = 'top right';
      break;
    case 'top-start':
      left = absoluteX;
      top = absoluteY - menuSize.height;
      transformOrigin = 'bottom left';
      break;
    case 'top-end':
      left = absoluteX - menuSize.width;
      top = absoluteY - menuSize.height;
      transformOrigin = 'bottom right';
      break;
    case 'right':
      left = absoluteX;
      top = absoluteY - menuSize.height / 2;
      transformOrigin = 'left center';
      break;
    case 'left':
      left = absoluteX - menuSize.width;
      top = absoluteY - menuSize.height / 2;
      transformOrigin = 'right center';
      break;
  }

  // 边界检测 - 右边界
  if (left + menuSize.width > viewportWidth - padding) {
    left = viewportWidth - menuSize.width - padding;
    // 更新 transform origin
    if (transformOrigin.includes('left')) {
      transformOrigin = transformOrigin.replace('left', 'right');
    }
  }

  // 边界检测 - 左边界
  if (left < padding) {
    left = padding;
    // 更新 transform origin
    if (transformOrigin.includes('right')) {
      transformOrigin = transformOrigin.replace('right', 'left');
    }
  }

  // 边界检测 - 下边界
  if (top + menuSize.height > viewportHeight - padding) {
    top = viewportHeight - menuSize.height - padding;
    // 如果超出下边界，尝试显示在上方
    if (top < absoluteY) {
      top = absoluteY - menuSize.height;
      // 更新 transform origin
      if (transformOrigin.includes('top')) {
        transformOrigin = transformOrigin.replace('top', 'bottom');
      }
    }
  }

  // 边界检测 - 上边界
  if (top < padding) {
    top = padding;
    // 更新 transform origin
    if (transformOrigin.includes('bottom')) {
      transformOrigin = transformOrigin.replace('bottom', 'top');
    }
  }

  return {
    left: Math.round(left),
    top: Math.round(top),
    transformOrigin,
  };
}

/**
 * 获取元素的边界矩形（相对于视口）
 */
export function getElementRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}

/**
 * 检查点是否在元素内
 */
export function isPointInElement(
  point: IPosition,
  element: HTMLElement
): boolean {
  const rect = getElementRect(element);
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

/**
 * 获取鼠标事件的绝对位置
 */
export function getMousePosition(event: MouseEvent | React.MouseEvent): IPosition {
  return {
    x: event.clientX,
    y: event.clientY,
  };
}

/**
 * 计算弹出层的位置（用于对话框、tooltip等）
 */
export function calculatePopoverPosition(
  anchorElement: HTMLElement,
  popoverSize: ISize,
  placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
  gap: number = 4
): IPositionResult {
  const anchorRect = getElementRect(anchorElement);
  
  let left = 0;
  let top = 0;
  let transformOrigin = 'top center';

  switch (placement) {
    case 'bottom':
      left = anchorRect.left + (anchorRect.width - popoverSize.width) / 2;
      top = anchorRect.bottom + gap;
      transformOrigin = 'top center';
      break;
    case 'top':
      left = anchorRect.left + (anchorRect.width - popoverSize.width) / 2;
      top = anchorRect.top - popoverSize.height - gap;
      transformOrigin = 'bottom center';
      break;
    case 'right':
      left = anchorRect.right + gap;
      top = anchorRect.top + (anchorRect.height - popoverSize.height) / 2;
      transformOrigin = 'center left';
      break;
    case 'left':
      left = anchorRect.left - popoverSize.width - gap;
      top = anchorRect.top + (anchorRect.height - popoverSize.height) / 2;
      transformOrigin = 'center right';
      break;
  }

  // 应用边界检测
  return calculateMenuPosition(
    { x: left, y: top },
    popoverSize,
    { preferredPlacement: 'bottom-start' }
  );
}

