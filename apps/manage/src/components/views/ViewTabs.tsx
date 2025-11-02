import type { View } from '@easygrid/sdk';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface ViewTabsProps {
  views: View[];
  activeViewId?: string;
  onSelect: (viewId: string) => void;
  onCreate?: (type: 'grid' | 'kanban') => void;
  onRename?: (viewId: string) => void;
  onDelete?: (viewId: string) => void;
}

export function ViewTabs(props: ViewTabsProps) {
  const { views, activeViewId, onSelect, onCreate, onRename, onDelete } = props;

  return (
    <div className="w-full flex items-center gap-2">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pr-4">
          {/* "+" 按钮放在最左侧 */}
          {onCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md border border-dashed hover:border-solid hover:bg-muted">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onCreate('grid')}>表格视图</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreate('kanban')}>看板视图</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 视图标签页 */}
          {views.map((v) => (
            <div key={v.id} className={cn('group flex items-center h-8 rounded-md border px-3 text-sm cursor-pointer select-none',
              v.id === activeViewId ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted')}
              onClick={() => onSelect(v.id)}
            >
              <span className="mr-2">{v.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[140px]">
                  {onRename && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(v.id); }}>重命名</DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(v.id); }}>删除视图</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}


