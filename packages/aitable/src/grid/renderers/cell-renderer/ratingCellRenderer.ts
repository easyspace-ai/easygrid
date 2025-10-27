import { GRID_DEFAULT } from '../../configs';
import { hexToRGBA, inRange } from '../../utils';
import { CellRegionType, CellType } from './interface';
import type {
  IInternalCellRenderer,
  ICellRenderProps,
  IRatingCell,
  ICellClickProps,
  ICellClickCallback,
} from './interface';

const gapSize = 3;

const { cellHorizontalPadding } = GRID_DEFAULT;

export const ratingCellRenderer: IInternalCellRenderer<IRatingCell> = {
  type: CellType.Rating,
  needsHover: true,
  needsHoverPosition: true,
  draw: (cell: IRatingCell, props: ICellRenderProps) => {
    const { data, icon, color, max, readonly } = cell;
    const { ctx, theme, rect, hoverCellPosition, spriteManager } = props;
    if (!ctx || !theme || !rect) return;
    
    const { x, y, width, height } = rect;
    const hoverX = hoverCellPosition?.x ?? 0;
    const hoverY = hoverCellPosition?.y ?? 0;
    const { iconSizeXS, iconFgHighlight, cellLineColor } = theme;

    // 即使data为null或0，也要显示所有灰色星星
    const ratingValue = data ?? 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let currentX = x + cellHorizontalPadding;
    const verticalPadding = (height - iconSizeXS) / 2;
    const initY = y + verticalPadding;
    const isVerticalRange = inRange(hoverY, verticalPadding, verticalPadding + iconSizeXS);
    const iconColor = color ?? iconFgHighlight;
    const hoverColor = hexToRGBA(iconColor, 0.3);
    const maxHoverX = cellHorizontalPadding + max * (iconSizeXS + gapSize);

    for (let i = 0; i < max; i++) {
      const isHighlight = ratingValue > i;
      const isHovered = hoverX >= currentX - x && hoverX < maxHoverX;
      let fillColor: string;

      if (isHighlight) {
        fillColor = iconColor;
      } else if (!readonly && isVerticalRange && isHovered) {
        fillColor = hoverColor;
      } else {
        fillColor = cellLineColor;
      }

      spriteManager.drawSprite(ctx, {
        sprite: icon,
        x: currentX,
        y: initY,
        size: iconSizeXS,
        colors: [fillColor, fillColor],
        theme,
      });
      currentX += iconSizeXS + gapSize;
    }

    ctx.restore();
  },
  checkRegion: (cell: IRatingCell, props: ICellClickProps, shouldCalculate?: boolean) => {
    const { data, max, readonly } = cell;
    if (readonly) {return { type: CellRegionType.Blank };}
    const { hoverCellPosition, height, theme } = props;
    if (!hoverCellPosition || !theme) return { type: CellRegionType.Blank };
    
    const { x, y } = hoverCellPosition;
    const { iconSizeXS } = theme;
    const minX = cellHorizontalPadding;
    const maxX = minX + max * (iconSizeXS + gapSize);

    if (inRange(x, minX, maxX) && inRange(y, height / 2 - iconSizeXS, height / 2 + iconSizeXS)) {
      if (!shouldCalculate) {return { type: CellRegionType.Update, data: null };}
      const newData = Math.ceil((x - cellHorizontalPadding) / (iconSizeXS + gapSize));
      return {
        type: CellRegionType.Update,
        data: newData !== data ? newData : null,
      };
    }
    return { type: CellRegionType.Blank };
  },
  onClick: (cell: IRatingCell, props: ICellClickProps, callback: ICellClickCallback) => {
    const cellRegion = ratingCellRenderer.checkRegion?.(cell, props, true);
    if (!cellRegion || cellRegion.type === CellRegionType.Blank) {return;}
    callback(cellRegion);
  },
};
