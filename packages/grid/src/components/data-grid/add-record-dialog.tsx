"use client";

import * as React from "react";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { FileUploadDialog } from "./file-upload-dialog";
import { LinkRecordDialog } from "./link-record-dialog";
import { Image, X, Link as LinkIcon } from "lucide-react";
import type { Field } from "@easygrid/sdk";
import type { LinkCellValue } from "../../types/data-grid";
import { mapFieldOptionsToCellOptions } from "../../services/fieldMapper";
import type { LinkFieldOptions } from "../../services/linkService";

// 附件字段输入组件
function AttachmentFieldInput({
  field,
  formField,
}: {
  field: Field;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const files = (formField.value as Array<{ name: string; url: string }>) || [];

  const handleFilesSelected = React.useCallback(
    (selectedFiles: File[]) => {
      const newFiles = selectedFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        file: file, // 保存原始文件对象用于上传
      }));
      const updatedFiles = [...files, ...newFiles];
      formField.onChange(updatedFiles);
    },
    [files, formField],
  );

  const handleFileRemove = React.useCallback(
    (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index);
      formField.onChange(updatedFiles);
    },
    [files, formField],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 min-h-[40px] rounded-md border border-input bg-background px-3 py-2">
        {files.length === 0 ? (
          <span className="text-sm text-muted-foreground">暂无附件</span>
        ) : (
          files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs"
            >
              <Image className="size-3 shrink-0" />
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button
                type="button"
                onClick={() => handleFileRemove(index)}
                className="ml-1 hover:text-destructive shrink-0"
              >
                <X className="size-3" />
              </button>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center justify-center size-8 rounded-md border border-dashed hover:bg-accent transition-colors shrink-0"
        >
          <Image className="size-4 text-muted-foreground" />
        </button>
      </div>
      <FileUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onFilesSelected={handleFilesSelected}
        existingFiles={files}
        onFileRemove={handleFileRemove}
      />
    </div>
  );
}

// Link字段输入组件
function LinkFieldInput({
  field,
  formField,
}: {
  field: Field;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  
  // 检查是否是关联字段（有link选项）
  const options = field.options as any;
  const linkOptions = options?.link || options?.Link;
  const isLinkField = field.type === "link" && linkOptions;
  
  // 如果不是关联字段，返回null（会在renderFieldInput中处理为普通文本输入）
  if (!isLinkField) {
    return null;
  }
  
  // 提取Link字段选项
  const cellOptions = mapFieldOptionsToCellOptions(field.options);
  const linkFieldOptions: LinkFieldOptions = {
    foreignTableId: cellOptions.foreignTableId || linkOptions.linked_table_id || linkOptions.foreignTableId || "",
    relationship: cellOptions.relationship || linkOptions.relationship,
    lookupFieldId: cellOptions.lookupFieldId || linkOptions.lookupFieldId || linkOptions.lookup_field_id,
    allowMultiple: cellOptions.allowMultiple ?? linkOptions.allowMultiple ?? linkOptions.allow_multiple ?? false,
  };
  
  const allowMultiple = linkFieldOptions.allowMultiple ?? false;
  const value = formField.value as LinkCellValue | LinkCellValue[] | null;
  
  // 格式化显示值
  const getDisplayValue = () => {
    if (!value) return "未选择";
    if (Array.isArray(value)) {
      if (value.length === 0) return "未选择";
      return value.map(v => v.title || v.id).join(", ");
    }
    return value.title || value.id || "未选择";
  };
  
  const handleChange = (newValue: LinkCellValue | LinkCellValue[] | null) => {
    formField.onChange(newValue);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm w-full justify-between"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-left">
              {getDisplayValue()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {allowMultiple ? "多选" : "单选"}
          </span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => handleChange(null)}
            className="flex items-center justify-center size-8 rounded-md border border-input hover:bg-accent transition-colors shrink-0"
            title="清除选择"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <LinkRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        value={value}
        options={linkFieldOptions}
        onChange={handleChange}
      />
    </div>
  );
}

interface AddRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Field[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export function AddRecordDialog({
  open,
  onOpenChange,
  fields,
  onSubmit,
}: AddRecordDialogProps) {
  // 构建表单默认值
  const defaultValues = React.useMemo(() => {
    const values: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        values[field.id] = field.defaultValue;
      } else if (field.type === "checkbox" || field.type === "boolean") {
        values[field.id] = false;
      } else if (field.type === "attachment") {
        values[field.id] = [];
      } else if (field.type === "link") {
        // 检查是否是关联字段（有link选项）
        const linkOptions = (field.options as any)?.link || (field.options as any)?.Link;
        if (linkOptions) {
          // 关联字段：默认为null（未选择）
          values[field.id] = null;
        } else {
          // URL链接：默认为空字符串
          values[field.id] = "";
        }
      } else {
        values[field.id] = "";
      }
    });
    return values;
  }, [fields]);

  const form = useForm({
    defaultValues,
    mode: "onChange",
  });

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      // 处理附件字段：将 File 对象转换为可序列化的格式
      const processedData = { ...data };
      for (const [key, value] of Object.entries(processedData)) {
        if (Array.isArray(value)) {
          // 检查是否是附件数组
          const isAttachmentArray = value.some(
            (item) => item && typeof item === 'object' && 'file' in item
          );
          if (isAttachmentArray) {
            // 对于附件字段，暂时只保存文件名和 URL（实际文件上传应该在服务端处理）
            processedData[key] = value.map((item: any) => ({
              name: item.name,
              url: item.url || '',
            }));
          }
        }
      }
      await onSubmit(processedData);
      form.reset(defaultValues);
      onOpenChange(false);
    } catch (error: any) {
      console.error("提交表单失败:", error);
      // 错误已经在 onSubmit 中处理，这里不需要额外处理
      // 如果 onSubmit 抛出错误，表单不会关闭，用户可以继续修改
    }
  };

  // 当对话框关闭时重置表单
  React.useEffect(() => {
    if (!open) {
      form.reset(defaultValues);
    }
  }, [open, form, defaultValues]);

  // 渲染表单字段
  const renderField = (field: Field) => {
    const fieldType = field.type;

    // 跳过公式字段和 AI 字段（这些字段是自动计算的）
    if (fieldType === "formula" || fieldType === "ai") {
      return null;
    }

    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        rules={{
          required: field.required ? `${field.name} 是必填项` : false,
          validate: (value) => {
            // 对于附件字段，检查是否是必填且为空数组
            if (field.type === "attachment" && field.required) {
              if (!Array.isArray(value) || value.length === 0) {
                return `${field.name} 是必填项`;
              }
            }
            return true;
          },
        }}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {renderFieldInput(field, formField)}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  // 根据字段类型渲染输入组件
  const renderFieldInput = (
    field: Field,
    formField: ControllerRenderProps<Record<string, unknown>, string>
  ) => {
    const fieldType = field.type;
    const options = field.options as { choices?: Array<{ id: string; name: string }> };

    switch (fieldType) {
      case "singleLineText":
      case "text":
      case "email":
      case "url":
      case "phone":
        return (
          <Input
            type={fieldType === "email" ? "email" : fieldType === "phone" ? "tel" : "text"}
            name={formField.name}
            onBlur={formField.onBlur}
            ref={formField.ref}
            value={typeof formField.value === 'string' || typeof formField.value === 'number' ? String(formField.value) : ''}
            onChange={(e) => formField.onChange(e.target.value)}
            placeholder={`请输入${field.name}`}
          />
        );
      
      case "link":
        // 检查是否是关联字段（有link选项）
        const linkOptions = (field.options as any)?.link || (field.options as any)?.Link;
        if (linkOptions) {
          // 关联字段：使用LinkFieldInput组件
          return (
            <LinkFieldInput
              field={field}
              formField={formField}
            />
          );
        } else {
          // URL链接：使用普通文本输入
          return (
            <Input
              type="text"
              name={formField.name}
              onBlur={formField.onBlur}
              ref={formField.ref}
              value={typeof formField.value === 'string' || typeof formField.value === 'number' ? String(formField.value) : ''}
              onChange={(e) => formField.onChange(e.target.value)}
              placeholder={`请输入${field.name}（URL链接）`}
            />
          );
        }

      case "longText":
        return (
          <Textarea
            name={formField.name}
            onBlur={formField.onBlur}
            ref={formField.ref as any}
            value={typeof formField.value === 'string' ? formField.value : ''}
            onChange={(e) => formField.onChange(e.target.value)}
            placeholder={`请输入${field.name}`}
            rows={4}
          />
        );

      case "number":
      case "currency":
      case "percent":
        return (
          <Input
            type="number"
            name={formField.name}
            onBlur={formField.onBlur}
            ref={formField.ref}
            placeholder={`请输入${field.name}`}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : Number(e.target.value)
              formField.onChange(value)
            }}
            value={formField.value === '' || formField.value === undefined ? '' : String(formField.value as any)}
          />
        );

      case "checkbox":
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={Boolean(formField.value)}
              onCheckedChange={(checked) => formField.onChange(Boolean(checked))}
            />
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {field.name}
            </label>
          </div>
        );

      case "singleSelect":
      case "select":
        const choices = options?.choices || [];
        return (
          <Select
            value={(formField.value as string) || ""}
            onValueChange={(v) => formField.onChange(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`请选择${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {choices.map((choice) => (
                <SelectItem key={choice.id} value={choice.id}>
                  {choice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "date":
      case "datetime":
        return (
          <Input
            type={fieldType === "datetime" ? "datetime-local" : "date"}
            name={formField.name}
            onBlur={formField.onBlur}
            ref={formField.ref}
            value={typeof formField.value === 'string' ? formField.value : ''}
            onChange={(e) => formField.onChange(e.target.value)}
            placeholder={`请选择${field.name}`}
          />
        );

      case "attachment":
        return (
          <AttachmentFieldInput
            field={field}
            formField={formField}
          />
        );

      default:
        return (
          <Input
            type="text"
            name={formField.name}
            onBlur={formField.onBlur}
            ref={formField.ref}
            value={typeof formField.value === 'string' ? formField.value : ''}
            onChange={(e) => formField.onChange(e.target.value)}
            placeholder={`请输入${field.name}`}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-background">
        <DialogHeader>
          <DialogTitle>添加新记录</DialogTitle>
          <DialogDescription>
            根据表格字段填写表单，带 * 号的字段为必填项
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              {fields
                .filter((field) => {
                  // 过滤掉公式和 AI 字段
                  return field.type !== "formula" && field.type !== "ai";
                })
                .map(renderField)}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

