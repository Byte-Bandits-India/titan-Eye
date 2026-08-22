/* eslint-disable react-refresh/only-export-components */
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'relative inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap border border-transparent font-medium outline-none transition-shadow',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
    '[&_svg:not([class*=size-])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    defaultVariants: {
      radius: 'default',
      size: 'default',
      variant: 'default',
    },
    variants: {
      radius: {
        default: 'rounded-sm',
        full: 'rounded-full',
      },
      size: {
        default: 'px-1.25 h-5 min-w-5 gap-1 py-0.5 text-sm',
        lg: 'h-5.5 min-w-5.5 gap-1 px-1.5 py-0.5 text-sm',
        sm: 'py-0.25 h-4.5 min-w-4.5 gap-1 px-1 text-[0.625rem] leading-none',
        xl: 'py-0.75 h-6 min-w-6 gap-1.5 px-2 text-sm',
        xs: 'py-0.25 h-4 min-w-4 gap-1 px-1 text-[0.6rem] leading-none',
      },
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-white',
        'destructive-light':
          'border-destructive/15 bg-destructive/10 dark:border-destructive/25 dark:bg-destructive/15 text-destructive-foreground dark:text-destructive',
        'destructive-outline': 'dark:bg-input/30 border-border bg-background text-destructive-foreground',
        focus: 'bg-focus text-focus-foreground',
        'focus-light':
          'border-focus/15 bg-focus/10 text-focus-foreground dark:border-focus/25 dark:bg-focus/15 dark:text-focus',
        'focus-outline': 'text-focus-foreground dark:bg-input/30 border-border bg-background',
        info: 'bg-info text-white',
        'info-light':
          'border-info/15 bg-info/10 text-info-foreground dark:border-info/25 dark:bg-info/15 dark:text-info',
        'info-outline': 'text-info-foreground dark:bg-input/30 border-border bg-background',
        invert: 'bg-invert text-invert-foreground',
        'invert-light':
          'border-invert/15 bg-invert/10 dark:border-invert/45 dark:bg-invert/35 dark:text-invert-foreground text-foreground',
        'invert-outline': 'text-invert-foreground dark:bg-input/30 border-border bg-background',
        outline: 'dark:bg-input/32 border-border bg-transparent',
        'primary-light':
          'border-primary/10 bg-primary/10 dark:border-primary/25 dark:bg-primary/15 text-primary dark:text-primary',
        'primary-outline': 'dark:bg-input/30 border-border bg-background text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-success text-white',
        'success-light':
          'border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success',
        'success-outline': 'text-success-foreground dark:bg-input/30 border-border bg-background',
        warning: 'bg-warning text-white',
        'warning-light':
          'border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning',
        'warning-outline': 'text-warning-foreground dark:bg-input/30 border-border bg-background',
      },
    },
  }
);

interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ asChild = false, className, radius, size, variant, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp className={cn(badgeVariants({ className, radius, size, variant }))} data-slot="badge" {...props} />
  );
}

export { Badge, type BadgeProps, badgeVariants };
