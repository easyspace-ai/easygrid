"use client";

import { Check, X, Search, Loader2 } from "lucide-react";
import * as React from "react";
import { Badge } from "../ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { cn } from "../../lib/utils";
import type { LinkCellValue } from "../../types/data-grid";
import { linkService, type LinkFieldOptions } from "../../services/linkService";
import { useDebouncedCallback } from "../../hooks/use-debounced-callback";

interface LinkRecordSelectorProps {
  value: LinkCellValue | LinkCellValue[] | null;
  options: LinkFieldOptions;
  onChange: (value: LinkCellValue | LinkCellValue[] | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * 关联记录选择器组件
 * 参考 teable 的 LinkEditor 实现
 */
export function LinkRecordSelector({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "选择关联记录...",
}: LinkRecordSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [records, setRecords] = React.useState<LinkCellValue[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedRecords, setSelectedRecords] = React.useState<LinkCellValue[]>([]);

  const allowMultiple = options.allowMultiple ?? false;

  // 初始化已选择的记录
  React.useEffect(() => {
    if (value === null || value === undefined) {
      setSelectedRecords([]);
    } else if (Array.isArray(value)) {
      setSelectedRecords(value);
    } else {
      setSelectedRecords([value]);
    }
  }, [value]);

  // 加载关联记录列表
  const loadRecords = React.useCallback(async () => {
    if (!options.foreignTableId) {
      return;
    }

    setLoading(true);
    try {
      let loadedRecords: LinkCellValue[];

      if (searchQuery) {
        // 搜索记录
        loadedRecords = await linkService.searchLinkedRecords(
          options.foreignTableId,
          searchQuery,
          options
        );
      } else {
        // 加载所有记录
        loadedRecords = await linkService.loadLinkedRecords(
          options.foreignTableId,
          options
        );
      }

      setRecords(loadedRecords);
    } catch (error) {
      console.error("加载关联记录失败:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [options, searchQuery]);

  // 当打开选择器时加载记录
  React.useEffect(() => {
    if (open) {
      loadRecords();
    }
  }, [open, loadRecords]);

  // 当搜索查询变化时重新加载（使用防抖）
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
  }, 300);

  // 当搜索查询变化时重新加载记录
  React.useEffect(() => {
    if (open && searchQuery !== undefined) {
      loadRecords();
    }
  }, [searchQuery, open, loadRecords]);

  // 处理记录选择
  const handleSelect = React.useCallback(
    (record: LinkCellValue) => {
      if (allowMultiple) {
        // 多选模式
        const isSelected = selectedRecords.some((r) => r.id === record.id);
        let newSelected: LinkCellValue[];

        if (isSelected) {
          // 取消选择
          newSelected = selectedRecords.filter((r) => r.id !== record.id);
        } else {
          // 添加选择
          newSelected = [...selectedRecords, record];
        }

        setSelectedRecords(newSelected);
        onChange(newSelected.length > 0 ? newSelected : null);
      } else {
        // 单选模式
        const isSelected = selectedRecords.some((r) => r.id === record.id);
        if (isSelected) {
          // 取消选择
          setSelectedRecords([]);
          onChange(null);
        } else {
          // 选择新记录
          setSelectedRecords([record]);
          onChange(record);
        }
        setOpen(false);
      }
    },
    [allowMultiple, selectedRecords, onChange]
  );

  // 处理删除已选择的记录
  const handleRemove = React.useCallback(
    (recordId: string) => {
      if (allowMultiple) {
        const newSelected = selectedRecords.filter((r) => r.id !== recordId);
        setSelectedRecords(newSelected);
        onChange(newSelected.length > 0 ? newSelected : null);
      } else {
        setSelectedRecords([]);
        onChange(null);
      }
    },
    [allowMultiple, selectedRecords, onChange]
  );

  // 检查记录是否已选择
  const isSelected = React.useCallback(
    (recordId: string) => {
      return selectedRecords.some((r) => r.id === recordId);
    },
    [selectedRecords]
  );

  return (
    <div className="flex flex-col gap-2">
      {/* 已选择的记录显示 */}
      {selectedRecords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedRecords.map((record) => (
            <Badge
              key={record.id}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="truncate max-w-[200px]">
                {record.title || record.id}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(record.id)}
                  className="ml-1 rounded-full hover:bg-muted"
                  aria-label="删除"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* 选择器 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              !selectedRecords.length && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedRecords.length > 0
                ? allowMultiple
                  ? `已选择 ${selectedRecords.length} 条记录`
                  : selectedRecords[0].title || selectedRecords[0].id
                : placeholder}
            </span>
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="搜索记录..."
              value={searchQuery}
              onValueChange={(value) => {
                setSearchQuery(value);
                debouncedSearch(value);
              }}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    加载中...
                  </span>
                </div>
              ) : records.length === 0 ? (
                <CommandEmpty>未找到记录</CommandEmpty>
              ) : (
                <CommandGroup>
                  {records.map((record) => {
                    const selected = isSelected(record.id);
                    return (
                      <CommandItem
                        key={record.id}
                        value={record.id}
                        onSelect={() => handleSelect(record)}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                        <span className="truncate">
                          {record.title || record.id}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

