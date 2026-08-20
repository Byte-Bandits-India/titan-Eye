export type ActiveCountBadgeProps = {
  count: number;
};

export function ActiveCountBadge({ count }: ActiveCountBadgeProps) {
  return (
    <span className="font-pro inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-normal text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {count} Active
    </span>
  );
}
