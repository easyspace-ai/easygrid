import React, { useState } from 'react';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '../ui-shim';

export interface IFormulaEditorProps {
  expression?: string;
  onConfirm?: (expression: string) => void;
}

export const FormulaEditor: React.FC<IFormulaEditorProps> = ({ expression = '', onConfirm }) => {
  const [value, setValue] = useState(expression);
  return (
    <div className="w-[700px]">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <h1 className="text-base">公式编辑器</h1>
      </div>
      <div className="p-3">
        <textarea
          className="w-full h-40 border rounded p-2"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="输入公式，例如 {标题} + ' - ' + {状态}"
        />
      </div>
      <div className="flex justify-end gap-2 border-t px-3 py-2">
        <Button onClick={() => onConfirm?.(value)}>确认</Button>
      </div>
    </div>
  );
};

export default FormulaEditor;


