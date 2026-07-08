import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#2d3a5e] text-white hover:bg-[#232d4a]',
        secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
        destructive: 'border-transparent bg-red-100 text-red-800 border-red-200',
        outline: 'text-gray-900 border-gray-300',
        Created: 'border-transparent bg-zinc-100 text-zinc-600 font-bold tracking-wide text-[9px] px-2.5 py-1',
        Initiated: 'border-transparent bg-indigo-50 text-indigo-600 font-bold tracking-wide text-[9px] px-2.5 py-1',
        Accepted: 'border-transparent bg-blue-50 text-blue-600 font-bold tracking-wide text-[9px] px-2.5 py-1',
        Pending: 'border-transparent bg-amber-50 text-amber-600 font-bold tracking-wide text-[9px] px-2.5 py-1',
        Completed: 'border-transparent bg-emerald-50 text-emerald-600 font-bold tracking-wide text-[9px] px-2.5 py-1',
        Rejected: 'border-transparent bg-rose-50 text-rose-600 font-bold tracking-wide text-[9px] px-2.5 py-1',
        Closed: 'border-transparent bg-gray-100 text-gray-500 font-bold tracking-wide text-[9px] px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
