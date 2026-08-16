import { cn } from '../../lib/utils';

export type OptometristStatusBadgeProps = {
  badgeClass: string;
  dotClass: string;
  statusLabel: string;
};

export function OptometristStatusBadge({ badgeClass, dotClass, statusLabel }: OptometristStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium',
        badgeClass
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} />
      {statusLabel}
    </span>
  );
}
