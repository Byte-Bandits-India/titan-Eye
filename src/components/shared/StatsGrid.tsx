import * as React from 'react';
import { FlaskConical, Clock, CheckCircle2, Users2 } from 'lucide-react';
import { Card } from '../ui/card';
import type { StatsGridProps } from '../../types';

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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const today = customers.filter((c) => c.lastUpdatedOn?.includes(todayStr)).length;

    return { active, pending, completed, today };
  }, [customers]);

  const cards = [
    {
      label: 'Active Tests',
      value: stats.active,
      icon: FlaskConical,
      border: 'border-blue-400/70',
      shadow: 'shadow-[0_2px_12px_rgba(59,130,246,0.08)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]',
      iconBg: 'bg-blue-50 border-blue-100 text-blue-500',
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      icon: Clock,
      border: 'border-orange-400/70',
      shadow: 'shadow-[0_2px_12px_rgba(249,115,22,0.08)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)]',
      iconBg: 'bg-orange-50 border-orange-100 text-orange-500',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      border: 'border-green-400/70',
      shadow: 'shadow-[0_2px_12px_rgba(34,197,94,0.08)] hover:shadow-[0_4px_20px_rgba(34,197,94,0.15)]',
      iconBg: 'bg-green-50 border-green-100 text-green-500',
    },
    {
      label: "Today's Patients",
      value: stats.today,
      icon: Users2,
      border: 'border-teal-400/70',
      shadow: 'shadow-[0_2px_12px_rgba(20,184,166,0.08)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.15)]',
      iconBg: 'bg-teal-50 border-teal-100 text-teal-500',
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className={`p-4 border-[1.5px] ${card.border} bg-white ${card.shadow} transition-all duration-300 flex items-center gap-3`}
          >
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg}`}
            >
              <Icon size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                {card.label}
              </span>
              <span className="text-2xl font-black text-gray-900 leading-none mt-1">
                {card.value}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
