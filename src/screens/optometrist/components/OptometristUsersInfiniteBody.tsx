import * as React from 'react';

import type { OptometristUserRow } from '../../../types';

import { OptometristAvatar } from '../../../components/shared/OptometristAvatar';
import { cn } from '../../../lib/utils';
import { getOptometristStatusBadge, rankAvailability } from '../../../utils/optometristStatusBadge';
import { renderCallDuration } from '../../store/components/cells';

type OptometristUsersInfiniteBodyProps = {
  data: OptometristUserRow[];
};

const PAGE_SIZE = 5;
const SCROLL_THRESHOLD_PX = 60;

export function OptometristUsersInfiniteBody({ data }: OptometristUsersInfiniteBodyProps) {
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  const sortedData = React.useMemo(
    () => [...data].sort((a, b) => rankAvailability(a) - rankAvailability(b)),
    [data]
  );

  const visibleData = sortedData.slice(0, visibleCount);
  const hasMore = visibleCount < sortedData.length;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD_PX;

    if (nearBottom && hasMore) {
      setVisibleCount((count) => Math.min(count + PAGE_SIZE, sortedData.length));
    }
  };

  return (
    <div className="font-pro flex min-h-0 w-full flex-1 flex-col">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto" onScroll={handleScroll}>
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Optometrist</th>
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Languages Known</th>
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-sm font-semibold text-muted-foreground">Call Duration</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-muted-foreground" colSpan={4}>
                  No Optometrist found.
                </td>
              </tr>
            ) : (
              visibleData.map((row) => {
                const { classes, label } = getOptometristStatusBadge(row);

                return (
                  <tr key={row.email}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0" title={row.avail.statusLabel}>
                          <OptometristAvatar className="h-9 w-9" email={row.email} name={row.name} />
                          <span
                            className={cn(
                              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                              row.avail.dotClass
                            )}
                          />
                        </div>
                        <span className="truncate text-sm font-normal">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.languages && row.languages.length > 0 ? (
                          row.languages.map((lang) => (
                            <span
                              className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-sm font-normal text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              key={lang}
                            >
                              {lang}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2.5 py-0.5 text-sm font-normal',
                          classes
                        )}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.activeCall ? (
                        renderCallDuration(row.activeCall)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {hasMore && <div className="py-3 text-center text-[10px] text-muted-foreground">Loading more…</div>}
      </div>
    </div>
  );
}
