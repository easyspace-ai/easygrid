/**
 * TextEditor - 重构版本
 * 
 * 优化点：
 * 1. ✅ border: 1px（从 2px 优化）
 * 2. ✅ 使用设计系统的颜色和间距
 * 3. ✅ 流畅的 focus 过渡动画
 * 4. ✅ subtle shadow 提升层次感
 * 5. ✅ 优化 focus ring 处理
 */

import { Input } from '../../../../ui';
import type { ChangeEvent, ForwardRefRenderFunction, KeyboardEvent, RefObject } from 'react';
import { useState, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import AutoSizeTextareaDefault from 'react-textarea-autosize';
const AutoSizeTextarea: any = AutoSizeTextareaDefault as any;
import { Key } from 'ts-keycode-enum';
import { GRID_DEFAULT } from '../../../configs';
import type { ILinkCell, INumberCell, ITextCell } from '../../../renderers';
import { CellType } from '../../../renderers';
import type { IEditorRef, IEditorProps } from '../EditorContainer';
import { tokens, cn } from '../../../design-system';

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
    const baseStyle: React.CSSProperties = {
      width: width + 4,
      minHeight: height + 4,
      height: needWrap ? 'auto' : height + 4,
      marginLeft: -2,
      marginTop: -2,
      textAlign: type === CellType.Number ? 'right' : 'left',
    };
    if (height > defaultRowHeight) {
      baseStyle.paddingBottom = height - defaultRowHeight;
    }
    return baseStyle;
  }, [type, height, width, needWrap]);

  // 使用设计系统的样式
  const editorClassName = cn(
    // 基础样式
    'bg-white rounded-md',
    'transition-all duration-200 ease-out',
    
    // 边框（优化为 1px）
    'border',
    
    // Focus 状态（使用设计系统的 elevation）
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0',
    
    // Shadow（subtle 提升层次感）
    'shadow-sm focus-visible:shadow-md',
    
    // 文本
    'text-[13px] leading-[1.4rem]',
    'px-2',
    
    // 特殊处理
    type === CellType.Number && 'text-right',
  );

  const borderColor = cellLineColorActived || tokens.colors.border.focus;

  return (
    <>
      {needWrap ? (
        <div
          style={{
            ...attachStyle,
            paddingBottom: 16,
            borderColor,
            ...style,
          }}
          className={cn(
            editorClassName,
            'relative pt-1'
          )}
        >
          <AutoSizeTextarea
            ref={inputRef as RefObject<HTMLTextAreaElement>}
            className={cn(
              'w-full resize-none',
              'border-none bg-transparent',
              'text-[13px] leading-[1.4rem]',
              'focus-visible:outline-none',
              'placeholder:text-gray-400'
            )}
            value={value}
            minRows={2}
            maxRows={5}
            onBlur={saveValue}
            onKeyDown={onKeyDown}
            onChange={onChangeInner}
            placeholder="输入文本..."
          />
          
          {/* Hint 文本 */}
          <div className={cn(
            'absolute bottom-0 left-0 right-0',
            'h-6 px-2 flex items-center justify-end',
            'text-xs text-gray-400',
            'bg-gradient-to-t from-white to-transparent',
            'rounded-b-md pointer-events-none'
          )}>
            Shift + Enter 换行
          </div>
        </div>
      ) : (
        <Input
          ref={inputRef as RefObject<HTMLInputElement>}
          style={{
            ...attachStyle,
            borderColor,
            ...style,
          }}
          value={value}
          className={cn(
            editorClassName,
            'cursor-text'
          )}
          placeholder={type === CellType.Number ? '0' : '输入文本...'}
          onChange={onChangeInner}
          onBlur={saveValue}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
    </>
  );
};

export const TextEditor = forwardRef(TextEditorBase);

