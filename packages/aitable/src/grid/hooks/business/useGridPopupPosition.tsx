import { useMemo } from 'react';

/**
 * Editor rect interface
 */
export interface IEditorRect {
  x: number;
  y: number;
  width: number;
  height: number;
  editorId: string;
}

/**
 * Popup position result
 */
export interface IPopupPosition {
  top: number | 'unset';
  bottom: number | 'unset';
  maxHeight: number;
  isAbove: boolean;
}

/**
 * Safe spacing from screen edges
 */
const SAFE_SPACING = 32;

/**
 * Grid container attribute
 */
const GRID_CONTAINER_ATTR = 'data-t-grid-container';

/**
 * Hook for calculating popup position within grid
 * Ensures popups don't overflow screen boundaries
 */
export const useGridPopupPosition = (
  rect: IEditorRect,
  maxHeight?: number
): IPopupPosition | undefined => {
  const { y, height, editorId } = rect;

  return useMemo(() => {
    // Find editor and grid elements
    const editorElement = document.querySelector(`#${editorId}`);
    const gridElement = editorElement?.closest(`[${GRID_CONTAINER_ATTR}]`);
    const gridBound = gridElement?.getBoundingClientRect();

    if (!gridBound) {
      return undefined;
    }

    // Calculate available space
    const screenH = window.innerHeight;
    const { y: gridY } = gridBound;
    const spaceAbove = Math.max(y, gridY);
    const spaceBelow = screenH - gridY - y - height;
    
    // Determine if popup should open above or below
    const isAbove = spaceAbove > spaceBelow;
    
    // Calculate final height with safe spacing
    const availableSpace = isAbove ? y : spaceBelow;
    const finalHeight = Math.min(availableSpace - SAFE_SPACING, maxHeight ?? Infinity);

    return {
      top: isAbove ? 'unset' : height + 1,
      bottom: isAbove ? height : 'unset',
      maxHeight: finalHeight,
      isAbove,
    };
  }, [editorId, y, height, maxHeight]);
};

/**
 * Calculate popup position for a given element
 */
export const calculatePopupPosition = (
  elementRect: DOMRect,
  popupHeight: number,
  containerRect?: DOMRect
): { top?: number; bottom?: number; left?: number; right?: number } => {
  const screenH = window.innerHeight;
  const screenW = window.innerWidth;
  
  const containerTop = containerRect?.top || 0;
  const containerLeft = containerRect?.left || 0;
  const containerRight = containerRect?.right || screenW;
  const containerBottom = containerRect?.bottom || screenH;

  // Calculate available space in each direction
  const spaceAbove = elementRect.top - containerTop;
  const spaceBelow = containerBottom - elementRect.bottom;
  const spaceLeft = elementRect.left - containerLeft;
  const spaceRight = containerRight - elementRect.right;

  const position: { top?: number; bottom?: number; left?: number; right?: number } = {};

  // Vertical positioning
  if (spaceBelow >= popupHeight + SAFE_SPACING) {
    // Open below
    position.top = elementRect.bottom;
  } else if (spaceAbove >= popupHeight + SAFE_SPACING) {
    // Open above
    position.bottom = screenH - elementRect.top;
  } else {
    // Not enough space, use the larger side
    if (spaceBelow > spaceAbove) {
      position.top = elementRect.bottom;
    } else {
      position.bottom = screenH - elementRect.top;
    }
  }

  // Horizontal positioning (center align with element)
  const elementCenter = elementRect.left + elementRect.width / 2;
  position.left = elementCenter;

  return position;
};

