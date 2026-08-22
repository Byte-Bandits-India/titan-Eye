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

export function RxScrollPicker({
  defaultValue = '0.00',
  hasError,
  onChange,
  options,
  value,
}: RxScrollPickerProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  const focusAndCenterZero = () => {
    const contentEl = contentRef.current;

    if (!contentEl) {
      return;
    }

    const items = contentEl.querySelectorAll<HTMLElement>('[data-slot="select-item"]');

    if (!items || items.length === 0) {
      return;
    }

    let targetIndex = value ? options.findIndex((opt) => opt === value) : -1;

    if (targetIndex < 0) {
      targetIndex = options.findIndex((opt) => opt === '0.00' || opt === '0');
    }

    if (targetIndex < 0) {
      targetIndex = 0;
    }

    const target = items[targetIndex] as HTMLElement | undefined;

    if (target) {
      target.focus();
      target.scrollIntoView({ block: 'center' });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      return;
    }

    requestAnimationFrame(() => {
      focusAndCenterZero();
    });
  };

  return (
    <Select onOpenChange={handleOpenChange} onValueChange={onChange} value={value}>
      <SelectTrigger
        className={cn(
          'h-9 w-full justify-center gap-1 border-0 bg-transparent px-1 font-mono text-sm font-medium text-foreground shadow-none hover:bg-slate-100/60 focus-visible:ring-1 focus-visible:ring-blue-500 dark:hover:bg-zinc-800/60',
          hasError && 'bg-rose-50 font-medium text-rose-600'
        )}
        size="sm"
      >
        <SelectValue placeholder={defaultValue} />
      </SelectTrigger>
      <SelectContent align="center" className="max-h-56 min-w-[7rem]" position="popper" ref={contentRef}>
        {options.map((opt) => (
          <SelectItem
            className={cn(
              'justify-center text-center font-mono text-sm',
              (opt === '0.00' || opt === '0') && 'font-bold'
            )}
            key={opt}
            value={opt}
          >
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
