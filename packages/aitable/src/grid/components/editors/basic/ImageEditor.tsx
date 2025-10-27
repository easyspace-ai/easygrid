import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ForwardRefRenderFunction } from 'react';
import type { IImageCell } from '../../../renderers/cell-renderer/interface';
import type { IEditorProps, IEditorRef } from '../EditorContainer';
import { Input } from '../../../../ui';

const ImageEditorBase: ForwardRefRenderFunction<IEditorRef<IImageCell>, IEditorProps<IImageCell>> = (
  props,
  ref
) => {
  const { cell, style, onChange, isEditing } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(cell.data);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    setValue: (data: IImageCell['data']) => setValue(data),
    saveValue: () => {
      if (!isEditing) {return;}
      onChange?.(value?.length ? value : null);
    },
  }));

  const display = (value || []).map((i: any) => i.url).join(', ');

  const onBlur = () => {
    const items = (inputRef.current?.value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url, idx) => ({ id: `${idx}`, url }));
    setValue(items.length ? items : []);
    onChange?.(items.length ? items : null);
  };

  return (
    <div className="rounded-sm border p-2 shadow-sm" style={style}>
      <Input ref={inputRef} defaultValue={display} placeholder="输入图片URL，逗号分隔" onBlur={onBlur} />
    </div>
  );
};

export const ImageEditor = forwardRef(ImageEditorBase);


