import React, { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

// NOTE: Lightweight UI shim to unblock integration. Replace with real UI library later.

export const cn = (...classes: Array<string | undefined | null | false>) =>
  classes.filter(Boolean).join(' ');

export type ShimProps<T = HTMLDivElement> = HTMLAttributes<T> & { children?: React.ReactNode };

// Button
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }>(function Button(
  { className, children, variant, ...rest },
  ref
) {
  return (
    <button ref={ref} className={cn('ld-btn', variant && `ld-btn-${variant}`, className)} {...rest}>
      {children}
    </button>
  );
});

// Input
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cn('ld-input', className)} {...rest} />;
});

// Textarea
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref
) {
  return <textarea ref={ref} className={cn('ld-textarea', className)} {...rest} />;
});

// Dialog primitives
export const Dialog: React.FC<ShimProps & { open?: boolean; onOpenChange?: (open: boolean) => void }> = ({ children }) => <>{children}</>;
export const DialogTrigger: React.FC<ShimProps> = ({ children }) => <>{children}</>;
export const DialogContent: React.FC<ShimProps> = ({ className, children, ...rest }) => (
  <div className={cn('ld-dialog', className)} {...rest}>
    {children}
  </div>
);
export const DialogHeader: React.FC<ShimProps> = ({ children }) => <div className="ld-dialog-header">{children}</div>;
export const DialogTitle: React.FC<ShimProps> = ({ children }) => <div className="ld-dialog-title">{children}</div>;
export const DialogDescription: React.FC<ShimProps> = ({ children }) => (
  <div className="ld-dialog-desc">{children}</div>
);
export const DialogFooter: React.FC<ShimProps> = ({ children }) => <div className="ld-dialog-footer">{children}</div>;
export const DialogClose: React.FC<ShimProps> = ({ children }) => <>{children}</>;

// Sheet primitives
export const Sheet: React.FC<ShimProps & { open?: boolean; onOpenChange?: (open?: boolean) => void }> = ({ children }) => <>{children}</>;
export const SheetContent: React.FC<ShimProps & { side?: string }> = ({ className, children, side, ...rest }) => (
  <div className={cn('ld-sheet', `ld-sheet-${side}`, className)} {...rest}>
    {children}
  </div>
);

// Popover primitives
export const Popover: React.FC<ShimProps & { open?: boolean; onOpenChange?: (open: boolean) => void }> = ({ children }) => <>{children}</>;
export const PopoverTrigger: React.FC<ShimProps> = ({ children }) => <>{children}</>;
export const PopoverContent: React.FC<ShimProps> = ({ className, children, ...rest }) => (
  <div className={cn('ld-popover', className)} {...rest}>
    {children}
  </div>
);

// Command palette primitives
export const Command: React.FC<ShimProps> = ({ children }) => <div className="ld-command">{children}</div>;
export const CommandInput: React.FC<ShimProps<HTMLInputElement>> = ({ className, ...rest }) => (
  <input className={cn('ld-command-input', className)} {...rest} />
);
export const CommandList: React.FC<ShimProps> = ({ children }) => <div className="ld-command-list">{children}</div>;
export const CommandGroup: React.FC<ShimProps> = ({ children }) => <div className="ld-command-group">{children}</div>;
export const CommandItem: React.FC<ShimProps> = ({ children }) => <div className="ld-command-item">{children}</div>;

// Tabs (used by FormulaEditor)
export const Tabs: React.FC<ShimProps> = ({ children }) => <>{children}</>;
export const TabsList: React.FC<ShimProps> = ({ children }) => <div className="ld-tabs-list">{children}</div>;
export const TabsTrigger: React.FC<ShimProps> = ({ children }) => <button className="ld-tabs-trigger">{children}</button>;
export const TabsContent: React.FC<ShimProps> = ({ children }) => <div className="ld-tabs-content">{children}</div>;

// Label + ScrollArea placeholders
export const Label: React.FC<ShimProps> = ({ children }) => <label className="ld-label">{children}</label>;
export const ScrollArea: React.FC<ShimProps> = ({ children }) => <div className="ld-scroll-area">{children}</div>;

// Utility icons placeholder types (actual icons should be wired later)
export const ChevronDown: React.FC<ShimProps> = () => <span>▾</span>;

export default {};


