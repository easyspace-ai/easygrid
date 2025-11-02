"use client"

import * as React from "react"
import { ChevronDown, Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CreateSpaceDialog } from "@/components/create-space-dialog"

interface Space {
  id: string
  name: string
  description?: string
}

interface SpaceSwitcherProps {
  spaces: Space[]
  selectedSpace?: Space
  onSpaceSelect: (space: Space) => void
  onCreateSpace: () => void
}

export function SpaceSwitcher({ 
  spaces, 
  selectedSpace, 
  onSpaceSelect, 
  onCreateSpace 
}: SpaceSwitcherProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background/50 hover:bg-background/80 border-0 shadow-none h-auto p-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
              <Logo size={20} className="text-current" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-medium">
                {selectedSpace ? `${selectedSpace.name}` : "LuckDB"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {selectedSpace ? "空间管理" : "选择工作空间"}
              </span>
            </div>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索空间..." />
          <CommandList>
            <CommandEmpty>未找到空间</CommandEmpty>
            <CommandGroup>
              {spaces.map((space) => (
                <CommandItem
                  key={space.id}
                  value={space.name}
                  onSelect={() => {
                    onSpaceSelect(space)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <div className="h-4 w-4 rounded-sm bg-primary" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{space.name}</span>
                    {space.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {space.description}
                      </span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedSpace?.id === space.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <div className="p-1">
                <CreateSpaceDialog onSpaceCreated={(space) => {
                  onCreateSpace()
                  setOpen(false) // 创建成功后关闭 Popover
                }} />
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
