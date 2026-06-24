import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  containerClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('relative w-full', containerClassName)}>
        <select
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border border-border bg-card px-3 py-2 pr-8 text-sm text-foreground shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
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
          size={16}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
