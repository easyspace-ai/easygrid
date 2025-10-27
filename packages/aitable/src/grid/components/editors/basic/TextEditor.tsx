import { Input } from '../../../../ui';
import type { ChangeEvent, ForwardRefRenderFunction, KeyboardEvent, RefObject } from 'react';
import { useState, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
// 使用 ESM 导入并以 any 断言，避免 TS/React 版本差异造成的 JSX 类型不兼容
import AutoSizeTextareaDefault from 'react-textarea-autosize';
const AutoSizeTextarea: any = AutoSizeTextareaDefault as any;
import { Key } from 'ts-keycode-enum';
import { GRID_DEFAULT } from '../../../configs';
import type { ILinkCell, INumberCell, ITextCell } from '../../../renderers';
import { CellType } from '../../../renderers';
import type { IEditorRef, IEditorProps } from '../EditorContainer';

const { rowHeight: defaultRowHeight } = GRID_DEFAULT;

const TextEditorBase: ForwardRefRenderFunction<
  IEditorRef<ITextCell | INumberCell>,
  IEditorProps<ITextCell | INumberCell | ILinkCell>
> = (props, ref) => {
  const { cell, rect, style, theme, isEditing, onChange } = props;
  const { cellLineColorActived } = theme;
  const { width, height } = rect;
  const { displayData, type } = cell;
  const needWrap = (cell as ITextCell)?.isWrap;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [value, setValueInner] = useState(displayData);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    setValue: (value: string | number | null | undefined) => setValueInner(String(value ?? '')),
    saveValue,
  }));

  const saveValue = () => {
    if (value === displayData || !isEditing) {return;}
    if (type === CellType.Number) {
      onChange?.(Number(value));
    } else {
      onChange?.(typeof value === 'string' ? value.trim() : value);
    }
  };

  const onChangeInner = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setValueInner(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const { keyCode, shiftKey } = event;
    if (keyCode === Key.Enter && !shiftKey) {
      event.preventDefault();
    }
    if (keyCode === Key.Enter && shiftKey) {
      event.stopPropagation();
    }
  };

  const attachStyle = useMemo(() => {
    const style: React.CSSProperties = {
      width: width + 4,
      minHeight: height + 4,
      height: needWrap ? 'auto' : height + 4,
      marginLeft: -2,
      marginTop: -2,
      textAlign: type === CellType.Number ? 'right' : 'left',
    };
    if (height > defaultRowHeight) {
      style.paddingBottom = height - defaultRowHeight;
    }
    return style;
  }, [type, height, width, needWrap]);

  return (
    <>
      {needWrap ? (
        <div
          style={{
            ...attachStyle,
            paddingBottom: 16,
            border: `2px solid ${cellLineColorActived}`,
            ...style,
          }}
          className="relative rounded-md bg-background"
        >
          <AutoSizeTextarea
            ref={inputRef as RefObject<HTMLTextAreaElement>}
            className="w-full resize-none rounded border-none bg-background px-2 pt-1 text-[13px] leading-[1.4rem] focus-visible:outline-none"
            value={value}
            minRows={2}
            maxRows={5}
            onBlur={saveValue}
            onKeyDown={onKeyDown}
            onChange={onChangeInner}
          />
          <div className="absolute bottom-[2px] left-0 w-full rounded-b-md bg-background pb-[2px] pr-1 text-right text-xs text-slate-400 dark:text-slate-600">
            Shift + Enter
          </div>
        </div>
      ) : (
        <Input
          ref={inputRef as RefObject<HTMLInputElement>}
          style={{
            ...attachStyle,
            border: `2px solid ${cellLineColorActived}`,
            ...style,
          }}
          value={value}
          className="cursor-text border-2 px-2 text-[13px] shadow-none focus-visible:ring-transparent bg-background"
          onChange={onChangeInner}
          onBlur={saveValue}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
    </>
  );
};

export const TextEditor = forwardRef(TextEditorBase);
