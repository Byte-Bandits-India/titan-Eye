import { Calendar } from 'lucide-react';

import { cn } from '../../lib/utils';
import { DATE_FILTER_OPTIONS, type DateFilterRange } from '../../utils/dateFilter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export type DateFilterProps = {
  className?: string;
  onChange: (value: DateFilterRange) => void;
  value: DateFilterRange;
};

export function DateFilter({ className, onChange, value }: DateFilterProps) {
  return (
    <div className={cn('shrink-0 min-w-[130px]', className)}>
      <Select onValueChange={(val) => onChange(val as DateFilterRange)} value={value}>
        <SelectTrigger className="h-10 px-4 bg-card border border-border/80 rounded-full font-bold text-xs shadow-xs hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer flex items-center justify-between gap-2.5 transition-all outline-none focus:ring-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <Calendar className="text-blue-600 dark:text-blue-400 stroke-[2.2] shrink-0" size={16} />
            <SelectValue placeholder="Select range" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="rounded-2xl border-border p-1.5 shadow-xl">
          {DATE_FILTER_OPTIONS.map((opt) => (
            <SelectItem className="cursor-pointer font-bold text-xs rounded-xl py-2" key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
