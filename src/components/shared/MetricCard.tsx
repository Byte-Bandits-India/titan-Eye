import type { LucideIcon } from 'lucide-react';
import type { RefObject } from 'react';

import { useEffect, useRef } from 'react';
import { useCountUp } from 'react-countup';

import { cn } from '../../lib/utils';

export type MetricCardConfig = {
  icon: LucideIcon;
  iconGradient: string;
  label: string;
  unitPlural?: string;
  unitSingular?: string;
  value: number;
};

export function MetricCard({
  icon: Icon,
  iconGradient,
  label,
  unitPlural = 'Customers',
  unitSingular = 'Customer',
  value,
}: MetricCardConfig) {
  return (
    <div className="overflow-hidden rounded-md border border-[#c2c2c2] bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-[#e5e5e5] bg-[#F7F7F7] px-4 py-2.5">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br text-white',
            iconGradient
          )}
        >
          <Icon size={13} />
        </div>
        <span className="truncate text-sm font-medium text-black">{label}</span>
      </div>

      <div className="flex items-baseline gap-2 px-4 py-3.5 sm:px-6 sm:py-4 md:px-8 md:py-5">
        <MetricCountUp className="text-[28px] font-medium leading-none text-foreground sm:text-[34px] md:text-[42px]" value={value} />
        <span className="text-xs font-normal text-muted-foreground sm:text-sm">
          {value === 1 ? unitSingular : unitPlural}
        </span>
      </div>
    </div>
  );
}

function MetricCountUp({ className, value }: { className?: string; value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { update } = useCountUp({ duration: 1, end: value, ref: ref as RefObject<HTMLElement> });

  useEffect(() => {
    update(value);
  }, [update, value]);

  return <span className={className} ref={ref} />;
}
