import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Field } from '@/types/field';

interface FieldEditorProps {
  field: Field;
  value: any;
  onChange: (value: any) => void;
}

export function FieldEditor({ field, value, onChange }: FieldEditorProps) {
  const renderFieldEditor = () => {
    switch (field.type) {
      case 'singleLineText':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.description || `请输入${field.name}`}
          />
        );

      case 'longText':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.description || `请输入${field.name}`}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.description || `请输入${field.name}`}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value || false}
              onCheckedChange={onChange}
            />
            <Label>{value ? '是' : '否'}</Label>
          </div>
        );

      case 'singleSelect':
        const singleOptions = field.options?.choices || [];
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`请选择${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {singleOptions.map((option) => (
                <SelectItem key={option.id} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multipleSelect':
        const multiOptions = field.options?.choices || [];
        return (
          <div className="space-y-2">
            {multiOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Switch
                  checked={Array.isArray(value) && value.includes(option.name)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (checked) {
                      onChange([...currentValues, option.name]);
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option.name));
                    }
                  }}
                />
                <Label>{option.name}</Label>
              </div>
            ))}
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.description || `请输入${field.name}`}
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.description || `请输入${field.name}`}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.description || `请输入${field.name}`}
          />
        );

      case 'rating':
        const maxRating = (field.options as any)?.maxRating || 5;
        return (
          <div className="flex space-x-1">
            {Array.from({ length: maxRating }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`text-2xl ${
                  (value || 0) > i ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400`}
                onClick={() => onChange(i + 1)}
              >
                ★
              </button>
            ))}
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`暂不支持${field.type}类型`}
            disabled
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {field.name}
        {field.options?.isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
      {renderFieldEditor()}
    </div>
  );
}
