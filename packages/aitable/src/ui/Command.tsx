/**
 * Command component - simplified command menu from @teable/ui-lib
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef, createContext, useContext, useState } from 'react';
import { cn } from '../utils';

interface CommandContextValue {
  search: string;
  setSearch: (search: string) => void;
}

const CommandContext = createContext<CommandContextValue>({
  search: '',
  setSearch: () => {},
});

export interface CommandProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const Command = forwardRef<HTMLDivElement, CommandProps>(
  ({ className, children, ...props }, ref) => {
    const [search, setSearch] = useState('');

    return (
      <CommandContext.Provider value={{ search, setSearch }}>
        <div
          ref={ref}
          className={cn(
            'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </CommandContext.Provider>
    );
  }
);

Command.displayName = 'Command';

export const CommandInput = forwardRef<
  HTMLInputElement,
  HTMLAttributes<HTMLInputElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
  const { setSearch } = useContext(CommandContext);

  return (
    <div className="flex items-center border-b px-3">
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none',
          'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        placeholder={placeholder}
        onChange={(e) => setSearch(e.target.value)}
        {...(props as any)}
      />
    </div>
  );
});

CommandInput.displayName = 'CommandInput';

export const CommandList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CommandList.displayName = 'CommandList';

export const CommandEmpty = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children = 'No results found.', ...props }, ref) => {
    return (
      <div ref={ref} className={cn('py-6 text-center text-sm', className)} {...props}>
        {children}
      </div>
    );
  }
);

CommandEmpty.displayName = 'CommandEmpty';

export const CommandGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CommandGroup.displayName = 'CommandGroup';

export const CommandItem = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { onSelect?: () => void }
>(({ className, onSelect, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'hover:bg-accent hover:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      onClick={onSelect}
      {...props}
    >
      {children}
    </div>
  );
});

CommandItem.displayName = 'CommandItem';