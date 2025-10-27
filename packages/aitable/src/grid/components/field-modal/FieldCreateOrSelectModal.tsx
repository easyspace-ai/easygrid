import React, { useImperativeHandle, useMemo, useState, useEffect, forwardRef } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Label, ScrollArea } from './ui-shim';

export interface IFieldCreateOrSelectModalRef {
  onOpen: () => void;
  onClose: () => void;
}

export interface IFieldCreateOrSelectModalProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  content?: React.ReactNode;
  selectedFieldId?: string;
  getCreateBtnText?: (fieldName: string) => React.ReactNode;
  children?: (isActive: boolean) => React.ReactNode;
  onConfirm?: (payload: unknown) => void;
}

export const FieldCreateOrSelectModal = forwardRef<IFieldCreateOrSelectModalRef, IFieldCreateOrSelectModalProps>(
  (props, ref) => {
    const { title = '添加字段', description, content, selectedFieldId: _selectedFieldId, children, onConfirm } = props;

    const [open, setOpen] = useState(false);
    const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>(_selectedFieldId);

    useImperativeHandle(ref, () => ({
      onOpen: () => setOpen(true),
      onClose: () => setOpen(false),
    }));

    useEffect(() => {
      setSelectedFieldId(_selectedFieldId);
    }, [_selectedFieldId]);

    const onConfirmInner = () => {
      onConfirm?.(selectedFieldId);
      setOpen(false);
    };

    const header = useMemo(
      () => (
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
      ),
      [title]
    );

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[640px] max-w-full">
          {header}
          <ScrollArea>
            {content}
            {description && <div className="text-sm text-muted-foreground">{description}</div>}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={onConfirmInner}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export default FieldCreateOrSelectModal;


