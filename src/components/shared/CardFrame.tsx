import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type CardFrameProps = {
  children: ReactNode;
  className?: string;
};

export type CardHeaderProps = {
  className?: string;
  icon: LucideIcon;
  iconGradient?: string;
  right?: ReactNode;
  title: string;
};

export function CardFrame({ children, className }: CardFrameProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-xs${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  icon: Icon,
  iconGradient = 'from-slate-500 to-slate-800',
  right,
  title,
}: CardHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 border-b border-border bg-[#F7F7F7] px-4 py-2.5 dark:bg-muted/40${className ? ` ${className}` : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br text-white ${iconGradient}`}
        >
          <Icon size={13} />
        </div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>

      {right != null && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
