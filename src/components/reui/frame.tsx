/* eslint-disable react-refresh/only-export-components */
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const frameVariants = cva(
  [
    'bg-muted/50 relative flex flex-col gap-[var(--frame-gap)] rounded-[var(--frame-radius)] px-[var(--frame-px)] py-[var(--frame-py)]',
    '[--frame-gap:0.1875rem] [--frame-panel-footer-gap:0.25rem] [--frame-panel-header-gap:0rem] [--frame-px:0.1875rem] [--frame-py:0.1875rem] [--frame-radius:var(--radius)]',
    '[--frame-panel-footer-px-adjust:0px] [--frame-panel-footer-py-adjust:0px] [--frame-panel-header-px-adjust:0px] [--frame-panel-header-py-adjust:0px] [--frame-panel-px-adjust:0px] [--frame-panel-py-adjust:0px]',
    '[--frame-panel-footer-px:calc(var(--frame-panel-footer-px-base)_+_var(--frame-panel-footer-px-adjust))] [--frame-panel-footer-py:calc(var(--frame-panel-footer-py-base)_+_var(--frame-panel-footer-py-adjust))] [--frame-panel-header-px:calc(var(--frame-panel-header-px-base)_+_var(--frame-panel-header-px-adjust))] [--frame-panel-header-py:calc(var(--frame-panel-header-py-base)_+_var(--frame-panel-header-py-adjust))] [--frame-panel-px:calc(var(--frame-panel-px-base)_+_var(--frame-panel-px-adjust))] [--frame-panel-py:calc(var(--frame-panel-py-base)_+_var(--frame-panel-py-adjust))]',
    '[--frame-border-color:var(--border)] [--frame-panel-bg:var(--card)] [--frame-panel-border-color:var(--border)]',
    '[--frame-panel-radius:calc(var(--frame-radius)_-_var(--frame-px)_-_1px)]',
  ],
  {
    defaultVariants: {
      dense: false,
      spacing: 'default',
      stacked: false,
      variant: 'default',
    },
    variants: {
      dense: {
        false: '',
        true: 'gap-0 border-[var(--frame-border-color)] p-0 [--frame-panel-radius:var(--frame-radius)] [&:not(:has([data-slot=frame-panel-header]))_[data-slot=frame-panel]:is(:first-child)]:-mt-px [&_[data-slot=frame-panel]:last-child]:-mb-px [&_[data-slot=frame-panel]]:-mx-px [&_[data-slot=frame-panel]]:before:hidden',
      },
      spacing: {
        default:
          '[--frame-panel-footer-px-base:1rem] [--frame-panel-footer-py-base:0.5rem] [--frame-panel-header-px-base:1rem] [--frame-panel-header-py-base:0.5rem] [--frame-panel-px-base:1rem] [--frame-panel-py-base:1rem]',
        lg: '[--frame-panel-footer-px-base:1.25rem] [--frame-panel-footer-py-base:0.625rem] [--frame-panel-header-px-base:1.25rem] [--frame-panel-header-py-base:0.625rem] [--frame-panel-px-base:1.25rem] [--frame-panel-py-base:1.25rem]',
        sm: '[--frame-panel-footer-px-base:0.75rem] [--frame-panel-footer-py-base:0.375rem] [--frame-panel-header-px-base:0.75rem] [--frame-panel-header-py-base:0.375rem] [--frame-panel-px-base:0.75rem] [--frame-panel-py-base:0.875rem]',
        xs: '[--frame-panel-footer-px-base:0.5rem] [--frame-panel-footer-py-base:0.125rem] [--frame-panel-header-px-base:0.5rem] [--frame-panel-header-py-base:0.125rem] [--frame-panel-px-base:0.5rem] [--frame-panel-py-base:0.5rem]',
      },
      stacked: {
        false: [
          'data-[spacing=sm]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-0.5',
          'data-[spacing=default]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-1',
          'data-[spacing=lg]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-2',
        ],
        true: [
          'gap-0 *:has-[+[data-slot=frame-panel]]:rounded-b-none',
          '*:has-[+[data-slot=frame-panel]]:before:hidden',
          '*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:rounded-t-none',
          '*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:border-t-0',
        ],
      },
      variant: {
        default: 'border border-[var(--frame-border-color)] bg-clip-padding',
        ghost: '[--frame-panel-radius:calc(var(--frame-radius)_-_var(--frame-px))]',
        inverse:
          'border border-[var(--frame-border-color)] bg-background bg-clip-padding [--frame-panel-bg:color-mix(in_oklch,var(--muted)_40%,transparent)]',
      },
    },
  }
);

function Frame({
  className,
  dense,
  spacing,
  stacked,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof frameVariants>) {
  return (
    <div
      className={cn(frameVariants({ dense, spacing, stacked, variant }), className)}
      data-slot="frame"
      data-spacing={spacing}
      {...props}
    />
  );
}

function FrameDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="frame-panel-description"
      {...props}
    />
  );
}

function FrameFooter({ className, ...props }: React.ComponentProps<'footer'>) {
  return (
    <footer
      className={cn(
        'flex flex-col gap-[var(--frame-panel-footer-gap)] px-[var(--frame-panel-footer-px)] py-[var(--frame-panel-footer-py)]',
        className
      )}
      data-slot="frame-panel-footer"
      {...props}
    />
  );
}

function FrameHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      className={cn(
        'flex flex-col gap-[var(--frame-panel-header-gap)] px-[var(--frame-panel-header-px)] py-[var(--frame-panel-header-py)]',
        className
      )}
      data-slot="frame-panel-header"
      {...props}
    />
  );
}

function FramePanel({ className, fit, ...props }: React.ComponentProps<'div'> & { fit?: boolean }) {
  return (
    <div
      className={cn(
        'shadow-xs relative overflow-hidden rounded-[var(--frame-panel-radius)] border border-[var(--frame-panel-border-color)] bg-[var(--frame-panel-bg)] bg-clip-padding',
        !fit && 'grow',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--frame-panel-radius)_-_1px)] before:shadow-black/5',
        'dark:bg-clip-border dark:before:shadow-white/5',
        'px-[var(--frame-panel-px)] py-[var(--frame-panel-py)]',
        className
      )}
      data-slot="frame-panel"
      {...props}
    />
  );
}

function FrameTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-sm font-medium', className)} data-slot="frame-panel-title" {...props} />;
}

export { Frame, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle, frameVariants };
