import { useMemo } from 'react';
import type { Field } from '@/types/field';
import { FieldEditor } from './FieldEditor';

interface RecordEditorProps {
  fields: Field[];
  recordData: { [fieldId: string]: any };
  onChange: (fieldId: string, value: any) => void;
}

export function RecordEditor({ fields, recordData, onChange }: RecordEditorProps) {
  // 过滤掉系统字段，只显示用户可编辑的字段
  const editableFields = useMemo(() => {
    return fields.filter(field => {
      // 过滤掉系统字段
      if (field.isPrimary) return false;
      if (field.type === 'createdTime' || field.type === 'lastModifiedTime') return false;
      if (field.type === 'createdBy' || field.type === 'lastModifiedBy') return false;
      if (field.type === 'autoNumber') return false;
      return true;
    });
  }, [fields]);

  return (
    <div className="space-y-6">
      {editableFields.map((field) => (
        <FieldEditor
          key={field.id}
          field={field}
          value={recordData[field.id]}
          onChange={(value) => onChange(field.id, value)}
        />
      ))}
    </div>
  );
}
