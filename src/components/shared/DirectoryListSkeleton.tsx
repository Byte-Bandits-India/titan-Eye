import { Skeleton } from '../ui/skeleton';

type DirectoryListSkeletonProps = {
  rowCount?: number;
};

export function DirectoryListSkeleton({ rowCount = 5 }: DirectoryListSkeletonProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col divide-y divide-border">
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <div className="flex items-center justify-between gap-3 px-4 py-3" key={rowIndex}>
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
