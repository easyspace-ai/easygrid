import { attachmentCellRenderer } from './attachmentCellRenderer';
import { booleanCellRenderer } from './booleanCellRenderer';
import { buttonCellRenderer } from './buttonCellRenderer';
import { chartCellRenderer } from './chartCellRenderer';
import { dateCellRenderer } from './dateCellRenderer';
import { imageCellRenderer } from './imageCellRenderer';
import { CellType } from './interface';
import { linkCellRenderer } from './linkCellRenderer';
import { loadingCellRenderer } from './loadingCellRenderer';
import { numberCellRenderer } from './numberCellRenderer';
import { ratingCellRenderer } from './ratingCellRenderer';
import { selectCellRenderer } from './selectCellRenderer';
import { textCellRenderer } from './textCellRenderer';
import { userCellRenderer } from './userCellRenderer';

export * from './interface';
export * from './utils';

import type { IInternalCellRenderer, ICell } from './interface';

// Export getCellRenderer function
export const getCellRenderer = (cellType: CellType): IInternalCellRenderer<ICell> => {
  switch (cellType) {
    case CellType.Text:
      return textCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Link:
      return linkCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Number:
      return numberCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Boolean:
      return booleanCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Select:
    case CellType.MultiSelect:
      return selectCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Image:
      return imageCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Rating:
      return ratingCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Chart:
      return chartCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.User:
      return userCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Button:
      return buttonCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Date:
      return dateCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Attachment:
      return attachmentCellRenderer as IInternalCellRenderer<ICell>;
    case CellType.Loading:
    default:
      return loadingCellRenderer as IInternalCellRenderer<ICell>;
  }
};
