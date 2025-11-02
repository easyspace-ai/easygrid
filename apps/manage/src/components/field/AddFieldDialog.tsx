import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Sparkles } from 'lucide-react';
import { FieldTypeSelector } from './FieldTypeSelector';
import { FieldType, getFieldTypeInfo } from '@/types/field';
import type { CreateFieldRequest, FieldOption } from '@/types/field';

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: CreateFieldRequest) => Promise<void>;
}

export function AddFieldDialog({ 
  open, 
  onOpenChange, 
  onSave
}: AddFieldDialogProps) {
  if (open) {
    // 调试：确认弹窗进入渲染
    console.log('[AddFieldDialog] render open=true');
  }
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>(FieldType.Formula);
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [isUnique, setIsUnique] = useState(false);
  const [displayStyle, setDisplayStyle] = useState<'text' | 'url' | 'email' | 'phone'>('text');
  const [isSaving, setIsSaving] = useState(false);
  // 选择类：单选/多选 选项
  const [choiceInput, setChoiceInput] = useState('');
  const [choices, setChoices] = useState<FieldOption[]>([]);
  // 公式字段：表达式
  const [formulaExpression, setFormulaExpression] = useState('');

  // 重置表单
  useEffect(() => {
    if (!open) {
      setFieldName('');
      setFieldType(FieldType.Formula);
      setDescription('');
      setShowDescription(false);
      setDefaultValue('');
      setIsUnique(false);
      setDisplayStyle('text');
      setIsSaving(false);
      setChoices([]);
      setChoiceInput('');
      setFormulaExpression('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!fieldName.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      
      const fieldData: CreateFieldRequest = {
        name: fieldName.trim(),
        type: fieldType,
        description: description.trim() || undefined,
        options: {
          defaultValue: defaultValue.trim() || undefined,
          isUnique,
          displayStyle: fieldType === FieldType.SingleLineText ? displayStyle : undefined,
          // 旧版：select/multipleSelect 使用 choices 数组
          choices: (fieldType === FieldType.SingleSelect || fieldType === FieldType.MultipleSelect) ? choices : undefined,
          // 旧版：公式字段使用 options.expression
          ...(fieldType === FieldType.Formula ? { expression: formulaExpression } : {}),
        } as any,
      };

      await onSave(fieldData);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save field:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const fieldTypeInfo = getFieldTypeInfo(fieldType);
  const isTextType = fieldType === FieldType.SingleLineText;
  const isSelectType = fieldType === FieldType.SingleSelect || fieldType === FieldType.MultipleSelect;
  const isFormulaType = fieldType === FieldType.Formula;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加字段</DialogTitle>
          <DialogDescription>
            为表格添加一个新的字段
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 字段名称 */}
          <div className="space-y-2">
            <Label htmlFor="field-name">名称</Label>
            <Input
              id="field-name"
              placeholder="字段名（可选）"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              disabled={isSaving}
            />
            {!showDescription && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDescription(true)}
                className="h-8 px-2 text-xs"
                disabled={isSaving}
              >
                <Plus className="h-3 w-3 mr-1" />
                添加描述
              </Button>
            )}
          </div>

          {/* 字段描述 */}
          {showDescription && (
            <div className="space-y-2">
              <Label htmlFor="field-description">描述</Label>
              <Textarea
                id="field-description"
                placeholder="字段描述（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                rows={3}
              />
            </div>
          )}

          {/* 字段类型 */}
          <div className="space-y-2">
            <Label>字段类型</Label>
            <FieldTypeSelector
              value={fieldType}
              onChange={setFieldType}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              {fieldTypeInfo?.description}
            </p>
          </div>

          {/* 多选/单选 - 选项配置（旧版风格） */}
          {isSelectType && (
            <div className="space-y-2">
              <Label>选项</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入后按回车添加（如：重要）"
                  value={choiceInput}
                  onChange={(e) => setChoiceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && choiceInput.trim()) {
                      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                      setChoices((prev) => [...prev, { id, name: choiceInput.trim() }]);
                      setChoiceInput('');
                    }
                  }}
                  disabled={isSaving}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!choiceInput.trim()) return;
                    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                    setChoices((prev) => [...prev, { id, name: choiceInput.trim() }]);
                    setChoiceInput('');
                  }}
                  disabled={isSaving}
                >添加</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {choices.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                    {c.name}
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setChoices((prev) => prev.filter((x) => x.id !== c.id))}
                      type="button"
                    >×</button>
                  </span>
                ))}
                {choices.length === 0 && (
                  <span className="text-xs text-muted-foreground">暂无选项</span>
                )}
              </div>
            </div>
          )}

          {/* 公式字段 - 表达式（旧版风格） */}
          {isFormulaType && (
            <div className="space-y-2">
              <Label htmlFor="formula">公式</Label>
              <Textarea
                id="formula"
                placeholder="例如：CONCAT({姓名}, ' - ', {部门}) 或 SUM({金额})"
                value={formulaExpression}
                onChange={(e) => setFormulaExpression(e.target.value)}
                rows={3}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">支持旧版公式语法，将以 options.expression 持久化。</p>
            </div>
          )}

          {/* 字段值验证规则 */}
          <div className="space-y-2">
            <Label>字段值验证规则</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-unique"
                checked={isUnique}
                onCheckedChange={setIsUnique}
                disabled={isSaving}
              />
              <Label htmlFor="is-unique" className="text-sm">
                禁止重复值
              </Label>
            </div>
          </div>

          {/* AI 配置 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI 配置</span>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  高级版
                </span>
              </div>
              <div className="text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 默认值 */}
          <div className="space-y-2">
            <Label htmlFor="default-value">默认值</Label>
            <Input
              id="default-value"
              placeholder="默认值（可选）"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* 显示样式（仅单行文本类型） */}
          {isTextType && (
            <div className="space-y-2">
              <Label>显示样式</Label>
              <div className="flex gap-2">
                {[
                  { value: 'text', label: '文本' },
                  { value: 'url', label: '网址' },
                  { value: 'email', label: '邮件' },
                  { value: 'phone', label: '电话' },
                ].map((style) => (
                  <Button
                    key={style.value}
                    type="button"
                    variant={displayStyle === style.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDisplayStyle(style.value as any)}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {style.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !fieldName.trim()}
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
