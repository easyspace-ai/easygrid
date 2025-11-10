"use client";

import * as React from "react";
import { Link as LinkIcon, ExternalLink, ChevronDown, Info, Table as TableIcon, Check, Search as SearchIcon } from "lucide-react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { luckdbClient } from "../../config/client";
import { useTableConfig } from "../../context/TableConfigContext";
import type { FieldResponse } from "@easygrid/sdk";

interface LinkFieldEditorProps {
  value: any;
  onChange: (value: any) => void;
}

/**
 * 关联字段配置编辑器
 * 参考 teable 的 LinkOptions 实现
 */
export function LinkFieldEditor({ value, onChange }: LinkFieldEditorProps) {
  const { tableId, baseId } = useTableConfig();
  const [tables, setTables] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [moreVisible, setMoreVisible] = React.useState(false);
  const [tableSelectOpen, setTableSelectOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // 关联表的字段列表（用于选择展示列）
  const [foreignFields, setForeignFields] = React.useState<FieldResponse[]>([]);
  const [loadingFields, setLoadingFields] = React.useState(false);
  const [fieldSelectOpen, setFieldSelectOpen] = React.useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = React.useState("");

  // 从 value 中提取配置
  const linkOptions = value?.link || value?.Link || {};
  const foreignTableId = linkOptions.foreignTableId || linkOptions.linked_table_id || "";
  const relationship = linkOptions.relationship || "manyOne";
  const isOneWay = linkOptions.isOneWay ?? false;
  const baseIdOption = linkOptions.baseId || baseId || "";
  const lookupFieldId = linkOptions.lookupFieldId || linkOptions.lookup_field_id || "";

  // 加载表列表
  React.useEffect(() => {
    const loadTables = async () => {
      let effectiveBaseId = baseId;
      
      // 如果 baseId 为空，尝试从 tableId 获取表信息来获取 baseId
      if (!effectiveBaseId && tableId) {
        try {
          // 从 tableId 获取表信息，表信息中包含 baseId
          const tableInfo = await luckdbClient.tables.getOne(tableId);
          if (tableInfo?.baseId) {
            effectiveBaseId = tableInfo.baseId;
          }
        } catch (error) {
          console.warn("无法从 tableId 获取 baseId:", error);
        }
      }
      
      if (!effectiveBaseId) {
        console.warn("baseId 为空，无法加载表列表");
        setTables([]);
        return;
      }
      
      setLoading(true);
      try {
        // 使用 SDK 获取表列表
        const tablesList = await luckdbClient.tables.getFullList(effectiveBaseId);
        // 过滤掉当前表本身，只显示其他表
        const otherTables = tablesList
          .filter((table: any) => table.id !== tableId)
          .map((table: any) => ({
            id: table.id,
            name: table.name || table.id,
          }));
        setTables(otherTables);
      } catch (error) {
        console.error("加载表列表失败:", error);
        setTables([]);
      } finally {
        setLoading(false);
      }
    };

    loadTables();
  }, [baseId, tableId]);

  // 加载关联表的字段列表（当选择了关联表时）
  React.useEffect(() => {
    const loadForeignFields = async () => {
      if (!foreignTableId) {
        setForeignFields([]);
        return;
      }

      setLoadingFields(true);
      try {
        const fieldsList = await luckdbClient.fields.getFullList(foreignTableId);
        // 过滤掉虚拟字段（formula, rollup, lookup, ai等），只显示可展示的字段
        const displayableFields = fieldsList.filter((field) => {
          const virtualTypes = ['formula', 'rollup', 'lookup', 'ai', 'count'];
          return !virtualTypes.includes(field.type);
        });
        setForeignFields(displayableFields);
      } catch (error) {
        console.error("加载关联表字段列表失败:", error);
        setForeignFields([]);
      } finally {
        setLoadingFields(false);
      }
    };

    loadForeignFields();
  }, [foreignTableId]);

  // 更新配置
  const updateOptions = React.useCallback(
    (updates: any) => {
      const newOptions = {
        ...linkOptions,
        ...updates,
      };
      onChange({
        ...value,
        link: newOptions,
      });
    },
    [value, linkOptions, onChange]
  );

  // 处理关系类型变化
  const handleRelationshipChange = React.useCallback(
    (leftMulti: boolean, rightMulti: boolean) => {
      let newRelationship: string;
      if (leftMulti && rightMulti) {
        newRelationship = "manyMany";
      } else if (leftMulti && !rightMulti) {
        newRelationship = "oneMany";
      } else if (!leftMulti && rightMulti) {
        newRelationship = "manyOne";
      } else {
        newRelationship = "oneOne";
      }
      updateOptions({ relationship: newRelationship });
    },
    [updateOptions]
  );

  // 判断关系类型的多选状态
  const isLeftMulti = (rel: string) => {
    return rel === "manyMany" || rel === "oneMany";
  };

  const isRightMulti = (rel: string) => {
    return rel === "manyMany" || rel === "manyOne";
  };

  // 获取关系类型说明
  const getRelationshipHint = () => {
    const isSelf = foreignTableId === tableId;
    const leftMulti = isLeftMulti(relationship);
    const rightMulti = isRightMulti(relationship);
    
    if (isSelf) {
      if (leftMulti && !rightMulti) {
        return "此配置表示多对一的自关联关系";
      } else if (!leftMulti && rightMulti) {
        return "此配置表示一对多的自关联关系";
      } else if (leftMulti && rightMulti) {
        return "此配置表示多对多的自关联关系";
      } else {
        return "此配置表示一对一的自关联关系";
      }
    } else {
      if (leftMulti && !rightMulti) {
        return "此配置表示多对一的关系";
      } else if (!leftMulti && rightMulti) {
        return "此配置表示一对多的关系";
      } else if (leftMulti && rightMulti) {
        return "此配置表示多对多的关系";
      } else {
        return "此配置表示一对一的关系";
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 字段类型说明 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <LinkIcon className="h-4 w-4" />
        <span>在表之间创建关联关系</span>
      </div>

      {/* 进行关联的表 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="foreign-table" className="text-sm font-medium">
            进行关联的表 <span className="text-destructive">*</span>
          </Label>
          <button
            type="button"
            className="text-xs text-primary hover:underline flex items-center gap-1"
            onClick={() => {
              // TODO: 实现从其他数据库关联
            }}
          >
            从其他数据库关联
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
        <Popover 
          open={tableSelectOpen} 
          onOpenChange={(open) => {
            // 允许打开和关闭
            setTableSelectOpen(open);
          }}
          modal={false}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={tableSelectOpen}
              className="w-full justify-between"
            >
              {foreignTableId ? (
                <div className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  <span>
                    {tables.find((t) => t.id === foreignTableId)?.name || foreignTableId}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">选择要关联的表</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[400px] p-0" 
            align="start"
            onInteractOutside={(e) => {
              // 如果点击的是 Popover 内部元素，阻止关闭
              const target = e.target as HTMLElement;
              // 检查点击的元素是否在 PopoverContent 内部
              const content = target.closest('[data-slot="popover-content"]');
              if (content) {
                e.preventDefault();
              }
            }}
            onPointerDownOutside={(e) => {
              // 如果点击的是 Popover 内部元素，阻止关闭
              const target = e.target as HTMLElement;
              // 检查点击的元素是否在 PopoverContent 内部
              const content = target.closest('[data-slot="popover-content"]');
              if (content) {
                e.preventDefault();
              }
            }}
            onEscapeKeyDown={(e) => {
              // 允许 ESC 键关闭
            }}
          >
            <div className="flex flex-col">
              <div className="flex items-center border-b px-3">
                <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  type="text"
                  placeholder="搜索表..."
                  value={searchQuery}
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onClick={(e) => {
                    // 阻止事件冒泡，防止 Popover 关闭
                    e.stopPropagation();
                  }}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="text-sm text-muted-foreground">加载中...</span>
                  </div>
                ) : tables.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">暂无可用表</div>
                ) : (
                  <div className="space-y-1">
                    {tables
                      .filter((table) => {
                        if (!searchQuery) return true;
                        return table.name.toLowerCase().includes(searchQuery.toLowerCase());
                      })
                      .map((table) => {
                        const isSelected = foreignTableId === table.id;
                        return (
                          <button
                            key={table.id}
                            type="button"
                            onClick={(e) => {
                              // 阻止事件冒泡，防止 Popover 关闭
                              e.stopPropagation();
                              e.preventDefault();
                              updateOptions({ foreignTableId: table.id });
                              // 不关闭菜单，让用户可以继续编辑后续配置
                            }}
                            onMouseDown={(e) => {
                              // 阻止 mousedown 事件，防止 Popover 关闭
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onPointerDown={(e) => {
                              // 阻止 pointerdown 事件，防止 Popover 关闭
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onPointerUp={(e) => {
                              // 阻止 pointerup 事件，防止 Popover 关闭
                              e.stopPropagation();
                            }}
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              isSelected && "bg-accent text-accent-foreground"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible"
                              )}
                            >
                              <Check className="h-4 w-4" />
                            </div>
                            <TableIcon className="h-4 w-4" />
                            <span>{table.name}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 更多配置 */}
      {foreignTableId && (
        <>
          <div className="flex items-center justify-between border-t pt-4">
            <button
              type="button"
              onClick={() => setMoreVisible(!moreVisible)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>更多配置</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  moreVisible && "rotate-180"
                )}
              />
            </button>
          </div>

          {moreVisible && (
            <div className="flex flex-col gap-4">
              {/* 选择展示的列 */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="lookup-field" className="text-sm font-medium">
                  选择展示的列
                </Label>
                <Popover 
                  open={fieldSelectOpen} 
                  onOpenChange={setFieldSelectOpen}
                  modal={false}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={fieldSelectOpen}
                      className="w-full justify-between"
                      disabled={!foreignTableId || loadingFields}
                    >
                      {lookupFieldId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">A</span>
                          <span>
                            {foreignFields.find((f) => f.id === lookupFieldId)?.name || lookupFieldId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {loadingFields ? "加载中..." : "请选择展示的列"}
                        </span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[400px] p-0" 
                    align="start"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center border-b px-3">
                        <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                          type="text"
                          placeholder="搜索字段..."
                          value={fieldSearchQuery}
                          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          onChange={(e) => {
                            setFieldSearchQuery(e.target.value);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                        {loadingFields ? (
                          <div className="flex items-center justify-center py-6">
                            <span className="text-sm text-muted-foreground">加载中...</span>
                          </div>
                        ) : foreignFields.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {foreignTableId ? "暂无可用字段" : "请先选择关联的表"}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {foreignFields
                              .filter((field) => {
                                if (!fieldSearchQuery) return true;
                                return field.name.toLowerCase().includes(fieldSearchQuery.toLowerCase());
                              })
                              .map((field) => {
                                const isSelected = lookupFieldId === field.id;
                                return (
                                  <button
                                    key={field.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      updateOptions({ lookupFieldId: field.id });
                                      setFieldSelectOpen(false);
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                    className={cn(
                                      "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                      isSelected && "bg-accent text-accent-foreground"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        isSelected
                                          ? "bg-primary text-primary-foreground"
                                          : "opacity-50 [&_svg]:invisible"
                                      )}
                                    >
                                      <Check className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs">A</span>
                                    <span>{field.name}</span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 双向关联 */}
              <div className="flex h-8 items-center gap-2">
                <Switch
                  id="bidirectional"
                  checked={!isOneWay}
                  onCheckedChange={(checked) => {
                    updateOptions({ isOneWay: !checked });
                  }}
                />
                <Label
                  htmlFor="bidirectional"
                  className="text-sm font-normal leading-tight cursor-pointer"
                >
                  双向关联
                </Label>
              </div>

              {/* 允许多选 */}
              <div className="flex h-8 items-center gap-2">
                <Switch
                  id="allow-multiple"
                  checked={isLeftMulti(relationship)}
                  onCheckedChange={(checked) => {
                    handleRelationshipChange(checked, isRightMulti(relationship));
                  }}
                />
                <Label
                  htmlFor="allow-multiple"
                  className="text-sm font-normal leading-tight cursor-pointer"
                >
                  允许多选
                </Label>
              </div>

              {/* 允许重复值 */}
              <div className="flex h-8 items-center gap-2">
                <Switch
                  id="allow-duplicate"
                  checked={isRightMulti(relationship)}
                  onCheckedChange={(checked) => {
                    handleRelationshipChange(isLeftMulti(relationship), checked);
                  }}
                />
                <Label
                  htmlFor="allow-duplicate"
                  className="text-sm font-normal leading-tight cursor-pointer"
                >
                  允许重复值
                </Label>
              </div>
            </div>
          )}

          {/* 提示 */}
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div>{getRelationshipHint()}</div>
                <button
                  type="button"
                  className="mt-1 text-primary hover:underline flex items-center gap-1"
                >
                  了解更多
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

