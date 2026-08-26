import { CheckCircle2, Clock, FlaskConical, Users2 } from 'lucide-react';

import type { TabCounts } from '../../../types';

import { MetricCard } from '../../../components/shared/MetricCard';
import { MetricCardSkeleton } from '../../../components/shared/MetricCardSkeleton';

type MetricCardGridProps = {
  isLoading?: boolean;
  isTabletMode?: boolean;
  tabCounts: TabCounts;
};

export function MetricCardGrid({ isLoading, isTabletMode, tabCounts }: MetricCardGridProps) {
  const gridClassName = isTabletMode
    ? 'grid w-full grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4'
    : 'grid w-full grid-cols-2 gap-4';

  if (isLoading) {
    return (
      <div className={gridClassName}>
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: Clock,
      iconGradient: 'from-[#EF427F] to-[#892649]',
      label: 'Created',
      value: tabCounts.pending,
    },
    {
      icon: FlaskConical,
      iconGradient: 'from-indigo-500 to-indigo-800',
      label: 'Testing',
      value: tabCounts.inProgress,
    },
    {
      icon: CheckCircle2,
      iconGradient: 'from-orange-500 to-orange-800',
      label: 'Completed',
      value: tabCounts.completed,
    },
    {
      icon: Users2,
      iconGradient: 'from-green-500 to-green-800',
      label: 'Total',
      value: tabCounts.all,
    },
  ] as const;

  return (
    <div className={gridClassName}>
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}
