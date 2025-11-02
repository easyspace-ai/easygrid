import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Field } from '@/types/field';
import { RecordEditor } from './RecordEditor';

interface AddRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Field[];
  onSave: (recordData: { [fieldId: string]: any }) => Promise<void>;
}

export function AddRecordDialog({
  open,
  onOpenChange,
  fields,
  onSave
}: AddRecordDialogProps) {
  const [recordData, setRecordData] = useState<{ [fieldId: string]: any }>({});
  const [loading, setLoading] = useState(false);

  console.log('[AddRecordDialog] render open=', open, 'fields=', fields.length);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setRecordData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      await onSave(recordData);
      setRecordData({});
      onOpenChange(false);
      toast.success('记录创建成功');
    } catch (error: any) {
      console.error('Failed to create record:', error);
      toast.error(error?.message || '创建记录失败');
    } finally {
      setLoading(false);
    }
  }, [recordData, onSave, onOpenChange]);

  const handleCancel = useCallback(() => {
    setRecordData({});
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加记录</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <RecordEditor
            fields={fields}
            recordData={recordData}
            onChange={handleFieldChange}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
