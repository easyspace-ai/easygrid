import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ForwardRefRenderFunction } from 'react';
import type { IEditorRef } from '../EditorContainer';
import type { IEditorProps } from '../EditorContainer';
import type { IChartCell } from '../../../renderers/cell-renderer/interface';
import { Input } from '../../../../ui';

// 图表编辑器：支持编辑图表数据和类型
const ChartEditorBase: ForwardRefRenderFunction<IEditorRef<IChartCell>, IEditorProps<IChartCell>> = (
  props,
  ref
) => {
  const { cell, style, onChange, isEditing } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(cell.displayData?.join(', ') || '');

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    setValue: (data: IChartCell['data']) => {
      // 将数字数组转换为逗号分隔的字符串
      const displayValue = Array.isArray(data) ? data.join(', ') : '';
      setValue(displayValue);
    },
    saveValue: () => {
      if (!isEditing) {return;}
      // 将逗号分隔的字符串转换为数字数组
      const numbers = value
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
      onChange?.(numbers.length ? numbers : null);
    },
  }));

  const onBlur = () => {
    // 将逗号分隔的字符串转换为数字数组
    const numbers = value
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n));
    onChange?.(numbers.length ? numbers : null);
  };

  return (
    <div className="rounded-sm border p-2 shadow-sm" style={style}>
      <div className="space-y-2">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          onBlur={onBlur}
          placeholder="输入数字，用逗号分隔 (例如: 10, 20, 30)"
          className="w-full"
        />
        <div className="text-xs text-muted-foreground">
          输入数字数据，用逗号分隔。例如：10, 20, 30, 40
        </div>
      </div>
    </div>
  );
};

export const ChartEditor = forwardRef(ChartEditorBase);
