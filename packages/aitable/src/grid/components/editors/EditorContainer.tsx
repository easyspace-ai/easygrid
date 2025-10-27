/* eslint-disable jsx-a11y/no-static-element-interactions */
import { getRandomString } from '../../../utils/string';
import { clamp } from 'lodash';
import type { CSSProperties, ForwardRefRenderFunction } from 'react';
import { useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import type { IGridTheme } from '../../configs';
import { useKeyboardSelection } from '../../hooks/primitive';
import type { IGridTheme as IInteractionLayerProps } from '../../configs';
import {
  SelectionRegionType,
  type IActiveCellBound,
  type ICellItem,
  type IRectangle,
  type IScrollState,
} from '../../types/grid';
import type { CombinedSelection } from '../../managers';
import type { ICell, IInnerCell } from '../../renderers/cell-renderer/interface';
import { CellType } from '../../renderers/cell-renderer/interface';
import { isPrintableKey } from '../../utils/core';
import { BooleanEditor } from './basic/BooleanEditor';
import { RatingEditor } from './enhanced/RatingEditor';
import { SelectEditor } from './enhanced/SelectEditor';
import { TextEditor } from './basic/TextEditor';
import { LinkEditor } from './enhanced/LinkEditor';
import { UserEditor } from './enhanced/UserEditor';
import { ImageEditor } from './basic/ImageEditor';
import { DateEditor } from './enhanced/DateEditor';
import { AttachmentEditor } from './enhanced/AttachmentEditor';
import { ChartEditor } from './basic/ChartEditor';

export interface IEditorContainerProps {
  theme: IGridTheme;
  coordInstance: any;
  scrollToItem: (position: [columnIndex: number, rowIndex: number]) => void;
  real2RowIndex: (index: number) => number;
  getCellContent: (position: [columnIndex: number, rowIndex: number]) => any;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: (selection: CombinedSelection, event: React.ClipboardEvent) => void;
  onPaste?: (selection: CombinedSelection, event: React.ClipboardEvent) => void;
  onDelete?: (selection: CombinedSelection) => void;
  onRowAppend?: () => void;
  onRowExpand?: (rowIndex: number) => void;
  scrollBy: (deltaX: number, deltaY: number) => void;
  isEditing?: boolean;
  scrollState: IScrollState;
  activeCell: ICellItem | null;
  selection: CombinedSelection;
  activeCellBound: IActiveCellBound | null;
  setActiveCell: React.Dispatch<React.SetStateAction<ICellItem | null>>;
  setSelection: React.Dispatch<React.SetStateAction<CombinedSelection>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  onChange?: (cell: ICellItem, cellValue: IInnerCell) => void;
}

export interface IEditorRef<T extends IInnerCell = IInnerCell> {
  focus?: () => void;
  setValue?: (data: T['data']) => void;
  saveValue?: () => void;
}

export interface IEditorProps<T extends IInnerCell = IInnerCell> {
  cell: T;
  rect: IRectangle & { editorId: string };
  theme: IGridTheme;
  style?: CSSProperties;
  isEditing?: boolean;
  setEditing?: React.Dispatch<React.SetStateAction<boolean>>;
  onChange?: (value: unknown) => void;
}

export interface IEditorContainerRef {
  focus?: () => void;
  saveValue?: () => void;
}

const NO_EDITING_CELL_TYPES = new Set([CellType.Boolean, CellType.Rating, CellType.Button]);

export const EditorContainerBase: ForwardRefRenderFunction<
  IEditorContainerRef,
  IEditorContainerProps
> = (props, ref) => {
  const {
    theme,
    isEditing,
    coordInstance,
    scrollState,
    activeCell,
    selection,
    activeCellBound,
    scrollToItem,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onChange,
    onDelete,
    onRowExpand,
    setEditing,
    setActiveCell,
    setSelection,
    real2RowIndex,
    getCellContent,
    scrollBy,
  } = props;
  const { scrollLeft, scrollTop } = scrollState;
  const { rowIndex, realRowIndex, columnIndex } = useMemo(() => {
    const [columnIndex, realRowIndex] = activeCell ?? [-1, -1];
    return {
      rowIndex: real2RowIndex(realRowIndex) ?? -1,
      realRowIndex,
      columnIndex,
    };
  }, [activeCell, real2RowIndex]);
  const cellContent = useMemo(() => {
    return getCellContent([columnIndex, realRowIndex]) as IInnerCell;
  }, [columnIndex, realRowIndex, getCellContent]);
  const { type: cellType, readonly, editorWidth } = cellContent;
  const editingEnable = !readonly && isEditing && activeCell;
  const width = editorWidth ?? coordInstance.getColumnWidth(columnIndex);
  const height = activeCellBound?.height ?? coordInstance.getRowHeight(rowIndex);
  const editorRef = useRef<IEditorRef | null>(null);
  const defaultFocusRef = useRef<HTMLInputElement | null>(null);
  const editorId = useMemo(() => `editor-container-${getRandomString(8)}`, []);

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus?.(),
    saveValue: () => editorRef.current?.saveValue?.(),
  }));

  useEffect(() => {
    if ((cellContent as ICell).type === CellType.Loading) {return;}
    if (!activeCell || isEditing) {return;}
    editorRef.current?.setValue?.(cellContent.data);
  }, [cellContent, activeCell, isEditing]);

  useEffect(() => {
    if ((cellType as CellType) === CellType.Loading) {return;}
    if (!activeCell || selection.type === SelectionRegionType.None) {return;}
    requestAnimationFrame(() => (editorRef.current || defaultFocusRef.current)?.focus?.());
  }, [cellType, activeCell, selection, isEditing]);

  useKeyboardSelection({
    editorRef,
    isEditing,
    activeCell,
    selection,
    coordInstance,
    onUndo,
    onRedo,
    onDelete,
    onRowExpand,
    setEditing,
    setActiveCell,
    setSelection,
    scrollToItem,
    scrollBy,
  });

  const editorStyle = useMemo(
    () =>
      (editingEnable
        ? { pointerEvents: 'auto', minWidth: width, minHeight: height }
        : { pointerEvents: 'none', opacity: 0, width: 0, height: 0 }) as React.CSSProperties,
    [editingEnable, height, width]
  );

  const rect = useMemo(() => {
    const { rowInitSize, columnInitSize, containerWidth, containerHeight } = coordInstance;
    const x = clamp(
      coordInstance.getColumnRelativeOffset(columnIndex, scrollLeft),
      columnInitSize,
      containerWidth - width
    );
    const y = clamp(
      coordInstance.getRowOffset(rowIndex) - scrollTop,
      rowInitSize,
      containerHeight - height
    );

    return {
      x,
      y,
      width,
      height,
      editorId,
    };
  }, [coordInstance, rowIndex, columnIndex, width, height, scrollLeft, scrollTop, editorId]);

  const EditorRenderer = useMemo(() => {
    if (readonly) {return null;}
    if (!isEditing) {return null;}

    const onChangeInner = (value: unknown) => {
      onChange?.([columnIndex, realRowIndex], {
        ...cellContent,
        data: value,
      } as IInnerCell);
    };

    const { customEditor } = cellContent;

    if (customEditor) {
      return customEditor(
        {
          rect,
          theme,
          style: editorStyle,
          cell: cellContent,
          isEditing,
          setEditing,
          onChange: onChangeInner,
        },
        editorRef
      );
    }

    switch (cellType) {
      case CellType.Text:
      case CellType.Number: {
        return (
          <TextEditor
            ref={editorRef}
            rect={rect}
            theme={theme}
            style={editorStyle}
            cell={cellContent}
            isEditing={isEditing}
            onChange={onChangeInner}
          />
        );
      }
      case CellType.Link: {
        return (
          <LinkEditor
            value={(cellContent as any)?.data || null}
            rect={rect}
            style={editorStyle}
            onChange={onChangeInner}
          />
        );
      }
      case CellType.Boolean:
        return (
          <BooleanEditor
            ref={editorRef}
            rect={rect}
            theme={theme}
            cell={cellContent}
            onChange={onChangeInner}
          />
        );
      case CellType.Rating:
        return (
          <div ref={editorRef as any}>
            <RatingEditor
              value={(cellContent as any)?.data || null}
              rect={rect}
              style={editorStyle}
              onChange={onChangeInner}
              options={{
                icon: (cellContent as any)?.icon,
                color: (cellContent as any)?.color,
                max: (cellContent as any)?.max,
              }}
            />
          </div>
        );
      case CellType.Select:
      case CellType.MultiSelect:
        return (
          <SelectEditor
            ref={editorRef}
            rect={rect}
            theme={theme}
            cell={cellContent}
            style={editorStyle}
            isEditing={isEditing}
            setEditing={setEditing}
            onChange={onChangeInner}
          />
        );
      case CellType.Image:
        return (
          <ImageEditor
            ref={editorRef}
            rect={rect}
            theme={theme}
            cell={{
              ...cellContent,
              url: (cellContent as any)?.url || '',
            } as any}
            style={editorStyle}
            isEditing={isEditing}
            onChange={onChangeInner}
          />
        );
      case CellType.Date:
        return (
          <div ref={editorRef as any}>
            <DateEditor
              value={(cellContent as any)?.data || null}
              rect={rect}
              style={editorStyle}
              onChange={(value) => onChangeInner(value)}
            />
          </div>
        );
      case CellType.User:
        return (
          <div ref={editorRef as any}>
            <UserEditor
              value={(cellContent as any)?.data || null}
              users={[]}
              rect={rect}
              style={editorStyle}
              onChange={(value) => onChangeInner(value)}
            />
          </div>
        );
      case CellType.Attachment:
        return (
          <div ref={editorRef as any}>
            <AttachmentEditor
              value={(cellContent as any)?.data || null}
              rect={rect}
              style={editorStyle}
              onChange={(value) => onChangeInner(value)}
            />
          </div>
        );
      case CellType.Chart:
        return (
          <ChartEditor
            ref={editorRef}
            rect={rect}
            theme={theme}
            cell={cellContent as any}
            style={editorStyle}
            isEditing={isEditing}
            onChange={onChangeInner}
          />
        );
      default:
        return null;
    }
  }, [
    rect,
    theme,
    readonly,
    cellType,
    cellContent,
    columnIndex,
    realRowIndex,
    editorStyle,
    isEditing,
    onChange,
    setEditing,
  ]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!activeCell || isEditing) {return;}
    if (!isPrintableKey(event.nativeEvent)) {return;}
    if (NO_EDITING_CELL_TYPES.has(cellType as CellType)) {return;}
    setEditing(true);
    editorRef.current?.setValue?.(null);
  };

  const onPasteInner = (e: React.ClipboardEvent) => {
    if (!activeCell || isEditing) {return;}
    onPaste?.(selection, e);
  };

  const onCopyInner = (e: React.ClipboardEvent) => {
    if (!activeCell || isEditing) {return;}
    onCopy?.(selection, e);
  };

  // 对于 Boolean 和 Rating 字段，容器应该完全不可见
  const containerStyle = useMemo(() => {
    const isInvisibleEditor = NO_EDITING_CELL_TYPES.has(cellType as CellType);
    if (isInvisibleEditor) {
      return {
        position: 'absolute' as const,
        zIndex: 10,
        top: rect.y,
        left: rect.x,
        width: 0,
        height: 0,
        overflow: 'hidden',
      };
    }
    return {
      position: 'absolute' as const,
      zIndex: 10,
      top: rect.y,
      left: rect.x,
      minWidth: width,
      minHeight: height,
    };
  }, [cellType, rect.y, rect.x, width, height]);

  return (
    <div
      id={editorId}
      className="click-outside-ignore"
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
      }}
    >
      <div
        style={containerStyle}
        onKeyDown={onKeyDown}
        onPaste={onPasteInner}
        onCopy={onCopyInner}
      >
        {EditorRenderer}
        <input style={{ opacity: 0 }} ref={defaultFocusRef} />
      </div>
    </div>
  );
};

export const EditorContainer = forwardRef(EditorContainerBase);
