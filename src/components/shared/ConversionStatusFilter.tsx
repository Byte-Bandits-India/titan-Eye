import { Filter } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export type ConversionStatusFilterValue = 'all' | 'Converted' | 'Not Converted';

const CONVERSION_STATUS_FILTER_OPTIONS: { label: string; value: ConversionStatusFilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Converted', value: 'Converted' },
  { label: 'Not Converted', value: 'Not Converted' },
];

export type ConversionStatusFilterProps = {
  className?: string;
  onChange: (value: ConversionStatusFilterValue) => void;
  value: ConversionStatusFilterValue;
};

export function ConversionStatusFilter({ className, onChange, value }: ConversionStatusFilterProps) {
  return (
    <div className={cn('min-w-[150px] shrink-0', className)}>
      <Select onValueChange={(val) => onChange(val as ConversionStatusFilterValue)} value={value}>
        <SelectTrigger className="border-border/80 shadow-xs flex h-9 cursor-pointer items-center justify-between gap-2.5 rounded-md border bg-card px-3 text-sm font-medium outline-none transition-all hover:border-blue-300 focus:ring-0 dark:hover:border-blue-700">
          <div className="flex items-center gap-2 overflow-hidden">
            <Filter className="shrink-0 stroke-[2.2] text-blue-600 dark:text-blue-400" size={15} />
            <SelectValue placeholder="Filter status" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="rounded-2xl border-border p-1.5 shadow-xl">
          {CONVERSION_STATUS_FILTER_OPTIONS.map((opt) => (
            <SelectItem
              className="cursor-pointer rounded-xl py-2 text-sm font-medium"
              key={opt.value}
              value={opt.value}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
