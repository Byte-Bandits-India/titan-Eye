import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * CSS variable architecture for FramePanel theming:
 *
 * The Frame parent sets --frame-panel-bg and --frame-panel-border-color.
 * FramePanel consumes them directly via bg-[var(--frame-panel-bg)] and
 * border-[var(--frame-panel-border-color)]. This means:
 *
 *   - variant="inverse" overrides those vars on Frame → all panels pick it up
 *   - <FramePanel className="bg-blue-50"> adds a direct utility on the element
 *     which wins over bg-[var(--frame-panel-bg)] by Tailwind source order —
 *     no :not() or !important needed
 *
 * Ported from the upstream (Tailwind v4) reui registry component to Tailwind
 * v3 syntax: `<utility>-(--var)` shorthand and the `--spacing()` function are
 * v4-only, so they're rewritten here as `<utility>-[var(--var)]` and literal
 * rem values (1 spacing unit = 0.25rem) respectively. `--radius-xl` etc. from
 * v4's default theme don't exist in this project's token set, so radius
 * falls back to this app's own `rounded-md` (`var(--radius)`) scale instead.
 */
const frameVariants = cva(
  [
    "relative flex flex-col bg-muted/50 gap-[var(--frame-gap)] px-[var(--frame-px)] py-[var(--frame-py)] rounded-[var(--frame-radius)]",
    "[--frame-radius:var(--radius)] [--frame-gap:0.1875rem] [--frame-px:0.1875rem] [--frame-py:0.1875rem] [--frame-panel-header-gap:0rem] [--frame-panel-footer-gap:0.25rem]",
    "[--frame-panel-px-adjust:0px] [--frame-panel-py-adjust:0px] [--frame-panel-header-px-adjust:0px] [--frame-panel-header-py-adjust:0px] [--frame-panel-footer-px-adjust:0px] [--frame-panel-footer-py-adjust:0px]",
    "[--frame-panel-px:calc(var(--frame-panel-px-base)_+_var(--frame-panel-px-adjust))] [--frame-panel-py:calc(var(--frame-panel-py-base)_+_var(--frame-panel-py-adjust))] [--frame-panel-header-px:calc(var(--frame-panel-header-px-base)_+_var(--frame-panel-header-px-adjust))] [--frame-panel-header-py:calc(var(--frame-panel-header-py-base)_+_var(--frame-panel-header-py-adjust))] [--frame-panel-footer-px:calc(var(--frame-panel-footer-px-base)_+_var(--frame-panel-footer-px-adjust))] [--frame-panel-footer-py:calc(var(--frame-panel-footer-py-base)_+_var(--frame-panel-footer-py-adjust))]",
    // Default panel token values — overridden per-variant below
    "[--frame-panel-bg:var(--card)] [--frame-panel-border-color:var(--border)] [--frame-border-color:var(--border)]",
    // Concentric inner radius: the panel corner nests smoothly inside the frame
    // corner instead of matching it. The panel sits inset from the frame's outer
    // edge by the frame's 1px border + --frame-px padding, so its radius is
    // reduced by that same gap (radius − gap keeps the two arcs parallel). This
    // base value assumes the bordered default/inverse frame; `ghost` drops the
    // 1px border term and `dense` pins it back to the frame radius (its panels
    // are pulled flush to the edge).
    "[--frame-panel-radius:calc(var(--frame-radius)_-_var(--frame-px)_-_1px)]",
  ],
  {
    variants: {
      variant: {
        default: "border border-[var(--frame-border-color)] bg-clip-padding",
        inverse:
          "[--frame-panel-bg:color-mix(in_oklch,var(--muted)_40%,transparent)] border border-[var(--frame-border-color)] bg-background bg-clip-padding",
        // No frame border, so the panel is inset by --frame-px padding only.
        ghost: "[--frame-panel-radius:calc(var(--frame-radius)_-_var(--frame-px))]",
      },
      // Header/footer vertical rhythm is tighter than the panel body's, and
      // the gap widens as the frame grows: the bars read as chrome rather than
      // as another content block. py ladder is 0.5 / 1.5 / 2 / 2.5 against a
      // body py of 2 / 3.5 / 4 / 5. `px` is deliberately left level with the
      // body so header, content and footer stay left-aligned. `xs` holds at
      // 0.5 (2px): it is the practical floor, since anything lower stops
      // reading as padding.
      spacing: {
        xs: "[--frame-panel-px-base:0.5rem] [--frame-panel-py-base:0.5rem] [--frame-panel-header-px-base:0.5rem] [--frame-panel-header-py-base:0.125rem] [--frame-panel-footer-px-base:0.5rem] [--frame-panel-footer-py-base:0.125rem]",
        sm: "[--frame-panel-px-base:0.75rem] [--frame-panel-py-base:0.875rem] [--frame-panel-header-px-base:0.75rem] [--frame-panel-header-py-base:0.375rem] [--frame-panel-footer-px-base:0.75rem] [--frame-panel-footer-py-base:0.375rem]",
        default:
          "[--frame-panel-px-base:1rem] [--frame-panel-py-base:1rem] [--frame-panel-header-px-base:1rem] [--frame-panel-header-py-base:0.5rem] [--frame-panel-footer-px-base:1rem] [--frame-panel-footer-py-base:0.5rem]",
        lg: "[--frame-panel-px-base:1.25rem] [--frame-panel-py-base:1.25rem] [--frame-panel-header-px-base:1.25rem] [--frame-panel-header-py-base:0.625rem] [--frame-panel-footer-px-base:1.25rem] [--frame-panel-footer-py-base:0.625rem]",
      },
      stacked: {
        true: [
          "gap-0 *:has-[+[data-slot=frame-panel]]:rounded-b-none",
          "*:has-[+[data-slot=frame-panel]]:before:hidden",
          "*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:rounded-t-none",
          "*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:border-t-0",
        ],
        false: [
          "data-[spacing=sm]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-0.5",
          "data-[spacing=default]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-1",
          "data-[spacing=lg]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-2",
        ],
      },
      dense: {
        // Positional rules must stay as parent selectors — cannot be expressed via CSS vars.
        // Padding is 0 and panels are pulled flush to the frame edge (-mx-px), so
        // their corners align with the frame radius rather than nesting inside it.
        true: "p-0 gap-0 border-[var(--frame-border-color)] [--frame-panel-radius:var(--frame-radius)] [&_[data-slot=frame-panel]]:-mx-px [&_[data-slot=frame-panel]]:before:hidden [&_[data-slot=frame-panel]:last-child]:-mb-px [&:not(:has([data-slot=frame-panel-header]))_[data-slot=frame-panel]:is(:first-child)]:-mt-px",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      spacing: "default",
      stacked: false,
      dense: false,
    },
  }
)

function Frame({
  className,
  variant,
  spacing,
  stacked,
  dense,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof frameVariants>) {
  return (
    <div
      className={cn(
        frameVariants({ variant, spacing, stacked, dense }),
        className
      )}
      data-slot="frame"
      data-spacing={spacing}
      {...props}
    />
  )
}

function FramePanel({
  className,
  fit,
  ...props
}: React.ComponentProps<"div"> & { fit?: boolean }) {
  return (
    <div
      className={cn(
        // bg-[var(--frame-panel-bg)] and border-[var(--frame-panel-border-color)]
        // consume the CSS vars set by the Frame parent. Any explicit bg-* or
        // border-* class passed via className overrides these by Tailwind
        // source order — no ! needed.
        "relative overflow-hidden rounded-[var(--frame-panel-radius)] border border-[var(--frame-panel-border-color)] bg-[var(--frame-panel-bg)] bg-clip-padding shadow-xs",
        // `fit` sizes the panel to its content; otherwise it grows to fill the frame.
        !fit && "grow",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--frame-panel-radius)_-_1px)] before:shadow-black/5",
        "dark:bg-clip-border dark:before:shadow-white/5",
        "px-[var(--frame-panel-px)] py-[var(--frame-panel-py)]",
        className
      )}
      data-slot="frame-panel"
      {...props}
    />
  )
}

function FrameHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      className={cn(
        "flex flex-col gap-[var(--frame-panel-header-gap)] px-[var(--frame-panel-header-px)] py-[var(--frame-panel-header-py)]",
        className
      )}
      data-slot="frame-panel-header"
      {...props}
    />
  )
}

function FrameTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm font-semibold", className)}
      data-slot="frame-panel-title"
      {...props}
    />
  )
}

function FrameDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="frame-panel-description"
      {...props}
    />
  )
}

function FrameFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      className={cn(
        "flex flex-col gap-[var(--frame-panel-footer-gap)] px-[var(--frame-panel-footer-px)] py-[var(--frame-panel-footer-py)]",
        className
      )}
      data-slot="frame-panel-footer"
      {...props}
    />
  )
}

export {
  Frame,
  FramePanel,
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FrameFooter,
  frameVariants,
}
