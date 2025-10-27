import type { IGridTheme } from '../../configs';
import { GRID_DEFAULT } from '../../configs';
import type { IRectangle } from '../../interface';
import { measuredCanvas } from '../../utils';
import { drawLine, drawMultiLineText } from '../base-renderer';
import { CellRegionType, CellType } from './interface';
import type {
  IInternalCellRenderer,
  ICellRenderProps,
  ILinkCell,
  ICellClickProps,
  ICellClickCallback,
  ICellMeasureProps,
} from './interface';

interface ITextPosition {
  x: number;
  y: number;
  key: string;
  text: string;
  link: string;
  width: number;
}

interface IComputeTextPositionProps {
  ctx: CanvasRenderingContext2D;
  data: string[] | ILinkCellData;
  rect: IRectangle;
  theme: IGridTheme;
  isActive?: boolean;
}

interface ILinkCellData {
  title?: string;
  url?: string;
  text?: string;
}

const { cellHorizontalPadding, cellVerticalPaddingMD, cellTextLineHeight, maxRowCount } =
  GRID_DEFAULT;

const computeTextPositions = ({
  ctx,
  data,
  rect,
  theme,
  isActive,
}: IComputeTextPositionProps): ITextPosition[] => {
  const positions: ITextPosition[] = [];
  const { x, y, width, height } = rect;
  const { fontSizeSM } = theme;
  const drawWidth = width - 2 * cellHorizontalPadding;
  const drawHeight = height - cellVerticalPaddingMD;
  const maxLines = isActive ? Infinity : Math.max(1, Math.floor(drawHeight / cellTextLineHeight));

  let row = 1;
  let index = 0;
  let drawX = x + cellHorizontalPadding;
  let drawY = y + cellVerticalPaddingMD;

  // Handle different data structures: array, object, or string
  let textArray: string[] = [];
  if (Array.isArray(data)) {
    textArray = data.filter(item => item != null).map(item => String(item));
  } else if (data && typeof data === 'object') {
    // Extract text from ILinkCellData object
    const linkData = data;
    const displayText = linkData.title || linkData.text || linkData.url || '';
    if (displayText) {
      textArray = [displayText];
    }
  } else if (data != null) {
    // Handle string or other primitive values
    textArray = [String(data)];
  }

  for (const text of textArray) {
    const textLines = drawMultiLineText(ctx, {
      text,
      maxLines,
      maxWidth: drawWidth,
      needRender: false,
      fontSize: fontSizeSM,
    });

    for (const { text: lineText, width: textWidth } of textLines) {
      if (row > maxLines) {break;}

      positions.push({
        x: drawX,
        y: drawY,
        text: lineText,
        width: textWidth,
        link: text,
        key: String(index),
      });

      row++;
      drawY += cellTextLineHeight;
      drawX = x + cellHorizontalPadding;
    }

    index++;
  }

  return positions;
};

export const linkCellRenderer: IInternalCellRenderer<ILinkCell> = {
  type: CellType.Link,
  needsHover: true,
  needsHoverPosition: true,
  measure: (cell: ILinkCell, props: ICellMeasureProps) => {
    const { data } = cell;
    const { ctx, theme, width, height } = props;
    if (!ctx || !theme) return { width: width ?? 0, height: height ?? 0, totalHeight: height ?? 0 };

    // Check if data is empty
    const isEmpty = Array.isArray(data) ? !data.length : 
                   (data && typeof data === 'object') ? (!data.title && !data.text && !data.url) :
                   !data || data === '';
    if (isEmpty) {
      return { width, height, totalHeight: height };
    }

    const textPositions = computeTextPositions({
      ctx,
      data,
      rect: { x: 0, y: 0, width, height },
      theme,
      isActive: true,
    });

    const positionLength = textPositions.length;
    if (!positionLength) {return { width, height, totalHeight: height };}

    const totalHeight = textPositions[positionLength - 1].y + cellTextLineHeight;
    const maxHeight = cellVerticalPaddingMD + maxRowCount * cellTextLineHeight;
    const finalHeight = Math.max(Math.min(totalHeight, maxHeight), height);

    return {
      width,
      height: finalHeight,
      totalHeight,
    };
  },
  draw: (cell: ILinkCell, props: ICellRenderProps) => {
    const { ctx, rect, theme, hoverCellPosition, isActive } = props;
    if (!ctx || !rect || !theme) return;
    
    const { data } = cell;
    const { x: originX, y: originY, width: originWidth, height: originHeight } = rect;
    const hoverX = hoverCellPosition?.x ?? -1;
    const hoverY = hoverCellPosition?.y ?? -1;
    const { fontSizeSM, cellTextColorHighlight } = theme;

    ctx.save();
    ctx.beginPath();

    // Check if data is empty
    const isEmpty = Array.isArray(data) ? !data.length : 
                   (data && typeof data === 'object') ? (!data.title && !data.text && !data.url) :
                   !data || data === '';
    if (!isEmpty && !isActive) {
      ctx.rect(originX, originY, originWidth, originHeight);
      ctx.clip();
    }

    const textPositions = computeTextPositions({
      ctx,
      data,
      rect,
      theme,
      isActive,
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cellTextColorHighlight;

    let hoveredLink = '';
    let hoveredKey = '';
    const offsetY = fontSizeSM / 2;

    textPositions.forEach((position) => {
      const { x, y, width, text, link, key } = position;
      const isHovered =
        hoverX >= cellHorizontalPadding &&
        hoverX <= cellHorizontalPadding + width &&
        hoverY >= y - originY &&
        hoverY <= y - originY + cellTextLineHeight;

      if (isHovered) {
        hoveredLink = link;
        hoveredKey = key;
      }

      ctx.fillText(text, x, y + offsetY);
    });

    if (hoveredLink) {
      textPositions.forEach((position) => {
        const { x, y, width, key } = position;

        if (key === hoveredKey) {
          drawLine(ctx, {
            x,
            y,
            points: [0, fontSizeSM - 1, width, fontSizeSM - 1],
            stroke: cellTextColorHighlight,
          });
        }
      });
    }

    ctx.restore();
  },
  checkRegion: (cell: ILinkCell, props: ICellClickProps, _shouldCalculate?: boolean) => {
    const { hoverCellPosition, width, height, isActive, theme, activeCellBound } = props;
    const { x: hoverX, y: originHoverY } = hoverCellPosition;
    const { fontSizeSM } = theme;
    const { data } = cell;

    if (measuredCanvas == null) {return { type: CellRegionType.Blank };}

    const { ctx, setFontSize } = measuredCanvas;

    if (!ctx) {return { type: CellRegionType.Blank };}

    const scrollTop = activeCellBound?.scrollTop ?? 0;
    const hoverY = originHoverY + scrollTop;

    setFontSize(fontSizeSM);

    const textPositions = computeTextPositions({
      ctx,
      data,
      rect: { x: 0, y: 0, width, height },
      theme,
      isActive,
    });

    for (const position of textPositions) {
      const { x, y, width, link } = position;
      if (hoverX >= x && hoverX <= x + width && hoverY >= y && hoverY <= y + cellTextLineHeight) {
        // Extract URL based on data structure
        let linkUrl = link; // default to the text content
        if (Array.isArray(data)) {
          linkUrl = link;
        } else if (data && typeof data === 'object') {
          const linkData = data as ILinkCellData;
          linkUrl = linkData.url || linkData.text || linkData.title || link;
        } else if (typeof data === 'string') {
          linkUrl = data;
        }
        return { type: CellRegionType.Preview, data: linkUrl };
      }
    }
    return { type: CellRegionType.Blank };
  },
  onClick: (cell: ILinkCell, props: ICellClickProps, _callback: ICellClickCallback) => {
    const cellRegion = linkCellRenderer.checkRegion?.(cell, props, true);
    if (!cellRegion || cellRegion.type === CellRegionType.Blank) {return;}
    if (cellRegion.type === CellRegionType.Preview) {
      cell.onClick?.(cellRegion.data as string);
    }
  },
};
