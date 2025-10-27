import React, { useCallback, useMemo, useState } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Sheet, SheetContent } from './ui-shim';

export type FieldOperator = 'add' | 'edit' | 'insert';

export interface IFieldSettingProps {
  visible: boolean;
  operator: FieldOperator;
  field?: any; // TODO: replace with IFieldVo
  onConfirm?: (result?: any) => void;
  onCancel?: () => void;
}

export const FieldSetting: React.FC<IFieldSettingProps> = (props) => {
  const { visible, operator, field, onConfirm, onCancel } = props;
  const [saving, setSaving] = useState(false);

  const title = useMemo(() => {
    if (operator === 'edit') {return '编辑字段';}
    return '添加字段';
  }, [operator]);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      onConfirm?.(field);
    } finally {
      setSaving(false);
    }
  }, [field, onConfirm]);

  return (
    <Sheet open={visible} onOpenChange={(o?: boolean) => !o && onCancel?.()}>
      <SheetContent className="w-screen p-0 sm:w-[400px] sm:max-w-[400px]" side="right">
        <div className="flex h-full flex-col">
          <div className="text-md w-full border-b px-4 py-3 font-semibold">{title}</div>
          <div className="flex-1 overflow-auto p-4">{/* TODO: FieldEditor */}</div>
          <div className="flex w-full shrink-0 justify-end gap-2 p-4">
            <Button variant="secondary" onClick={onCancel}>取消</Button>
            <Button onClick={onSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FieldSetting;


