import { Stethoscope, Store } from 'lucide-react';
import * as React from 'react';

import type { OptometristUserRow } from '../../types';

import { cn } from '../../lib/utils';
import { AvailableStoresBody } from '../../screens/admin/components/AvailableStoresBody';
import { OptometristUsersInfiniteBody } from '../../screens/optometrist/components/OptometristUsersInfiniteBody';
import { ActiveCountBadge } from './ActiveCountBadge';
import { CardFrame } from './CardFrame';

export type AvailableView = 'optometrists' | 'stores';

export interface AvailableDirectoryCardProps {
  className?: string;
  defaultView?: AvailableView;
  optometristData: OptometristUserRow[];
  storeData: OptometristUserRow[];
}

export function AvailableDirectoryCard({
  className,
  defaultView = 'optometrists',
  optometristData,
  storeData,
}: AvailableDirectoryCardProps) {
  const [view, setView] = React.useState<AvailableView>(defaultView);
  const activeData = view === 'optometrists' ? optometristData : storeData;
  const activeCount = activeData.filter((d) => d.avail.statusLabel !== 'Offline').length;

  return (
    <CardFrame className={cn('flex h-[300px] flex-col', className)}>
      <div className="dark:bg-muted/40 flex flex-wrap items-center justify-between gap-2.5 border-b border-border bg-[#F7F7F7] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br text-white',
              view === 'optometrists' ? 'from-teal-500 to-teal-800' : 'from-blue-500 to-blue-800'
            )}
          >
            {view === 'optometrists' ? <Stethoscope size={13} /> : <Store size={13} />}
          </div>
          <span className="text-sm font-semibold text-foreground">Available</span>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              className={cn(
                'rounded-md px-2.5 py-1 text-sm font-medium transition-colors',
                view === 'optometrists'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setView('optometrists')}
              type="button"
            >
              Optometrists
            </button>
            <button
              className={cn(
                'rounded-md px-2.5 py-1 text-sm font-medium transition-colors',
                view === 'stores'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setView('stores')}
              type="button"
            >
              Stores
            </button>
          </div>
        </div>

        <ActiveCountBadge count={activeCount} />
      </div>

      {view === 'optometrists' ? (
        <OptometristUsersInfiniteBody data={optometristData} />
      ) : (
        <AvailableStoresBody data={storeData} />
      )}
    </CardFrame>
  );
}
