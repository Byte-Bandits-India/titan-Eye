/* eslint-disable react-refresh/only-export-components */
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'active:scale-98 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-9 px-4 py-2',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
        lg: 'h-10 rounded-md px-8',
        pill: 'h-10 rounded-full px-6 py-2.5 text-sm font-medium',
        sm: 'h-8 rounded-md px-3 text-xs',
      },
      variant: {
        darkBlue:
          'bg-[#1a2b6e] text-white shadow-sm hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800',
        default:
          'bg-[#2d3a5e] text-white shadow-sm hover:bg-[#232d4a] dark:bg-blue-600 dark:hover:bg-blue-700',
        destructive: 'bg-red-500 text-white shadow-sm hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        gradient:
          'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm hover:from-blue-600 hover:to-blue-800',
        link: 'text-blue-600 underline-offset-4 hover:underline dark:text-blue-400',
        outline: 'border border-border bg-card text-foreground shadow-sm hover:bg-muted',
        secondary: 'hover:bg-secondary/80 bg-secondary text-secondary-foreground',
      },
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return <Comp className={cn(buttonVariants({ className, size, variant }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
