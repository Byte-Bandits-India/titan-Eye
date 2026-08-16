import { Calendar } from 'lucide-react';

import { cn } from '../../lib/utils';
import { DATE_FILTER_OPTIONS, type DateFilterRange } from '../../utils/dateFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export type DateFilterProps = {
  className?: string;
  onChange: (value: DateFilterRange) => void;
  value: DateFilterRange;
};

export function DateFilter({ className, onChange, value }: DateFilterProps) {
  return (
    <div className={cn('min-w-[130px] shrink-0', className)}>
      <Select onValueChange={(val) => onChange(val as DateFilterRange)} value={value}>
        <SelectTrigger className="border-border/80 shadow-xs flex h-10 cursor-pointer items-center justify-between gap-2.5 rounded-md border bg-card px-4 text-xs font-medium outline-none transition-all hover:border-blue-300 focus:ring-0 dark:hover:border-blue-700">
          <div className="flex items-center gap-2 overflow-hidden">
            <Calendar className="shrink-0 stroke-[2.2] text-blue-600 dark:text-blue-400" size={16} />
            <SelectValue placeholder="Select range" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="rounded-2xl border-border p-1.5 shadow-xl">
          {DATE_FILTER_OPTIONS.map((opt) => (
            <SelectItem
              className="cursor-pointer rounded-xl py-2 text-xs font-medium"
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
