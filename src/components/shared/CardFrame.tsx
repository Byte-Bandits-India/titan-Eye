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
      className={`flex flex-col overflow-hidden rounded-md border border-[#c2c2c2] bg-card shadow-sm${className ? ` ${className}` : ''}`}
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
      className={`flex flex-wrap items-center justify-between gap-2.5 border-b border-[#e5e5e5] bg-[#F7F7F7] px-4 py-2.5${className ? ` ${className}` : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br text-white ${iconGradient}`}
        >
          <Icon size={13} />
        </div>
        <span className="text-sm font-medium text-black">{title}</span>
      </div>

      {right != null && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
