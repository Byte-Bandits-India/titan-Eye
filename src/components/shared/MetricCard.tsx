import type { LucideIcon } from 'lucide-react';
import type { RefObject } from 'react';

import { useRef } from 'react';
import { useCountUp } from 'react-countup';

import { cn } from '../../lib/utils';

export type MetricCardConfig = {
  icon: LucideIcon;
  iconGradient: string;
  label: string;
  value: number;
};

export function MetricCard({ icon: Icon, iconGradient, label, value }: MetricCardConfig) {
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
        <span className="truncate text-sm font-bold text-black">{label}</span>
      </div>

      <div className="flex items-baseline gap-2 px-8 py-5">
        <MetricCountUp className="text-[42px] font-bold leading-none text-foreground" value={value} />
        <span className="text-sm font-normal text-muted-foreground">
          {value === 1 ? 'Customer' : 'Customers'}
        </span>
      </div>
    </div>
  );
}

function MetricCountUp({ className, value }: { className?: string; value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useCountUp({ duration: 1, end: value, ref: ref as RefObject<HTMLElement> });

  return <span className={className} ref={ref} />;
}
