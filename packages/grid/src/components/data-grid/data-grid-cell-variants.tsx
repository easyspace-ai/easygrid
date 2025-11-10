"use client";

import type { Cell, Table } from "@tanstack/react-table";
import { Check, X, Link as LinkIcon, Mail, Phone, Star, User, Image as ImageIcon, ExternalLink, Plus, Code, Bot, Loader2, RefreshCw, AlertCircle, Download, File } from "lucide-react";
import * as React from "react";
import { DataGridCellWrapper } from "./data-grid-cell-wrapper";
import { useAIField } from "../../hooks/use-ai-field";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
} from "../ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useDebouncedCallback } from "../../hooks/use-debounced-callback";
import { getLineCount } from "../../lib/data-grid";
import { FileUploadDialog } from "./file-upload-dialog";
import { cn } from "../../lib/utils";
import { LinkRecordSelector } from "./link-record-selector";
import { LinkRecordDialog } from "./link-record-dialog";
import type { LinkCellValue } from "../../types/data-grid";
import type { LinkFieldOptions } from "../../services/linkService";

interface CellVariantProps<TData> {
  cell: Cell<TData, unknown>;
  table: Table<TData>;
  rowIndex: number;
  columnId: string;
  isEditing: boolean;
  isFocused: boolean;
  isSelected: boolean;
}

export function ShortTextCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isEditing,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue);
  const cellRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;

  const onBlur = React.useCallback(() => {
    // Read the current value directly from the DOM to avoid stale state
    const currentValue = cellRef.current?.textContent ?? "";
    if (currentValue !== initialValue) {
      meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
    }
    meta?.onCellEditingStop?.();
  }, [meta, rowIndex, columnId, initialValue]);

  const onInput = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const currentValue = event.currentTarget.textContent ?? "";
      setValue(currentValue);
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Enter") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
          }
          meta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
          }
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          cellRef.current?.blur();
        }
      } else if (
        isFocused &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        // Handle typing to pre-fill the value when editing starts
        setValue(event.key);

        queueMicrotask(() => {
          if (cellRef.current && cellRef.current.contentEditable === "true") {
            cellRef.current.textContent = event.key;
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(cellRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        });
      }
    },
    [isEditing, isFocused, initialValue, meta, rowIndex, columnId],
  );

  React.useEffect(() => {
    setValue(initialValue);
    if (cellRef.current && !isEditing) {
      cellRef.current.textContent = initialValue;
    }
  }, [initialValue, isEditing]);

  React.useEffect(() => {
    if (isEditing && cellRef.current) {
      cellRef.current.focus();

      if (!cellRef.current.textContent && value) {
        cellRef.current.textContent = value;
      }

      if (cellRef.current.textContent) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cellRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
    // Don't focus if we're in the middle of a scroll operation
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, value, meta?.searchOpen, meta?.isScrolling]);

  const displayValue = !isEditing ? (value ?? "") : "";

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      <div
        role="textbox"
        data-slot="grid-cell-content"
        contentEditable={isEditing}
        tabIndex={-1}
        ref={cellRef}
        onBlur={onBlur}
        onInput={onInput}
        suppressContentEditableWarning
        className={cn("size-full overflow-hidden outline-none", {
          "whitespace-nowrap [&_*]:inline [&_*]:whitespace-nowrap [&_br]:hidden":
            isEditing,
        })}
      >
        {displayValue}
      </div>
    </DataGridCellWrapper>
  );
}

export function LongTextCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue ?? "");
  const [open, setOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;
  const sideOffset = -(containerRef.current?.clientHeight ?? 0);

  const prevInitialValueRef = React.useRef(initialValue);
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue;
    setValue(initialValue ?? "");
  }

  // Debounced auto-save (300ms delay)
  const debouncedSave = useDebouncedCallback((newValue: string) => {
    meta?.onDataUpdate?.({ rowIndex, columnId, value: newValue });
  }, 300);

  const onSave = React.useCallback(() => {
    // Immediately save any pending changes and close the popover
    if (value !== initialValue) {
      meta?.onDataUpdate?.({ rowIndex, columnId, value });
    }
    setOpen(false);
    meta?.onCellEditingStop?.();
  }, [meta, value, initialValue, rowIndex, columnId]);

  const onCancel = React.useCallback(() => {
    // Restore the original value
    setValue(initialValue ?? "");
    meta?.onDataUpdate?.({ rowIndex, columnId, value: initialValue });
    setOpen(false);
    meta?.onCellEditingStop?.();
  }, [meta, initialValue, rowIndex, columnId]);

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      setValue(newValue);
      // Debounced auto-save
      debouncedSave(newValue);
    },
    [debouncedSave],
  );

  const onOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        // Immediately save any pending changes when closing
        if (value !== initialValue) {
          meta?.onDataUpdate?.({ rowIndex, columnId, value });
        }
        meta?.onCellEditingStop?.();
      }
    },
    [meta, value, initialValue, rowIndex, columnId],
  );

  const onOpenAutoFocus: NonNullable<
    React.ComponentProps<typeof PopoverContent>["onOpenAutoFocus"]
  > = React.useCallback((event) => {
    event.preventDefault();
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing && !open) {
        if (event.key === "Escape") {
          event.preventDefault();
          meta?.onCellEditingStop?.();
        } else if (event.key === "Tab") {
          event.preventDefault();
          // Save any pending changes
          if (value !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value });
          }
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        }
      }
    },
    [isEditing, open, meta, value, initialValue, rowIndex, columnId],
  );

  const onTextareaKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        onSave();
      }
      // Stop propagation to prevent grid navigation
      event.stopPropagation();
    },
    [onCancel, onSave],
  );

  const onTextareaBlur = React.useCallback(() => {
    // Immediately save any pending changes on blur
    if (value !== initialValue) {
      meta?.onDataUpdate?.({ rowIndex, columnId, value });
    }
    setOpen(false);
    meta?.onCellEditingStop?.();
  }, [meta, value, initialValue, rowIndex, columnId]);

  React.useEffect(() => {
    if (isEditing && !open) {
      setOpen(true);
    }
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, open, meta?.searchOpen, meta?.isScrolling]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <DataGridCellWrapper
          ref={containerRef}
          cell={cell}
          table={table}
          rowIndex={rowIndex}
          columnId={columnId}
          isEditing={isEditing}
          isFocused={isFocused}
          isSelected={isSelected}
          onKeyDown={onWrapperKeyDown}
        >
          <span data-slot="grid-cell-content">{value}</span>
        </DataGridCellWrapper>
      </PopoverAnchor>
      <PopoverContent
        data-grid-cell-editor=""
        align="start"
        side="bottom"
        sideOffset={sideOffset}
        className="w-[400px] rounded-none p-0"
        onOpenAutoFocus={onOpenAutoFocus}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onTextareaKeyDown}
          onBlur={onTextareaBlur}
          className="min-h-[150px] resize-none rounded-none border-0 shadow-none focus-visible:ring-0"
          placeholder="Enter text..."
        />
      </PopoverContent>
    </Popover>
  );
}

export function NumberCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as number;
  const [value, setValue] = React.useState(String(initialValue ?? ""));
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;
  const cellOpts = cell.column.columnDef.meta?.cell;
  const min = cellOpts?.variant === "number" ? cellOpts.min : undefined;
  const max = cellOpts?.variant === "number" ? cellOpts.max : undefined;
  const step = cellOpts?.variant === "number" ? cellOpts.step : undefined;

  const onBlur = React.useCallback(() => {
    const numValue = value === "" ? null : Number(value);
    if (numValue !== initialValue) {
      meta?.onDataUpdate?.({ rowIndex, columnId, value: numValue });
    }
    meta?.onCellEditingStop?.();
  }, [meta, rowIndex, columnId, initialValue, value]);

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Enter") {
          event.preventDefault();
          const numValue = value === "" ? null : Number(value);
          if (numValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: numValue });
          }
          meta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          const numValue = value === "" ? null : Number(value);
          if (numValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: numValue });
          }
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setValue(String(initialValue ?? ""));
          inputRef.current?.blur();
        }
      } else if (isFocused) {
        // Handle Backspace to start editing with empty value
        if (event.key === "Backspace") {
          setValue("");
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          // Handle typing to pre-fill the value when editing starts
          setValue(event.key);
        }
      }
    },
    [isEditing, isFocused, initialValue, meta, rowIndex, columnId, value],
  );

  React.useEffect(() => {
    setValue(String(initialValue ?? ""));
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, meta?.searchOpen, meta?.isScrolling]);

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onBlur={onBlur}
          onChange={onChange}
          className="w-full border-none bg-transparent p-0 outline-none"
        />
      ) : (
        <span data-slot="grid-cell-content">{value}</span>
      )}
    </DataGridCellWrapper>
  );
}

export function SelectCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;
  const cellOpts = cell.column.columnDef.meta?.cell;
  const options = cellOpts?.variant === "select" ? cellOpts.options : [];

  const onValueChange = React.useCallback(
    (newValue: string) => {
      setValue(newValue);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: newValue });
      meta?.onCellEditingStop?.();
    },
    [meta, rowIndex, columnId],
  );

  const onOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        meta?.onCellEditingStop?.();
      }
    },
    [meta],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          setOpen(false);
          meta?.onCellEditingStop?.();
        } else if (event.key === "Tab") {
          event.preventDefault();
          setOpen(false);
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        }
      }
    },
    [isEditing, initialValue, meta],
  );

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && !open) {
      setOpen(true);
    }
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, open, meta?.searchOpen, meta?.isScrolling]);

  const displayLabel =
    options.find((opt) => opt.value === value)?.label ?? value;

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <Select
          value={value}
          onValueChange={onValueChange}
          open={open}
          onOpenChange={onOpenChange}
        >
          <SelectTrigger
            size="sm"
            className="size-full items-start border-none p-0 shadow-none focus-visible:ring-0 dark:bg-transparent [&_svg]:hidden"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            data-grid-cell-editor=""
            // compensate for the wrapper padding
            align="start"
            alignOffset={-8}
            sideOffset={-8}
            className="min-w-[calc(var(--radix-select-trigger-width)+16px)]"
          >
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span data-slot="grid-cell-content">{displayLabel}</span>
      )}
    </DataGridCellWrapper>
  );
}

export function MultiSelectCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: CellVariantProps<TData>) {
  const cellValue = React.useMemo(
    () => (cell.getValue() as string[]) ?? [],
    [cell],
  );

  const cellId = `${rowIndex}-${columnId}`;
  const prevCellIdRef = React.useRef(cellId);

  const [selectedValues, setSelectedValues] =
    React.useState<string[]>(cellValue);
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const meta = table.options.meta;
  const cellOpts = cell.column.columnDef.meta?.cell;
  const options = cellOpts?.variant === "multi-select" ? cellOpts.options : [];
  const sideOffset = -(containerRef.current?.clientHeight ?? 0);

  if (prevCellIdRef.current !== cellId) {
    prevCellIdRef.current = cellId;
    setSelectedValues(cellValue);
    setOpen(false);
    setSearchValue("");
  }

  const onValueChange = React.useCallback(
    (value: string) => {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];

      setSelectedValues(newValues);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: newValues });
      // Clear search input and focus back on input after selection
      setSearchValue("");
      queueMicrotask(() => inputRef.current?.focus());
    },
    [selectedValues, meta, rowIndex, columnId],
  );

  const removeValue = React.useCallback(
    (valueToRemove: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      event?.preventDefault();
      const newValues = selectedValues.filter((v) => v !== valueToRemove);
      setSelectedValues(newValues);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: newValues });
      // Focus back on input after removing
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [selectedValues, meta, rowIndex, columnId],
  );

  const clearAll = React.useCallback(() => {
    setSelectedValues([]);
    meta?.onDataUpdate?.({ rowIndex, columnId, value: [] });
    queueMicrotask(() => inputRef.current?.focus());
  }, [meta, rowIndex, columnId]);

  const onOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        setSearchValue("");
        meta?.onCellEditingStop?.();
      }
    },
    [meta],
  );

  const onOpenAutoFocus: NonNullable<
    React.ComponentProps<typeof PopoverContent>["onOpenAutoFocus"]
  > = React.useCallback((event) => {
    event.preventDefault();
    inputRef.current?.focus();
  }, []);

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Escape") {
          event.preventDefault();
          setSelectedValues(cellValue);
          setSearchValue("");
          setOpen(false);
          meta?.onCellEditingStop?.();
        } else if (event.key === "Tab") {
          event.preventDefault();
          setSearchValue("");
          setOpen(false);
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        }
      }
    },
    [isEditing, cellValue, meta],
  );

  const onInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle backspace when input is empty - remove last selected item
      if (
        event.key === "Backspace" &&
        searchValue === "" &&
        selectedValues.length > 0
      ) {
        event.preventDefault();
        const lastValue = selectedValues[selectedValues.length - 1];
        if (lastValue) {
          removeValue(lastValue);
        }
      }
      // Prevent escape from propagating to close the popover immediately
      // Let the command handle it first
      if (event.key === "Escape") {
        event.stopPropagation();
      }
    },
    [searchValue, selectedValues, removeValue],
  );

  React.useEffect(() => {
    if (isEditing && !open) {
      setOpen(true);
    }
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, open, meta?.searchOpen, meta?.isScrolling]);

  // Focus input when popover opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const displayLabels = selectedValues
    .map((val) => options.find((opt) => opt.value === val)?.label ?? val)
    .filter(Boolean);

  const rowHeight = table.options.meta?.rowHeight ?? "short";

  const lineCount = getLineCount(rowHeight);
  const maxVisibleBadgeCount = lineCount * 3;

  const visibleLabels = displayLabels.slice(0, maxVisibleBadgeCount);
  const hiddenBadgeCount = Math.max(
    0,
    displayLabels.length - maxVisibleBadgeCount,
  );

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            <div className="absolute inset-0" />
          </PopoverAnchor>
          <PopoverContent
            data-grid-cell-editor=""
            align="start"
            sideOffset={sideOffset}
            className="w-[300px] rounded-none p-0"
            onOpenAutoFocus={onOpenAutoFocus}
          >
            <Command className="[&_[data-slot=command-input-wrapper]]:h-auto [&_[data-slot=command-input-wrapper]]:border-none [&_[data-slot=command-input-wrapper]]:p-0 [&_[data-slot=command-input-wrapper]_svg]:hidden">
              <div className="flex min-h-9 flex-wrap items-center gap-1 border-b px-3 py-1.5">
                {selectedValues.map((value) => {
                  const option = options.find((opt) => opt.value === value);
                  const label = option?.label ?? value;

                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="h-5 gap-1 px-1.5 text-xs"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={(event) => removeValue(value, event)}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
                <CommandInput
                  ref={inputRef}
                  value={searchValue}
                  onValueChange={setSearchValue}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search..."
                  className="h-auto flex-1 p-0"
                />
              </div>
              <CommandList className="max-h-full">
                <CommandEmpty>No options found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden">
                  {options.map((option) => {
                    const isSelected = selectedValues.includes(option.value);

                    return (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={() => onValueChange(option.value)}
                      >
                        <div
                          className={cn(
                            "flex size-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <Check className="size-3" />
                        </div>
                        <span>{option.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                {selectedValues.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={clearAll}
                        className="justify-center text-muted-foreground"
                      >
                        Clear all
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}
      {displayLabels.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 overflow-hidden">
          {visibleLabels.map((label, index) => (
            <Badge
              key={selectedValues[index]}
              variant="secondary"
              className="h-5 shrink-0 px-1.5 text-xs"
            >
              {label}
            </Badge>
          ))}
          {hiddenBadgeCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 shrink-0 px-1.5 text-muted-foreground text-xs"
            >
              +{hiddenBadgeCount}
            </Badge>
          )}
        </div>
      ) : null}
    </DataGridCellWrapper>
  );
}

export function CheckboxCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as boolean;
  const [value, setValue] = React.useState(Boolean(initialValue));
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;

  const onCheckedChange = React.useCallback(
    (checked: boolean) => {
      setValue(checked);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: checked });
    },
    [meta, rowIndex, columnId],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isFocused && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        event.stopPropagation();
        onCheckedChange(!value);
      }
    },
    [isFocused, value, onCheckedChange],
  );

  React.useEffect(() => {
    setValue(Boolean(initialValue));
  }, [initialValue]);

  React.useEffect(() => {
    if (
      isFocused &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, meta?.searchOpen, meta?.isScrolling]);

  const onWrapperClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (isFocused) {
        event.preventDefault();
        event.stopPropagation();
        onCheckedChange(!value);
      }
    },
    [isFocused, value, onCheckedChange],
  );

  const onCheckboxClick = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  const onCheckboxMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
    },
    [],
  );

  const onCheckboxDoubleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
    },
    [],
  );

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={false}
      isFocused={isFocused}
      isSelected={isSelected}
      onClick={onWrapperClick}
      onKeyDown={onWrapperKeyDown}
      className="flex size-full justify-center"
    >
      <Checkbox
        checked={value}
        onCheckedChange={onCheckedChange}
        onClick={onCheckboxClick}
        onMouseDown={onCheckboxMouseDown}
        onDoubleClick={onCheckboxDoubleClick}
        className="border-primary"
      />
    </DataGridCellWrapper>
  );
}

function formatDateForDisplay(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

export function DateCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue ?? "");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;

  const prevInitialValueRef = React.useRef(initialValue);
  if (initialValue !== prevInitialValueRef.current) {
    prevInitialValueRef.current = initialValue;
    setValue(initialValue ?? "");
  }

  const selectedDate = value ? new Date(value) : undefined;

  const onDateSelect = React.useCallback(
    (date: Date | undefined) => {
      if (!date) return;

      const formattedDate = date.toISOString().split("T")[0] ?? "";
      setValue(formattedDate);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: formattedDate });
      setOpen(false);
      meta?.onCellEditingStop?.();
    },
    [meta, rowIndex, columnId],
  );

  const onOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen && isEditing) {
        meta?.onCellEditingStop?.();
      }
    },
    [isEditing, meta],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          setOpen(false);
        } else if (event.key === "Tab") {
          event.preventDefault();
          setOpen(false);
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        }
      }
    },
    [isEditing, initialValue, meta],
  );

  React.useEffect(() => {
    if (isEditing) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isEditing]);

  React.useEffect(() => {
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, meta?.searchOpen, meta?.isScrolling]);

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>
          <span data-slot="grid-cell-content">
            {formatDateForDisplay(value)}
          </span>
        </PopoverAnchor>
        {isEditing && (
          <PopoverContent
            data-grid-cell-editor=""
            align="start"
            sideOffset={10}
            className="w-auto p-0"
          >
            <Calendar
              autoFocus
              captionLayout="dropdown"
              mode="single"
              className="rounded-md border shadow-sm"
              defaultMonth={selectedDate ?? new Date()}
              selected={selectedDate}
              onSelect={onDateSelect}
            />
          </PopoverContent>
        )}
      </Popover>
    </DataGridCellWrapper>
  );
}

// Link Cell - 链接类型（支持关联字段和 URL 链接）
export function LinkCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isEditing,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const cellOpts = cell.column.columnDef.meta?.cell;
  const linkConfig = cellOpts?.variant === "link" ? cellOpts : null;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;

  // 检测是否为关联字段（通过 foreignTableId 判断）
  const isLinkField = linkConfig?.foreignTableId && !linkConfig.isUrl;
  const isUrlLink = linkConfig?.isUrl || (!linkConfig?.foreignTableId);

  // 获取单元格值
  const cellValue = cell.getValue() as LinkCellValue | LinkCellValue[] | string | null | undefined;

  // 如果是关联字段，使用关联记录选择器
  if (isLinkField && linkConfig.foreignTableId) {
    const linkFieldOptions: LinkFieldOptions = {
      foreignTableId: linkConfig.foreignTableId,
      relationship: linkConfig.relationship,
      lookupFieldId: linkConfig.lookupFieldId,
      allowMultiple: linkConfig.allowMultiple,
    };

    // 转换单元格值为 LinkCellValue 格式
    const linkValue: LinkCellValue | LinkCellValue[] | null = React.useMemo(() => {
      if (cellValue === null || cellValue === undefined) {
        return null;
      }
      if (typeof cellValue === "string") {
        // 如果是字符串，可能是旧格式，尝试解析
        try {
          const parsed = JSON.parse(cellValue);
          if (Array.isArray(parsed)) {
            return parsed as LinkCellValue[];
          }
          if (parsed && typeof parsed === "object" && parsed.id) {
            return parsed as LinkCellValue;
          }
        } catch {
          // 解析失败，返回 null
          return null;
        }
      }
      if (Array.isArray(cellValue)) {
        return cellValue as LinkCellValue[];
      }
      if (typeof cellValue === "object" && cellValue !== null && "id" in cellValue) {
        return cellValue as LinkCellValue;
      }
      return null;
    }, [cellValue]);

    const handleChange = React.useCallback(
      (value: LinkCellValue | LinkCellValue[] | null) => {
        // 更新数据，但不停止编辑状态
        // 这样可以在选择记录后继续选择其他记录，直到点击确认
        meta?.onDataUpdate?.({ rowIndex, columnId, value });
        // 注意：这里不调用 onCellEditingStop，让弹窗保持打开状态
      },
      [meta, rowIndex, columnId]
    );

    const onWrapperKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (isEditing) {
          if (event.key === "Escape") {
            event.preventDefault();
            meta?.onCellEditingStop?.();
          } else if (event.key === "Tab") {
            event.preventDefault();
            meta?.onCellEditingStop?.({
              direction: event.shiftKey ? "left" : "right",
            });
          }
        }
      },
      [isEditing, meta]
    );

    React.useEffect(() => {
      if (
        isFocused &&
        !isEditing &&
        !meta?.searchOpen &&
        !meta?.isScrolling &&
        containerRef.current
      ) {
        containerRef.current.focus();
      }
    }, [isFocused, isEditing, meta?.searchOpen, meta?.isScrolling]);

    const [dialogOpen, setDialogOpen] = React.useState(false);
    
    // 使用 ref 标记是否应该保持弹窗打开
    const shouldKeepDialogOpenRef = React.useRef(false);

    // 当进入编辑状态时，自动打开弹窗
    React.useEffect(() => {
      if (isEditing && isLinkField && linkConfig.foreignTableId) {
        // 延迟一点打开，确保编辑状态已经稳定
        const timer = setTimeout(() => {
          setDialogOpen(true);
          shouldKeepDialogOpenRef.current = true;
        }, 100);
        return () => clearTimeout(timer);
      } else if (!isEditing && dialogOpen) {
        // 退出编辑状态时，只有在弹窗打开且不应该保持打开时才关闭
        // 这样可以防止在选择记录时因为状态更新导致弹窗关闭
        // 但是，如果 shouldKeepDialogOpenRef 为 true，说明弹窗应该保持打开
        // 这种情况下，不要关闭弹窗，让用户继续选择
        if (!shouldKeepDialogOpenRef.current) {
          const timer = setTimeout(() => {
            setDialogOpen(false);
          }, 200);
          return () => clearTimeout(timer);
        } else {
          // 如果弹窗应该保持打开，但编辑状态变为 false，可能是数据更新导致的
          // 在这种情况下，保持弹窗打开，不要关闭
          // 这样可以防止在选择记录时因为 onDataUpdate 导致编辑状态变化，从而关闭弹窗
        }
      }
    }, [isEditing, isLinkField, linkConfig?.foreignTableId, dialogOpen]);
    
    // 当弹窗关闭时，如果还在编辑状态，停止编辑
    const handleDialogOpenChange = React.useCallback(
      (open: boolean) => {
        setDialogOpen(open);
        shouldKeepDialogOpenRef.current = open;
        
        // 只有在用户明确关闭弹窗（点击取消或确认，或点击外部区域）时才停止编辑
        // 不要在选择记录时自动关闭弹窗
        if (!open && isEditing) {
          // 延迟停止编辑，确保 onChange 回调已经执行
          // 使用更长的延迟，确保用户有足够时间点击确认
          setTimeout(() => {
            // 只有在弹窗确实关闭时才停止编辑
            if (!shouldKeepDialogOpenRef.current) {
              meta?.onCellEditingStop?.();
            }
          }, 300);
        }
      },
      [isEditing, meta]
    );

    return (
      <>
        <DataGridCellWrapper
          ref={containerRef}
          cell={cell}
          table={table}
          rowIndex={rowIndex}
          columnId={columnId}
          isEditing={isEditing}
          isFocused={isFocused}
          isSelected={isSelected}
          onKeyDown={onWrapperKeyDown}
        >
          {isEditing ? (
            <div className="flex items-center gap-2 min-w-0">
              {linkValue && (
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(linkValue) ? (
                    linkValue.map((record) => (
                      <Badge key={record.id} variant="secondary" className="truncate max-w-[150px]">
                        {record.title || record.id}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="truncate max-w-[150px]">
                      {linkValue.title || linkValue.id}
                    </Badge>
                  )}
                </div>
              )}
              {!linkValue && (
                <span className="text-sm text-muted-foreground">点击选择记录...</span>
              )}
            </div>
          ) : (
          <div className="flex flex-wrap gap-1 min-w-0">
            {linkValue === null || linkValue === undefined ? (
              <span data-slot="grid-cell-content" className="text-muted-foreground">
                未选择
              </span>
            ) : Array.isArray(linkValue) ? (
              linkValue.length > 0 ? (
                linkValue.map((record) => (
                  <Badge
                    key={record.id}
                    variant="secondary"
                    className="truncate max-w-[200px]"
                  >
                    {record.title || record.id}
                  </Badge>
                ))
              ) : (
                <span data-slot="grid-cell-content" className="text-muted-foreground">
                  未选择
                </span>
              )
            ) : (
              <Badge variant="secondary" className="truncate max-w-[200px]">
                {linkValue.title || linkValue.id}
              </Badge>
            )}
          </div>
        )}
      </DataGridCellWrapper>
      <LinkRecordDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        value={linkValue}
        options={linkFieldOptions}
        onChange={handleChange}
      />
    </>
    );
  }

  // 如果是 URL 链接，使用原有实现（向后兼容）
  const initialValue = typeof cellValue === "string" ? cellValue : "";
  const [value, setValue] = React.useState(initialValue ?? "");
  const cellRef = React.useRef<HTMLDivElement>(null);

  const isValidUrl = (url: string) => {
    if (!url) return false;
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const formatUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  };

  const onBlur = React.useCallback(() => {
    const currentValue = cellRef.current?.textContent ?? "";
    if (currentValue !== initialValue) {
      meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
    }
    meta?.onCellEditingStop?.();
  }, [meta, rowIndex, columnId, initialValue]);

  const onInput = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const currentValue = event.currentTarget.textContent ?? "";
      setValue(currentValue);
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Enter") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
          }
          meta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
          }
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          cellRef.current?.blur();
        }
      } else if (
        isFocused &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        setValue(event.key);
        queueMicrotask(() => {
          if (cellRef.current && cellRef.current.contentEditable === "true") {
            cellRef.current.textContent = event.key;
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(cellRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        });
      }
    },
    [isEditing, isFocused, initialValue, meta, rowIndex, columnId],
  );

  React.useEffect(() => {
    setValue(initialValue);
    if (cellRef.current && !isEditing) {
      cellRef.current.textContent = initialValue;
    }
  }, [initialValue, isEditing]);

  React.useEffect(() => {
    if (isEditing && cellRef.current) {
      cellRef.current.focus();
      if (!cellRef.current.textContent && value) {
        cellRef.current.textContent = value;
      }
      if (cellRef.current.textContent) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cellRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, value, meta?.searchOpen, meta?.isScrolling]);

  const displayValue = !isEditing ? (value ?? "") : "";
  const url = formatUrl(value ?? "");

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <div
          role="textbox"
          data-slot="grid-cell-content"
          contentEditable={isEditing}
          tabIndex={-1}
          ref={cellRef}
          onBlur={onBlur}
          onInput={onInput}
          suppressContentEditableWarning
          className="size-full overflow-hidden outline-none whitespace-nowrap [&_*]:inline [&_*]:whitespace-nowrap [&_br]:hidden"
        />
      ) : (
        <div className="flex items-center gap-1.5 min-w-0">
          {value && isValidUrl(value) ? (
            <>
              <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary hover:underline truncate"
              >
                <span className="truncate">{displayValue}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </>
          ) : (
            <span data-slot="grid-cell-content" className="truncate">
              {displayValue}
            </span>
          )}
        </div>
      )}
    </DataGridCellWrapper>
  );
}

// Email Cell - 邮箱类型
export function EmailCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isEditing,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue ?? "");
  const cellRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;

  const isValidEmail = (email: string) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const onBlur = React.useCallback(() => {
    const currentValue = cellRef.current?.textContent ?? "";
    if (currentValue !== initialValue) {
      meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
    }
    meta?.onCellEditingStop?.();
  }, [meta, rowIndex, columnId, initialValue]);

  const onInput = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const currentValue = event.currentTarget.textContent ?? "";
      setValue(currentValue);
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Enter") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
          }
          meta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
          }
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          cellRef.current?.blur();
        }
      } else if (
        isFocused &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        setValue(event.key);
        queueMicrotask(() => {
          if (cellRef.current && cellRef.current.contentEditable === "true") {
            cellRef.current.textContent = event.key;
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(cellRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        });
      }
    },
    [isEditing, isFocused, initialValue, meta, rowIndex, columnId],
  );

  React.useEffect(() => {
    setValue(initialValue);
    if (cellRef.current && !isEditing) {
      cellRef.current.textContent = initialValue;
    }
  }, [initialValue, isEditing]);

  React.useEffect(() => {
    if (isEditing && cellRef.current) {
      cellRef.current.focus();
      if (!cellRef.current.textContent && value) {
        cellRef.current.textContent = value;
      }
      if (cellRef.current.textContent) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cellRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, value, meta?.searchOpen, meta?.isScrolling]);

  const displayValue = !isEditing ? (value ?? "") : "";

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <div
          role="textbox"
          data-slot="grid-cell-content"
          contentEditable={isEditing}
          tabIndex={-1}
          ref={cellRef}
          onBlur={onBlur}
          onInput={onInput}
          suppressContentEditableWarning
          className="size-full overflow-hidden outline-none whitespace-nowrap [&_*]:inline [&_*]:whitespace-nowrap [&_br]:hidden"
        />
      ) : (
        <div className="flex items-center gap-1.5 min-w-0">
          {value && isValidEmail(value) ? (
            <>
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
              <a
                href={`mailto:${value}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary hover:underline truncate"
              >
                <span className="truncate">{displayValue}</span>
              </a>
            </>
          ) : (
            <>
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
              <span data-slot="grid-cell-content" className="truncate">
                {displayValue}
              </span>
            </>
          )}
        </div>
      )}
    </DataGridCellWrapper>
  );
}

// Phone Cell - 电话类型
export function PhoneCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isEditing,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue ?? "");
  const cellRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    return cleaned;
  };

  const isValidPhone = (phone: string) => {
    if (!phone) return false;
    const cleaned = formatPhoneNumber(phone);
    return cleaned.length >= 7 && cleaned.length <= 15;
  };

  const onBlur = React.useCallback(() => {
    const currentValue = cellRef.current?.textContent ?? "";
    if (currentValue !== initialValue) {
      meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
    }
    meta?.onCellEditingStop?.();
  }, [meta, rowIndex, columnId, initialValue]);

  const onInput = React.useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const currentValue = event.currentTarget.textContent ?? "";
      setValue(currentValue);
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Enter") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
          }
          meta?.onCellEditingStop?.({ moveToNextRow: true });
        } else if (event.key === "Tab") {
          event.preventDefault();
          const currentValue = cellRef.current?.textContent ?? "";
          if (currentValue !== initialValue) {
            meta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
          }
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        } else if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          cellRef.current?.blur();
        }
      } else if (
        isFocused &&
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        setValue(event.key);
        queueMicrotask(() => {
          if (cellRef.current && cellRef.current.contentEditable === "true") {
            cellRef.current.textContent = event.key;
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(cellRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        });
      }
    },
    [isEditing, isFocused, initialValue, meta, rowIndex, columnId],
  );

  React.useEffect(() => {
    setValue(initialValue);
    if (cellRef.current && !isEditing) {
      cellRef.current.textContent = initialValue;
    }
  }, [initialValue, isEditing]);

  React.useEffect(() => {
    if (isEditing && cellRef.current) {
      cellRef.current.focus();
      if (!cellRef.current.textContent && value) {
        cellRef.current.textContent = value;
      }
      if (cellRef.current.textContent) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cellRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, value, meta?.searchOpen, meta?.isScrolling]);

  const displayValue = !isEditing ? (value ?? "") : "";
  const phoneNumber = formatPhoneNumber(value ?? "");

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <div
          role="textbox"
          data-slot="grid-cell-content"
          contentEditable={isEditing}
          tabIndex={-1}
          ref={cellRef}
          onBlur={onBlur}
          onInput={onInput}
          suppressContentEditableWarning
          className="size-full overflow-hidden outline-none whitespace-nowrap [&_*]:inline [&_*]:whitespace-nowrap [&_br]:hidden"
        />
      ) : (
        <div className="flex items-center gap-1.5 min-w-0">
          {value && isValidPhone(value) ? (
            <>
              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
              <a
                href={`tel:${phoneNumber}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary hover:underline truncate"
              >
                <span className="truncate">{displayValue}</span>
              </a>
            </>
          ) : (
            <>
              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
              <span data-slot="grid-cell-content" className="truncate">
                {displayValue}
              </span>
            </>
          )}
        </div>
      )}
    </DataGridCellWrapper>
  );
}

// Rating Cell - 评分类型
export function RatingCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as number;
  const [value, setValue] = React.useState(initialValue ?? 0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;
  const cellOpts = cell.column.columnDef.meta?.cell;
  const maxRating = cellOpts?.variant === "rating" ? cellOpts.max ?? 5 : 5;

  const onStarClick = React.useCallback(
    (rating: number) => {
      const newValue = rating === value ? 0 : rating;
      setValue(newValue);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: newValue });
    },
    [meta, rowIndex, columnId, value],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isFocused) {
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          const newValue = Math.min(value + 1, maxRating);
          setValue(newValue);
          meta?.onDataUpdate?.({ rowIndex, columnId, value: newValue });
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          const newValue = Math.max(value - 1, 0);
          setValue(newValue);
          meta?.onDataUpdate?.({ rowIndex, columnId, value: newValue });
        } else if (event.key >= "1" && event.key <= String(maxRating)) {
          event.preventDefault();
          const newValue = parseInt(event.key, 10);
          setValue(newValue);
          meta?.onDataUpdate?.({ rowIndex, columnId, value: newValue });
        }
      }
    },
    [isFocused, value, maxRating, meta, rowIndex, columnId],
  );

  React.useEffect(() => {
    setValue(initialValue ?? 0);
  }, [initialValue]);

  React.useEffect(() => {
    if (
      isFocused &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, meta?.searchOpen, meta?.isScrolling]);

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={false}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
      className="flex size-full items-center justify-center"
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, i) => {
          const rating = i + 1;
          const isFilled = rating <= value;
          return (
            <button
              key={rating}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStarClick(rating);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-0.5 focus:outline-none"
              tabIndex={-1}
            >
              <Star
                className={cn(
                  "size-4 transition-colors",
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground hover:text-yellow-400",
                )}
              />
            </button>
          );
        })}
      </div>
    </DataGridCellWrapper>
  );
}

// User Cell - 用户类型
export function UserCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as string;
  const [value, setValue] = React.useState(initialValue);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;
  const cellOpts = cell.column.columnDef.meta?.cell;
  const userOptions =
    cellOpts?.variant === "user" ? cellOpts.options ?? [] : [];
  const selectedUser = userOptions.find((user) => user.id === value);

  const onValueChange = React.useCallback(
    (userId: string) => {
      setValue(userId);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: userId });
      meta?.onCellEditingStop?.();
    },
    [meta, rowIndex, columnId],
  );

  const onOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        meta?.onCellEditingStop?.();
      }
    },
    [meta],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isEditing) {
        if (event.key === "Escape") {
          event.preventDefault();
          setValue(initialValue);
          setOpen(false);
          meta?.onCellEditingStop?.();
        } else if (event.key === "Tab") {
          event.preventDefault();
          setOpen(false);
          meta?.onCellEditingStop?.({
            direction: event.shiftKey ? "left" : "right",
          });
        }
      }
    },
    [isEditing, initialValue, meta],
  );

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && !open) {
      setOpen(true);
    }
    if (
      isFocused &&
      !isEditing &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, isEditing, open, meta?.searchOpen, meta?.isScrolling]);

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      onKeyDown={onWrapperKeyDown}
    >
      {isEditing ? (
        <Select
          value={value}
          onValueChange={onValueChange}
          open={open}
          onOpenChange={onOpenChange}
        >
          <SelectTrigger
            size="sm"
            className="size-full items-start border-none p-0 shadow-none focus-visible:ring-0 dark:bg-transparent [&_svg]:hidden"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            data-grid-cell-editor=""
            align="start"
            alignOffset={-8}
            sideOffset={-8}
            className="min-w-[calc(var(--radix-select-trigger-width)+16px)]"
          >
            {userOptions.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="size-5 rounded-full"
                    />
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded-full bg-muted">
                      <User className="size-3 text-muted-foreground" />
                    </div>
                  )}
                  <span>{user.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          {selectedUser ? (
            <>
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="size-5 shrink-0 rounded-full"
                />
              ) : (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="size-3 text-muted-foreground" />
                </div>
              )}
              <span data-slot="grid-cell-content" className="truncate">
                {selectedUser.name}
              </span>
            </>
          ) : (
            <>
              <User className="size-4 shrink-0 text-muted-foreground" />
              <span data-slot="grid-cell-content" className="truncate text-muted-foreground">
                未选择
              </span>
            </>
          )}
        </div>
      )}
    </DataGridCellWrapper>
  );
}

// 判断文件是否是图片
function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
  const lowerName = fileName.toLowerCase();
  return imageExtensions.some(ext => lowerName.endsWith(ext));
}

// 附件项组件
function AttachmentItem({
  file,
  isImage,
  onFileClick,
  onRemove,
}: {
  file: { name: string; url: string };
  isImage: boolean;
  onFileClick: (file: { name: string; url: string }, event: React.MouseEvent) => void;
  onRemove: () => void;
}) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 text-xs max-w-[100px] shrink-0",
        isImage && "cursor-pointer hover:bg-muted/80 transition-colors"
      )}
      onClick={(e) => onFileClick(file, e)}
      title={isImage ? "点击预览图片" : "点击下载文件"}
    >
      {isImage ? (
        <div className="relative size-5 shrink-0 rounded overflow-hidden border bg-muted flex items-center justify-center">
          {!imageError ? (
            <img
              src={file.url}
              alt={file.name}
              className="size-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <ImageIcon className="size-3 text-muted-foreground" />
          )}
        </div>
      ) : (
        <File className="size-3 shrink-0" />
      )}
      <span className="truncate min-w-0 flex-1">{file.name}</span>
      {isImage && (
        <ImageIcon className="size-3 shrink-0 text-muted-foreground" />
      )}
      {!isImage && (
        <Download className="size-3 shrink-0 text-muted-foreground" />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 hover:text-destructive shrink-0"
        tabIndex={-1}
        title="删除"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

// 图片预览对话框
function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  imageName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-transparent border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt={imageName}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-black/70 text-white p-2 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Attachment Cell - 附件类型
export function AttachmentCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const initialValue = cell.getValue() as Array<{ name: string; url: string }>;
  const [files, setFiles] = React.useState(initialValue ?? []);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState<{ url: string; name: string } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;

  const handleFilesSelected = React.useCallback(
    (selectedFiles: File[]) => {
      const newFiles = selectedFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: updatedFiles });
    },
    [files, meta, rowIndex, columnId],
  );

  const handleFileRemove = React.useCallback(
    (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index);
      setFiles(updatedFiles);
      meta?.onDataUpdate?.({ rowIndex, columnId, value: updatedFiles });
    },
    [files, meta, rowIndex, columnId],
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent) => {
      // 阻止事件冒泡和默认行为，避免触发单元格编辑
      event.preventDefault();
      event.stopPropagation();
      // 打开上传弹窗
      setDialogOpen(true);
    },
    [],
  );

  const handleFileClick = React.useCallback(
    (file: { name: string; url: string }, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (isImageFile(file.name)) {
        // 如果是图片，显示预览
        setPreviewImage({ url: file.url, name: file.name });
      } else {
        // 如果是文件，下载
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isFocused && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        event.stopPropagation();
        setDialogOpen(true);
      }
    },
    [isFocused],
  );

  React.useEffect(() => {
    setFiles(initialValue ?? []);
  }, [initialValue]);

  React.useEffect(() => {
    if (
      isFocused &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, meta?.searchOpen, meta?.isScrolling]);

  return (
    <>
      <DataGridCellWrapper
        ref={containerRef}
        cell={cell}
        table={table}
        rowIndex={rowIndex}
        columnId={columnId}
        isEditing={false}
        isFocused={isFocused}
        isSelected={isSelected}
        onClick={handleClick}
        onKeyDown={onWrapperKeyDown}
        className="flex items-center min-w-0 overflow-hidden"
      >
        {files.length === 0 ? (
          <button
            type="button"
            className="flex items-center justify-center size-8 rounded-md border border-dashed hover:bg-accent transition-colors shrink-0"
            onClick={handleClick}
            tabIndex={-1}
          >
            <Plus className="size-4 text-muted-foreground" />
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-1 min-w-0 w-full max-w-full overflow-hidden">
            {files.map((file, index) => {
              const isImage = isImageFile(file.name);
              return (
                <AttachmentItem
                  key={index}
                  file={file}
                  isImage={isImage}
                  onFileClick={handleFileClick}
                  onRemove={() => handleFileRemove(index)}
                />
              );
            })}
            <button
              type="button"
              className="flex items-center justify-center size-6 rounded-md border border-dashed hover:bg-accent transition-colors shrink-0"
              onClick={handleClick}
              tabIndex={-1}
              title="添加附件"
            >
              <Plus className="size-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </DataGridCellWrapper>
      <FileUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onFilesSelected={handleFilesSelected}
        existingFiles={files}
        onFileRemove={handleFileRemove}
      />
      {previewImage && (
        <ImagePreviewDialog
          open={!!previewImage}
          onOpenChange={(open) => {
            if (!open) setPreviewImage(null);
          }}
          imageUrl={previewImage.url}
          imageName={previewImage.name}
        />
      )}
    </>
  );
}

// Formula Cell - 公式类型
export function FormulaCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;
  const cellOpts = cell.column.columnDef.meta?.cell;
  const expression = cellOpts?.variant === "formula" ? cellOpts.expression ?? "" : "";
  
  // 获取当前行的数据（用于依赖跟踪）
  const row = table.getRowModel().rows[rowIndex];
  const rowData = row?.original;
  
  // 计算公式值
  const calculateValue = React.useCallback(() => {
    if (!expression) return null;

    try {
      if (!row) return null;

      // 获取所有列
      const columns = table.getAllColumns();
      
      // 替换表达式中的字段引用 {字段名} 为实际值
      let formula = expression;
      const fieldPattern = /\{([^}]+)\}/g;
      const matches = Array.from(expression.matchAll(fieldPattern));
      
      // 查找并替换字段引用
      for (const match of matches) {
        const fieldName = match[1].trim();
        // 查找对应的列（支持列头名称、列ID或meta.label）
        const column = columns.find(col => {
          const colLabel = col.columnDef.meta?.label;
          const colHeader = typeof col.columnDef.header === "string" ? col.columnDef.header : null;
          return colLabel === fieldName || colHeader === fieldName || col.id === fieldName;
        });
        
        if (column) {
          const cellValue = row.getValue(column.id);
          // 将值转换为字符串或数字
          let replacement = "";
          if (cellValue === null || cellValue === undefined) {
            replacement = "0"; // 空值默认为 0
          } else if (typeof cellValue === "number") {
            replacement = String(cellValue);
          } else if (typeof cellValue === "string") {
            replacement = `"${cellValue.replace(/"/g, '\\"')}"`; // 字符串加引号，转义内部引号
          } else if (typeof cellValue === "boolean") {
            replacement = cellValue ? "true" : "false";
          } else {
            replacement = String(cellValue);
          }
          formula = formula.replace(match[0], replacement);
        } else {
          // 找不到字段，替换为 0
          formula = formula.replace(match[0], "0");
        }
      }

      // 安全的表达式求值（仅支持基本数学运算和字符串连接）
      // 使用 Function 构造函数来评估表达式
      const result = new Function(`return ${formula}`)();
      return result;
    } catch (error) {
      console.error("Formula calculation error:", error, { expression });
      return "#ERROR";
    }
  }, [expression, table, row]);

  const calculatedValue = React.useMemo(() => {
    return calculateValue();
  }, [calculateValue, rowData]); // 依赖 rowData 以确保数据变化时重新计算

  // 格式化显示值
  const formatValue = React.useCallback((value: any) => {
    if (value === null || value === undefined) return "";
    if (value === "#ERROR") return "#ERROR";
    
    const formatting = cellOpts?.variant === "formula" ? cellOpts.formatting : undefined;
    
    if (formatting?.type === "number") {
      const precision = formatting.precision ?? 0;
      return typeof value === "number" ? value.toFixed(precision) : String(value);
    }
    
    return String(value);
  }, [cellOpts]);

  const displayValue = formatValue(calculatedValue);

  React.useEffect(() => {
    if (
      isFocused &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, meta?.searchOpen, meta?.isScrolling]);

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={false}
      isFocused={isFocused}
      isSelected={isSelected}
      className="cursor-default"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {!expression ? (
          <span className="text-xs text-muted-foreground">未设置公式</span>
        ) : calculatedValue === "#ERROR" ? (
          <>
            <Code className="size-3.5 shrink-0 text-destructive" />
            <span className="text-xs text-destructive">公式错误</span>
          </>
        ) : (
          <>
            <Code className="size-3.5 shrink-0 text-muted-foreground" />
            <span data-slot="grid-cell-content" className="truncate">
              {displayValue}
            </span>
          </>
        )}
      </div>
    </DataGridCellWrapper>
  );
}

// AI Field Cell - AI 字段类型
export function AIFieldCell<TData>({
  cell,
  table,
  rowIndex,
  columnId,
  isFocused,
  isSelected,
}: CellVariantProps<TData>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const meta = table.options.meta;

  const { state, result, error, generate, regenerate } = useAIField({
    cell,
    table,
    rowIndex,
    columnId,
  });

  const cellOpts = cell.column.columnDef.meta?.cell;
  const aiConfig = cellOpts?.variant === "ai" ? cellOpts : null;
  const trigger = aiConfig?.trigger || "manual";

  // 获取当前单元格的值（可能是之前生成的结果）
  const currentValue = cell.getValue() as string | null | undefined;

  // 显示的内容
  const displayContent = React.useMemo(() => {
    if (state === "generating") {
      return "正在生成...";
    }
    if (state === "error") {
      return error?.message || "生成失败";
    }
    if (state === "success" || state === "cached") {
      return result || currentValue || "";
    }
    return currentValue || "";
  }, [state, result, currentValue, error]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (trigger === "manual" && state !== "generating") {
        if (result || currentValue) {
          regenerate();
        } else {
          generate();
        }
      }
    },
    [trigger, state, result, currentValue, generate, regenerate],
  );

  const onWrapperKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isFocused && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        event.stopPropagation();
        if (trigger === "manual" && state !== "generating") {
          if (result || currentValue) {
            regenerate();
          } else {
            generate();
          }
        }
      }
    },
    [isFocused, trigger, state, result, currentValue, generate, regenerate],
  );

  React.useEffect(() => {
    if (
      isFocused &&
      !meta?.searchOpen &&
      !meta?.isScrolling &&
      containerRef.current
    ) {
      containerRef.current.focus();
    }
  }, [isFocused, meta?.searchOpen, meta?.isScrolling]);

  return (
    <DataGridCellWrapper
      ref={containerRef}
      cell={cell}
      table={table}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={false}
      isFocused={isFocused}
      isSelected={isSelected}
      onClick={handleClick}
      onKeyDown={onWrapperKeyDown}
      className={cn(
        "cursor-pointer",
        trigger === "manual" && "hover:bg-accent/50",
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* 状态图标 */}
        {state === "generating" ? (
          <Loader2 className="size-4 shrink-0 text-primary animate-spin" />
        ) : state === "error" ? (
          <AlertCircle className="size-4 shrink-0 text-destructive" />
        ) : state === "cached" ? (
          <Bot className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Bot className="size-4 shrink-0 text-muted-foreground" />
        )}

        {/* 内容 */}
        <div className="min-w-0 flex-1">
          {state === "generating" ? (
            <span className="text-sm text-muted-foreground">{displayContent}</span>
          ) : state === "error" ? (
            <span className="text-sm text-destructive">{displayContent}</span>
          ) : displayContent ? (
            <span data-slot="grid-cell-content" className="text-sm truncate">
              {displayContent}
            </span>
          ) : trigger === "manual" ? (
            <span className="text-xs text-muted-foreground">点击生成内容</span>
          ) : (
            <span className="text-xs text-muted-foreground">等待自动生成...</span>
          )}
        </div>

        {/* 手动触发按钮 */}
        {trigger === "manual" && state !== "generating" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (result || currentValue) {
                regenerate();
              } else {
                generate();
              }
            }}
            className="shrink-0 rounded-md p-1 hover:bg-accent transition-colors"
            tabIndex={-1}
            title={result || currentValue ? "重新生成" : "生成内容"}
          >
            <RefreshCw className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </DataGridCellWrapper>
  );
}
