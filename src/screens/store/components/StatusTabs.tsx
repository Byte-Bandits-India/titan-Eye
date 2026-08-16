import type { StatusTab, TabCounts } from '../../../types';

import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';

type StatusTabsProps = {
  hideCompleted?: boolean;
  onValueChange: (tab: StatusTab) => void;
  tabCounts: TabCounts;
  value: StatusTab;
};

export function StatusTabs({ hideCompleted, onValueChange, tabCounts, value }: StatusTabsProps) {
  const tabs = [
    { count: tabCounts.pending, label: 'Created', value: 'Pending' as StatusTab },
    { count: tabCounts.inProgress, label: 'Testing', value: 'InProgress' as StatusTab },
    ...(hideCompleted
      ? []
      : [{ count: tabCounts.completed, label: 'Completed', value: 'Completed' as StatusTab }]),
    { count: tabCounts.all, label: 'All', value: 'all' as StatusTab },
  ];

  return (
    <Tabs className="px-4 pb-3 pt-3" onValueChange={(v) => onValueChange(v as StatusTab)} value={value}>
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger
            className="flex-none gap-2 text-muted-foreground underline-offset-4 data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:underline"
            key={tab.value}
            value={tab.value}
          >
            {tab.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {tab.count}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
