/* eslint-disable react-refresh/only-export-components */
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        Accepted:
          'border-transparent bg-blue-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-blue-600',
        active:
          'border-transparent bg-emerald-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-emerald-700',
        admin:
          'border-transparent bg-violet-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-violet-700',
        Cancelled:
          'border-transparent bg-rose-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-rose-600',
        Closed:
          'border-transparent bg-gray-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-gray-500',
        Completed:
          'border-transparent bg-emerald-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-emerald-600',
        Created:
          'border-transparent bg-zinc-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-zinc-600',
        default: 'border-transparent bg-[#2d3a5e] text-white hover:bg-[#232d4a]',
        destructive: 'border-red-200 border-transparent bg-red-100 text-red-800',
        Drop: 'border-transparent bg-amber-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
        inactive:
          'border-transparent bg-rose-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-rose-700',
        Initiated:
          'border-transparent bg-indigo-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-indigo-600',
        Queued:
          'border-transparent bg-amber-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-amber-700',
        'Test Completed':
          'border-transparent bg-purple-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-purple-700',
        Testing:
          'border-transparent bg-amber-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-amber-700',
        optometrist:
          'border-transparent bg-teal-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-teal-700',
        outline: 'border-gray-300 text-gray-900',
        Pending:
          'border-transparent bg-amber-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-amber-600',
        Rejected:
          'border-transparent bg-rose-50 px-2.5 py-1 text-[9px] font-medium tracking-wide text-rose-600',
        secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
        store:
          'border-transparent bg-blue-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-blue-700',
        USER_CREATED:
          'border-transparent bg-purple-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-purple-700',
        USER_DELETED:
          'border-transparent bg-rose-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-rose-700',
        USER_STATUS_CHANGE:
          'border-transparent bg-amber-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-amber-700',
        USER_UPDATED:
          'border-transparent bg-sky-100 px-2.5 py-1 text-[9px] font-medium tracking-wide text-sky-700',
      },
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
