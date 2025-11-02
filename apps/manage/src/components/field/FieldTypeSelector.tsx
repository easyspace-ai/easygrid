import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldType, FIELD_TYPES_BY_CATEGORY } from '@/types/field';

interface FieldTypeSelectorProps {
  value?: FieldType;
  onChange?: (type: FieldType) => void;
  disabled?: boolean;
  className?: string;
}

export function FieldTypeSelector({ 
  value = FieldType.Formula, 
  onChange, 
  disabled = false,
  className 
}: FieldTypeSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedType = FIELD_TYPES_BY_CATEGORY.basic
    .concat(FIELD_TYPES_BY_CATEGORY.advanced)
    .concat(FIELD_TYPES_BY_CATEGORY.system)
    .find(f => f.type === value);

  const handleSelect = (type: FieldType) => {
    onChange?.(type);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{selectedType?.icon}</span>
            <span>{selectedType?.name}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command className="h-auto">
          <CommandInput placeholder="搜索字段类型..." />
          <CommandEmpty>未找到匹配的字段类型</CommandEmpty>
          <CommandList className="max-h-[400px] overflow-y-auto">
            {/* 基础类型 */}
            <CommandGroup heading="基础类型">
              {FIELD_TYPES_BY_CATEGORY.basic.map((fieldType) => (
                <CommandItem
                  key={fieldType.type}
                  value={fieldType.type}
                  onSelect={() => handleSelect(fieldType.type)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === fieldType.type ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-lg">{fieldType.icon}</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{fieldType.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {fieldType.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* 高级类型 */}
            <CommandGroup heading="高级类型">
              {FIELD_TYPES_BY_CATEGORY.advanced.map((fieldType) => (
                <CommandItem
                  key={fieldType.type}
                  value={fieldType.type}
                  onSelect={() => handleSelect(fieldType.type)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === fieldType.type ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-lg">{fieldType.icon}</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{fieldType.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {fieldType.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* 系统类型 */}
            <CommandGroup heading="系统类型">
              {FIELD_TYPES_BY_CATEGORY.system.map((fieldType) => (
                <CommandItem
                  key={fieldType.type}
                  value={fieldType.type}
                  onSelect={() => handleSelect(fieldType.type)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === fieldType.type ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-lg">{fieldType.icon}</span>
                  <div className="flex flex-col">
                    <span className="font-medium">{fieldType.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {fieldType.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
