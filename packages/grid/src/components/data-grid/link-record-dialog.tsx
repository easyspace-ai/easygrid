"use client";

import * as React from "react";
import { X, Search, ExternalLink, Plus, Loader2, Check } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { cn } from "../../lib/utils";
import type { LinkCellValue } from "../../types/data-grid";
import { linkService, type LinkFieldOptions } from "../../services/linkService";
import { useTableConfig } from "../../context/TableConfigContext";
import { luckdbClient } from "../../config/client";

interface LinkRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: LinkCellValue | LinkCellValue[] | null;
  options: LinkFieldOptions;
  onChange: (value: LinkCellValue | LinkCellValue[] | null) => void;
}

type ListType = "unselected" | "selected";

/**
 * 关联记录选择弹窗
 * 参考 teable 的实现
 */
export function LinkRecordDialog({
  open,
  onOpenChange,
  value,
  options,
  onChange,
}: LinkRecordDialogProps) {
  const { baseId } = useTableConfig();
  const [listType, setListType] = React.useState<ListType>("unselected");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [records, setRecords] = React.useState<LinkCellValue[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedRecords, setSelectedRecords] = React.useState<LinkCellValue[]>([]);
  const [tempSelectedRecords, setTempSelectedRecords] = React.useState<LinkCellValue[]>([]);
  // 使用 ref 保存 tempSelectedRecords，避免 loadRecords 依赖变化导致无限循环
  const tempSelectedRecordsRef = React.useRef<LinkCellValue[]>([]);

  const allowMultiple = options.allowMultiple ?? false;
  const foreignTableId = options.foreignTableId;
  
  // 使用 useMemo 稳定化 options，避免对象引用变化导致无限循环
  const stableOptions = React.useMemo(() => ({
    foreignTableId: options.foreignTableId,
    relationship: options.relationship,
    lookupFieldId: options.lookupFieldId,
    allowMultiple: options.allowMultiple,
  }), [options.foreignTableId, options.relationship, options.lookupFieldId, options.allowMultiple]);

  // 初始化已选择的记录
  React.useEffect(() => {
    if (value === null || value === undefined) {
      setSelectedRecords([]);
      setTempSelectedRecords([]);
      tempSelectedRecordsRef.current = [];
    } else if (Array.isArray(value)) {
      setSelectedRecords(value);
      setTempSelectedRecords(value);
      tempSelectedRecordsRef.current = value;
    } else {
      setSelectedRecords([value]);
      setTempSelectedRecords([value]);
      tempSelectedRecordsRef.current = [value];
    }
  }, [value]);

  // 加载记录列表（使用 useRef 保存函数，避免依赖变化导致无限循环）
  const loadRecordsRef = React.useRef<(() => Promise<void>) | undefined>(undefined);
  
  loadRecordsRef.current = React.useCallback(async () => {
    if (!foreignTableId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let loadedRecords: LinkCellValue[];

      if (searchQuery) {
        // 搜索记录
        loadedRecords = await linkService.searchLinkedRecords(
          foreignTableId,
          searchQuery,
          stableOptions
        );
      } else {
        // 加载所有记录
        loadedRecords = await linkService.loadLinkedRecords(
          foreignTableId,
          stableOptions
        );
      }

      // 根据列表类型过滤（使用 ref 中的 tempSelectedRecords，避免依赖变化）
      const currentSelectedIds = tempSelectedRecordsRef.current.map((r) => r.id);
      let filteredRecords: LinkCellValue[];
      
      if (listType === "selected") {
        // 只显示已选择的记录
        filteredRecords = loadedRecords.filter((r) => currentSelectedIds.includes(r.id));
      } else {
        // 只显示未选择的记录
        filteredRecords = loadedRecords.filter((r) => !currentSelectedIds.includes(r.id));
      }
      
      setRecords(filteredRecords);
    } catch (error) {
      console.error("[LinkRecordDialog] 加载关联记录失败:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [foreignTableId, stableOptions, searchQuery, listType]);
  
  // 稳定的 loadRecords 函数，始终调用最新的实现
  const loadRecords = React.useCallback(async () => {
    await loadRecordsRef.current?.();
  }, []);

  // 当弹窗打开或列表类型变化时加载记录
  React.useEffect(() => {
    if (!open || !foreignTableId) return;
    
    // 重置搜索查询和临时选择
    setSearchQuery("");
    setTempSelectedRecords(selectedRecords);
    tempSelectedRecordsRef.current = selectedRecords;
    
    // 延迟加载，避免在状态重置时立即触发
    const timer = setTimeout(() => {
      loadRecordsRef.current?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [open, listType, foreignTableId]); // 移除 selectedRecords 和 loadRecords 依赖，避免无限循环

  // 当搜索查询变化时重新加载（使用防抖）
  React.useEffect(() => {
    if (!open || !foreignTableId) return;
    
    const timer = setTimeout(() => {
      loadRecordsRef.current?.();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open, foreignTableId]); // 移除 loadRecords 依赖，避免无限循环

  // 处理记录选择/取消选择
  const handleToggleRecord = React.useCallback(
    (record: LinkCellValue) => {
      // 阻止事件冒泡，防止触发弹窗关闭
      const isSelected = tempSelectedRecords.some((r) => r.id === record.id);
      let newSelected: LinkCellValue[];

      if (isSelected) {
        // 取消选择
        newSelected = tempSelectedRecords.filter((r) => r.id !== record.id);
      } else {
        // 添加选择
        if (allowMultiple) {
          newSelected = [...tempSelectedRecords, record];
        } else {
          newSelected = [record];
        }
      }

      setTempSelectedRecords(newSelected);
      tempSelectedRecordsRef.current = newSelected;
      
      // 重要：这里不调用 onChange，只有在点击"确认"时才调用
      // 这样可以避免在选择时触发状态更新导致弹窗关闭
      // 不要在这里调用 onChange，否则会触发 onDataUpdate，可能导致编辑状态变化
    },
    [tempSelectedRecords, allowMultiple]
  );

  // 处理确认
  const handleConfirm = React.useCallback(() => {
    // 标记正在确认，允许关闭弹窗
    isConfirmingRef.current = true;
    
    // 先更新值，再关闭弹窗
    if (tempSelectedRecords.length === 0) {
      onChange(null);
    } else if (allowMultiple) {
      onChange(tempSelectedRecords);
    } else {
      onChange(tempSelectedRecords[0]);
    }
    
    // 关闭弹窗
    setInternalOpen(false);
    onOpenChange(false);
    
    // 延迟重置标记，确保关闭操作完成
    setTimeout(() => {
      isConfirmingRef.current = false;
    }, 100);
  }, [tempSelectedRecords, allowMultiple, onChange, onOpenChange]);

  // 处理取消
  const handleCancel = React.useCallback(() => {
    // 标记正在取消，允许关闭弹窗
    isCancellingRef.current = true;
    
    // 重置临时选择
    setTempSelectedRecords(selectedRecords);
    tempSelectedRecordsRef.current = selectedRecords;
    
    // 关闭弹窗
    setInternalOpen(false);
    onOpenChange(false);
    
    // 延迟重置标记，确保关闭操作完成
    setTimeout(() => {
      isCancellingRef.current = false;
    }, 100);
  }, [selectedRecords, onOpenChange]);

  // 检查记录是否已选择
  const isRecordSelected = React.useCallback(
    (recordId: string) => {
      return tempSelectedRecords.some((r) => r.id === recordId);
    },
    [tempSelectedRecords]
  );

  // 获取关联表名称
  const [tableName, setTableName] = React.useState<string>("");
  React.useEffect(() => {
    if (foreignTableId && baseId) {
      luckdbClient.tables
        .getOne(foreignTableId)
        .then((table) => {
          setTableName(table.name || foreignTableId);
        })
        .catch(() => {
          setTableName(foreignTableId);
        });
    }
  }, [foreignTableId, baseId]);

  // 使用 ref 标记是否正在处理确认，防止在选择时意外关闭
  const isConfirmingRef = React.useRef(false);
  const isCancellingRef = React.useRef(false);
  
  // 处理弹窗关闭，防止在选择记录时意外关闭
  // 使用受控方式，只有在确认或取消时才允许关闭
  const handleDialogOpenChange = React.useCallback(
    (newOpen: boolean) => {
      // 如果正在确认或取消，允许关闭
      if (isConfirmingRef.current || isCancellingRef.current) {
        onOpenChange(newOpen);
        return;
      }
      
      // 如果弹窗要关闭，但不是在确认或取消过程中，阻止关闭
      // 这样可以防止在选择记录时意外关闭弹窗
      if (!newOpen) {
        // 不自动关闭，只有在用户明确点击取消或确认时才关闭
        // 不调用 onOpenChange，保持内部状态为打开
        setInternalOpen(true);
        return;
      } else {
        // 允许打开弹窗
        setInternalOpen(true);
        onOpenChange(newOpen);
      }
    },
    [onOpenChange]
  );
  
  // 受控的 open 状态，只有在确认或取消时才允许关闭
  // 使用 state 来跟踪弹窗是否应该打开
  const [internalOpen, setInternalOpen] = React.useState(open);
  
  React.useEffect(() => {
    // 如果外部 open 变为 true，打开弹窗
    if (open) {
      setInternalOpen(true);
    }
  }, [open]);
  
  // 受控的 open 状态，只有在确认或取消时才允许关闭
  const controlledOpen = React.useMemo(() => {
    // 如果正在确认或取消，允许关闭（使用外部 open 状态）
    if (isConfirmingRef.current || isCancellingRef.current) {
      return open;
    }
    // 否则，使用内部状态，保持弹窗打开
    // 这样可以防止在选择记录时意外关闭
    return internalOpen;
  }, [open, internalOpen]);

  return (
    <Dialog open={controlledOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent 
        className="flex h-[520px] max-w-4xl flex-col p-0"
        onInteractOutside={(e) => {
          // 防止点击外部区域时关闭弹窗
          // 只有在用户明确点击取消或确认时才关闭
          if (!isConfirmingRef.current && !isCancellingRef.current) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // 防止按 ESC 键时关闭弹窗
          // 只有在用户明确点击取消或确认时才关闭
          if (!isConfirmingRef.current && !isCancellingRef.current) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle>选择要链接的记录</DialogTitle>
            {foreignTableId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-primary hover:underline"
                onClick={() => {
                  // TODO: 跳转到关联表
                  window.open(`/table/${foreignTableId}`, "_blank");
                }}
              >
                跳转至关联表
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden px-6 pb-6">
          {/* 搜索框 */}
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索记录"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 标签页 */}
          <div className="mb-4 flex gap-2 border-b">
            <button
              type="button"
              onClick={() => setListType("unselected")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                listType === "unselected"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              未选择
            </button>
            <button
              type="button"
              onClick={() => setListType("selected")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                listType === "selected"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              已选择 ({tempSelectedRecords.length})
            </button>
          </div>

          {/* 记录列表表格 */}
          <div className="flex-1 overflow-auto rounded-md border">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
              </div>
            ) : records.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  {listType === "selected" ? "暂无已选择的记录" : "暂无可用记录"}
                </span>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-muted/50">
                  <tr>
                    <th className="w-12 px-4 py-2 text-left">
                      <Checkbox
                        checked={
                          records.length > 0 &&
                          records.every((r) => isRecordSelected(r.id))
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            // 全选
                            const newSelected = [
                              ...tempSelectedRecords,
                              ...records.filter((r) => !isRecordSelected(r.id)),
                            ];
                            setTempSelectedRecords(newSelected);
      tempSelectedRecordsRef.current = newSelected;
                          } else {
                            // 取消全选
                            const recordIds = records.map((r) => r.id);
                            setTempSelectedRecords(
                              tempSelectedRecords.filter((r) => !recordIds.includes(r.id))
                            );
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium">标题</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const selected = isRecordSelected(record.id);
                    return (
                      <tr
                        key={record.id}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/50",
                          selected && "bg-muted/30"
                        )}
                        onClick={(e) => {
                          // 阻止行点击事件冒泡，防止触发弹窗关闭
                          e.stopPropagation();
                        }}
                      >
                        <td className="px-4 py-2">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => {
                              // 阻止事件冒泡，防止触发弹窗关闭
                              handleToggleRecord(record);
                            }}
                            onClick={(e) => {
                              // 阻止事件冒泡，防止触发弹窗关闭
                              e.stopPropagation();
                            }}
                          />
                        </td>
                        <td 
                          className="px-4 py-2 text-sm"
                          onClick={(e) => {
                            // 点击行时也触发选择，但阻止事件冒泡
                            e.stopPropagation();
                            handleToggleRecord(record);
                          }}
                        >
                          {record.title || record.id}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                          {record.id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: 实现添加新记录
                console.log("添加新记录");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              添加记录
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                取消
              </Button>
              <Button onClick={handleConfirm}>确认</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

