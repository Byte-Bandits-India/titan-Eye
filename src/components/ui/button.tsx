import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-98 cursor-pointer',
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
        pill: 'h-10 px-6 py-2.5 rounded-full text-sm font-medium',
        sm: 'h-8 rounded-md px-3 text-xs',
      },
      variant: {
        darkBlue: 'bg-[#1a2b6e] text-white hover:bg-[#152260] dark:bg-blue-700 dark:hover:bg-blue-800 shadow-sm',
        default: 'bg-[#2d3a5e] text-white hover:bg-[#232d4a] dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm',
        destructive: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 shadow-sm',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        link: 'text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline',
        outline: 'border border-border bg-card text-foreground hover:bg-muted shadow-sm',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ className, size, variant }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
