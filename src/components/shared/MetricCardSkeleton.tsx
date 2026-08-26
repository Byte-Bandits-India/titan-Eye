import { Skeleton } from '../ui/skeleton';

export function MetricCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="dark:bg-muted/40 flex items-center gap-2.5 border-b border-border bg-[#F7F7F7] px-4 py-2.5">
        <Skeleton className="h-7 w-7 shrink-0 rounded-sm" />
        <Skeleton className="h-3.5 w-24" />
      </div>

      <div className="flex items-baseline gap-2 px-4 py-3.5 sm:px-6 sm:py-4 md:px-8 md:py-5">
        <Skeleton className="h-8 w-14 sm:h-9 md:h-10" />
        <Skeleton className="h-3.5 w-16" />
      </div>
    </div>
  );
}
