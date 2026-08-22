import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { ScrollArea } from './scroll-area';

export interface LegacySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
  options: SelectOption[];
}

export interface SelectOption {
  label: string;
  value: string;
}

const SelectRoot = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { size?: 'default' | 'sm' }
>(({ children, className, size = 'default', ...props }, ref) => (
  <SelectPrimitive.Trigger
    className={cn(
      'shadow-xs flex w-full cursor-pointer items-center justify-between rounded-md border border-input bg-card px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800/50 [&>span]:line-clamp-1',
      size === 'sm' ? 'h-7' : 'h-9',
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ children, className, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      className={cn(
        'relative z-50 max-h-60 min-w-[6rem] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      ref={ref}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn('p-1', position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]')}
      >
        <ScrollArea className="max-h-52 w-full pr-1">{children}</ScrollArea>
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ children, className, ...props }, ref) => (
  <SelectPrimitive.Item
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-7 pr-2 text-sm font-medium outline-none transition-colors focus:bg-blue-50 focus:text-blue-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-blue-950/50 dark:focus:text-blue-300',
      className
    )}
    ref={ref}
    {...props}
  >
    <span className="absolute left-1.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const LegacySelect = React.forwardRef<HTMLSelectElement, LegacySelectProps>(
  ({ className, containerClassName, options, ...props }, ref) => (
    <div className={cn('relative w-full', containerClassName)}>
      <select
        className={cn(
          'rounded-xs flex h-10 w-full cursor-pointer appearance-none border border-border bg-card px-3 py-2 pr-8 text-sm text-foreground shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        size={16}
      />
    </div>
  )
);
LegacySelect.displayName = 'LegacySelect';

export {
  LegacySelect,
  SelectRoot as Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
};
