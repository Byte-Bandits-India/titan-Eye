import * as React from 'react';

import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select-radix';

export interface RxScrollPickerProps {
  defaultValue?: string;
  hasError?: boolean;
  onChange: (val: string) => void;
  options: string[];
  value: string;
}

export function RxScrollPicker({ defaultValue = '0.00', hasError, onChange, options, value }: RxScrollPickerProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Radix auto-scrolls the opened list to the currently selected item, which can
  // land far into negative values. Override it so the list always opens showing
  // the "0" option (or the top of the list, for option sets with no zero).
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      return;
    }

    requestAnimationFrame(() => {
      const items = contentRef.current?.querySelectorAll('[data-slot="select-item"]');

      if (!items || items.length === 0) {
        return;
      }

      const zeroIndex = options.findIndex((opt) => opt === '0.00' || opt === '0');
      const target = items[zeroIndex >= 0 ? zeroIndex : 0] as HTMLElement | undefined;
      target?.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <Select onOpenChange={handleOpenChange} onValueChange={onChange} value={value}>
      <SelectTrigger
        className={cn(
          'h-9 w-full justify-center gap-1 border-0 bg-transparent px-1 font-mono text-xs font-medium text-foreground shadow-none hover:bg-slate-100/60 focus-visible:ring-1 focus-visible:ring-blue-500 dark:hover:bg-zinc-800/60',
          hasError && 'bg-rose-50 font-medium text-rose-600'
        )}
        size="sm"
      >
        <SelectValue placeholder={defaultValue} />
      </SelectTrigger>
      <SelectContent align="center" className="max-h-56 min-w-[7rem]" position="popper" ref={contentRef}>
        {options.map((opt) => (
          <SelectItem className="justify-center text-center font-mono text-xs" key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
