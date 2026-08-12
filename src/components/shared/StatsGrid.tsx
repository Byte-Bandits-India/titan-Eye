import { CheckCircle2, Clock, FlaskConical, Users2 } from 'lucide-react';
import * as React from 'react';

import type { StatsGridProps } from '../../types';

import { Card } from '../ui/card';

export function StatsGrid({ customers }: StatsGridProps) {
  const stats = React.useMemo(() => {
    const active = customers.filter(
      (c) => c.status === 'Created' || c.status === 'Initiated' || c.status === 'Accepted',
    ).length;
    const pending = customers.filter(
      (c) => c.status === 'Created' || c.status === 'Initiated',
    ).length;
    const completed = customers.filter((c) => c.status === 'Completed').length;
    const todayStr = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const today = customers.filter((c) => c.lastUpdatedOn?.includes(todayStr)).length;

    return { active, completed, pending, today };
  }, [customers]);

  const cards = [
    {
      border: 'border-blue-400/70 dark:border-blue-500/50',
      icon: FlaskConical,
      iconBg: 'bg-blue-50 border-blue-100 text-blue-500 dark:bg-blue-950/50 dark:border-blue-900/50 dark:text-blue-400',
      label: 'Active Tests',
      shadow: 'shadow-[0_2px_12px_rgba(59,130,246,0.08)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]',
      value: stats.active,
    },
    {
      border: 'border-orange-400/70 dark:border-orange-500/50',
      icon: Clock,
      iconBg: 'bg-orange-50 border-orange-100 text-orange-500 dark:bg-orange-950/50 dark:border-orange-900/50 dark:text-orange-400',
      label: 'Pending Review',
      shadow: 'shadow-[0_2px_12px_rgba(249,115,22,0.08)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)]',
      value: stats.pending,
    },
    {
      border: 'border-green-400/70 dark:border-green-500/50',
      icon: CheckCircle2,
      iconBg: 'bg-green-50 border-green-100 text-green-500 dark:bg-green-950/50 dark:border-green-900/50 dark:text-green-400',
      label: 'Completed',
      shadow: 'shadow-[0_2px_12px_rgba(34,197,94,0.08)] hover:shadow-[0_4px_20px_rgba(34,197,94,0.15)]',
      value: stats.completed,
    },
    {
      border: 'border-teal-400/70 dark:border-teal-500/50',
      icon: Users2,
      iconBg: 'bg-teal-50 border-teal-100 text-teal-500 dark:bg-teal-950/50 dark:border-teal-900/50 dark:text-teal-400',
      label: "Today's Patients",
      shadow: 'shadow-[0_2px_12px_rgba(20,184,166,0.08)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.15)]',
      value: stats.today,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            className={`p-4 border-[1.5px] ${card.border} bg-card ${card.shadow} transition-all duration-300 flex items-center gap-3`}
            key={card.label}
          >
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg}`}
            >
              <Icon size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                {card.label}
              </span>
              <span className="text-2xl font-black text-foreground leading-none mt-1">
                {card.value}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
