import type { IAttachmentCell } from './interface';
import { CellType } from './interface';
import type { IBaseCellRenderer } from './interface';

export const attachmentCellRenderer: IBaseCellRenderer<IAttachmentCell> = {
  type: CellType.Attachment,
  draw: (cell, props) => {
    const { ctx, theme, rect } = props;
    if (!ctx || !theme || !rect) return;
    
    const { data } = cell;
    const { textColor, cellLineColor } = theme;
    const { x, y, width, height } = rect;

    // 设置文本样式
    ctx.fillStyle = textColor;
    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 绘制附件信息
    if (data && data.length > 0) {
      const text = `${data.length} 个附件`;
      const textX = x + 8;
      const textY = y + height / 2;
      ctx.fillText(text, textX, textY);
    } else {
      const text = '无附件';
      const textX = x + 8;
      const textY = y + height / 2;
      ctx.fillStyle = theme.textColorSecondary;
      ctx.fillText(text, textX, textY);
    }

    // 绘制边框
    if (props.isActive) {
      ctx.strokeStyle = theme.cellLineColorActived;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    }
  },
  needsHover: true,
};
